using System.Numerics;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>
/// One band of the salaried rate table: income above <see cref="Over"/> (and
/// up to <see cref="UpTo"/>) pays <see cref="Fixed"/> plus <see cref="Rate"/>
/// percent of the amount above <see cref="Over"/>.
/// </summary>
/// <param name="Over">Lower bound in rupees (income must exceed it).</param>
/// <param name="UpTo">Upper bound in rupees, or <c>null</c> for the top band.</param>
/// <param name="Fixed">Tax on the income up to <see cref="Over"/>, in rupees.</param>
/// <param name="Rate">Percent of the income above <see cref="Over"/>.</param>
public sealed record SalaryTaxSlab(long Over, long? UpTo, long Fixed, double Rate);

/// <summary>The salaried rate table for one tax year (1 July to 30 June).</summary>
/// <param name="TaxYear">The tax year, named after the June it ends in: 2026 is 1 July 2025 to 30 June 2026.</param>
/// <param name="From"><c>YYYY-MM-DD</c>, always 1 July.</param>
/// <param name="To"><c>YYYY-MM-DD</c>, always 30 June.</param>
/// <param name="Law">The law that sets the table.</param>
/// <param name="Source">Official document.</param>
/// <param name="Slabs">The bands, lowest first.</param>
public sealed record SalaryTaxYear(
    int TaxYear,
    string From,
    string To,
    string Law,
    string Source,
    IReadOnlyList<SalaryTaxSlab> Slabs);

/// <summary>Options for <see cref="IncomeTax.CalculateSalaryTax"/> and <see cref="IncomeTax.CalculateMonthlySalaryTax"/>.</summary>
public sealed record SalaryTaxOptions
{
    /// <summary>Tax year, e.g. <c>2026</c>. Takes precedence over <see cref="Date"/> and <see cref="OnDate"/>.</summary>
    public int? TaxYear { get; init; }

    /// <summary>
    /// A day in the tax year as <c>YYYY-MM-DD</c>. Use this or
    /// <see cref="OnDate"/>, not both. Defaults to today's local date.
    /// </summary>
    public string? Date { get; init; }

    /// <summary>A day in the tax year as a <see cref="DateOnly"/>. Use this or <see cref="Date"/>, not both.</summary>
    public DateOnly? OnDate { get; init; }
}

/// <summary>Result of <see cref="IncomeTax.CalculateSalaryTax"/> and <see cref="IncomeTax.CalculateMonthlySalaryTax"/>.</summary>
/// <param name="Tax">Tax for the year, in rupees, rounded half up to the paisa.</param>
/// <param name="Monthly"><c>Tax / 12</c>, rounded half up to the paisa.</param>
/// <param name="EffectiveRate"><see cref="Tax"/> as a percent of the income, rounded half up to 2 decimals.</param>
/// <param name="Slab">The band the income falls in.</param>
/// <param name="TaxYear">The tax year used.</param>
public sealed record SalaryTax(double Tax, double Monthly, double EffectiveRate, SalaryTaxSlab Slab, int TaxYear);

/// <summary>
/// Pakistani income tax on salary: the salaried rate tables for tax years
/// 2020 to 2027 and exact tax calculation in paisa.
/// </summary>
public static class IncomeTax
{
    /// <summary>The tax year (July to June) that contains today's local date.</summary>
    /// <returns>The tax year, e.g. <c>2027</c> for 18 November 2026.</returns>
    public static int GetTaxYear() => GetTaxYear(Dates.Today);

    /// <summary>The tax year (July to June) that contains a date.</summary>
    /// <param name="date">The date.</param>
    /// <returns>The year plus one from July, otherwise the year.</returns>
    public static int GetTaxYear(DateOnly date) => date.Month >= 7 ? date.Year + 1 : date.Year;

    /// <summary>The tax year (July to June) that contains a <c>YYYY-MM-DD</c> date.</summary>
    /// <remarks>
    /// <code>IncomeTax.GetTaxYear("2025-07-01"); // 2026</code>
    /// </remarks>
    /// <param name="date">The date as <c>YYYY-MM-DD</c>.</param>
    /// <returns>The tax year, or <c>null</c> for an invalid date. Never throws.</returns>
    public static int? GetTaxYear(string? date)
    {
        if (date is null || Dates.IsoDate(date) is not { } iso) return null;
        var year = int.Parse(iso[..4], System.Globalization.CultureInfo.InvariantCulture);
        var month = int.Parse(iso[5..7], System.Globalization.CultureInfo.InvariantCulture);
        return month >= 7 ? year + 1 : year;
    }

    /// <summary>
    /// Returns the salaried rate table for a tax year: Division I of Part I
    /// of the First Schedule to the Income Tax Ordinance 2001, clause (2),
    /// which applies when salary is more than 75% of taxable income.
    /// </summary>
    /// <remarks>Covers tax years 2020 to 2027, each from FBR's consolidated Ordinance.</remarks>
    /// <param name="taxYear">
    /// e.g. <c>2026</c> (1 July 2025 to 30 June 2026). Defaults to the current
    /// tax year.
    /// </param>
    /// <returns>The table, or <c>null</c> for a year that is not covered. Never throws.</returns>
    public static SalaryTaxYear? GetSalaryTaxSlabs(int? taxYear = null)
    {
        var year = FindYear(taxYear ?? GetTaxYear());
        return year is null ? null : year with { Slabs = year.Slabs.ToArray() };
    }

    /// <summary>Which tax years <see cref="GetSalaryTaxSlabs"/> covers, oldest first.</summary>
    /// <returns>The tax years (2020 to 2027).</returns>
    public static IReadOnlyList<int> GetSalaryTaxYears() => Data.SalaryTaxYears.Select(y => y.TaxYear).ToArray();

    /// <summary>
    /// Income tax on a salaried individual's taxable income for a tax year,
    /// from the salaried rate table (see <see cref="GetSalaryTaxSlabs"/>).
    /// </summary>
    /// <remarks>
    /// The rate table only: the surcharge, tax credits, exemptions, the
    /// separate pension rate and withholding adjustments are not applied.
    /// <code>
    /// IncomeTax.CalculateSalaryTax(1_800_000, new SalaryTaxOptions { TaxYear = 2026 });
    /// // Tax = 72000, Monthly = 6000, EffectiveRate = 4, Slab = { Over = 1200000, … }, TaxYear = 2026
    /// </code>
    /// </remarks>
    /// <param name="annualIncome">
    /// Taxable income for the year in rupees, 0 to 1 trillion (at most 2
    /// decimals count).
    /// </param>
    /// <param name="options">The tax year or a date in it; defaults to the current tax year.</param>
    /// <returns>
    /// The tax, or <c>null</c> for an invalid amount, date or a tax year that
    /// is not covered. Never throws.
    /// </returns>
    public static SalaryTax? CalculateSalaryTax(double annualIncome, SalaryTaxOptions? options = null)
    {
        if (Money.ToUnits(annualIncome, 2) is not { } paisa) return null;
        return FindYear(options) is { } year ? Compute(paisa, year) : null;
    }

    /// <summary>
    /// <see cref="CalculateSalaryTax"/> for a monthly salary: the income is
    /// <c>monthlySalary × 12</c>, and <see cref="SalaryTax.Monthly"/> is the
    /// tax to withhold each month.
    /// </summary>
    /// <remarks>
    /// <code>IncomeTax.CalculateMonthlySalaryTax(150_000, new SalaryTaxOptions { TaxYear = 2026 })?.Monthly; // 6000</code>
    /// </remarks>
    /// <param name="monthlySalary">Taxable salary for a month in rupees, 0 to 1 trillion.</param>
    /// <param name="options">The tax year or a date in it; defaults to the current tax year.</param>
    /// <returns>
    /// The tax, or <c>null</c> for an invalid amount, date or a tax year that
    /// is not covered. Never throws.
    /// </returns>
    public static SalaryTax? CalculateMonthlySalaryTax(double monthlySalary, SalaryTaxOptions? options = null)
    {
        if (Money.ToUnits(monthlySalary, 2) is not { } paisa) return null;
        return FindYear(options) is { } year ? Compute(paisa * 12, year) : null;
    }

    private static SalaryTaxYear? FindYear(SalaryTaxOptions? options)
    {
        int? taxYear;
        if (options?.TaxYear is { } given) taxYear = given;
        else if (options?.Date is { } text) taxYear = options.OnDate is null ? GetTaxYear(text) : null;
        else taxYear = GetTaxYear(options?.OnDate ?? Dates.Today);
        return taxYear is { } y ? FindYear(y) : null;
    }

    private static SalaryTaxYear? FindYear(int taxYear) =>
        Data.SalaryTaxYears.FirstOrDefault(y => y.TaxYear == taxYear);

    private static SalaryTax Compute(long incomePaisa, SalaryTaxYear year)
    {
        var slab = year.Slabs[0];
        foreach (var candidate in year.Slabs)
        {
            if (incomePaisa > candidate.Over * 100) slab = candidate;
        }
        var rateBp = (long)Js.Round(slab.Rate * 100);
        var taxPaisa = incomePaisa > slab.Over * 100
            ? slab.Fixed * 100 + Money.DivideHalfUp(new BigInteger(incomePaisa - slab.Over * 100) * rateBp, 10_000)
            : slab.Fixed * 100;
        return new SalaryTax(
            Money.FromPaisa(taxPaisa),
            Money.FromPaisa(Money.DivideHalfUp(taxPaisa, 12)),
            incomePaisa == 0 ? 0 : (double)Money.DivideHalfUp(new BigInteger(taxPaisa) * 10_000, incomePaisa) / 100,
            slab,
            year.TaxYear);
    }
}
