using System.Globalization;
using System.Text;

namespace PakDataKit.Internal;

/// <summary>
/// Sort keys approximating <c>a.localeCompare(b)</c> (ICU root collation):
/// base letters first, ignoring case and accents, then accents, then case
/// (lowercase first). Implemented here so the order does not depend on the
/// ICU or NLS version of the machine.
/// </summary>
internal static class Collation
{
    // Root-collation order of ASCII punctuation and symbols, all of which
    // sort before digits and letters.
    private const string Punctuation = "_-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$";

    internal sealed record SortKey(
        (int Class, string Weight)[] Primary, int[] Secondary, int[] Tertiary, string Text);

    internal static readonly IComparer<SortKey> Comparer = Comparer<SortKey>.Create(Compare);

    internal static SortKey Key(string text)
    {
        var primary = new List<(int, string)>();
        var secondary = new List<int>();
        var tertiary = new List<int>();
        string decomposed;
        try
        {
            decomposed = text.Normalize(NormalizationForm.FormD);
        }
        catch (ArgumentException)
        {
            decomposed = text; // lone surrogates cannot be normalized
        }

        foreach (var rune in Js.CodePoints(decomposed))
        {
            var lone = rune.Length == 1 && char.IsSurrogate(rune[0]);
            var code = lone ? rune[0] : char.ConvertToUtf32(rune, 0);
            var category = lone ? UnicodeCategory.Surrogate : CharUnicodeInfo.GetUnicodeCategory(code);
            if (category is UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark
                or UnicodeCategory.EnclosingMark)
            {
                secondary.Add(code);
                continue;
            }

            (int, string) weight;
            if (rune.Length == 1 && Js.WsChars.Contains(rune[0])) weight = (0, Pad(code));
            else if (rune.Length == 1 && Punctuation.Contains(rune[0]))
                weight = (1, Pad(Punctuation.IndexOf(rune[0])));
            else if (category == UnicodeCategory.DecimalDigitNumber)
                weight = (2, Pad((int)CharUnicodeInfo.GetNumericValue(rune, 0)));
            else if (IsLetter(category)) weight = (3, Js.ToLower(rune));
            else weight = (4, Pad(code));
            primary.Add(weight);
            secondary.Add(0);
            tertiary.Add(category == UnicodeCategory.UppercaseLetter ? 1 : 0);
        }
        return new SortKey(primary.ToArray(), secondary.ToArray(), tertiary.ToArray(), text);
    }

    private static string Pad(int value) => value.ToString("D8", CultureInfo.InvariantCulture);

    private static bool IsLetter(UnicodeCategory category) => category is UnicodeCategory.UppercaseLetter
        or UnicodeCategory.LowercaseLetter or UnicodeCategory.TitlecaseLetter
        or UnicodeCategory.ModifierLetter or UnicodeCategory.OtherLetter;

    private static int Compare(SortKey? a, SortKey? b)
    {
        if (ReferenceEquals(a, b)) return 0;
        if (a is null) return -1;
        if (b is null) return 1;
        for (var i = 0; i < Math.Min(a.Primary.Length, b.Primary.Length); i++)
        {
            var c = a.Primary[i].Class.CompareTo(b.Primary[i].Class);
            if (c == 0) c = string.CompareOrdinal(a.Primary[i].Weight, b.Primary[i].Weight);
            if (c != 0) return c;
        }
        if (a.Primary.Length != b.Primary.Length) return a.Primary.Length.CompareTo(b.Primary.Length);
        var s = CompareArrays(a.Secondary, b.Secondary);
        if (s != 0) return s;
        var t = CompareArrays(a.Tertiary, b.Tertiary);
        return t != 0 ? t : string.CompareOrdinal(a.Text, b.Text);
    }

    private static int CompareArrays(int[] a, int[] b)
    {
        for (var i = 0; i < Math.Min(a.Length, b.Length); i++)
        {
            if (a[i] != b[i]) return a[i].CompareTo(b[i]);
        }
        return a.Length.CompareTo(b.Length);
    }
}
