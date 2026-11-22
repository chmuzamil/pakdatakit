using System.Numerics;
using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>
/// How the rate for a person not on the Active Taxpayers List is set for a
/// withholding case, under the Tenth Schedule to the Income Tax Ordinance.
/// </summary>
public enum WithholdingNonAtlRule
{
    /// <summary>The Tenth Schedule's 100% increase: double the ATL rate.</summary>
    Double,

    /// <summary>Its own rate (236C; 231AB, which applies only to persons not on the list).</summary>
    Fixed,

    /// <summary>Its own value bands (236K).</summary>
    Slabs,

    /// <summary>The same rate for everyone (149).</summary>
    NotApplicable,
}

/// <summary>
/// A value band: the rate for amounts over <see cref="Over"/> up to
/// <see cref="UpTo"/> (inclusive).
/// </summary>
/// <param name="Over">Lower bound in rupees (the amount must exceed it).</param>
/// <param name="UpTo">Upper bound in rupees, or <c>null</c> for no limit.</param>
/// <param name="Rate">Percent of the whole amount.</param>
public sealed record WithholdingSlab(long Over, long? UpTo, double Rate);

/// <summary>
/// The amount at or below which nothing is collected (231AB: Rs 50,000 of
/// cash withdrawn in a day, all withdrawals added up).
/// </summary>
/// <param name="Amount">The threshold in rupees.</param>
/// <param name="Per">The period it applies to, e.g. <c>day</c>.</param>
public sealed record WithholdingThreshold(long Amount, string Per);

/// <summary>A case's threshold and whether the amount was within it.</summary>
/// <param name="Amount">The threshold in rupees.</param>
/// <param name="Per">The period it applies to, e.g. <c>day</c>.</param>
/// <param name="WithinThreshold"><c>true</c> if the amount was at or below it, so nothing was collected.</param>
public sealed record WithholdingThresholdCheck(long Amount, string Per, bool WithinThreshold);

/// <summary>Input of <see cref="Withholding.Calculate"/>.</summary>
public sealed record WithholdingInput
{
    /// <summary>
    /// Section of the Income Tax Ordinance 2001: <c>231AB</c>, <c>236C</c>,
    /// <c>236K</c>, <c>151</c>, <c>150</c>, <c>153</c>, <c>154B</c> or
    /// <c>149</c> (any case, spaces around it ignored).
    /// </summary>
    public required string Section { get; init; }

    /// <summary>
    /// Which case of the section, e.g. <c>bank-deposit</c> (151) or
    /// <c>goods-company</c> (153); see <see cref="Withholding.GetRates"/>.
    /// May be left out for sections with one case.
    /// </summary>
    public string? SubType { get; init; }

    /// <summary>
    /// The payment (or, for 236C and 236K, the value; for 149, the year's
    /// taxable salary) in rupees, 0 to 1 trillion.
    /// </summary>
    public required double Amount { get; init; }

    /// <summary><c>true</c> if the person is on FBR's Active Taxpayers List.</summary>
    public required bool Atl { get; init; }

    /// <summary>
    /// <c>true</c> for a person on the list who filed the return late.
    /// Changes the rate only where the year has a late-filer rate (236C and
    /// 236K in tax years 2025 and 2026).
    /// </summary>
    public bool LateFiler { get; init; }

    /// <summary>Tax year (July to June), e.g. <c>2027</c>. Takes precedence over <see cref="Date"/> and <see cref="OnDate"/>.</summary>
    public int? TaxYear { get; init; }

    /// <summary>A date in the tax year as <c>YYYY-MM-DD</c>, instead of <see cref="TaxYear"/>. Use this or <see cref="OnDate"/>, not both.</summary>
    public string? Date { get; init; }

    /// <summary>A date in the tax year as a <see cref="DateOnly"/>, instead of <see cref="TaxYear"/>. Use this or <see cref="Date"/>, not both.</summary>
    public DateOnly? OnDate { get; init; }
}

/// <summary>Result of <see cref="Withholding.Calculate"/>.</summary>
/// <param name="Section">The section, e.g. <c>236K</c>.</param>
/// <param name="SubType">The case used, e.g. <c>purchase</c>.</param>
/// <param name="Description">The case as the rate card describes it.</param>
/// <param name="TaxYear">The tax year used.</param>
/// <param name="Atl">Whether the person is on the Active Taxpayers List.</param>
/// <param name="LateFiler">Whether a late filer's rate was asked for (only for a person on the list).</param>
/// <param name="Rate">Percent applied to the whole amount (for 149, the effective rate).</param>
/// <param name="Tax">Tax to withhold or collect, rounded half up to the paisa.</param>
/// <param name="NonAtlRule">How the rate for a person not on the list is set for this case.</param>
/// <param name="Slab">The value band used (236C, 236K), or <c>null</c>.</param>
/// <param name="Threshold">The amount at or below which nothing is collected, and whether this amount was within it; <c>null</c> where there is none.</param>
/// <param name="CardRef">Where the case is on FBR's rate card.</param>
/// <param name="LawRef">The law, as printed on the card.</param>
/// <param name="StatuteOverride">Where the statute differs from the card and the statute is used, why; otherwise <c>null</c>.</param>
/// <param name="Source">The rate card and law (dataset <c>withholding-rates</c>).</param>
public sealed record WithholdingTax(
    string Section,
    string SubType,
    string Description,
    int TaxYear,
    bool Atl,
    bool LateFiler,
    double Rate,
    double Tax,
    WithholdingNonAtlRule NonAtlRule,
    WithholdingSlab? Slab,
    WithholdingThresholdCheck? Threshold,
    string CardRef,
    string LawRef,
    string? StatuteOverride,
    DataSource Source);

/// <summary>One case of a section in a tax year, as in FBR's rate card. See <see cref="Withholding.GetRates"/>.</summary>
/// <param name="TaxYear">The tax year.</param>
/// <param name="Section">The section, e.g. <c>153</c>.</param>
/// <param name="SubType">The case, e.g. <c>goods-company</c>.</param>
/// <param name="Description">The case as the rate card describes it.</param>
/// <param name="AtlRate">Percent for a person on the list; <c>null</c> where it does not apply or depends on the value (see <paramref name="AtlSlabs"/>).</param>
/// <param name="AtlSlabs">Value bands for a person on the list, or <c>null</c>.</param>
/// <param name="NonAtlRule">How the rate for a person not on the list is set.</param>
/// <param name="NonAtlRate">Percent for a person not on the list, or <c>null</c> (see <paramref name="NonAtlSlabs"/>).</param>
/// <param name="NonAtlSlabs">Value bands for a person not on the list, or <c>null</c>.</param>
/// <param name="LateFilerSlabs">Late-filer value bands, where the year has them; otherwise <c>null</c>.</param>
/// <param name="Threshold">The amount at or below which nothing is collected, or <c>null</c>.</param>
/// <param name="CardRef">Where the case is on FBR's rate card.</param>
/// <param name="LawRef">The law, as printed on the card.</param>
/// <param name="StatuteOverride">Where the statute differs from the card and the statute is used, why; otherwise <c>null</c>.</param>
/// <param name="Note">More about the case, or <c>null</c>.</param>
/// <param name="Source">The rate card and law (dataset <c>withholding-rates</c>).</param>
public sealed record WithholdingRate(
    int TaxYear,
    string Section,
    string SubType,
    string Description,
    double? AtlRate,
    IReadOnlyList<WithholdingSlab>? AtlSlabs,
    WithholdingNonAtlRule NonAtlRule,
    double? NonAtlRate,
    IReadOnlyList<WithholdingSlab>? NonAtlSlabs,
    IReadOnlyList<WithholdingSlab>? LateFilerSlabs,
    WithholdingThreshold? Threshold,
    string CardRef,
    string LawRef,
    string? StatuteOverride,
    string? Note,
    DataSource Source);

/// <summary>
/// Income tax withheld or collected at source under the Income Tax Ordinance
/// 2001, for persons on and not on FBR's Active Taxpayers List (ATL), from
/// FBR's Withholding Tax Rate Cards for tax years 2025 to 2027.
/// </summary>
public static class Withholding
{
    /// <summary>
    /// Every case FBR's Withholding Tax Rate Card lists for the covered
    /// sections in a tax year (2025 to 2027), with its rates for persons on
    /// and not on the Active Taxpayers List and its references.
    /// </summary>
    /// <remarks>
    /// <code>Withholding.GetRates(2027, "153").Select(r => r.SubType); // ["rice-cotton-seed-edible-oil", …]</code>
    /// </remarks>
    /// <param name="taxYear">The tax year, e.g. <c>2027</c>.</param>
    /// <param name="section">Only this section, e.g. <c>153</c> (any case); <c>null</c> for all.</param>
    /// <returns>The cases, or an empty list for a year that is not covered. Never throws.</returns>
    public static IReadOnlyList<WithholdingRate> GetRates(int taxYear, string? section = null)
    {
        var wanted = section is null ? null : Js.ToUpper(section);
        return Data.WithholdingRates
            .Where(r => r.TaxYear == taxYear && (wanted is null || r.Section == wanted))
            .Select(r => new WithholdingRate(
                r.TaxYear,
                r.Section,
                r.SubType,
                r.Description,
                r.Atl.Rate,
                r.Atl.Slabs?.ToArray(),
                r.NonAtlRule,
                r.NonAtl.Rate,
                r.NonAtl.Slabs?.ToArray(),
                r.LateFiler?.Slabs?.ToArray(),
                r.Threshold,
                r.CardRef,
                r.LawRef,
                r.StatuteOverride,
                r.Note,
                Source(r)))
            .ToArray();
    }

    /// <summary>
    /// Income tax to withhold or collect under one section of the Income Tax
    /// Ordinance 2001, for a person on or not on FBR's Active Taxpayers List,
    /// from FBR's Withholding Tax Rate Card for tax years 2025 to 2027.
    /// </summary>
    /// <remarks>
    /// Covered: 231AB cash withdrawal, 236C sale and 236K purchase of
    /// immovable property, 151 profit on debt, 150 dividends, 153 goods,
    /// services and contracts, 154B social media income (from 2027) and 149
    /// salary (the salaried rate table, as <see cref="IncomeTax.CalculateSalaryTax"/>).
    /// <para>
    /// The rate for a person not on the list follows each case's own rule in
    /// the Tenth Schedule: usually double, but a fixed rate (236C, and 151 in
    /// 2025), its own value bands (236K), or none (149; 231AB applies only to
    /// them). The rate applies to the whole amount. Where FBR's card and the
    /// Ordinance differ, the Ordinance is used and
    /// <see cref="WithholdingTax.StatuteOverride"/> says so.
    /// </para>
    /// <para>
    /// This is an estimate from the rate card, not tax advice: exemptions,
    /// reduced-rate certificates, adjustable or final status and the many
    /// cases not listed here are not applied.
    /// </para>
    /// <code>
    /// Withholding.Calculate(new WithholdingInput { Section = "236K", Amount = 60_000_000, Atl = false, TaxYear = 2027 });
    /// // Rate = 14.5, Tax = 8700000, NonAtlRule = Slabs, …
    /// Withholding.Calculate(new WithholdingInput { Section = "231AB", Amount = 80_000, Atl = false, TaxYear = 2027 })?.Tax; // 640
    /// </code>
    /// </remarks>
    /// <param name="input">The section, case, amount, ATL status and tax year (or a date in it).</param>
    /// <returns>
    /// The rate, tax and references, or <c>null</c> for an unknown section,
    /// case or tax year, an invalid amount or date, or no tax year or date.
    /// Never throws.
    /// </returns>
    public static WithholdingTax? Calculate(WithholdingInput? input)
    {
        if (input?.Section is null) return null;
        if (Money.ToUnits(input.Amount, 2) is not { } paisa) return null;
        int? taxYear;
        if (input.TaxYear is { } given) taxYear = given;
        else if (input.Date is not null && input.OnDate is not null) taxYear = null;
        else if (input.Date is not null) taxYear = IncomeTax.GetTaxYear(input.Date);
        else if (input.OnDate is { } date) taxYear = IncomeTax.GetTaxYear(date);
        else taxYear = null;
        if (taxYear is not { } year) return null;

        var section = Js.ToUpper(Js.Trim(input.Section));
        var cases = Data.WithholdingRates.Where(r => r.TaxYear == year && r.Section == section).ToArray();
        if (cases.Length == 0) return null;
        var row = input.SubType is null
            ? (cases.Length == 1 ? cases[0] : null)
            : cases.FirstOrDefault(r => r.SubType == input.SubType);
        if (row is null) return null;

        var atl = input.Atl;
        var lateFiler = atl && input.LateFiler;
        double rate;
        long taxPaisa;
        WithholdingSlab? slab = null;
        WithholdingThresholdCheck? threshold = null;

        if (row.Atl.SalarySlabs)
        {
            var salary = IncomeTax.CalculateSalaryTax(Money.FromPaisa(paisa), new SalaryTaxOptions { TaxYear = year });
            if (salary is null) return null;
            rate = salary.EffectiveRate;
            taxPaisa = (long)Js.Round(salary.Tax * 100);
        }
        else
        {
            var spec = !atl ? row.NonAtl : lateFiler && row.LateFiler is not null ? row.LateFiler : row.Atl;
            if (spec.Slabs is { } slabs)
            {
                slab = InSlab(paisa, slabs);
                rate = slab.Rate;
            }
            else
            {
                rate = spec.Rate ?? 0;
            }
            taxPaisa = Money.DivideHalfUp(new BigInteger(paisa) * (long)Js.Round(rate * 100), 10_000);
            if (row.Threshold is { } t)
            {
                var within = paisa <= t.Amount * 100;
                threshold = new WithholdingThresholdCheck(t.Amount, t.Per, within);
                if (within) taxPaisa = 0;
            }
        }

        return new WithholdingTax(
            row.Section,
            row.SubType,
            row.Description,
            year,
            atl,
            lateFiler,
            rate,
            Money.FromPaisa(taxPaisa),
            row.NonAtlRule,
            slab,
            threshold,
            row.CardRef,
            row.LawRef,
            row.StatuteOverride,
            Source(row));
    }

    private static WithholdingSlab InSlab(long paisa, IReadOnlyList<WithholdingSlab> slabs) =>
        slabs.FirstOrDefault(s => paisa > s.Over * 100 && (s.UpTo is null || paisa <= s.UpTo * 100)) ?? slabs[0];

    private static DataSource Source(Data.WithholdingRow row) => new(
        "withholding-rates",
        row.From,
        row.To,
        $"{row.LawRef} (FBR Withholding Tax Rate Card, tax year {row.TaxYear}, {row.CardRef})",
        row.Card);
}
