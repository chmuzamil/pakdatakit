import 'internal/data.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

final RegExp _whitespaceRun = RegExp('[$ws]+');

final Map<String, String> _postalByCode = {
  for (final e in postalCodes) e.postalCode: e.city,
};

final Map<String, String> _postalByCity = () {
  final map = <String, String>{};
  for (final e in postalCodes) {
    final key = normalizeKey(e.city);
    if (!map.containsKey(key) || e.primary) map[key] = e.postalCode;
  }
  return map;
}();

/// Returns the city for a Pakistani postal code (whitespace is ignored), or
/// `null` if not found.
String? getCityByPostalCode(String postalCode) {
  final code = jsTrim(postalCode).replaceAll(_whitespaceRun, '');
  if (code.isEmpty) return null;
  return _postalByCode[code];
}

/// Returns the primary (GPO) postal code for a Pakistani city, or `null`.
///
/// Matching is case-insensitive and whitespace-tolerant.
String? getPostalCode(String city) {
  final key = normalizeKey(city);
  if (key.isEmpty) return null;
  return _postalByCity[key];
}

/// Returns all known postal codes for a city (case-insensitive), sorted.
List<String> getPostalCodes(String city) {
  final key = normalizeKey(city);
  if (key.isEmpty) return [];
  return localeSorted([
    for (final e in postalCodes)
      if (normalizeKey(e.city) == key) e.postalCode,
  ]);
}

/// Searches postal entries by city name, area, or postal code prefix, and
/// returns the matching postal codes, sorted.
List<String> searchPostalCodes(String query) {
  final normalizedQuery = normalizeKey(query);
  if (normalizedQuery.isEmpty) return [];
  final prefix = jsTrim(query);
  return localeSorted(unique([
    for (final e in postalCodes)
      if (normalizeKey(e.city).contains(normalizedQuery) ||
          (e.area != null && e.area!.isNotEmpty ? normalizeKey(e.area!) : '')
              .contains(normalizedQuery) ||
          e.postalCode.startsWith(prefix))
        e.postalCode,
  ]));
}

/// Returns the known area names of a city's postal entries, sorted.
List<String> getPostalAreas(String city) {
  final key = normalizeKey(city);
  if (key.isEmpty) return [];
  return localeSorted([
    for (final e in postalCodes)
      if (normalizeKey(e.city) == key && e.area != null && e.area!.isNotEmpty)
        e.area!,
  ]);
}
