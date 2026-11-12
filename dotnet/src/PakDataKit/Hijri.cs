using System.Globalization;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Islamic (Hijri) date components.</summary>
/// <param name="Year">Hijri year.</param>
/// <param name="Month">Month, 1 (Muharram) to 12 (Dhu al-Hijjah).</param>
/// <param name="Day">Day of the month, 1 to 30.</param>
public sealed record HijriDate(int Year, int Month, int Day);

/// <summary>
/// Tabular Islamic (Hijri) calendar conversions. This is the arithmetic
/// "islamic-civil" calendar, the same algorithm as the npm package; it does
/// not use <see cref="System.Globalization.HijriCalendar"/> or the machine's
/// culture settings.
/// </summary>
public static class Hijri
{
    private static readonly string[] Months =
    [
        "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani",
        "Rajab", "Shaaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah",
    ];

    /// <summary>
    /// Converts a Gregorian date to a tabular Hijri date. Actual dates in
    /// Pakistan follow moon sighting and can differ by a day or two; pass
    /// <paramref name="offset"/> (whole days) to adjust.
    /// </summary>
    /// <param name="date">Gregorian date.</param>
    /// <param name="offset">Days to add before converting.</param>
    /// <returns>The Hijri date.</returns>
    public static HijriDate ToHijri(DateOnly date, int offset = 0) =>
        JdnToHijri(GregorianToJdn(date.Year, date.Month, date.Day) + offset);

    /// <summary>Converts a Hijri date to a Gregorian date.</summary>
    /// <param name="hijri">Hijri date.</param>
    /// <param name="offset">Days subtracted after converting, mirroring <see cref="ToHijri"/>.</param>
    /// <returns>The Gregorian date.</returns>
    /// <exception cref="ArgumentException">The Hijri date is out of range.</exception>
    public static DateOnly FromHijri(HijriDate hijri, int offset = 0)
    {
        ArgumentNullException.ThrowIfNull(hijri);
        if (hijri.Year < 1 || hijri.Month < 1 || hijri.Month > 12 || hijri.Day < 1 || hijri.Day > 30)
            throw new ArgumentException(
                $"Invalid Hijri date: {hijri.Year}-{hijri.Month}-{hijri.Day}", nameof(hijri));
        var (y, m, d) = JdnToGregorian(HijriToJdn(hijri.Year, hijri.Month, hijri.Day) - offset);
        if (y < 1 || y > 9999)
            throw new ArgumentException("The Gregorian date is outside the supported range", nameof(hijri));
        return new DateOnly((int)y, (int)m, (int)d);
    }

    /// <summary>Formats a Gregorian date as a Hijri string, e.g. <c>14 Ramadan 1447</c>.</summary>
    /// <param name="date">Gregorian date.</param>
    /// <param name="offset">Days to add before converting.</param>
    /// <returns>Day, month name and year.</returns>
    public static string Format(DateOnly date, int offset = 0)
    {
        var hijri = ToHijri(date, offset);
        return string.Create(
            CultureInfo.InvariantCulture, $"{hijri.Day} {Months[hijri.Month - 1]} {hijri.Year}");
    }

    /// <summary>Returns the English name of a Hijri month.</summary>
    /// <param name="month">Month number, 1 to 12.</param>
    /// <returns>The name, or <c>null</c> if the number is out of range.</returns>
    public static string? GetMonthName(int month) => month is < 1 or > 12 ? null : Months[month - 1];

    /// <summary>Returns whether a Gregorian date falls in Ramadan.</summary>
    /// <param name="date">Gregorian date.</param>
    /// <param name="offset">Days to add before converting.</param>
    /// <returns><c>true</c> in Ramadan.</returns>
    public static bool IsRamadan(DateOnly date, int offset = 0) => ToHijri(date, offset).Month == 9;

    internal static long GregorianToJdn(long year, long month, long day)
    {
        var a = Js.FloorDiv(14 - month, 12);
        var y = year + 4800 - a;
        var m = month + 12 * a - 3;
        return day + Js.FloorDiv(153 * m + 2, 5) + 365 * y + Js.FloorDiv(y, 4) - Js.FloorDiv(y, 100)
            + Js.FloorDiv(y, 400) - 32045;
    }

    internal static (long Year, long Month, long Day) JdnToGregorian(long jdn)
    {
        var a = jdn + 32044;
        var b = Js.FloorDiv(4 * a + 3, 146097);
        var c = a - Js.FloorDiv(146097 * b, 4);
        var d = Js.FloorDiv(4 * c + 3, 1461);
        var e = c - Js.FloorDiv(1461 * d, 4);
        var m = Js.FloorDiv(5 * e + 2, 153);
        return (
            100 * b + d - 4800 + Js.FloorDiv(m, 10),
            m + 3 - 12 * Js.FloorDiv(m, 10),
            e - Js.FloorDiv(153 * m + 2, 5) + 1);
    }

    internal static HijriDate JdnToHijri(long jdn)
    {
        var l = jdn - 1948440 + 10632;
        var n = Js.FloorDiv(l - 1, 10631);
        var l2 = l - 10631 * n + 354;
        var j = Js.FloorDiv(10985 - l2, 5316) * Js.FloorDiv(50 * l2, 17719)
            + Js.FloorDiv(l2, 5670) * Js.FloorDiv(43 * l2, 15238);
        var l3 = l2 - Js.FloorDiv(30 - j, 15) * Js.FloorDiv(17719 * j, 50)
            - Js.FloorDiv(j, 16) * Js.FloorDiv(15238 * j, 43) + 29;
        var month = Js.FloorDiv(24 * l3, 709);
        var day = l3 - Js.FloorDiv(709 * month, 24);
        var year = 30 * n + j - 30;
        return new HijriDate((int)year, (int)month, (int)day);
    }

    internal static long HijriToJdn(long year, long month, long day) =>
        Js.FloorDiv(11 * year + 3, 30) + 354 * year + 30 * month - Js.FloorDiv(month - 1, 2) + day + 1948440
        - 385;
}
