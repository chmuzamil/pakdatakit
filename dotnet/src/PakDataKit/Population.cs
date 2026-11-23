using PakDataKit.Internal;

namespace PakDataKit;

/// <summary>Result of <see cref="PakDataKit.Population.GetDistrict"/>: a district's 2023 census figures.</summary>
/// <param name="District">The district, as <see cref="Geo.GetDistrictsByProvince"/> names it.</param>
/// <param name="Province">Its province or territory.</param>
/// <param name="Population">Total population (all sexes), or <c>null</c> where the census has no figure.</param>
/// <param name="Households">Households, or <c>null</c>.</param>
/// <param name="Urban">Urban population, or <c>null</c>.</param>
/// <param name="Rural">Rural population, or <c>null</c>.</param>
/// <param name="Census">Always <c>2023</c>: the 7th Population and Housing Census.</param>
/// <param name="CensusDistrict">
/// The census district the figures belong to. For a district created after
/// the census, the one its area was part of (its own figures are
/// <c>null</c>); <c>null</c> in Gilgit-Baltistan and Azad Jammu and Kashmir,
/// which the census did not cover.
/// </param>
/// <param name="BoundaryChanged">
/// <c>true</c> when the district has lost area to a district created after
/// the census: the figures are for the district as it was at the census.
/// </param>
/// <param name="Note">Why figures are missing or what they cover, or <c>null</c>.</param>
/// <param name="Source">The census tables (dataset <c>district-population</c>).</param>
public sealed record DistrictPopulation(
    string District,
    string Province,
    long? Population,
    long? Households,
    long? Urban,
    long? Rural,
    int Census,
    string? CensusDistrict,
    bool BoundaryChanged,
    string? Note,
    DataSource Source);

/// <summary>Result of <see cref="PakDataKit.Population.GetTehsil"/>: a tehsil's 2023 census figures.</summary>
/// <param name="Tehsil">The tehsil (taluka, sub-division) as the census tables name it.</param>
/// <param name="CensusDistrict">The district at the census.</param>
/// <param name="CurrentDistrict">
/// The district today, or <c>null</c> where its census district has since
/// been split and no official source yet confirms which district it is in.
/// </param>
/// <param name="Province">Its province or territory.</param>
/// <param name="Population">Total population (all sexes).</param>
/// <param name="Households">Households.</param>
/// <param name="Urban">Urban population.</param>
/// <param name="Rural">Rural population.</param>
/// <param name="Census">Always <c>2023</c>: the 7th Population and Housing Census.</param>
/// <param name="Note">What the figures cover, or <c>null</c>.</param>
/// <param name="Source">The census tables (dataset <c>tehsil-population</c>).</param>
public sealed record TehsilPopulation(
    string Tehsil,
    string CensusDistrict,
    string? CurrentDistrict,
    string Province,
    long Population,
    long Households,
    long Urban,
    long Rural,
    int Census,
    string? Note,
    DataSource Source);

/// <summary>
/// Population, households and the urban/rural split of districts and tehsils
/// from Pakistan's 2023 census (Pakistan Bureau of Statistics).
/// </summary>
public static class Population
{
    private const string EffectiveFrom = "2023-03-01";

    private const string SourceReference =
        "7th Population and Housing Census 2023, Table 1 (population, urban and rural) and Table 20 (households)";

    private const string SourceUrl = "https://www.pbs.gov.pk/result-excel/";

    private static readonly Lazy<Dictionary<string, Data.DistrictPopulationRow>> Districts = new(() =>
    {
        var map = new Dictionary<string, Data.DistrictPopulationRow>(StringComparer.Ordinal);
        foreach (var row in Data.DistrictPopulation) map[Normalize.Key(row.District)] = row;
        return map;
    });

    private static readonly Lazy<Dictionary<string, List<Data.TehsilPopulationRow>>> Tehsils = new(() =>
    {
        var map = new Dictionary<string, List<Data.TehsilPopulationRow>>(StringComparer.Ordinal);
        foreach (var row in Data.TehsilPopulation)
        {
            var key = Normalize.Key(row.Tehsil);
            if (!map.TryGetValue(key, out var rows)) map[key] = rows = [];
            rows.Add(row);
        }
        return map;
    });

    /// <summary>
    /// A district's population, households and urban/rural split from the
    /// 2023 census, for any of the 177 districts in
    /// <see cref="Geo.GetDistrictsByProvince"/>.
    /// </summary>
    /// <remarks>
    /// Districts created after the census have <c>null</c> figures and name
    /// the census district their area was part of; nothing is estimated.
    /// Districts that lost area to a new district keep their census figures,
    /// with <see cref="DistrictPopulation.BoundaryChanged"/> set.
    /// Gilgit-Baltistan and Azad Jammu and Kashmir were not enumerated by this
    /// census, so their figures are <c>null</c>.
    /// <code>
    /// Population.GetDistrict("Lahore")?.Population;  // 13004135
    /// Population.GetDistrict("Murree")?.Population;  // null (created after the census)
    /// </code>
    /// </remarks>
    /// <param name="district">A district name, in any case.</param>
    /// <returns>The figures and their source, or <c>null</c> for an unknown district (also for <c>null</c>). Never throws.</returns>
    public static DistrictPopulation? GetDistrict(string? district)
    {
        if (district is null || !Districts.Value.TryGetValue(Normalize.Key(district), out var row)) return null;
        return new DistrictPopulation(
            row.District,
            row.Province,
            row.Population,
            row.Households,
            row.Urban,
            row.Rural,
            2023,
            row.InCensusDistrict,
            row.BoundaryChanged,
            row.Note,
            new DataSource("district-population", EffectiveFrom, null, SourceReference, SourceUrl));
    }

    /// <summary>
    /// A tehsil's (or taluka's, sub-division's) population, households and
    /// urban/rural split from the 2023 census, for the 591 units in the
    /// census tables.
    /// </summary>
    /// <remarks>
    /// A few names occur in more than one district; give the district (at the
    /// census or today) to choose.
    /// <code>Population.GetTehsil("Murree")?.CurrentDistrict; // "Murree"</code>
    /// </remarks>
    /// <param name="tehsil">A tehsil name, in any case.</param>
    /// <param name="district">Its district (at the census or today), needed only when the name is not unique.</param>
    /// <returns>
    /// The figures and their source, or <c>null</c> for an unknown or
    /// ambiguous name (also for <c>null</c>). Never throws.
    /// </returns>
    public static TehsilPopulation? GetTehsil(string? tehsil, string? district = null)
    {
        if (tehsil is null) return null;
        IEnumerable<Data.TehsilPopulationRow> rows =
            Tehsils.Value.TryGetValue(Normalize.Key(tehsil), out var found) ? found : [];
        if (district is not null)
        {
            var d = Normalize.Key(district);
            rows = rows.Where(r =>
                Normalize.Key(r.InCensusDistrict) == d
                || (r.CurrentDistrict is not null && Normalize.Key(r.CurrentDistrict) == d));
        }
        var matches = rows.Take(2).ToArray();
        if (matches.Length != 1) return null;
        var row = matches[0];
        return new TehsilPopulation(
            row.Tehsil,
            row.InCensusDistrict,
            row.CurrentDistrict,
            row.Province,
            row.Population,
            row.Households,
            row.Urban,
            row.Rural,
            2023,
            row.Note,
            new DataSource("tehsil-population", EffectiveFrom, null, SourceReference, SourceUrl));
    }
}
