import 'data/post_offices.g.dart';
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

/// A delivery post office from Pakistan Post's post code directory.
class PostOffice {
  /// Creates a post office value.
  const PostOffice({
    required this.code,
    required this.office,
    required this.town,
    this.district,
    required this.province,
  });

  /// 5-digit post code, e.g. `48330`.
  final String code;

  /// Office name as the directory gives it, in title case, e.g. `Dulmial`.
  final String office;

  /// The city the office belongs to when that is known (`Lahore` for an
  /// office in Lahore); otherwise the office's own name, which for most
  /// offices is its town or village.
  final String town;

  /// The district, when the town is the headquarters a district is named
  /// after; otherwise `null`. The directory has no district column.
  final String? district;

  /// Province or territory.
  final String province;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'code': code,
        'office': office,
        'town': town,
        'district': district,
        'province': province,
      };

  @override
  bool operator ==(Object other) =>
      other is PostOffice &&
      other.code == code &&
      other.office == office &&
      other.town == town &&
      other.district == district &&
      other.province == province;

  @override
  int get hashCode => Object.hash(code, office, town, district, province);

  @override
  String toString() => 'PostOffice${toJson()}';
}

// Only getPostOffice and searchPostOffices reference the directory, so
// builds that do not call them leave it out.
final List<PostOffice> _postOffices = List.unmodifiable([
  for (final e in postOfficesJson.cast<Map<String, Object?>>())
    PostOffice(
      code: e['code']! as String,
      office: e['office']! as String,
      town: e['town']! as String,
      district: e['district'] as String?,
      province: e['province']! as String,
    ),
]);

final Map<String, PostOffice> _postOfficeByCode = {
  for (final office in _postOffices) office.code: office,
};

/// Returns the delivery post office for a post code (whitespace is ignored),
/// from Pakistan Post's directory of about 2,560 offices, or `null` if the
/// code is not in the directory.
///
/// Unlike [getCityByPostalCode], which only answers for codes in the cities
/// pakdatakit lists, this knows every delivery office, including those in
/// towns and villages.
///
/// ```dart
/// getPostOffice('48330');
/// // PostOffice{code: 48330, office: Dulmial, town: Dulmial, district: null, province: Punjab}
/// ```
PostOffice? getPostOffice(String code) {
  final key = jsTrim(code).replaceAll(_whitespaceRun, '');
  if (key.isEmpty) return null;
  return _postOfficeByCode[key];
}

/// Searches Pakistan Post's directory by office name, town or post code.
///
/// Matching is case-insensitive: an office matches when its name or town
/// contains the query, or its code starts with it. Results are sorted by
/// post code.
List<PostOffice> searchPostOffices(String query) {
  final key = normalizeKey(query);
  if (key.isEmpty) return [];
  final codePrefix = jsTrim(query);
  return [
    for (final office in _postOffices)
      if (normalizeKey(office.office).contains(key) ||
          normalizeKey(office.town).contains(key) ||
          office.code.startsWith(codePrefix))
        office,
  ];
}
