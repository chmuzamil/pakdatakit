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
    /// A separator between digit groups: a space, a hyphen or Unicode dash
    /// (U+2010-2014), a dot or a slash.
    /// </summary>
    private const string Separator = @"[-\u2010\u2011\u2012\u2013\u2014./ ]";

    /// <summary>
    /// A run of digit groups joined by single separators (<c>352 0212 3456 71</c>,
    /// <c>35202/1234567/1</c>), as long as it goes. Two separators in a row, or
    /// any other character, end it.
    /// </summary>
    private static readonly SafeRegex DigitRun = Js.Rx($"{AnyDigit}(?:{Separator}?{AnyDigit})*");

    /// <summary>
    /// A CNIC in 5-7-1 groups (as in 2.7.0) inside a longer run, such as
    /// <c>0300-1234567 35202-1234567-1</c>: a province digit, then 4, 7 and 1
    /// digits with an optional separator between the groups, not next to
    /// another digit.
    /// </summary>
    private static readonly SafeRegex Cnic571 = Js.Rx(
        $"(?<!{AnyDigit}){ProvinceDigit}"
        + $"{AnyDigit}{{4}}{Separator}?{AnyDigit}{{7}}{Separator}?{AnyDigit}"
        + $"(?!{AnyDigit})");

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

    /// <summary>Where CNICs are in a text: <c>(Start, End)</c> pairs, in order.</summary>
    private static List<(int Start, int End)> Spans(string text)
    {
        var spans = new List<(int Start, int End)>();
        foreach (var run in DigitRun.Matches(text))
        {
            var raw = run.Value;
            var digits = OneDigit.Matches(raw).Count;
            if (digits == 13 && FirstIsProvince.IsMatch(raw))
            {
                // Exactly 13 digits in any grouping: the whole run.
                spans.Add((run.Index, run.Index + raw.Length));
            }
            else if (digits > 13)
            {
                // A longer run: only a CNIC written in 5-7-1 groups inside it.
                foreach (var m in Cnic571.Matches(raw))
                    spans.Add((run.Index + m.Index, run.Index + m.Index + m.Length));
            }
        }

        return spans;
    }

    /// <summary>
    /// Finds CNIC numbers in free text, such as a chat message, a note or an
    /// uploaded document, for example to mask them before logging.
    /// </summary>
    /// <remarks>
    /// A match is either:
    /// <list type="bullet">
    /// <item>a run of exactly 13 digits whose first digit is a province code
    /// (1-8), together or in any grouping joined by single separators: a
    /// space, a hyphen or Unicode dash, a dot or a slash (<c>3520212345671</c>,
    /// <c>35202-1234567-1</c>, <c>352 0212 3456 71</c>, <c>35202/1234567/1</c>); or</item>
    /// <item>a CNIC in 5-7-1 groups inside a longer run of such groups
    /// (<c>0300-1234567 35202-1234567-1</c>).</item>
    /// </list>
    /// Digits may be ASCII, Urdu or Arabic-Indic, even mixed. A match never
    /// starts or ends next to another digit, and a run of more than 13 digits
    /// is never cut into a CNIC except at 5-7-1 groups.
    /// <para>
    /// Accepting any grouping catches CNICs as people really type them, but
    /// matches more that is not a CNIC: any 13 digits starting with 1-8,
    /// however they are grouped (an account, order or tracking number, or two
    /// shorter numbers written together), are found. <see cref="Validate"/>
    /// stays strict.
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
