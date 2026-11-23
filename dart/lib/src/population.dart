import 'data/district_population.g.dart';
import 'data/tehsil_population.g.dart';
import 'data_info.dart';
import 'internal/normalize.dart';

/// The census, its tables and where they are published.
DataSource _source(String id) => DataSource(
      id: id,
      effectiveFrom: '2023-03-01',
      effectiveTo: null,
      sourceReference: '7th Population and Housing Census 2023, Table 1 '
          '(population, urban and rural) and Table 20 (households)',
      sourceUrl: 'https://www.pbs.gov.pk/result-excel/',
    );

/// Result of [getDistrictPopulation]: a district's 2023 census counts.
class DistrictPopulation {
  /// Creates a district population value.
  const DistrictPopulation({
    required this.district,
    required this.province,
    required this.population,
    required this.households,
    required this.urban,
    required this.rural,
    this.census = 2023,
    required this.censusDistrict,
    required this.boundaryChanged,
    required this.note,
    required this.source,
  });

  /// The district, as in `getDistrictsByProvince`.
  final String district;

  /// Its province or territory.
  final String province;

  /// Total population (all sexes), or `null` where the census has no figure.
  final int? population;

  /// Households, or `null`.
  final int? households;

  /// Urban population, or `null`.
  final int? urban;

  /// Rural population, or `null`.
  final int? rural;

  /// Always `2023`: the 7th Population and Housing Census.
  final int census;

  /// The census district the figures belong to. For a district created
  /// after the census, the one its area was part of (its own figures are
  /// `null`); `null` in Gilgit-Baltistan and Azad Jammu and Kashmir, which
  /// the census did not cover.
  final String? censusDistrict;

  /// `true` when the district has lost area to a district created after the
  /// census: the figures are for the district as it was at the census.
  final bool boundaryChanged;

  /// Why figures are missing or what they cover, or `null`.
  final String? note;

  /// The census tables (dataset `district-population`).
  final DataSource source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'district': district,
        'province': province,
        'population': population,
        'households': households,
        'urban': urban,
        'rural': rural,
        'census': census,
        'censusDistrict': censusDistrict,
        'boundaryChanged': boundaryChanged,
        'note': note,
        'source': source.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is DistrictPopulation &&
      other.district == district &&
      other.province == province &&
      other.population == population &&
      other.households == households &&
      other.urban == urban &&
      other.rural == rural &&
      other.census == census &&
      other.censusDistrict == censusDistrict &&
      other.boundaryChanged == boundaryChanged &&
      other.note == note &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
        district,
        province,
        population,
        households,
        urban,
        rural,
        census,
        censusDistrict,
        boundaryChanged,
        note,
        source,
      );

  @override
  String toString() => 'DistrictPopulation${toJson()}';
}

/// Result of [getTehsilPopulation]: a tehsil's 2023 census counts.
class TehsilPopulation {
  /// Creates a tehsil population value.
  const TehsilPopulation({
    required this.tehsil,
    required this.censusDistrict,
    required this.currentDistrict,
    required this.province,
    required this.population,
    required this.households,
    required this.urban,
    required this.rural,
    this.census = 2023,
    required this.note,
    required this.source,
  });

  /// The tehsil (or taluka, sub-division), as the census tables name it.
  final String tehsil;

  /// The district at the census.
  final String censusDistrict;

  /// The district today, or `null` where the tehsil's current district is
  /// not recorded in the data.
  final String? currentDistrict;

  /// Its province or territory.
  final String province;

  /// Total population (all sexes).
  final int population;

  /// Households.
  final int households;

  /// Urban population.
  final int urban;

  /// Rural population.
  final int rural;

  /// Always `2023`: the 7th Population and Housing Census.
  final int census;

  /// What the figures cover, or `null`.
  final String? note;

  /// The census tables (dataset `tehsil-population`).
  final DataSource source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'tehsil': tehsil,
        'censusDistrict': censusDistrict,
        'currentDistrict': currentDistrict,
        'province': province,
        'population': population,
        'households': households,
        'urban': urban,
        'rural': rural,
        'census': census,
        'note': note,
        'source': source.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is TehsilPopulation &&
      other.tehsil == tehsil &&
      other.censusDistrict == censusDistrict &&
      other.currentDistrict == currentDistrict &&
      other.province == province &&
      other.population == population &&
      other.households == households &&
      other.urban == urban &&
      other.rural == rural &&
      other.census == census &&
      other.note == note &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
        tehsil,
        censusDistrict,
        currentDistrict,
        province,
        population,
        households,
        urban,
        rural,
        census,
        note,
        source,
      );

  @override
  String toString() => 'TehsilPopulation${toJson()}';
}

// Only the population functions reference the census tables, so builds that
// do not call them leave them out. The data files call the census district
// `inCensusDistrict`.
final Map<String, DistrictPopulation> _districts = {
  for (final e in districtPopulationJson.cast<Map<String, Object?>>())
    normalizeKey(e['district']! as String): DistrictPopulation(
      district: e['district']! as String,
      province: e['province']! as String,
      population: e['population'] as int?,
      households: e['households'] as int?,
      urban: e['urban'] as int?,
      rural: e['rural'] as int?,
      censusDistrict: e['inCensusDistrict'] as String?,
      boundaryChanged: e['boundaryChanged'] == true,
      note: e['note'] as String?,
      source: _source('district-population'),
    ),
};

final Map<String, List<TehsilPopulation>> _tehsils = () {
  final map = <String, List<TehsilPopulation>>{};
  for (final e in tehsilPopulationJson.cast<Map<String, Object?>>()) {
    final tehsil = TehsilPopulation(
      tehsil: e['tehsil']! as String,
      censusDistrict: e['inCensusDistrict']! as String,
      currentDistrict: e['currentDistrict'] as String?,
      province: e['province']! as String,
      population: e['population']! as int,
      households: e['households']! as int,
      urban: e['urban']! as int,
      rural: e['rural']! as int,
      note: e['note'] as String?,
      source: _source('tehsil-population'),
    );
    (map[normalizeKey(tehsil.tehsil)] ??= []).add(tehsil);
  }
  return map;
}();

/// A district's population, households and urban/rural split from
/// Pakistan's 2023 census (Pakistan Bureau of Statistics), for any of the
/// 177 districts in `getDistrictsByProvince`.
///
/// - Districts created after the census have `null` figures and name the
///   census district their area was part of; nothing is estimated.
/// - Districts that lost area to a new district keep their census figures,
///   with [DistrictPopulation.boundaryChanged] `true`.
/// - Gilgit-Baltistan and Azad Jammu and Kashmir were not enumerated by this
///   census, so their figures are `null`.
///
/// [district] is a district name, in any case.
///
/// Returns the figures and their source, or `null` for an unknown district.
/// Never throws.
///
/// ```dart
/// getDistrictPopulation('Lahore')?.population; // 13004135
/// getDistrictPopulation('Murree')?.population; // null (created after the census)
/// ```
DistrictPopulation? getDistrictPopulation(String district) =>
    _districts[normalizeKey(district)];

/// A tehsil's (or taluka's, sub-division's) population, households and
/// urban/rural split from the 2023 census, for the 591 units in the census
/// tables.
///
/// [tehsil] is a tehsil name, in any case. A few names occur in more than
/// one district; give [district] (at the census or today) to choose.
///
/// Returns the figures and their source, or `null` for an unknown or
/// ambiguous name. Never throws.
///
/// ```dart
/// getTehsilPopulation('Murree')?.currentDistrict; // 'Murree'
/// ```
TehsilPopulation? getTehsilPopulation(String tehsil, [String? district]) {
  var rows = _tehsils[normalizeKey(tehsil)] ?? const <TehsilPopulation>[];
  if (district != null) {
    final d = normalizeKey(district);
    rows = [
      for (final r in rows)
        if (normalizeKey(r.censusDistrict) == d ||
            (r.currentDistrict != null &&
                normalizeKey(r.currentDistrict!) == d))
          r,
    ];
  }
  return rows.length == 1 ? rows.first : null;
}
