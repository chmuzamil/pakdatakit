using System.Text;
using System.Text.RegularExpressions;

namespace PakDataKit.Internal;

/// <summary>Input normalization shared by the modules (mirrors src/internal/normalize.ts).</summary>
internal static class Normalize
{
    // Whitespace, hyphens and dashes, dots, slashes and parentheses.
    private static readonly Regex Separators = Js.Rx("[" + Js.Ws + @"\-‐‑‒–—./()]");
    private static readonly Regex WhitespaceRun = Js.Rx("[" + Js.Ws + "]+");

    /// <summary>Converts Urdu (Extended Arabic-Indic) and Arabic-Indic digits to ASCII digits.</summary>
    internal static string ToAsciiDigits(string value)
    {
        StringBuilder? sb = null;
        for (var i = 0; i < value.Length; i++)
        {
            var c = value[i];
            char mapped;
            if (c is >= '۰' and <= '۹') mapped = (char)('0' + (c - '۰'));
            else if (c is >= '٠' and <= '٩') mapped = (char)('0' + (c - '٠'));
            else
            {
                sb?.Append(c);
                continue;
            }
            sb ??= new StringBuilder(value, 0, i, value.Length);
            sb.Append(mapped);
        }
        return sb?.ToString() ?? value;
    }

    /// <summary>Removes whitespace, hyphens and dashes, dots, slashes and parentheses.</summary>
    internal static string StripSeparators(string value) => Separators.Replace(value, "");

    /// <summary>Collapses internal whitespace and trims leading/trailing whitespace.</summary>
    internal static string Whitespace(string value) => WhitespaceRun.Replace(Js.Trim(value), " ");

    /// <summary>Lowercase with collapsed whitespace.</summary>
    internal static string Key(string value) => Js.ToLower(Whitespace(value));
}
