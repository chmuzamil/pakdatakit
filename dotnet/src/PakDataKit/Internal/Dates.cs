using System.Globalization;

namespace PakDataKit.Internal;

/// <summary>Calendar dates shared by the sales tax and income tax modules (mirrors src/internal/date.ts).</summary>
internal static class Dates
{
    private static readonly SafeRegex IsoDatePattern = Js.Rx("^([0-9]{4})-([0-9]{2})-([0-9]{2})\\z");

    /// <summary>Today's local date.</summary>
    internal static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    /// <summary><c>YYYY-MM-DD</c> for a date.</summary>
    internal static string Format(DateOnly date) =>
        $"{date.Year:D4}-{date.Month:D2}-{date.Day:D2}";

    /// <summary><c>YYYY-MM-DD</c> for a valid calendar date, otherwise <c>null</c>.</summary>
    internal static string? IsoDate(string input)
    {
        var match = IsoDatePattern.Match(Js.Trim(input));
        if (!match.Success) return null;
        var y = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var m = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        var d = int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture);
        var leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        int[] days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) return null;
        return match.Value;
    }
}
