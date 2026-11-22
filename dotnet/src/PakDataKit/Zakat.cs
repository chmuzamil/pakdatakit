using System.Globalization;
using System.Numerics;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>A document behind a Zakat year's nisab: its number, date and URL.</summary>
/// <param name="Number">The document's number, as printed.</param>
/// <param name="Date">Its date (<c>YYYY-MM-DD</c>).</param>
/// <param name="Url">The official copy.</param>
public sealed record ZakatDocument(string Number, string Date, string Url);

/// <summary>One Zakat year's nisab for deduction at source, as notified.</summary>
/// <param name="ZakatYear">The Hijri year of the valuation date (1 Ramazan), e.g. <c>1447</c>.</param>
/// <param name="Label">The year as the Ministry's notification writes it, e.g. <c>1446-47</c>.</param>
/// <param name="Nisab">Nisab in rupees: accounts with a lower balance are not deducted.</param>
/// <param name="ValuationDateHijri">The valuation (deduction) date in the Hijri calendar, e.g. <c>1 Ramazan 1447 AH</c>.</param>
/// <param name="ExpectedValuationDates">
/// The two Gregorian dates the notification says 1 Ramazan is likely to fall
/// on (<c>YYYY-MM-DD</c>). The day itself depends on the moon sighting.
/// </param>
/// <param name="BankHolidayDate">
/// The bank holiday for the deduction, when SBP's circular names a Gregorian
/// date (<c>YYYY-MM-DD</c>); otherwise <c>null</c>.
/// </param>
/// <param name="Notification">The Ministry of Poverty Alleviation &amp; Social Safety notification.</param>
/// <param name="SbpCircular">The SBP BPRD circular letter that conveys it to banks.</param>
/// <param name="Source">The notification and SBP circular, as a <see cref="DataSource"/> (dataset <c>zakat-nisab</c>).</param>
public sealed record ZakatNisab(
    int ZakatYear,
    string Label,
    long Nisab,
    string ValuationDateHijri,
    IReadOnlyList<string> ExpectedValuationDates,
    string? BankHolidayDate,
    ZakatDocument Notification,
    ZakatDocument SbpCircular,
    DataSource Source);

/// <summary>
/// Which Zakat year: by its Hijri year (<see cref="ZakatYear"/> or
/// <see cref="Label"/>) or by a date (<see cref="Date"/> or
/// <see cref="OnDate"/>). Give one of the four.
/// </summary>
public sealed record ZakatYearQuery
{
    /// <summary>The Hijri year, e.g. <c>1447</c>. Takes precedence over a date.</summary>
    public int? ZakatYear { get; init; }

    /// <summary>
    /// The year as text: <c>"1447"</c>, or as the notification writes it,
    /// <c>"1446-47"</c>. Use this or <see cref="ZakatYear"/>, not both. Takes
    /// precedence over a date.
    /// </summary>
    public string? Label { get; init; }

    /// <summary>A date in the Zakat year as <c>YYYY-MM-DD</c>. Use this or <see cref="OnDate"/>, not both.</summary>
    public string? Date { get; init; }

    /// <summary>A date in the Zakat year as a <see cref="DateOnly"/>. Use this or <see cref="Date"/>, not both.</summary>
    public DateOnly? OnDate { get; init; }
}

/// <summary>Why <see cref="Zakat.CalculateDeduction"/> deducts nothing.</summary>
public enum ZakatExemption
{
    /// <summary>The holder filed the exemption declaration (Form CZ-50).</summary>
    Exempt,

    /// <summary>The balance is below the year's nisab.</summary>
    BelowNisab,
}

/// <summary>Result of <see cref="PakDataKit.Zakat.CalculateDeduction"/>.</summary>
/// <param name="ZakatYear">The Hijri Zakat year used.</param>
/// <param name="Nisab">That year's nisab in rupees.</param>
/// <param name="Balance">The balance in rupees (rounded half up to the paisa).</param>
/// <param name="Deductible">Whether Zakat is deducted from this balance.</param>
/// <param name="Reason">Why not, when <paramref name="Deductible"/> is <c>false</c>; otherwise <c>null</c>.</param>
/// <param name="Rate">Percent of the whole balance: 2.5.</param>
/// <param name="Zakat">The amount deducted, rounded half up to the paisa; <c>0</c> if not deductible.</param>
/// <param name="Source">The year's notification and SBP circular (dataset <c>zakat-nisab</c>).</param>
public sealed record ZakatDeduction(
    int ZakatYear,
    long Nisab,
    double Balance,
    bool Deductible,
    ZakatExemption? Reason,
    double Rate,
    double Zakat,
    DataSource Source);

/// <summary>
/// Zakat deducted at source in Pakistan: the nisab notified each year by the
/// Administrator-General Zakat and conveyed to banks by SBP (Zakat years 1433
/// to 1447 AH, 2012-2026), and the deduction from one account.
/// </summary>
/// <remarks>
/// This is the nisab for deduction from savings and similar bank accounts
/// under the Zakat and Ushr Ordinance 1980, not a religious ruling on
/// personal Zakat.
/// </remarks>
public static class Zakat
{
    /// <summary>Days after the last notified year's first possible start that it still certainly covers.</summary>
    private const int LunarYearDays = 353;

    private static readonly SafeRegex FourDigits = Js.Rx("^[0-9]{4}\\z");

    /// <summary>
    /// The nisab for compulsory Zakat deduction at source for a Zakat year,
    /// given by its Hijri year or a date in it.
    /// </summary>
    /// <remarks>
    /// A Zakat year starts on 1 Ramazan; for a date on the first of the two
    /// days the notification gives for it, the year is unknown and the result
    /// is <c>null</c>, as it is for a date past the last notified year.
    /// <code>
    /// Zakat.GetNisab(new ZakatYearQuery { ZakatYear = 1447 })?.Nisab;    // 503529
    /// Zakat.GetNisab(new ZakatYearQuery { Label = "1445-46" })?.ZakatYear; // 1446
    /// Zakat.GetNisab(new ZakatYearQuery { Date = "2025-06-01" })?.Nisab;  // 179689
    /// </code>
    /// </remarks>
    /// <param name="query">The year or a date.</param>
    /// <returns>
    /// The year's nisab, dates and sources, or <c>null</c> for a year that is
    /// not covered, an invalid query, or an ambiguous date. Never throws.
    /// </returns>
    public static ZakatNisab? GetNisab(ZakatYearQuery? query) => Find(query) is { } row ? ToNisab(row) : null;

    /// <summary>The nisab for compulsory Zakat deduction at source for a Hijri Zakat year.</summary>
    /// <remarks>
    /// <code>Zakat.GetNisab(1447)?.Nisab; // 503529</code>
    /// </remarks>
    /// <param name="zakatYear">The Hijri year of the valuation date, e.g. <c>1447</c>.</param>
    /// <returns>The year's nisab, dates and sources, or <c>null</c> for a year that is not covered. Never throws.</returns>
    public static ZakatNisab? GetNisab(int zakatYear) => GetNisab(new ZakatYearQuery { ZakatYear = zakatYear });

    /// <summary>Every notified Zakat year, oldest first.</summary>
    /// <returns>The Hijri years (1433 to 1447).</returns>
    public static IReadOnlyList<int> GetYears() => Data.ZakatNisab.Select(r => r.ZakatYear).ToArray();

    /// <summary>
    /// Zakat deducted at source from one account on the valuation date (1
    /// Ramazan): 2.5% of the whole balance when it is at or above that year's
    /// nisab, and nothing when it is below or the holder filed the exemption
    /// declaration (Form CZ-50).
    /// </summary>
    /// <remarks>
    /// It applies to the accounts the Ordinance subjects to deduction at
    /// source: savings, profit-and-loss sharing and similar accounts (asset
    /// code 101). Current accounts and foreign currency accounts are not
    /// deducted. It is not a religious ruling on how much Zakat a person owes.
    /// <code>
    /// Zakat.CalculateDeduction(600_000, new ZakatYearQuery { ZakatYear = 1447 });
    /// // ZakatYear = 1447, Nisab = 503529, Balance = 600000, Deductible = true,
    /// // Reason = null, Rate = 2.5, Zakat = 15000, Source = { … }
    /// Zakat.CalculateDeduction(600_000, new ZakatYearQuery { ZakatYear = 1447 }, exempt: true)?.Zakat; // 0
    /// </code>
    /// </remarks>
    /// <param name="balance">The account balance in rupees at the start of the valuation date, 0 to 1 trillion.</param>
    /// <param name="query">The Zakat year or a date in it.</param>
    /// <param name="exempt"><c>true</c> if the holder filed the exemption declaration (Form CZ-50).</param>
    /// <returns>
    /// The deduction and its source, or <c>null</c> for an invalid balance, a
    /// year that is not covered, or an ambiguous date. Never throws.
    /// </returns>
    public static ZakatDeduction? CalculateDeduction(double balance, ZakatYearQuery? query, bool exempt = false)
    {
        if (Money.ToUnits(balance, 2) is not { } paisa) return null;
        if (Find(query) is not { } row) return null;
        var below = paisa < row.Nisab * 100;
        var deductible = !exempt && !below;
        return new ZakatDeduction(
            row.ZakatYear,
            row.Nisab,
            Money.FromPaisa(paisa),
            deductible,
            exempt ? ZakatExemption.Exempt : below ? ZakatExemption.BelowNisab : null,
            2.5,
            deductible ? Money.FromPaisa(Money.DivideHalfUp(new BigInteger(paisa) * 25, 1000)) : 0,
            Source(row));
    }

    private static Data.ZakatRow? Find(ZakatYearQuery? query)
    {
        if (query is null) return null;
        if (query.ZakatYear is not null || query.Label is not null)
        {
            if (query.ZakatYear is not null && query.Label is not null) return null;
            return query.ZakatYear is { } year ? ByYear(year) : ByLabel(query.Label!);
        }
        if (query.Date is not null && query.OnDate is not null) return null;
        if (query.Date is not null) return Dates.IsoDate(query.Date) is { } iso ? ByDate(iso) : null;
        return query.OnDate is { } date ? ByDate(Dates.Format(date)) : null;
    }

    private static Data.ZakatRow? ByYear(int year) => Data.ZakatNisab.FirstOrDefault(r => r.ZakatYear == year);

    private static Data.ZakatRow? ByLabel(string label)
    {
        var text = Js.Trim(label);
        return FourDigits.IsMatch(text)
            ? ByYear(int.Parse(text, CultureInfo.InvariantCulture))
            : Data.ZakatNisab.FirstOrDefault(r => r.Label == text);
    }

    /// <summary>
    /// The Zakat year a date falls in. A year starts on 1 Ramazan, which the
    /// notification gives only as one of two likely days; a date on the
    /// earlier of the two is ambiguous and gives <c>null</c>, as does a date
    /// past the last notified year.
    /// </summary>
    private static Data.ZakatRow? ByDate(string date)
    {
        var years = Data.ZakatNisab;
        for (var i = years.Count - 1; i >= 0; i--)
        {
            var row = years[i];
            var first = row.ExpectedValuationDates[0];
            var second = row.ExpectedValuationDates[1];
            if (string.CompareOrdinal(date, second) >= 0)
            {
                if (i == years.Count - 1 && string.CompareOrdinal(date, AddDays(first, LunarYearDays)) >= 0)
                    return null;
                return row;
            }
            if (string.CompareOrdinal(date, first) >= 0) return null;
        }
        return null;
    }

    private static string AddDays(string iso, int days) =>
        Dates.Format(DateOnly.ParseExact(iso, "yyyy-MM-dd", CultureInfo.InvariantCulture).AddDays(days));

    private static DataSource Source(Data.ZakatRow row)
    {
        var next = Data.ZakatNisab.FirstOrDefault(r => r.ZakatYear == row.ZakatYear + 1);
        // From the earlier of the two likely days of 1 Ramazan, to the day
        // before the next year's; open while it is the latest year.
        return new DataSource(
            "zakat-nisab",
            row.ExpectedValuationDates[0],
            next is null ? null : AddDays(next.ExpectedValuationDates[0], -1),
            $"Notification No. {row.Notification.Number} ({row.Notification.Date}); "
                + $"SBP {row.SbpCircular.Number} ({row.SbpCircular.Date})",
            row.Notification.Url);
    }

    private static ZakatNisab ToNisab(Data.ZakatRow row) => new(
        row.ZakatYear,
        row.Label,
        row.Nisab,
        row.ValuationDateHijri,
        row.ExpectedValuationDates.ToArray(),
        row.BankHolidayDate,
        row.Notification,
        row.SbpCircular,
        Source(row));
}
