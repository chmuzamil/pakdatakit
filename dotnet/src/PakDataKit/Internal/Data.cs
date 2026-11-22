using System.Text.Json;

namespace PakDataKit.Internal;

/// <summary>
/// The bundled datasets: the repository's <c>data/*.json</c> files, embedded
/// as resources when the package is built.
/// </summary>
internal static class Data
{
    internal sealed record NetworkEntry(string Prefix, string Network);

    internal sealed record AreaCodeEntry(string Code, IReadOnlyList<string> Cities);

    internal sealed record BankEntry(
        string Code, string Name, string Type, string? MergedInto, string? AliasOf, bool Active);

    internal sealed record CityEntry(string City, string Province);

    internal sealed record DistrictEntry(string District, string Province);

    internal sealed record DivisionEntry(string Division, string Province, IReadOnlyList<string> Districts);

    internal sealed record TehsilEntry(string Tehsil, string CensusDistrict, string? CurrentDistrict, string Province);

    internal sealed record PostalEntry(string City, string PostalCode, string? Area, bool Primary);

    internal sealed record ObservedHoliday(IReadOnlyList<string> Dates, string Source);

    internal sealed record ZakatRow(
        int ZakatYear,
        string Label,
        long Nisab,
        string ValuationDateHijri,
        IReadOnlyList<string> ExpectedValuationDates,
        string? BankHolidayDate,
        ZakatDocument Notification,
        ZakatDocument SbpCircular);

    /// <summary>A rate for one kind of person: a rate, value bands, or the salaried rate table.</summary>
    internal sealed record WithholdingSpec(double? Rate, IReadOnlyList<WithholdingSlab>? Slabs, bool SalarySlabs);

    internal sealed record WithholdingRow(
        int TaxYear,
        string From,
        string To,
        string Section,
        string SubType,
        string Description,
        WithholdingSpec Atl,
        WithholdingNonAtlRule NonAtlRule,
        WithholdingSpec NonAtl,
        WithholdingSpec? LateFiler,
        WithholdingThreshold? Threshold,
        string CardRef,
        string LawRef,
        string Card,
        string? StatuteOverride,
        string? Note);

    internal sealed record DistrictPopulationRow(
        string District,
        string Province,
        long? Population,
        long? Households,
        long? Urban,
        long? Rural,
        string? InCensusDistrict,
        bool BoundaryChanged,
        string? Note);

    internal sealed record TehsilPopulationRow(
        string Tehsil,
        string InCensusDistrict,
        string? CurrentDistrict,
        string Province,
        long Population,
        long Households,
        long Urban,
        long Rural,
        string? Note);

    private static readonly Lazy<IReadOnlyList<NetworkEntry>> NetworksLazy = new(() =>
        Array("networks.json", e => new NetworkEntry(Str(e, "prefix")!, Str(e, "network")!)));

    private static readonly Lazy<IReadOnlyList<AreaCodeEntry>> AreaCodesLazy = new(() =>
        Array("area-codes.json", e => new AreaCodeEntry(Str(e, "code")!, Strings(e.GetProperty("cities")))));

    private static readonly Lazy<IReadOnlyList<BankEntry>> BanksLazy = new(() =>
        Array("banks.json", e => new BankEntry(
            Str(e, "code")!, Str(e, "name")!, Str(e, "type")!, Str(e, "mergedInto"), Str(e, "aliasOf"),
            !(e.TryGetProperty("active", out var a) && a.ValueKind == JsonValueKind.False))));

    private static readonly Lazy<IReadOnlyList<CityEntry>> CitiesLazy = new(() =>
        Array("cities.json", e => new CityEntry(Str(e, "city")!, Str(e, "province")!)));

    private static readonly Lazy<IReadOnlyList<DistrictEntry>> DistrictsLazy = new(() =>
        Array("districts.json", e => new DistrictEntry(Str(e, "district")!, Str(e, "province")!)));

    private static readonly Lazy<IReadOnlyList<DivisionEntry>> DivisionsLazy = new(() =>
        Array("divisions.json", e => new DivisionEntry(
            Str(e, "division")!, Str(e, "province")!, Strings(e.GetProperty("districts")))));

    private static readonly Lazy<IReadOnlyList<TehsilEntry>> TehsilsLazy = new(() =>
        Array("tehsils.json", e => new TehsilEntry(
            Str(e, "tehsil")!, Str(e, "censusDistrict")!, Str(e, "currentDistrict"), Str(e, "province")!)));

    private static readonly Lazy<IReadOnlyList<PostalEntry>> PostalLazy = new(() =>
        Array("postal-codes.json", e => new PostalEntry(
            Str(e, "city")!, Str(e, "postalCode")!, Str(e, "area"),
            e.TryGetProperty("primary", out var p) && p.ValueKind == JsonValueKind.True)));

    private static readonly Lazy<IReadOnlyList<PostOffice>> PostOfficesLazy = new(() =>
        Array("post-offices.json", e => new PostOffice(
            Str(e, "code")!, Str(e, "office")!, Str(e, "town")!, Str(e, "district"), Str(e, "province")!)));

    private static readonly Lazy<IReadOnlyList<SalesTaxRate>> SalesTaxRatesLazy = new(() =>
        Array("sales-tax-rates.json", e => new SalesTaxRate(
            Str(e, "kind") == "goods" ? SalesTaxKind.Goods : SalesTaxKind.Services,
            Str(e, "authority")!, Str(e, "province"), e.GetProperty("rate").GetDouble(),
            Str(e, "from")!, Str(e, "to"), Str(e, "law")!, Str(e, "source")!)));

    private static readonly Lazy<IReadOnlyList<SalaryTaxYear>> SalaryTaxYearsLazy = new(() =>
        Array("income-tax-slabs.json", e => new SalaryTaxYear(
            e.GetProperty("taxYear").GetInt32(), Str(e, "from")!, Str(e, "to")!, Str(e, "law")!, Str(e, "source")!,
            e.GetProperty("slabs").EnumerateArray().Select(s => new SalaryTaxSlab(
                s.GetProperty("over").GetInt64(),
                s.GetProperty("upTo").ValueKind == JsonValueKind.Number ? s.GetProperty("upTo").GetInt64() : null,
                s.GetProperty("fixed").GetInt64(),
                s.GetProperty("rate").GetDouble())).ToArray(),
            e.GetProperty("surcharge") is { ValueKind: JsonValueKind.Object } surcharge
                ? new SalaryTaxSurcharge(
                    surcharge.GetProperty("rate").GetDouble(), surcharge.GetProperty("over").GetInt64(),
                    Str(surcharge, "law")!, Str(surcharge, "source")!)
                : null)));

    private static readonly Lazy<IReadOnlyDictionary<string, IReadOnlyDictionary<string, ObservedHoliday>>>
        HolidaysLazy = new(() =>
        {
            using var doc = JsonDocument.Parse(Read("holidays.json"));
            var years = new Dictionary<string, IReadOnlyDictionary<string, ObservedHoliday>>(StringComparer.Ordinal);
            foreach (var year in doc.RootElement.EnumerateObject())
            {
                var holidays = new Dictionary<string, ObservedHoliday>(StringComparer.Ordinal);
                foreach (var holiday in year.Value.EnumerateObject())
                {
                    holidays[holiday.Name] = new ObservedHoliday(
                        Strings(holiday.Value.GetProperty("dates")), Str(holiday.Value, "source") ?? "");
                }
                years[year.Name] = holidays;
            }
            return years;
        });

    private static readonly Lazy<IReadOnlyList<DataInfo>> ManifestLazy = new(() =>
        Array("manifest.json", e => new DataInfo(
            Str(e, "id")!, Str(e, "file")!, Str(e, "title")!, Str(e, "issuer")!, Str(e, "sourceUrl")!,
            Str(e, "sourceReference")!, Str(e, "sourceDate"), Str(e, "retrievedAt")!, Str(e, "effectiveFrom")!,
            Str(e, "effectiveTo"), Str(e, "coverage")!, e.GetProperty("recordCount").GetInt32(),
            Str(e, "nextExpectedUpdate")!, Str(e, "updateCadence")!, Str(e, "notes")!)));

    private static readonly Lazy<IReadOnlyList<ZakatRow>> ZakatNisabLazy = new(() =>
        Array("zakat-nisab.json", e => new ZakatRow(
            e.GetProperty("zakatYear").GetInt32(), Str(e, "label")!, e.GetProperty("nisab").GetInt64(),
            Str(e, "valuationDateHijri")!, Strings(e.GetProperty("expectedValuationDates")),
            Str(e, "bankHolidayDate"), Document(e.GetProperty("notification")),
            Document(e.GetProperty("sbpCircular")))));

    private static readonly Lazy<IReadOnlyList<WithholdingRow>> WithholdingRatesLazy = new(() =>
        Array("withholding-rates.json", e =>
        {
            var nonAtl = e.GetProperty("nonAtl");
            return new WithholdingRow(
                e.GetProperty("taxYear").GetInt32(), Str(e, "from")!, Str(e, "to")!, Str(e, "section")!,
                Str(e, "subType")!, Str(e, "description")!, Spec(e.GetProperty("atl")),
                Str(nonAtl, "rule") switch
                {
                    "double" => WithholdingNonAtlRule.Double,
                    "fixed" => WithholdingNonAtlRule.Fixed,
                    "slabs" => WithholdingNonAtlRule.Slabs,
                    "not-applicable" => WithholdingNonAtlRule.NotApplicable,
                    var other => throw new InvalidOperationException("Unknown nonAtl rule " + other),
                },
                Spec(nonAtl),
                e.TryGetProperty("lateFiler", out var late) && late.ValueKind == JsonValueKind.Object ? Spec(late) : null,
                e.TryGetProperty("threshold", out var t) && t.ValueKind == JsonValueKind.Object
                    ? new WithholdingThreshold(t.GetProperty("amount").GetInt64(), Str(t, "per")!)
                    : null,
                Str(e, "cardRef")!, Str(e, "lawRef")!, Str(e, "card")!, Str(e, "statuteOverride"), Str(e, "note"));
        }));

    private static readonly Lazy<IReadOnlyList<DistrictPopulationRow>> DistrictPopulationLazy = new(() =>
        Array("district-population.json", e => new DistrictPopulationRow(
            Str(e, "district")!, Str(e, "province")!, Long(e, "population"), Long(e, "households"),
            Long(e, "urban"), Long(e, "rural"), Str(e, "inCensusDistrict"),
            e.TryGetProperty("boundaryChanged", out var b) && b.ValueKind == JsonValueKind.True, Str(e, "note"))));

    private static readonly Lazy<IReadOnlyList<TehsilPopulationRow>> TehsilPopulationLazy = new(() =>
        Array("tehsil-population.json", e => new TehsilPopulationRow(
            Str(e, "tehsil")!, Str(e, "inCensusDistrict")!, Str(e, "currentDistrict"), Str(e, "province")!,
            e.GetProperty("population").GetInt64(), e.GetProperty("households").GetInt64(),
            e.GetProperty("urban").GetInt64(), e.GetProperty("rural").GetInt64(), Str(e, "note"))));

    private static readonly Lazy<IReadOnlyList<FbrSaleType>> FbrSaleTypesLazy = new(() =>
        Array("fbr-sale-types.json", e => new FbrSaleType(Str(e, "saleType")!, Strings(e.GetProperty("scenarioIds")))));

    private static readonly Lazy<string> VersionLazy = new(() =>
        Js.Rx("'([0-9]{4}-[0-9]{2}-[0-9]{2})'").Match(Read("data-version.ts")) is { Success: true } match
            ? match.Groups[1].Value
            : throw new InvalidOperationException("dataVersion not found in data-version.ts"));

    internal static IReadOnlyList<NetworkEntry> Networks => NetworksLazy.Value;

    internal static IReadOnlyList<AreaCodeEntry> AreaCodes => AreaCodesLazy.Value;

    internal static IReadOnlyList<BankEntry> Banks => BanksLazy.Value;

    internal static IReadOnlyList<CityEntry> Cities => CitiesLazy.Value;

    internal static IReadOnlyList<DistrictEntry> Districts => DistrictsLazy.Value;

    internal static IReadOnlyList<DivisionEntry> Divisions => DivisionsLazy.Value;

    internal static IReadOnlyList<TehsilEntry> Tehsils => TehsilsLazy.Value;

    internal static IReadOnlyList<PostalEntry> Postal => PostalLazy.Value;

    internal static IReadOnlyList<PostOffice> PostOffices => PostOfficesLazy.Value;

    internal static IReadOnlyList<SalesTaxRate> SalesTaxRates => SalesTaxRatesLazy.Value;

    internal static IReadOnlyList<SalaryTaxYear> SalaryTaxYears => SalaryTaxYearsLazy.Value;

    internal static IReadOnlyDictionary<string, IReadOnlyDictionary<string, ObservedHoliday>> Holidays =>
        HolidaysLazy.Value;

    internal static string Version => VersionLazy.Value;

    /// <summary><c>manifest.json</c> in file order, without <c>series</c>.</summary>
    internal static IReadOnlyList<DataInfo> Manifest => ManifestLazy.Value;

    internal static IReadOnlyList<ZakatRow> ZakatNisab => ZakatNisabLazy.Value;

    internal static IReadOnlyList<WithholdingRow> WithholdingRates => WithholdingRatesLazy.Value;

    internal static IReadOnlyList<DistrictPopulationRow> DistrictPopulation => DistrictPopulationLazy.Value;

    internal static IReadOnlyList<TehsilPopulationRow> TehsilPopulation => TehsilPopulationLazy.Value;

    internal static IReadOnlyList<FbrSaleType> FbrSaleTypes => FbrSaleTypesLazy.Value;

    private static string Read(string name)
    {
        using var stream = typeof(Data).Assembly.GetManifestResourceStream("PakDataKit.Data." + name)
            ?? throw new InvalidOperationException("Missing embedded dataset " + name);
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static IReadOnlyList<T> Array<T>(string name, Func<JsonElement, T> map)
    {
        using var doc = JsonDocument.Parse(Read(name));
        return doc.RootElement.EnumerateArray().Select(map).ToArray();
    }

    private static string? Str(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static long? Long(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetInt64()
            : null;

    private static ZakatDocument Document(JsonElement e) =>
        new(Str(e, "number")!, Str(e, "date")!, Str(e, "url")!);

    private static WithholdingSpec Spec(JsonElement e) => new(
        e.TryGetProperty("rate", out var rate) && rate.ValueKind == JsonValueKind.Number ? rate.GetDouble() : null,
        e.TryGetProperty("slabs", out var slabs) && slabs.ValueKind == JsonValueKind.Array
            ? slabs.EnumerateArray().Select(x => new WithholdingSlab(
                x.GetProperty("over").GetInt64(),
                x.GetProperty("upTo").ValueKind == JsonValueKind.Number ? x.GetProperty("upTo").GetInt64() : null,
                x.GetProperty("rate").GetDouble())).ToArray()
            : null,
        Str(e, "salarySlabs") is not null);

    private static IReadOnlyList<string> Strings(JsonElement array) =>
        array.EnumerateArray().Select(v => v.GetString()!).ToArray();
}
