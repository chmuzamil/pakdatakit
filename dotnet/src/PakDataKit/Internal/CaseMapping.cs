using System.Globalization;
using System.Text;
using System.Text.Json;

namespace PakDataKit.Internal;

/// <summary>
/// <c>String.prototype.toUpperCase</c> and <c>toLowerCase</c>: full Unicode
/// case mapping (e.g. <c>ß</c> to <c>SS</c>) from a table generated from
/// JavaScript's ICU, so results do not depend on the machine's ICU or NLS
/// version. ASCII input, which is nearly all real input, takes a fast path.
/// </summary>
internal static class CaseMapping
{
    private sealed record Tables(
        Dictionary<int, string> Upper, Dictionary<int, string> Lower, int[] Cased, int[] CaseIgnorable);

    private static readonly Lazy<Tables> Lazy = new(Load);

    internal static string ToUpper(string value)
    {
        if (IsAscii(value)) return value.ToUpperInvariant();
        var map = Lazy.Value.Upper;
        var sb = new StringBuilder(value.Length);
        foreach (var rune in Js.CodePoints(value)) Append(sb, rune, map, upper: true);
        return sb.ToString();
    }

    internal static string ToLower(string value)
    {
        if (IsAscii(value)) return value.ToLowerInvariant();
        var tables = Lazy.Value;
        var runes = Js.CodePoints(value);
        var sb = new StringBuilder(value.Length);
        for (var i = 0; i < runes.Count; i++)
        {
            // Capital sigma becomes a final sigma at the end of a word.
            if (runes[i] == "Σ" && IsFinalSigma(runes, i, tables)) sb.Append('ς');
            else Append(sb, runes[i], tables.Lower, upper: false);
        }
        return sb.ToString();
    }

    private static void Append(StringBuilder sb, string rune, Dictionary<int, string> map, bool upper)
    {
        if (rune.Length == 1 && rune[0] < 0x80)
        {
            sb.Append(upper ? char.ToUpperInvariant(rune[0]) : char.ToLowerInvariant(rune[0]));
            return;
        }
        if (rune.Length == 1 && char.IsSurrogate(rune[0]))
        {
            sb.Append(rune); // unpaired surrogate
            return;
        }
        sb.Append(map.TryGetValue(char.ConvertToUtf32(rune, 0), out var mapped) ? mapped : rune);
    }

    private static bool IsFinalSigma(List<string> runes, int index, Tables tables)
    {
        var before = index - 1;
        while (before >= 0 && InRanges(tables.CaseIgnorable, runes[before])) before--;
        if (before < 0 || !InRanges(tables.Cased, runes[before])) return false;
        var after = index + 1;
        while (after < runes.Count && InRanges(tables.CaseIgnorable, runes[after])) after++;
        return after >= runes.Count || !InRanges(tables.Cased, runes[after]);
    }

    private static bool InRanges(int[] ranges, string rune)
    {
        if (rune.Length == 1 && char.IsSurrogate(rune[0])) return false;
        var code = char.ConvertToUtf32(rune, 0);
        var low = 0;
        var high = ranges.Length / 2 - 1;
        while (low <= high)
        {
            var mid = (low + high) / 2;
            if (code < ranges[mid * 2]) high = mid - 1;
            else if (code > ranges[mid * 2 + 1]) low = mid + 1;
            else return true;
        }
        return false;
    }

    private static bool IsAscii(string value)
    {
        foreach (var c in value)
        {
            if (c > 0x7f) return false;
        }
        return true;
    }

    private static Tables Load()
    {
        using var stream = typeof(CaseMapping).Assembly.GetManifestResourceStream("PakDataKit.Generated.unicode-case.json")
            ?? throw new InvalidOperationException("Missing embedded Unicode case data");
        using var doc = JsonDocument.Parse(stream);
        var root = doc.RootElement;
        return new Tables(
            Map(root.GetProperty("upper")), Map(root.GetProperty("lower")),
            Ints(root.GetProperty("cased")), Ints(root.GetProperty("caseIgnorable")));
    }

    private static Dictionary<int, string> Map(JsonElement element)
    {
        var map = new Dictionary<int, string>();
        foreach (var entry in element.EnumerateObject())
        {
            var sb = new StringBuilder();
            foreach (var point in entry.Value.GetString()!.Split(' '))
                sb.Append(char.ConvertFromUtf32(int.Parse(point, NumberStyles.HexNumber, CultureInfo.InvariantCulture)));
            map[int.Parse(entry.Name, NumberStyles.HexNumber, CultureInfo.InvariantCulture)] = sb.ToString();
        }
        return map;
    }

    private static int[] Ints(JsonElement element) => element.EnumerateArray().Select(v => v.GetInt32()).ToArray();
}
