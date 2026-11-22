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

/// <summary>Result of <see cref="Cnic.Mask(string?, string?, string?)"/>.</summary>
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

    /// <summary>A province digit (1-8) in any of the three scripts.</summary>
    private const string ProvinceDigit = @"[1-8\u06F1-\u06F8\u0661-\u0668]";

    /// <summary>
    /// Horizontal space between digit groups: a space, a tab, a no-break space
    /// (U+00A0) or a narrow no-break space (U+202F). Never a line break.
    /// </summary>
    private const string Space = @"[ \t\u00A0\u202F]";

    /// <summary>
    /// One separator mark: a hyphen or Unicode dash (U+2010-2014), a dot, a
    /// slash or an underscore.
    /// </summary>
    private const string Mark = @"[-\u2010\u2011\u2012\u2013\u2014./_]";

    /// <summary>
    /// What may join two digit groups: any run of spaces, or one mark with any
    /// spaces around it (<c>35202  1234567  1</c>, <c>35202 -1234567- 1</c>,
    /// <c>35202_1234567_1</c>, <c>35202 - 1234567 - 1</c>). A line break never
    /// joins them.
    /// </summary>
    private const string Join = $"(?:{Space}+|{Space}*{Mark}{Space}*)";

    /// <summary>One digit group: an unbroken run of digits.</summary>
    private static readonly SafeRegex Group = Js.Rx($"{AnyDigit}+");

    /// <summary>Digit groups joined as above, as long as the run goes.</summary>
    private static readonly SafeRegex DigitRun = Js.Rx($"{AnyDigit}+(?:{Join}{AnyDigit}+)*");

    private static readonly SafeRegex FirstIsProvince = Js.Rx($"^{ProvinceDigit}");

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
    /// Where CNICs are in a text: <c>(Start, End)</c> pairs, in order. In each
    /// run of digit groups, consecutive whole groups that add up to exactly 13
    /// digits, starting with a province digit, are a CNIC; the search goes on
    /// after it. A group is never split, so 13 digits inside a longer unbroken
    /// number are never matched.
    /// </summary>
    private static List<(int Start, int End)> Spans(string text)
    {
        var spans = new List<(int Start, int End)>();
        foreach (var run in DigitRun.Matches(text))
        {
            var groups = Group.Matches(run.Value)
                .Select(g => (Start: run.Index + g.Index, End: run.Index + g.Index + g.Length, g.Value))
                .ToArray();
            for (var i = 0; i < groups.Length; i++)
            {
                var digits = 0;
                for (var j = i; j < groups.Length; j++)
                {
                    digits += groups[j].Value.Length;
                    if (digits < 13) continue;
                    if (digits == 13 && FirstIsProvince.IsMatch(groups[i].Value))
                    {
                        spans.Add((groups[i].Start, groups[j].End));
                        i = j;
                    }

                    break;
                }
            }
        }

        return spans;
    }

    /// <summary>
    /// Finds CNIC numbers in free text, such as a chat message, a note or an
    /// uploaded document, for example to mask them before logging.
    /// </summary>
    /// <remarks>
    /// Digits are read in groups (unbroken runs of digits). Groups may be
    /// joined by any run of spaces or tabs, or by one mark (a hyphen or
    /// Unicode dash, a dot, a slash or an underscore) with any spaces around
    /// it: <c>35202 1234567 1</c>, <c>35202  1234567  1</c>,
    /// <c>35202 -1234567- 1</c>, <c>35202_1234567_1</c>,
    /// <c>35202 - 1234567 - 1</c>, <c>352 0212 3456 71</c>,
    /// <c>35202/1234567/1</c>. A line break never joins groups. A match is
    /// consecutive whole groups that add up to exactly 13 digits, starting
    /// with a province code (1-8); the search goes on after each match, so
    /// <c>0300-1234567 35202-1234567-1</c> finds the CNIC. A group is never
    /// split, so 13 digits inside a longer unbroken number (an IBAN, a card
    /// number) never match. Digits may be ASCII, Urdu or Arabic-Indic, even
    /// mixed. This matches everything Jaanch's own CNIC redaction does, except
    /// across line breaks.
    /// <para>
    /// Accepting any grouping catches CNICs as people really type them, but
    /// matches more that is not a CNIC: any 13 digits starting with 1-8 split
    /// into groups this way (an account, order or tracking number, table
    /// columns, a price list such as <c>8260 - 8048 - 2804 - 0</c>, a file
    /// name such as <c>IMG_20261123_12345</c>, or two shorter numbers written
    /// together) are found. <see cref="Validate"/> stays strict.
    /// </para>
    /// <code>
    /// Cnic.FindAll("CNIC: 35202-1234567-1, phone 0300-1234567");
    /// // [CnicMatch { Raw = "35202-1234567-1", Digits = "3520212345671",
    /// //   Formatted = "35202-1234567-1", Start = 6, End = 21 }]
    /// Cnic.FindAll("id 352 0212 3456 71")[0].Digits;  // "3520212345671"
    /// </code>
    /// </remarks>
    /// <param name="text">Any text.</param>
    /// <returns>The matches in order, or an empty list (also for <c>null</c>). Never throws.</returns>
    public static IReadOnlyList<CnicMatch> FindAll(string? text)
    {
        if (text is null) return [];
        return Spans(text).Select(span =>
        {
            var raw = text[span.Start..span.End];
            var digits = NonDigit.Replace(Normalize.ToAsciiDigits(raw), "");
            return new CnicMatch(
                raw, digits, $"{digits[..5]}-{digits[5..12]}-{digits[12]}", span.Start, span.End);
        }).ToArray();
    }

    /// <summary>
    /// Masks every CNIC in free text, as found by <see cref="FindAll"/>: each
    /// digit becomes <paramref name="mask"/> and the separators stay, so
    /// <c>35202-1234567-1</c> becomes <c>XXXXX-XXXXXXX-X</c>. The rest of the
    /// text is unchanged. With <paramref name="replacement"/>, each whole CNIC
    /// is replaced by that text instead.
    /// </summary>
    /// <remarks>
    /// Like <see cref="FindAll"/>, it also masks any other 13 digits that start
    /// with 1-8, however they are grouped.
    /// <code>
    /// Cnic.Mask("My CNIC is 35202-1234567-1");  // Text = "My CNIC is XXXXX-XXXXXXX-X", Count = 1
    /// Cnic.Mask("35202 1234567 1", "*");        // Text = "***** ******* *", Count = 1
    /// Cnic.Mask("CNIC 352 0212 3456 71", replacement: "[CNIC removed]");
    /// // Text = "CNIC [CNIC removed]", Count = 1
    /// </code>
    /// </remarks>
    /// <param name="text">Any text.</param>
    /// <param name="mask">The string that replaces each digit. <c>null</c> means <c>"X"</c>.</param>
    /// <param name="replacement">
    /// The string that replaces each whole CNIC, separators included, e.g.
    /// <c>"[CNIC removed]"</c>. Takes precedence over <paramref name="mask"/>;
    /// <c>null</c> means no replacement.
    /// </param>
    /// <returns>
    /// The masked text (or replaced, with <paramref name="replacement"/>) and
    /// the number of CNICs masked; <c>("", 0)</c> for <c>null</c> text. Never throws.
    /// </returns>
    public static MaskedText Mask(string? text, string? mask = "X", string? replacement = null)
    {
        if (text is null) return new MaskedText("", 0);
        var digitMask = mask ?? "X";
        var spans = Spans(text);
        var sb = new System.Text.StringBuilder(text.Length);
        var at = 0;
        foreach (var (start, end) in spans)
        {
            sb.Append(text, at, start - at);
            sb.Append(replacement ?? OneDigit.Replace(text[start..end], _ => digitMask));
            at = end;
        }

        sb.Append(text, at, text.Length - at);
        return new MaskedText(sb.ToString(), spans.Count);
    }

    /// <summary>
    /// Masks every CNIC in free text: the same as
    /// <see cref="Mask(string?, string?, string?)"/> with no replacement. Kept
    /// so that code compiled against 2.7.0 and earlier still binds.
    /// </summary>
    /// <param name="text">Any text.</param>
    /// <param name="mask">The string that replaces each digit. <c>null</c> means <c>"X"</c>.</param>
    /// <returns>The masked text and the number of CNICs masked.</returns>
    public static MaskedText Mask(string? text, string? mask) => Mask(text, mask, null);
}
