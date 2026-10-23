import 'internal/data.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

final Map<String, String> _cityLookup = {
  for (final e in cities) normalizeKey(e.city): e.province,
};

final Map<String, String> _districtLookup = {
  for (final e in districts) normalizeKey(e.district): e.province,
};

/// Districts that were split or renamed, so names stored before the change
/// still resolve. They are not listed by [searchDistricts] or
/// [getDistrictsByProvince].
const Map<String, String> _formerDistricts = {
  // Split into Lower and Upper South Waziristan (2022).
  'south waziristan': 'Khyber Pakhtunkhwa',
  // Split into Quetta East and Quetta West (2026).
  'quetta': 'Balochistan',
  // Became South Dera Bugti; Upper Dera Bugti became North Dera Bugti (2026).
  'dera bugti': 'Balochistan',
  'upper dera bugti': 'Balochistan',
};

/// Returns the province for a Pakistani city name.
///
/// Matching is case-insensitive and ignores inconsistent spacing. Returns
/// `null` when no exact city match is found.
String? getProvince(String city) {
  final key = normalizeKey(city);
  if (key.isEmpty) return null;
  return _cityLookup[key];
}

/// Searches cities by partial, case-insensitive name; sorted alphabetically.
List<String> searchCities(String query) {
  final q = normalizeKey(query);
  if (q.isEmpty) return [];
  return localeSorted(unique([
    for (final e in cities)
      if (normalizeKey(e.city).contains(q)) e.city,
  ]));
}

/// Returns the province for a Pakistani district name, or `null`.
///
/// Matching is case-insensitive and ignores inconsistent spacing. Names of
/// districts that were split or renamed still resolve.
String? getDistrictProvince(String district) {
  final key = normalizeKey(district);
  if (key.isEmpty) return null;
  return _districtLookup[key] ?? _formerDistricts[key];
}

/// Searches districts by partial, case-insensitive name; sorted
/// alphabetically.
List<String> searchDistricts(String query) {
  final q = normalizeKey(query);
  if (q.isEmpty) return [];
  return localeSorted(unique([
    for (final e in districts)
      if (normalizeKey(e.district).contains(q)) e.district,
  ]));
}

/// Returns all districts of a province (case-insensitive), sorted
/// alphabetically.
List<String> getDistrictsByProvince(String province) {
  final key = normalizeKey(province);
  if (key.isEmpty) return [];
  return localeSorted([
    for (final e in districts)
      if (normalizeKey(e.province) == key) e.district,
  ]);
}
