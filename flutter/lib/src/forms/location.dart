import 'package:pakdatakit/geo.dart';

/// Options for the cascading province, district, tehsil and city fields of
/// the checkout and KYC forms, from `package:pakdatakit/geo.dart`.
///
/// Use it to build your own form markup with the same cascade:
///
/// ```dart
/// PakLocation.provinces;                 // the 7 provinces and territories
/// PakLocation.districts('Punjab');       // districts of a province
/// PakLocation.tehsils('Lahore');         // tehsils of a district
/// PakLocation.cities('Punjab', 'lah');   // city suggestions in a province
/// ```
abstract final class PakLocation {
  /// The provinces and territories, as named in the data.
  static const List<String> provinces = [
    'Punjab',
    'Sindh',
    'Khyber Pakhtunkhwa',
    'Balochistan',
    'Islamabad Capital Territory',
    'Gilgit-Baltistan',
    'Azad Jammu and Kashmir',
  ];

  /// Districts of [province] (empty when [province] is `null` or unknown),
  /// using `getDistrictsByProvince`.
  static List<String> districts(String? province) =>
      province == null || province.isEmpty
          ? const []
          : getDistrictsByProvince(province);

  /// Tehsils of [district] (empty when [district] is `null` or unknown),
  /// using `getTehsils`.
  static List<String> tehsils(String? district) =>
      district == null || district.isEmpty ? const [] : getTehsils(district);

  /// City suggestions for [query], limited to cities in [province].
  ///
  /// The data has no city-to-district mapping, so the city is free text and
  /// these are only suggestions: `searchCities(query)` filtered to
  /// `getProvince(city) == province`. Returns at most [limit] names, and
  /// nothing for an empty query.
  static List<String> cities(String? province, String query, {int limit = 8}) {
    if (query.trim().isEmpty) return const [];
    return searchCities(query)
        .where((city) => province == null || getProvince(city) == province)
        .take(limit)
        .toList();
  }
}
