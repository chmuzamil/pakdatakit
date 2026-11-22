using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Gender encoded in the last digit of a CNIC.</summary>
public enum CnicGender
{
    /// <summary>Odd last digit.</summary>
    Male,

    /// <summary>Even last digit.</summary>
    Female,
}

/// <summary>Information encoded in a CNIC number.</summary>
/// <param name="Digits">The CNIC as 13 digits without separators.</param>
/// <param name="Formatted">The CNIC in <c>#####-#######-#</c> form.</param>
/// <param name="Province">Province where the CNIC was first registered (from the first digit).</param>
/// <param name="Gender">Gender from the last digit: odd is male, even is female.</param>
public sealed record CnicInfo(string Digits, string Formatted, string Province, CnicGender Gender);

/// <summary>A CNIC found by <see cref="Cnic.FindAll"/>.</summary>
/// <param name="Raw">The text as written, e.g. <c>35202 1234567-1</c> or with Urdu digits.</param>
/// <param name="Digits">The 13 digits, in ASCII.</param>
/// <param name="Formatted">The CNIC in <c>#####-#######-#</c> form.</param>
/// <param name="Start">Index of the first character in the text (UTF-16 code units, as <see cref="string"/> indexes).</param>
/// <param name="End">Index just after the last character, so <c>text[Start..End]</c> is <see cref="Raw"/>.</param>
public sealed record CnicMatch(string Raw, string Digits, string Formatted, int Start, int End);

/// <summary>Result of <see cref="Cnic.Mask"/>.</summary>
/// <param name="Text">The text with every CNIC's digits masked; separators are kept.</param>
/// <param name="Count">How many CNICs were masked.</param>
public sealed record MaskedText(string Text, int Count);

/// <summary>CNIC (Computerized National Identity Card) validation and decoding.</summary>
public static class Cnic
{
    // 13 digits, optionally grouped as #####-#######-# with a consistent separator.
    private static readonly SafeRegex Pattern = Js.Rx(@"^[1-8][0-9]{4}([-‐‑‒–—. ]?)[0-9]{7}\1[0-9]\z");
    private static readonly SafeRegex NonDigit = Js.Rx("[^0-9]");

    /// <summary>One digit: ASCII, Urdu (U+06F0-06F9) or Arabic-Indic (U+0660-0669).</summary>
    private const string AnyDigit = @"[0-9\u06F0-\u06F9\u0660-\u0669]";

    /// <summary>A CNIC separator: a hyphen or dash, a dot, or a space.</summary>
    private const string Separator = @"[-\u2010\u2011\u2012\u2013\u2014. ]";

    /// <summary>
    /// A CNIC in running text: a province digit (1-8), then 4, 7 and 1 more
    /// digits with an optional separator between the groups (the two may
    /// differ), not touching another digit on either side.
    /// </summary>
    private static readonly SafeRegex InText = Js.Rx(
        $"(?<!{AnyDigit})" + @"[1-8\u06F1-\u06F8\u0661-\u0668]"
        + $"{AnyDigit}{{4}}{Separator}?{AnyDigit}{{7}}{Separator}?{AnyDigit}"
        + $"(?!{AnyDigit})");

    private static readonly SafeRegex OneDigit = Js.Rx(AnyDigit);

    private static readonly Dictionary<char, string> Provinces = new()
    {
        ['1'] = "Khyber Pakhtunkhwa",
        ['2'] = "Khyber Pakhtunkhwa",
        ['3'] = "Punjab",
        ['4'] = "Sindh",
        ['5'] = "Balochistan",
        ['6'] = "Islamabad Capital Territory",
        ['7'] = "Gilgit-Baltistan",
        ['8'] = "Azad Jammu and Kashmir",
    };

    /// <summary>
    /// Validates a Pakistani CNIC number (structure only; NADRA publishes no
    /// check-digit algorithm). Accepts <c>3520212345671</c>,
    /// <c>35202-1234567-1</c>, <c>35202 1234567 1</c> and Urdu digits.
    /// </summary>
    /// <param name="cnic">CNIC to validate.</param>
    /// <returns><c>true</c> if the structure is valid.</returns>
    public static bool Validate(string? cnic)
    {
        cnic ??= "";
        return Pattern.IsMatch(Normalize.ToAsciiDigits(Js.Trim(cnic)));
    }

    /// <summary>
    /// Reads the province of first registration and the gender encoded in a CNIC.
    /// </summary>
    /// <param name="cnic">CNIC in any accepted format.</param>
    /// <returns>The details, or <c>null</c> if the CNIC is invalid.</returns>
    public static CnicInfo? GetInfo(string cnic)
    {
        if (!Validate(cnic)) return null;
        var digits = NonDigit.Replace(Normalize.ToAsciiDigits(cnic), "");
        return new CnicInfo(
            digits,
            $"{digits[..5]}-{digits[5..12]}-{digits[12]}",
            Provinces[digits[0]],
            (digits[12] - '0') % 2 == 1 ? CnicGender.Male : CnicGender.Female);
    }

    /// <summary>
    /// Finds CNIC numbers in free text, such as a chat message, a note or an
    /// uploaded document, for example to mask them before logging.
    /// </summary>
    /// <remarks>
    /// A match is 13 digits whose first digit is a province code (1-8),
    /// written together or in 5-7-1 groups with a hyphen, dash, dot or space
    /// between the groups (the two separators may differ). Digits may be
    /// ASCII, Urdu or Arabic-Indic, even mixed. A match never starts or ends
    /// next to another digit, so a longer number is not cut into a CNIC.
    /// <para>
    /// This is looser than <see cref="Validate"/>, which needs the same
    /// separator twice: text is written carelessly. It is a pattern match, so
    /// any other 13-digit number that starts with 1-8 (an account or order
    /// number, say) also matches.
    /// </para>
    /// <code>
    /// Cnic.FindAll("CNIC: 35202-1234567-1, phone 0300-1234567");
    /// // [CnicMatch { Raw = "35202-1234567-1", Digits = "3520212345671",
    /// //   Formatted = "35202-1234567-1", Start = 6, End = 21 }]
    /// </code>
    /// </remarks>
    /// <param name="text">Any text.</param>
    /// <returns>The matches in order, or an empty list (also for <c>null</c>). Never throws.</returns>
    public static IReadOnlyList<CnicMatch> FindAll(string? text)
    {
        if (text is null) return [];
        return InText.Matches(text).Select(match =>
        {
            var raw = match.Value;
            var digits = NonDigit.Replace(Normalize.ToAsciiDigits(raw), "");
            return new CnicMatch(
                raw, digits, $"{digits[..5]}-{digits[5..12]}-{digits[12]}", match.Index, match.Index + raw.Length);
        }).ToArray();
    }

    /// <summary>
    /// Masks every CNIC in free text, as found by <see cref="FindAll"/>: each
    /// digit becomes <paramref name="mask"/> and the separators stay, so
    /// <c>35202-1234567-1</c> becomes <c>XXXXX-XXXXXXX-X</c>. The rest of the
    /// text is unchanged.
    /// </summary>
    /// <remarks>
    /// Like <see cref="FindAll"/>, it also masks any other 13-digit number
    /// that starts with 1-8.
    /// <code>
    /// Cnic.Mask("My CNIC is 35202-1234567-1");  // Text = "My CNIC is XXXXX-XXXXXXX-X", Count = 1
    /// Cnic.Mask("35202 1234567 1", "*");        // Text = "***** ******* *", Count = 1
    /// </code>
    /// </remarks>
    /// <param name="text">Any text.</param>
    /// <param name="mask">The string that replaces each digit. <c>null</c> means <c>"X"</c>.</param>
    /// <returns>
    /// The masked text and the number of CNICs masked; <c>("", 0)</c> for
    /// <c>null</c> text. Never throws.
    /// </returns>
    public static MaskedText Mask(string? text, string? mask = "X")
    {
        if (text is null) return new MaskedText("", 0);
        var replacement = mask ?? "X";
        var count = 0;
        var masked = InText.Replace(text, match =>
        {
            count++;
            return OneDigit.Replace(match.Value, _ => replacement);
        });
        return new MaskedText(masked, count);
    }
}
