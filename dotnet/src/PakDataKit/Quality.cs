using System.Collections.ObjectModel;
using System.Text;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>A part of a delivery address that <see cref="Quality.ScoreAddress"/> looks for.</summary>
public enum AddressPart
{
    /// <summary>A known city.</summary>
    City,

    /// <summary>A house, plot, flat or street number.</summary>
    HouseNumber,

    /// <summary>A street, road, lane or gali.</summary>
    Street,

    /// <summary>An area within the city: block, sector, phase, town, colony and so on.</summary>
    Area,

    /// <summary>A postal code that is a known post office.</summary>
    PostalCode,

    /// <summary>A landmark ("near", "opp", "nazd", "سامنے" …).</summary>
    Landmark,
}

/// <summary>Result of <see cref="Quality.ScoreAddress"/>.</summary>
/// <param name="Score">0 (unusable) to 100 (every part present and consistent).</param>
/// <param name="Missing">Parts not found, in the order of <see cref="Quality.AddressWeights"/>.</param>
/// <param name="Parsed">The address as <see cref="Address.Parse"/> reads it, with any extra warnings.</param>
public sealed record AddressScore(int Score, IReadOnlyList<AddressPart> Missing, ParsedAddress Parsed);

/// <summary>A reason to double-check a phone number given for a delivery.</summary>
public enum PhoneRiskFlag
{
    /// <summary>Not a Pakistani phone number.</summary>
    Invalid,

    /// <summary>A fixed-line number (no SMS, often unanswered).</summary>
    Landline,

    /// <summary>A UAN, toll-free or other service number.</summary>
    NotMobile,

    /// <summary>The 7-digit subscriber part uses at most two different digits (<c>0300-0000000</c>).</summary>
    RepeatedDigits,

    /// <summary>The subscriber part is a run such as <c>1234567</c> or <c>7654321</c>.</summary>
    SequentialDigits,

    /// <summary>A placeholder often typed into forms (<c>03XX-1234567</c>, <c>0312-3456789</c>).</summary>
    TestNumber,
}

/// <summary>Delivery-quality checks for cash on delivery and other courier use.</summary>
public static class Quality
{
    /// <summary>
    /// Points for each part of an address, in order. They add up to 100. A
    /// postal code scores in full only when it is a known post office code;
    /// an unknown one scores 5.
    /// </summary>
    public static readonly IReadOnlyDictionary<AddressPart, int> AddressWeights =
        new ReadOnlyDictionary<AddressPart, int>(new Dictionary<AddressPart, int>
        {
            [AddressPart.City] = 30,
            [AddressPart.HouseNumber] = 20,
            [AddressPart.Street] = 15,
            [AddressPart.Area] = 10,
            [AddressPart.PostalCode] = 15,
            [AddressPart.Landmark] = 10,
        });

    private static readonly AddressPart[] PartOrder =
    [
        AddressPart.City, AddressPart.HouseNumber, AddressPart.Street, AddressPart.Area, AddressPart.PostalCode,
        AddressPart.Landmark,
    ];

    private const int UnknownPostalCodePoints = 5;

    // Taken off when the post office and the city are in different provinces.
    private const int MismatchPenalty = 15;

    // Words that introduce a landmark, in English and Roman Urdu.
    private static readonly string[] LandmarkWords =
    [
        "near", "nr", "opposite", "opp", "behind", "beside", "besides", "adjacent", "next to", "in front of",
        "facing", "nazd", "nazdeek", "nazdik", "qareeb", "qarib", "kareeb", "samne", "saamne", "samnay", "peeche",
        "peechay", "pichay", "bil muqabil", "bilmuqabil", "muttasil", "mutasil",
    ];

    private static readonly string[] UrduLandmarkWords = ["نزد", "نزدیک", "قریب", "سامنے", "پیچھے", "بالمقابل", "متصل"];

    // Words that name a street or lane.
    private static readonly string[] StreetWords =
    [
        "street", "st", "road", "rd", "lane", "gali", "avenue", "ave", "boulevard", "blvd", "chowk", "bazar",
        "bazaar", "mohalla", "muhalla",
    ];

    private static readonly string[] UrduStreetWords = ["گلی", "سڑک", "روڈ", "محلہ", "چوک", "بازار"];

    // Words that name an area within a city.
    private static readonly string[] AreaWords =
    [
        "block", "sector", "phase", "town", "colony", "society", "scheme", "housing", "garden", "gardens", "park",
        "estate", "abad", "nagar", "cantt", "cantonment",
    ];

    private static readonly string[] UrduAreaWords = ["بلاک", "سیکٹر", "فیز", "ٹاؤن", "کالونی", "سوسائٹی"];

    // A number other than the postal code: house, plot, flat or street number ("12", "12b", "4th").
    private static readonly SafeRegex HouseNumber = Js.Rx(" [0-9]+[a-z]{0,2} ");

    private const string Ascending = "01234567890";
    private const string Descending = "09876543210";

    /// <summary>
    /// Scores how complete a free-form Pakistani delivery address is, for cash
    /// on delivery and other courier use.
    /// </summary>
    /// <remarks>
    /// Built on <see cref="Address.Parse"/>. It looks for a city, a house, plot
    /// or flat number, a street, an area, a postal code and a landmark
    /// ("near", "opp", "nazd", "qareeb", "سامنے" …), and adds up
    /// <see cref="AddressWeights"/>. A postal code that is a known post office
    /// raises the score more than an unknown one, and a post office in a
    /// different province from the city lowers it (with a warning in
    /// <see cref="ParsedAddress.Warnings"/>). This is a heuristic: it says how
    /// much an address tells a rider, not whether the address exists.
    /// <code>
    /// Quality.ScoreAddress("House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660");
    /// // AddressScore { Score = 100, Missing = [], Parsed = … }
    /// </code>
    /// </remarks>
    /// <param name="address">Address as written.</param>
    /// <returns>The score, the missing parts and the parsed address.</returns>
    public static AddressScore ScoreAddress(string? address)
    {
        var text = Normalize.Whitespace(address ?? "");
        var parsed = Address.Parse(text);
        var found = new HashSet<AddressPart>();
        var lowered = Words(text);
        var postal = parsed.PostalCode;
        // The text without the postal code, for the house-number check.
        var rest = lowered;
        if (postal is not null)
        {
            var at = lowered.IndexOf(" " + postal + " ", StringComparison.Ordinal);
            if (at >= 0) rest = lowered[..at] + " " + lowered[(at + postal.Length + 2)..];
        }

        if (parsed.City is not null) found.Add(AddressPart.City);
        if (HouseNumber.IsMatch(rest)) found.Add(AddressPart.HouseNumber);
        if (HasWord(lowered, StreetWords) || HasUrdu(text, UrduStreetWords)) found.Add(AddressPart.Street);
        if (parsed.Area is not null || HasWord(lowered, AreaWords) || HasUrdu(text, UrduAreaWords))
            found.Add(AddressPart.Area);
        if (HasWord(lowered, LandmarkWords) || HasUrdu(text, UrduLandmarkWords)) found.Add(AddressPart.Landmark);

        var score = found.Sum(part => AddressWeights[part]);
        var warnings = new List<string>(parsed.Warnings);

        if (postal is not null)
        {
            var office = Postal.GetPostOffice(postal);
            if (office is null) score += UnknownPostalCodePoints;
            else
            {
                found.Add(AddressPart.PostalCode);
                score += AddressWeights[AddressPart.PostalCode];
                if (parsed.Province is not null && office.Province != parsed.Province)
                {
                    score -= MismatchPenalty;
                    warnings.Add($"Postal code {postal} is in {office.Province}, but the address is in {parsed.Province}");
                }
            }
        }

        var missing = PartOrder.Where(part => !found.Contains(part)).ToArray();
        return new AddressScore(Math.Max(0, Math.Min(100, score)), missing, parsed with { Warnings = warnings });
    }

    /// <summary>
    /// Flags a phone number that a courier cannot reach by SMS or call, or that
    /// looks made up. Pure heuristics on the number itself: no list of real
    /// numbers, no personal data, no network call.
    /// </summary>
    /// <remarks>
    /// <code>
    /// Quality.PhoneRiskSignals("0301-2945716");  // []
    /// Quality.PhoneRiskSignals("03001234567");   // [SequentialDigits, TestNumber]
    /// Quality.PhoneRiskSignals("042 35761234");  // [Landline]
    /// </code>
    /// </remarks>
    /// <param name="phone">Number in any common format.</param>
    /// <returns>The flags; empty for a valid mobile number with nothing suspicious.</returns>
    public static IReadOnlyList<PhoneRiskFlag> PhoneRiskSignals(string? phone)
    {
        var info = Numbers.Analyze(phone);
        if (info is null) return [PhoneRiskFlag.Invalid];
        if (info.Type == NumberType.Landline) return [PhoneRiskFlag.Landline];
        if (info.Type != NumberType.Mobile || info.E164 is null) return [PhoneRiskFlag.NotMobile];

        var national = info.E164[3..]; // 3XXXXXXXXX
        var subscriber = national[3..];
        var flags = new List<PhoneRiskFlag>();
        if (subscriber.Distinct().Count() <= 2) flags.Add(PhoneRiskFlag.RepeatedDigits);
        if (Ascending.Contains(subscriber, StringComparison.Ordinal)
            || Descending.Contains(subscriber, StringComparison.Ordinal))
            flags.Add(PhoneRiskFlag.SequentialDigits);
        if (subscriber is "1234567" or "7654321" || national == "3123456789") flags.Add(PhoneRiskFlag.TestNumber);
        return flags;
    }

    /// <summary>
    /// Lower-cases, folds Urdu digits and collapses everything but ASCII
    /// letters, digits and the Arabic block (U+0600–U+06FF) to single spaces,
    /// padded with a space at each end.
    /// </summary>
    private static string Words(string text)
    {
        var lower = Js.ToLower(Normalize.ToAsciiDigits(text));
        var sb = new StringBuilder(lower.Length + 2).Append(' ');
        var gap = true;
        foreach (var c in lower)
        {
            if (c is (>= 'a' and <= 'z') or (>= '0' and <= '9') or (>= '؀' and <= 'ۿ'))
            {
                sb.Append(c);
                gap = false;
            }
            else if (!gap)
            {
                sb.Append(' ');
                gap = true;
            }
        }
        if (!gap || sb.Length == 1) sb.Append(' ');
        return sb.ToString();
    }

    private static bool HasWord(string haystack, string[] list) =>
        list.Any(word => haystack.Contains(" " + word + " ", StringComparison.Ordinal));

    private static bool HasUrdu(string text, string[] list) =>
        list.Any(word => text.Contains(word, StringComparison.Ordinal));
}
