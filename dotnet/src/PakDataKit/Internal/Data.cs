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

    internal sealed record BankEntry(string Code, string Name, string Type, string? MergedInto, string? AliasOf);

    internal sealed record CityEntry(string City, string Province);

    internal sealed record DistrictEntry(string District, string Province);

    internal sealed record PostalEntry(string City, string PostalCode, string? Area, bool Primary);

    internal sealed record ObservedHoliday(IReadOnlyList<string> Dates, string Source);

    private static readonly Lazy<IReadOnlyList<NetworkEntry>> NetworksLazy = new(() =>
        Array("networks.json", e => new NetworkEntry(Str(e, "prefix")!, Str(e, "network")!)));

    private static readonly Lazy<IReadOnlyList<AreaCodeEntry>> AreaCodesLazy = new(() =>
        Array("area-codes.json", e => new AreaCodeEntry(Str(e, "code")!, Strings(e.GetProperty("cities")))));

    private static readonly Lazy<IReadOnlyList<BankEntry>> BanksLazy = new(() =>
        Array("banks.json", e => new BankEntry(
            Str(e, "code")!, Str(e, "name")!, Str(e, "type")!, Str(e, "mergedInto"), Str(e, "aliasOf"))));

    private static readonly Lazy<IReadOnlyList<CityEntry>> CitiesLazy = new(() =>
        Array("cities.json", e => new CityEntry(Str(e, "city")!, Str(e, "province")!)));

    private static readonly Lazy<IReadOnlyList<DistrictEntry>> DistrictsLazy = new(() =>
        Array("districts.json", e => new DistrictEntry(Str(e, "district")!, Str(e, "province")!)));

    private static readonly Lazy<IReadOnlyList<PostalEntry>> PostalLazy = new(() =>
        Array("postal-codes.json", e => new PostalEntry(
            Str(e, "city")!, Str(e, "postalCode")!, Str(e, "area"),
            e.TryGetProperty("primary", out var p) && p.ValueKind == JsonValueKind.True)));

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

    private static readonly Lazy<string> VersionLazy = new(() =>
        Js.Rx("'([0-9]{4}-[0-9]{2}-[0-9]{2})'").Match(Read("data-version.ts")) is { Success: true } match
            ? match.Groups[1].Value
            : throw new InvalidOperationException("dataVersion not found in data-version.ts"));

    internal static IReadOnlyList<NetworkEntry> Networks => NetworksLazy.Value;

    internal static IReadOnlyList<AreaCodeEntry> AreaCodes => AreaCodesLazy.Value;

    internal static IReadOnlyList<BankEntry> Banks => BanksLazy.Value;

    internal static IReadOnlyList<CityEntry> Cities => CitiesLazy.Value;

    internal static IReadOnlyList<DistrictEntry> Districts => DistrictsLazy.Value;

    internal static IReadOnlyList<PostalEntry> Postal => PostalLazy.Value;

    internal static IReadOnlyDictionary<string, IReadOnlyDictionary<string, ObservedHoliday>> Holidays =>
        HolidaysLazy.Value;

    internal static string Version => VersionLazy.Value;

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

    private static IReadOnlyList<string> Strings(JsonElement array) =>
        array.EnumerateArray().Select(v => v.GetString()!).ToArray();
}
