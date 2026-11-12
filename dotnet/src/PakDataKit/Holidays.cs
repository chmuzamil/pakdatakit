using System.Globalization;
using System.Text.RegularExpressions;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Identifier of a Pakistani federal public holiday.</summary>
public enum HolidayId
{
    /// <summary>Eid ul Fitr.</summary>
    EidUlFitr,

    /// <summary>Eid ul Adha.</summary>
    EidUlAdha,

    /// <summary>Ashura (9 and 10 Muharram).</summary>
    Ashura,

    /// <summary>Eid Milad un Nabi.</summary>
    EidMiladUnNabi,

    /// <summary>Kashmir Solidarity Day, 5 February.</summary>
    KashmirDay,

    /// <summary>Pakistan Day, 23 March.</summary>
    PakistanDay,

    /// <summary>Labour Day, 1 May.</summary>
    LabourDay,

    /// <summary>Youm-e-Takbeer, 28 May (from 2024).</summary>
    YoumETakbeer,

    /// <summary>Independence Day, 14 August.</summary>
    IndependenceDay,

    /// <summary>Iqbal Day, 9 November.</summary>
    IqbalDay,

    /// <summary>Quaid-e-Azam Day and Christmas, 25 December.</summary>
    QuaidEAzamDay,

    /// <summary>26 December, for Christian employees only.</summary>
    DayAfterChristmas,
}

/// <summary>Kind of public holiday.</summary>
public enum HolidayType
{
    /// <summary>National holiday.</summary>
    National,

    /// <summary>Religious holiday.</summary>
    Religious,
}

/// <summary>A public holiday on a specific date.</summary>
/// <param name="Id">Which holiday this is.</param>
/// <param name="Name">English name.</param>
/// <param name="Date">Date as <c>YYYY-MM-DD</c>.</param>
/// <param name="Type">National or religious.</param>
/// <param name="Estimated">
/// <c>true</c> when an Islamic holiday's date is calculated from the tabular
/// Hijri calendar because the observed dates are not in the dataset yet.
/// </param>
/// <param name="ChristiansOnly"><c>true</c> for holidays that apply to Christian employees only; otherwise <c>null</c>.</param>
/// <param name="Source">Source of an observed Islamic holiday date, when known.</param>
public sealed record Holiday(
    HolidayId Id, string Name, string Date, HolidayType Type, bool Estimated, bool? ChristiansOnly = null,
    string? Source = null);

/// <summary>Options for <see cref="Holidays"/>.</summary>
public sealed record HolidayOptions
{
    /// <summary>Include 26 December, a holiday for Christian employees only. Defaults to <c>false</c>.</summary>
    public bool IncludeChristianHolidays { get; init; }

    /// <summary>
    /// Observed or announced dates (<c>YYYY-MM-DD</c>) for Islamic holidays,
    /// used instead of the dataset or estimate. An empty list removes that
    /// holiday for the year. Only the four Islamic holidays are used.
    /// </summary>
    public IReadOnlyDictionary<HolidayId, IReadOnlyList<string>>? Announced { get; init; }

    /// <summary>Day offset applied to estimated Islamic dates. Defaults to <c>0</c>.</summary>
    public int HijriOffset { get; init; }
}

/// <summary>Pakistan's federal public holidays.</summary>
public static class Holidays
{
    private static readonly SafeRegex IsoDate = Js.Rx("^[0-9]{4}-[0-9]{2}-[0-9]{2}\\z");

    private static readonly (HolidayId Id, string Name, int Month, int Day, HolidayType Type,
        Func<int, bool>? AppliesIn, bool ChristiansOnly)[] Fixed =
        [
            (HolidayId.KashmirDay, "Kashmir Solidarity Day", 2, 5, HolidayType.National, null, false),
            (HolidayId.PakistanDay, "Pakistan Day", 3, 23, HolidayType.National, null, false),
            (HolidayId.LabourDay, "Labour Day", 5, 1, HolidayType.National, null, false),
            // A one-off holiday in 2024, on the annual list since 2025.
            (HolidayId.YoumETakbeer, "Youm-e-Takbeer", 5, 28, HolidayType.National, y => y >= 2024, false),
            (HolidayId.IndependenceDay, "Independence Day", 8, 14, HolidayType.National, null, false),
            // Dropped from 2015 to 2021, restored in 2022.
            (HolidayId.IqbalDay, "Iqbal Day", 11, 9, HolidayType.National, y => y <= 2014 || y >= 2022, false),
            (HolidayId.QuaidEAzamDay, "Quaid-e-Azam Day / Christmas", 12, 25, HolidayType.National, null, false),
            (HolidayId.DayAfterChristmas, "Day after Christmas", 12, 26, HolidayType.Religious, null, true),
        ];

    // Id, dataset key, name, Hijri month, Hijri day, usual number of days.
    private static readonly (HolidayId Id, string Key, string Name, int Month, int Day, int Days)[] Islamic =
    [
        (HolidayId.EidUlFitr, "eidUlFitr", "Eid ul Fitr", 10, 1, 3),
        (HolidayId.EidUlAdha, "eidUlAdha", "Eid ul Adha", 12, 10, 3),
        (HolidayId.Ashura, "ashura", "Ashura", 1, 9, 2),
        (HolidayId.EidMiladUnNabi, "eidMiladUnNabi", "Eid Milad un Nabi", 3, 12, 1),
    ];

    /// <summary>
    /// Lists Pakistan's federal public holidays for a year, sorted by date.
    /// Islamic holidays use the dates observed after moon sighting (2020
    /// onwards). For years not in the dataset they are estimated from the
    /// tabular Hijri calendar and marked <see cref="Holiday.Estimated"/>; pass
    /// <see cref="HolidayOptions.Announced"/> to use official dates instead.
    /// </summary>
    /// <param name="year">Gregorian year, 1948 to 9999.</param>
    /// <param name="options">Christian holidays, announced dates and estimate offset.</param>
    /// <returns>Holidays in date order.</returns>
    /// <exception cref="ArgumentException">The year is out of range, or an announced date is not <c>YYYY-MM-DD</c>.</exception>
    public static IReadOnlyList<Holiday> GetHolidays(int year, HolidayOptions? options = null)
    {
        if (year is < 1948 or > 9999)
            throw new ArgumentException("Expected a year from 1948 to 9999", nameof(year));
        options ??= new HolidayOptions();
        var holidays = new List<Holiday>();

        foreach (var f in Fixed)
        {
            if (f.AppliesIn is not null && !f.AppliesIn(year)) continue;
            if (f.ChristiansOnly && !options.IncludeChristianHolidays) continue;
            holidays.Add(new Holiday(
                f.Id, f.Name, Iso(year, f.Month, f.Day), f.Type, false, f.ChristiansOnly ? true : null));
        }

        var observed = Data.Holidays.GetValueOrDefault(year.ToString(CultureInfo.InvariantCulture));
        foreach (var h in Islamic)
        {
            IReadOnlyList<string> dates;
            var estimated = false;
            string? source = null;
            if (options.Announced is not null && options.Announced.TryGetValue(h.Id, out var announced)
                && announced is not null)
            {
                foreach (var value in announced) AssertIsoDate(value);
                dates = announced;
            }
            else if (observed is not null && observed.TryGetValue(h.Key, out var recorded))
            {
                dates = recorded.Dates;
                source = recorded.Source;
            }
            else
            {
                dates = Estimate(h.Month, h.Day, h.Days, year, options.HijriOffset);
                estimated = true;
            }

            foreach (var date in dates)
            {
                holidays.Add(new Holiday(
                    h.Id, h.Name, date, HolidayType.Religious, estimated, null,
                    string.IsNullOrEmpty(source) ? null : source));
            }
        }

        // OrderBy is a stable sort, like Array.prototype.sort.
        return holidays.OrderBy(h => h.Date, StringComparer.Ordinal).ToArray();
    }

    /// <summary>Returns the public holidays that fall on a date.</summary>
    /// <param name="date">The date.</param>
    /// <param name="options">Same options as <see cref="GetHolidays"/>.</param>
    /// <returns>Holidays on that date; empty if it is not a public holiday.</returns>
    public static IReadOnlyList<Holiday> GetHolidaysOn(DateOnly date, HolidayOptions? options = null) =>
        GetHolidaysOn(Iso(date.Year, date.Month, date.Day), options);

    /// <summary>Returns the public holidays that fall on a date.</summary>
    /// <param name="date">Date as <c>YYYY-MM-DD</c>.</param>
    /// <param name="options">Same options as <see cref="GetHolidays"/>.</param>
    /// <returns>
    /// Holidays on that date; empty if it is not a public holiday, or if the
    /// text is not a usable date (see <see cref="TryGetHolidaysOn"/>).
    /// </returns>
    /// <exception cref="ArgumentException">An announced date in <paramref name="options"/> is not <c>YYYY-MM-DD</c>.</exception>
    public static IReadOnlyList<Holiday> GetHolidaysOn(string? date, HolidayOptions? options = null) =>
        TryGetHolidaysOn(date, out var holidays, options) ? holidays : [];

    /// <summary>
    /// Returns the public holidays that fall on a date, and reports whether
    /// the date text could be used. The npm package throws for such text;
    /// this returns <c>false</c>.
    /// </summary>
    /// <param name="date">Date as <c>YYYY-MM-DD</c>.</param>
    /// <param name="holidays">Holidays on that date; empty if there are none or the text is not usable.</param>
    /// <param name="options">Same options as <see cref="GetHolidays"/>.</param>
    /// <returns><c>false</c> if the text is not <c>YYYY-MM-DD</c> or its year is outside 1948 to 9999.</returns>
    /// <exception cref="ArgumentException">An announced date in <paramref name="options"/> is not <c>YYYY-MM-DD</c>.</exception>
    public static bool TryGetHolidaysOn(
        string? date, out IReadOnlyList<Holiday> holidays, HolidayOptions? options = null)
    {
        holidays = [];
        if (date is null || !IsoDate.IsMatch(date)) return false;
        var year = int.Parse(date.AsSpan(0, 4), NumberStyles.None, CultureInfo.InvariantCulture);
        if (year is < 1948 or > 9999) return false;
        holidays = GetHolidays(year, options).Where(h => h.Date == date).ToArray();
        return true;
    }

    /// <summary>Returns whether a date is a Pakistani federal public holiday.</summary>
    /// <param name="date">The date.</param>
    /// <param name="options">Same options as <see cref="GetHolidays"/>.</param>
    /// <returns><c>true</c> on a public holiday.</returns>
    public static bool IsHoliday(DateOnly date, HolidayOptions? options = null) =>
        GetHolidaysOn(date, options).Count > 0;

    /// <summary>Returns whether a date is a Pakistani federal public holiday.</summary>
    /// <param name="date">Date as <c>YYYY-MM-DD</c>.</param>
    /// <param name="options">Same options as <see cref="GetHolidays"/>.</param>
    /// <returns><c>true</c> on a public holiday; <c>false</c> otherwise, including for text that is not a usable date.</returns>
    /// <exception cref="ArgumentException">An announced date in <paramref name="options"/> is not <c>YYYY-MM-DD</c>.</exception>
    public static bool IsHoliday(string? date, HolidayOptions? options = null) =>
        GetHolidaysOn(date, options).Count > 0;

    private static string Iso(long year, long month, long day) => string.Create(
        CultureInfo.InvariantCulture, $"{year:D4}-{month:D2}-{day:D2}");

    private static void AssertIsoDate(string? value)
    {
        if (value is null || !IsoDate.IsMatch(value))
            throw new ArgumentException($"Expected a YYYY-MM-DD date, received {value}");
    }

    /// <summary>Estimates the dates of an Islamic holiday in a Gregorian year.</summary>
    private static List<string> Estimate(int hijriMonth, int hijriDay, int days, int year, int offset)
    {
        var firstHijriYear = Hijri.JdnToHijri(Hijri.GregorianToJdn(year, 1, 1)).Year;
        var dates = new List<string>();
        for (var hijriYear = firstHijriYear; hijriYear <= firstHijriYear + 1; hijriYear++)
        {
            var start = Hijri.HijriToJdn(hijriYear, hijriMonth, hijriDay) - offset;
            for (var i = 0; i < days; i++)
            {
                var (y, m, d) = Hijri.JdnToGregorian(start + i);
                if (y == year) dates.Add(Iso(y, m, d));
            }
        }
        return dates;
    }
}
