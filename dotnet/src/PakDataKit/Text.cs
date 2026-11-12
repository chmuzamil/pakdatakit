using System.Text;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Text normalization, Roman Urdu spelling and Urdu digits.</summary>
public static class Text
{
    private const string UrduDigits = "۰۱۲۳۴۵۶۷۸۹";
    private const string WordChar = "[A-Za-z0-9_]";

    // Common Roman Urdu spelling normalizations (informal to preferred). Only
    // unambiguous variants are listed.
    private static readonly (Regex Pattern, string Replacement)[] RomanUrduReplacements = new[]
    {
        ("kia", "kya"),
        ("ker", "kar"),
        ("kr", "kar"),
        ("hy", "hai"),
        ("mujhay", "mujhe"),
        ("ap", "aap"),
        ("shukria", "shukriya"),
        ("nhi", "nahi"),
        ("assalamu alaikum", "assalamualaikum"),
        ("assalam o alaikum", "assalamualaikum"),
    }.Select(p => (Js.Rx($"(?<!{WordChar}){Js.Ci(p.Item1)}(?!{WordChar})"), p.Item2)).ToArray();

    private static readonly Regex AsciiDigit = Js.Rx("[0-9]");

    /// <summary>Trims, collapses whitespace and applies Unicode NFC.</summary>
    /// <param name="text">Text to normalize.</param>
    /// <returns>The normalized text.</returns>
    public static string Normalize(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        return Internal.Normalize.Whitespace(Nfc(text));
    }

    /// <summary>
    /// Normalizes informal Roman Urdu spellings (<c>kia</c> to <c>kya</c>).
    /// Also applies <see cref="Normalize"/> and converts Urdu and Arabic-Indic
    /// digits to English. A capitalized word keeps its capital; all-caps words
    /// are left alone.
    /// </summary>
    /// <param name="text">Text to normalize.</param>
    /// <returns>The normalized text.</returns>
    public static string NormalizeRomanUrdu(string text)
    {
        var result = Normalize(ToEnglishDigits(text));
        foreach (var (pattern, replacement) in RomanUrduReplacements)
            result = pattern.Replace(result, m => MatchCase(m.Value, replacement));
        return result;
    }

    /// <summary>Converts English and Arabic-Indic digits to Urdu digits (۰–۹).</summary>
    /// <param name="text">Text to convert.</param>
    /// <returns>The text with Urdu digits.</returns>
    public static string ToUrduDigits(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        return AsciiDigit.Replace(
            Internal.Normalize.ToAsciiDigits(text), m => UrduDigits[m.Value[0] - '0'].ToString());
    }

    /// <summary>Converts Urdu and Arabic-Indic digits to English digits (0–9).</summary>
    /// <param name="text">Text to convert.</param>
    /// <returns>The text with English digits.</returns>
    public static string ToEnglishDigits(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        return Internal.Normalize.ToAsciiDigits(text);
    }

    private static string MatchCase(string original, string replacement)
    {
        if (original.Length > 1 && original == Js.ToUpper(original)) return original;
        var first = original[..1];
        return first != Js.ToLower(first) ? Js.ToUpper(replacement[..1]) + replacement[1..] : replacement;
    }

    /// <summary><c>String.prototype.normalize('NFC')</c>, which leaves unpaired surrogates alone.</summary>
    private static string Nfc(string text)
    {
        try
        {
            return text.Normalize(NormalizationForm.FormC);
        }
        catch (ArgumentException)
        {
            // .NET rejects unpaired surrogates; normalize the text around them.
            var sb = new StringBuilder();
            var start = 0;
            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];
                var paired = char.IsHighSurrogate(c) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]);
                if (paired)
                {
                    i++;
                    continue;
                }
                if (!char.IsSurrogate(c)) continue;
                sb.Append(text[start..i].Normalize(NormalizationForm.FormC)).Append(c);
                start = i + 1;
            }
            return sb.Append(text[start..].Normalize(NormalizationForm.FormC)).ToString();
        }
    }
}
