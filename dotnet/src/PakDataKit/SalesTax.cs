using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>What is taxed: goods (federal sales tax) or services (provincial or ICT).</summary>
public enum SalesTaxKind
{
    /// <summary>Goods: federal sales tax under the Sales Tax Act 1990, collected by FBR.</summary>
    Goods,

    /// <summary>Services: provincial sales tax, or FBR's tax on services in Islamabad Capital Territory.</summary>
    Services,
}

/// <summary>One standard sales tax rate and the period it applied.</summary>
/// <param name="Kind">Goods or services.</param>
/// <param name="Authority"><c>FBR</c>, <c>PRA</c>, <c>SRB</c>, <c>KPRA</c> or <c>BRA</c>. FBR also collects ICT's tax on services.</param>
/// <param name="Province">For services: the province or <c>Islamabad Capital Territory</c>. <c>null</c> for goods.</param>
/// <param name="Rate">Percent, e.g. <c>18</c>.</param>
/// <param name="From">First day it applied (<c>YYYY-MM-DD</c>). Coverage starts on 1 July 2019.</param>
/// <param name="To">Last day it applied, or <c>null</c> if it still applies.</param>
/// <param name="Law">The law that sets it.</param>
/// <param name="Source">Official document.</param>
public sealed record SalesTaxRate(
    SalesTaxKind Kind,
    string Authority,
    string? Province,
    double Rate,
    string From,
    string? To,
    string Law,
    string Source);

/// <summary>Result of <see cref="SalesTax.Calculate"/> and <see cref="SalesTax.SplitInclusive"/>.</summary>
/// <param name="Net">Value excluding tax, in rupees (2 decimals at most).</param>
/// <param name="Tax">Tax, in rupees.</param>
/// <param name="Gross">Value including tax; always <c>Net + Tax</c> to the paisa.</param>
/// <param name="Rate">Percent used.</param>
public sealed record SalesTaxAmounts(double Net, double Tax, double Gross, double Rate);

/// <summary>Options for <see cref="SalesTax.GetRate"/>.</summary>
public sealed record SalesTaxRateQuery
{
    /// <summary>Goods or services.</summary>
    public required SalesTaxKind Kind { get; init; }

    /// <summary>
    /// For services: Punjab, Sindh, Khyber Pakhtunkhwa (<c>KP</c>, <c>KPK</c>),
    /// Balochistan or Islamabad Capital Territory (<c>ICT</c>, <c>Islamabad</c>).
    /// For goods it may be left out; Azad Jammu and Kashmir and
    /// Gilgit-Baltistan give <c>null</c>.
    /// </summary>
    public string? Province { get; init; }

    /// <summary>
    /// The date as <c>YYYY-MM-DD</c>. Use this or <see cref="OnDate"/>, not
    /// both. Defaults to today's local date.
    /// </summary>
    public string? Date { get; init; }

    /// <summary>The date as a <see cref="DateOnly"/>. Use this or <see cref="Date"/>, not both.</summary>
    public DateOnly? OnDate { get; init; }
}

/// <summary>
/// Options for <see cref="SalesTax.Calculate"/>: a <see cref="Rate"/>, or a
/// <see cref="Province"/>/<see cref="Kind"/> to look one up.
/// </summary>
public sealed record SalesTaxOptions
{
    /// <summary>Percent, 0 to 100, at most 2 decimals. Takes precedence over <see cref="Province"/>.</summary>
    public double? Rate { get; init; }

    /// <summary>Province or territory whose standard rate to use (see <see cref="SalesTaxRateQuery.Province"/>).</summary>
    public string? Province { get; init; }

    /// <summary>Goods or services. Defaults to <see cref="SalesTaxKind.Services"/> when a province is given.</summary>
    public SalesTaxKind? Kind { get; init; }

    /// <summary>The date of the rate, as <c>YYYY-MM-DD</c>. Defaults to today's local date.</summary>
    public string? Date { get; init; }

    /// <summary>The date of the rate, as a <see cref="DateOnly"/>. Use this or <see cref="Date"/>, not both.</summary>
    public DateOnly? OnDate { get; init; }

    /// <summary><c>true</c> if the amount already includes the tax.</summary>
    public bool Inclusive { get; init; }
}

/// <summary>
/// Pakistani standard sales tax rates (goods and services, from 1 July 2019)
/// and exact tax calculation in paisa.
/// </summary>
public static class SalesTax
{
    private static readonly Dictionary<string, string> Provinces = new(StringComparer.Ordinal)
    {
        ["punjab"] = "Punjab",
        ["sindh"] = "Sindh",
        ["khyber pakhtunkhwa"] = "Khyber Pakhtunkhwa",
        ["kp"] = "Khyber Pakhtunkhwa",
        ["kpk"] = "Khyber Pakhtunkhwa",
        ["balochistan"] = "Balochistan",
        ["baluchistan"] = "Balochistan",
        ["islamabad capital territory"] = "Islamabad Capital Territory",
        ["ict"] = "Islamabad Capital Territory",
        ["islamabad"] = "Islamabad Capital Territory",
        ["azad jammu and kashmir"] = "Azad Jammu and Kashmir",
        ["ajk"] = "Azad Jammu and Kashmir",
        ["gilgit-baltistan"] = "Gilgit-Baltistan",
        ["gilgit baltistan"] = "Gilgit-Baltistan",
        ["gb"] = "Gilgit-Baltistan",
    };

    /// <summary>Provinces outside the federal Sales Tax Act's territory.</summary>
    private static readonly HashSet<string> OutsideFederal =
        new(StringComparer.Ordinal) { "Azad Jammu and Kashmir", "Gilgit-Baltistan" };

    private static readonly SafeRegex IsoDatePattern = Js.Rx("^([0-9]{4})-([0-9]{2})-([0-9]{2})\\z");

    /// <summary>
    /// Returns the standard sales tax rate for goods (federal, Sales Tax Act
    /// 1990) or for services in a province or Islamabad Capital Territory, on
    /// a given date.
    /// </summary>
    /// <remarks>
    /// Only standard rates are covered, from 1 July 2019. Reduced, higher and
    /// sector rates (telecom, restaurants paid by card, Third Schedule goods
    /// and so on) are not. Every rate comes from the authority's own Act or
    /// Finance Act; see DATA.md.
    /// <code>
    /// SalesTax.GetRate(new SalesTaxRateQuery { Kind = SalesTaxKind.Goods, Date = "2026-11-18" })?.Rate; // 18
    /// </code>
    /// </remarks>
    /// <param name="query">Kind, province and date.</param>
    /// <returns>
    /// The rate and its source, or <c>null</c> for an unknown province or
    /// kind, an invalid date, or a date before 1 July 2019. Never throws.
    /// </returns>
    public static SalesTaxRate? GetRate(SalesTaxRateQuery? query)
    {
        if (query is null) return null;
        var kind = query.Kind;
        if (kind is not (SalesTaxKind.Goods or SalesTaxKind.Services)) return null;
        var date = ResolveDate(query.Date, query.OnDate);
        if (date is null) return null;

        string? province = null;
        if (query.Province is not null)
        {
            province = ProvinceName(query.Province);
            if (province is null) return null;
        }
        if (kind == SalesTaxKind.Goods)
        {
            if (province is not null && OutsideFederal.Contains(province)) return null;
        }
        else if (province is null)
        {
            return null;
        }

        foreach (var r in Data.SalesTaxRates)
        {
            if (r.Kind == kind
                && (kind == SalesTaxKind.Goods || r.Province == province)
                && string.CompareOrdinal(r.From, date) <= 0
                && (r.To is null || string.CompareOrdinal(date, r.To) <= 0))
            {
                return r;
            }
        }
        return null;
    }

    /// <summary>
    /// Splits an amount that includes sales tax into its value and tax. The
    /// value is rounded half up to the paisa and the tax is the rest, so
    /// <c>Net + Tax</c> is always <c>Gross</c>.
    /// </summary>
    /// <remarks>
    /// <code>SalesTax.SplitInclusive(1180, 18); // Net = 1000, Tax = 180, Gross = 1180, Rate = 18</code>
    /// </remarks>
    /// <param name="gross">Amount including tax, 0 to 1 trillion rupees.</param>
    /// <param name="rate">Percent, 0 to 100, at most 2 decimals.</param>
    /// <returns>The split, or <c>null</c> for an invalid amount or rate. Never throws.</returns>
    public static SalesTaxAmounts? SplitInclusive(double gross, double rate)
    {
        var grossPaisa = Money.ToUnits(gross, 2);
        var bp = BasisPoints(rate);
        if (grossPaisa is not { } g || bp is not { } b) return null;
        var netPaisa = Money.DivideHalfUp(g * 10_000, 10_000 + b);
        return Amounts(netPaisa, g - netPaisa, b);
    }

    /// <summary>
    /// Adds sales tax to an amount, or splits it out when
    /// <see cref="SalesTaxOptions.Inclusive"/> is set.
    /// </summary>
    /// <remarks>
    /// Give a <see cref="SalesTaxOptions.Rate"/>, or a
    /// <see cref="SalesTaxOptions.Province"/> (and <see cref="SalesTaxOptions.Kind"/>,
    /// default services, and a date) to use the standard rate from
    /// <see cref="GetRate"/>. The tax is rounded half up to the paisa.
    /// <code>
    /// SalesTax.Calculate(1000, new SalesTaxOptions { Rate = 18 }); // Net = 1000, Tax = 180, Gross = 1180, Rate = 18
    /// </code>
    /// </remarks>
    /// <param name="amount">0 to 1 trillion rupees.</param>
    /// <param name="options">The rate, or where and when to look one up.</param>
    /// <returns>
    /// The amounts, or <c>null</c> if the amount, rate or province is invalid
    /// or no rate applies. Never throws.
    /// </returns>
    public static SalesTaxAmounts? Calculate(double amount, SalesTaxOptions? options)
    {
        if (options is null) return null;
        double rate;
        if (options.Rate is { } given)
        {
            rate = given;
        }
        else
        {
            var kind = options.Kind ?? (options.Province is not null ? SalesTaxKind.Services : null);
            if (kind is null) return null;
            var found = GetRate(new SalesTaxRateQuery
            {
                Kind = kind.Value,
                Province = options.Province,
                Date = options.Date,
                OnDate = options.OnDate,
            });
            if (found is null) return null;
            rate = found.Rate;
        }
        if (options.Inclusive) return SplitInclusive(amount, rate);

        var netPaisa = Money.ToUnits(amount, 2);
        var bp = BasisPoints(rate);
        if (netPaisa is not { } n || bp is not { } b) return null;
        var taxPaisa = Money.DivideHalfUp(n * b, 10_000);
        return Amounts(n, taxPaisa, b);
    }

    private static string? ProvinceName(string input) =>
        Provinces.TryGetValue(Normalize.Key(input), out var name) ? name : null;

    /// <summary>The date as <c>YYYY-MM-DD</c>, today when neither is given, or <c>null</c> if invalid.</summary>
    private static string? ResolveDate(string? text, DateOnly? date)
    {
        if (text is not null && date is not null) return null;
        if (text is not null) return IsoDate(text);
        return Format(date ?? DateOnly.FromDateTime(DateTime.Now));
    }

    private static string Format(DateOnly date) =>
        $"{date.Year:D4}-{date.Month:D2}-{date.Day:D2}";

    /// <summary><c>YYYY-MM-DD</c> for a valid calendar date, otherwise <c>null</c>.</summary>
    private static string? IsoDate(string input)
    {
        var match = IsoDatePattern.Match(Js.Trim(input));
        if (!match.Success) return null;
        var y = int.Parse(match.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture);
        var m = int.Parse(match.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture);
        var d = int.Parse(match.Groups[3].Value, System.Globalization.CultureInfo.InvariantCulture);
        var leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        int[] days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) return null;
        return match.Value;
    }

    /// <summary>Basis points (hundredths of a percent) for a rate from 0 to 100 with at most 2 decimals.</summary>
    private static long? BasisPoints(double rate)
    {
        if (!double.IsFinite(rate) || rate < 0 || rate > 100) return null;
        var exact = Money.ToUnits(rate, 4); // ten-thousandths of a percent
        if (exact is not { } e || e % 100 != 0) return null;
        return e / 100;
    }

    private static SalesTaxAmounts Amounts(long netPaisa, long taxPaisa, long bp) => new(
        Money.FromPaisa(netPaisa),
        Money.FromPaisa(taxPaisa),
        Money.FromPaisa(netPaisa + taxPaisa),
        (double)bp / 100);
}
