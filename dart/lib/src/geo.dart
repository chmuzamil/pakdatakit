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
  // Notified as Bar Swat (2026); reported as Upper Swat before that.
  'upper swat': 'Khyber Pakhtunkhwa',
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

final Map<String, String> _divisionOfDistrict = {
  for (final e in divisions)
    for (final district in e.districts) normalizeKey(district): e.division,
};

final Set<String> _censusDistrictKeys = {
  for (final e in tehsils) normalizeKey(e.censusDistrict),
};

/// Returns the administrative divisions of Pakistan, or of one [province]
/// (case-insensitive), sorted alphabetically.
///
/// The list is the 30 divisions of the 2023 census: Punjab 9, Sindh 6, Khyber
/// Pakhtunkhwa 7 and Balochistan 8. Islamabad has no division, and the census
/// tables do not cover Azad Jammu and Kashmir or Gilgit-Baltistan. Divisions
/// created since the census (such as Gujrat in Punjab) are not included.
List<String> getDivisions([String? province]) {
  if (province == null) {
    return localeSorted([for (final e in divisions) e.division]);
  }
  final key = normalizeKey(province);
  if (key.isEmpty) return [];
  return localeSorted([
    for (final e in divisions)
      if (normalizeKey(e.province) == key) e.division,
  ]);
}

/// Returns the division a district belonged to in the 2023 census, or `null`
/// if not known. Matching is case-insensitive.
///
/// Census-district caveat: only the 136 districts of the 2023 census have a
/// division here, under the name they had then (so `Quetta`, `Dera Bugti` and
/// `South Waziristan` work, and their successors do not). Districts created
/// after the census, and those of Azad Jammu and Kashmir, Gilgit-Baltistan and
/// Islamabad, return `null`.
String? getDivisionOfDistrict(String district) {
  final key = normalizeKey(district);
  if (key.isEmpty) return null;
  return _divisionOfDistrict[key];
}

/// Returns the tehsils (talukas, sub-divisions) of a district, sorted
/// alphabetically. Matching is case-insensitive; former district names such
/// as `Quetta` and `South Waziristan` work.
///
/// Census-district caveat: the data is the 591 tehsil-level units of the 2023
/// census, each recorded under the district it was in then. For a district of
/// the 2023 census this returns its census tehsils, even if some have since
/// moved to a new district (so `Rawalpindi` still lists Murree). For a
/// district created after the census it returns only the tehsils an official
/// source places in it, which can be an empty list. Azad Jammu and Kashmir
/// and Gilgit-Baltistan are not covered.
List<String> getTehsils(String district) {
  final key = normalizeKey(district);
  if (key.isEmpty) return [];
  final inCensus = _censusDistrictKeys.contains(key);
  return localeSorted([
    for (final e in tehsils)
      if (inCensus
          ? normalizeKey(e.censusDistrict) == key
          : e.currentDistrict != null &&
              normalizeKey(e.currentDistrict!) == key)
        e.tehsil,
  ]);
}

/// Returns the district a tehsil (taluka, sub-division) was in at the 2023
/// census, or `null`. Matching is case-insensitive.
///
/// Census-district caveat: the result is the census district, which may have
/// been split since (a tehsil of `Quetta` is now in Quetta East or Quetta
/// West). A few names are shared by tehsils in different districts (`Saddar`,
/// `Sahiwal`, `Khanpur`); pass the [province] to tell them apart. Returns
/// `null` when the name is unknown or still matches more than one district.
String? getTehsilDistrict(String tehsil, [String? province]) {
  final key = normalizeKey(tehsil);
  if (key.isEmpty) return null;
  final provinceKey = province == null ? null : normalizeKey(province);
  final matches = {
    for (final e in tehsils)
      if (normalizeKey(e.tehsil) == key &&
          (provinceKey == null || normalizeKey(e.province) == provinceKey))
        e.censusDistrict,
  };
  return matches.length == 1 ? matches.first : null;
}
