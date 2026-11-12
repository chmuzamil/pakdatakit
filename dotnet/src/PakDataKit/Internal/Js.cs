using System.Globalization;
using System.Numerics;
using System.Text;
using System.Text.RegularExpressions;

namespace PakDataKit.Internal;

/// <summary>
/// Helpers that reproduce JavaScript semantics, so results match the npm
/// package exactly: whitespace classes, <c>Math.round</c>, number-to-string
/// conversion, <c>toFixed</c> rounding and <c>localeCompare</c> ordering.
/// </summary>
internal static class Js
{
    /// <summary>Characters matched by JavaScript's <c>\s</c> and removed by <c>trim()</c>.</summary>
    internal const string WsChars =
        "\t\n\u000b\u000c\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

    /// <summary>Regex character-class body equivalent to JavaScript's <c>\s</c>.</summary>
    internal const string Ws =
        @"\t\n\x0b\x0c\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

    internal const double MaxSafeInteger = 9007199254740991d;

    private static readonly char[] WsArray = WsChars.ToCharArray();

    /// <summary>
    /// Creates a culture-invariant regex with a match timeout. Patterns use
    /// explicit classes (<c>[0-9]</c>, <see cref="Ws"/>) and <c>\z</c>, because
    /// .NET's <c>\d</c>, <c>\s</c>, <c>\w</c> and <c>$</c> differ from JavaScript's.
    /// </summary>
    internal static Regex Rx(string pattern) =>
        new(pattern, RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));

    /// <summary>Turns <c>abc</c> into <c>[Aa][Bb][Cc]</c>: ASCII-only case-insensitivity.</summary>
    internal static string Ci(string letters)
    {
        var sb = new StringBuilder();
        foreach (var c in letters)
        {
            if (c is >= 'a' and <= 'z') sb.Append('[').Append(char.ToUpperInvariant(c)).Append(c).Append(']');
            else sb.Append(c);
        }
        return sb.ToString();
    }

    /// <summary><c>String.prototype.trim</c>.</summary>
    internal static string Trim(string value) => value.Trim(WsArray);

    /// <summary><c>String.prototype.trimEnd</c>.</summary>
    internal static string TrimEnd(string value) => value.TrimEnd(WsArray);

    /// <summary><c>String.prototype.toUpperCase</c>.</summary>
    internal static string ToUpper(string value) => CaseMapping.ToUpper(value);

    /// <summary><c>String.prototype.toLowerCase</c>.</summary>
    internal static string ToLower(string value) => CaseMapping.ToLower(value);

    /// <summary><c>Number.isSafeInteger</c>.</summary>
    internal static bool IsSafeInteger(double value) =>
        double.IsFinite(value) && Math.Floor(value) == value && Math.Abs(value) <= MaxSafeInteger;

    /// <summary><c>Math.round</c>: halves round towards positive infinity.</summary>
    internal static double Round(double value)
    {
        var floor = Math.Floor(value);
        return value - floor >= 0.5 ? floor + 1 : floor;
    }

    /// <summary>Floor division, like <c>Math.floor(a / b)</c> on integers.</summary>
    internal static long FloorDiv(long a, long b)
    {
        var q = a / b;
        return (a % b != 0 && (a < 0) != (b < 0)) ? q - 1 : q;
    }

    /// <summary>
    /// Shortest round-trip decimal digits of a positive finite double, and the
    /// position <c>n</c> of the decimal point (value = 0.digits × 10^n).
    /// </summary>
    private static (string Digits, int N) ShortestDigits(double positive)
    {
        // "R" gives the shortest string that round-trips.
        var text = positive.ToString("R", CultureInfo.InvariantCulture);
        var exponent = 0;
        var e = text.IndexOfAny(['E', 'e']);
        if (e >= 0)
        {
            exponent = int.Parse(text[(e + 1)..], NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture);
            text = text[..e];
        }
        var point = text.IndexOf('.');
        var intPart = point < 0 ? text : text[..point];
        var fracPart = point < 0 ? "" : text[(point + 1)..];
        var digits = intPart + fracPart;
        var n = intPart.Length + exponent;
        var leading = 0;
        while (leading < digits.Length - 1 && digits[leading] == '0') leading++;
        digits = digits[leading..];
        n -= leading;
        digits = digits.TrimEnd('0');
        if (digits.Length == 0) digits = "0";
        return (digits, n);
    }

    /// <summary><c>String(number)</c>.</summary>
    internal static string NumberToString(double value)
    {
        if (double.IsNaN(value)) return "NaN";
        if (double.IsInfinity(value)) return value > 0 ? "Infinity" : "-Infinity";
        if (value == 0) return "0";
        var sign = value < 0 ? "-" : "";
        var (digits, n) = ShortestDigits(Math.Abs(value));
        var k = digits.Length;
        string text;
        if (k <= n && n <= 21) text = digits + new string('0', n - k);
        else if (0 < n && n <= 21) text = digits[..n] + "." + digits[n..];
        else if (-6 < n && n <= 0) text = "0." + new string('0', -n) + digits;
        else
        {
            var e = n - 1;
            var exp = (e >= 0 ? "+" : "-") + Math.Abs(e).ToString(CultureInfo.InvariantCulture);
            text = k == 1 ? digits + "e" + exp : digits[..1] + "." + digits[1..] + "e" + exp;
        }
        return sign + text;
    }

    /// <summary>
    /// The integer value of a non-negative whole double, written from its
    /// shortest round-trip digits (as <c>Intl.NumberFormat</c> does) with
    /// thousands separators.
    /// </summary>
    internal static string GroupInteger(double whole)
    {
        if (whole == 0) return "0";
        var (digits, n) = ShortestDigits(whole);
        var integer = n >= digits.Length ? digits + new string('0', n - digits.Length) : digits[..Math.Max(n, 0)];
        if (integer.Length == 0) integer = "0";
        var sb = new StringBuilder();
        for (var i = 0; i < integer.Length; i++)
        {
            if (i > 0 && (integer.Length - i) % 3 == 0) sb.Append(',');
            sb.Append(integer[i]);
        }
        return sb.ToString();
    }

    /// <summary><c>Number.prototype.toFixed</c>: rounds the exact binary value half up.</summary>
    internal static string ToFixed(double value, int places)
    {
        if (!double.IsFinite(value) || Math.Abs(value) >= 1e21) return NumberToString(value);
        if (value == 0) return places > 0 ? "0." + new string('0', places) : "0";

        var bits = BitConverter.DoubleToInt64Bits(Math.Abs(value));
        var exponentBits = (int)((bits >> 52) & 0x7FF);
        var mantissa = bits & 0xFFFFFFFFFFFFFL;
        int exponent;
        if (exponentBits == 0) exponent = -1074;
        else
        {
            mantissa |= 1L << 52;
            exponent = exponentBits - 1075;
        }

        var scaled = new BigInteger(mantissa) * BigInteger.Pow(10, places);
        BigInteger rounded;
        if (exponent >= 0) rounded = scaled << exponent;
        else
        {
            var divisor = BigInteger.One << -exponent;
            rounded = BigInteger.DivRem(scaled, divisor, out var remainder);
            if (remainder * 2 >= divisor) rounded += 1;
        }

        var text = rounded.ToString(CultureInfo.InvariantCulture);
        if (places > 0)
        {
            if (text.Length <= places) text = new string('0', places - text.Length + 1) + text;
            text = text[..^places] + "." + text[^places..];
        }
        return (value < 0 ? "-" : "") + text;
    }

    /// <summary>Splits a string as <c>[...string]</c> does: by code point, lone surrogates alone.</summary>
    internal static List<string> CodePoints(string text)
    {
        var result = new List<string>(text.Length);
        for (var i = 0; i < text.Length; i++)
        {
            if (char.IsHighSurrogate(text[i]) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]))
            {
                result.Add(text.Substring(i, 2));
                i++;
            }
            else result.Add(text[i].ToString());
        }
        return result;
    }

    /// <summary>Number of code points, as <c>[...string].length</c>.</summary>
    internal static int CodePointCount(string text)
    {
        var count = 0;
        for (var i = 0; i < text.Length; i++)
        {
            if (char.IsHighSurrogate(text[i]) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1])) i++;
            count++;
        }
        return count;
    }

    /// <summary><c>new TextEncoder().encode(text)</c>: lone surrogates become U+FFFD.</summary>
    internal static byte[] Utf8Bytes(string text) => new UTF8Encoding(false, false).GetBytes(text);

    /// <summary><c>values.sort((a, b) =&gt; a.localeCompare(b))</c>, as a new list.</summary>
    internal static List<string> LocaleSorted(IEnumerable<string> values) =>
        values.Select(v => (Key: Collation.Key(v), Value: v))
            .OrderBy(p => p.Key, Collation.Comparer)
            .Select(p => p.Value)
            .ToList();
}
