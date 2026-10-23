import 'geo.dart';
import 'internal/data.dart';
import 'internal/equality.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';
import 'postal.dart';

/// Longest names first so "Dera Ghazi Khan" wins over "Ghazi".
int _byLengthDesc(String a, String b) => b.length - a.length;

final List<String> _cityNames =
    stableSorted([for (final e in cities) e.city], _byLengthDesc);

final List<String> _districtNames =
    stableSorted([for (final e in districts) e.district], _byLengthDesc);

const List<String> _provinces = [
  'Islamabad Capital Territory',
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Punjab',
  'Sindh',
];

/// Words that mark a following 5-digit number as something other than a
/// postal code.
final RegExp _nonPostalPrefix = RegExp(
  '(?:\\b(?:p\\.?[$ws]*o\\.?[$ws]*box|box|house|h\\.?[$ws]*no\\.?|plot|'
  'street|st\\.?|flat|shop|office|suite|no\\.?)|#)[$ws]*\$',
  caseSensitive: false,
);

final RegExp _postalCandidate = RegExp(r'(?<![\w#/-])([1-9]\d{4})(?![\w/-])');

/// Parsed components of a Pakistani mailing address. See [parseAddress].
class ParsedAddress {
  /// Creates a parsed address.
  const ParsedAddress({
    required this.raw,
    this.street,
    this.area,
    this.city,
    this.district,
    this.province,
    this.postalCode,
    this.warnings = const [],
  });

  /// The input with whitespace normalized.
  final String raw;

  /// First remaining segment, e.g. `"House 12"`.
  final String? street;

  /// Other remaining segments, comma-separated.
  final String? area;

  /// Matched city.
  final String? city;

  /// Matched district.
  final String? district;

  /// Matched or inferred province.
  final String? province;

  /// 5-digit postal code.
  final String? postalCode;

  /// Inconsistencies found while parsing, e.g. a city in a different
  /// province.
  final List<String> warnings;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'raw': raw,
        'street': street,
        'area': area,
        'city': city,
        'district': district,
        'province': province,
        'postalCode': postalCode,
        'warnings': List.of(warnings),
      };

  @override
  bool operator ==(Object other) =>
      other is ParsedAddress &&
      other.raw == raw &&
      other.street == street &&
      other.area == area &&
      other.city == city &&
      other.district == district &&
      other.province == province &&
      other.postalCode == postalCode &&
      listEquals(other.warnings, warnings);

  @override
  int get hashCode => Object.hash(raw, street, area, city, district, province,
      postalCode, listHash(warnings));

  @override
  String toString() => 'ParsedAddress${toJson()}';
}

/// Parses a free-form Pakistani address into structured components.
///
/// Extracts the postal code, matches known cities, districts and provinces
/// from the datasets, and assigns the remaining segments to [ParsedAddress.street]
/// and [ParsedAddress.area]. Works with or without commas between components.
ParsedAddress parseAddress(String address) {
  final raw = normalizeWhitespace(address);
  if (raw.isEmpty) return ParsedAddress(raw: raw);

  final warnings = <String>[];
  var working = raw;
  final postalMatch = _findPostalCode(working);
  final postalCode = postalMatch?.code;
  if (postalMatch != null) {
    working = '${working.substring(0, postalMatch.index)} '
        '${working.substring(postalMatch.index + postalMatch.code.length)}';
  }

  final segments = [
    for (final part in working.split(','))
      if (normalizeWhitespace(part).isNotEmpty) normalizeWhitespace(part),
  ];

  String? province;
  String? city;
  String? district;

  // Match whole segments first, from the end of the address.
  for (var i = segments.length - 1; i >= 0; i--) {
    final segment = segments[i];

    final matchedProvince =
        province == null ? _matchExact(segment, _provinces) : null;
    if (matchedProvince != null) {
      province = matchedProvince;
      segments[i] = '';
      continue;
    }

    final matchedCity = city == null ? _matchExact(segment, _cityNames) : null;
    if (matchedCity != null) {
      city = matchedCity;
      segments[i] = '';
      continue;
    }

    final matchedDistrict =
        district == null ? _matchExact(segment, _districtNames) : null;
    if (matchedDistrict != null) {
      district = matchedDistrict;
      segments[i] = '';
    }
  }

  // Then look for names at the end of a segment ("12 Model Town Lahore").
  for (var i = segments.length - 1; i >= 0; i--) {
    if (province == null) {
      final found = _matchTrailing(segments[i], _provinces);
      if (found != null) {
        province = found.match;
        segments[i] = found.rest;
      }
    }
    if (city == null) {
      final found = _matchTrailing(segments[i], _cityNames);
      if (found != null) {
        city = found.match;
        segments[i] = found.rest;
      }
    }
  }

  if (city == null && district != null) city = district;
  if (postalCode != null && city == null) {
    city = getCityByPostalCode(postalCode);
  }

  final inferredProvince = city != null
      ? (getProvince(city) ?? getDistrictProvince(city))
      : district != null
          ? getDistrictProvince(district)
          : null;

  if (province == null) {
    province = inferredProvince;
  } else if (inferredProvince != null && inferredProvince != province) {
    warnings.add(
      '${city ?? district} is in $inferredProvince, '
      'but the address says $province',
    );
  }

  final remaining = [
    for (final part in segments)
      if (part.isNotEmpty) part,
  ];

  return ParsedAddress(
    raw: raw,
    street: remaining.isEmpty ? null : remaining.first,
    area: remaining.length > 1 ? remaining.sublist(1).join(', ') : null,
    city: city,
    district: district,
    province: province,
    postalCode: postalCode,
    warnings: List.unmodifiable(warnings),
  );
}

/// Formats address components into a single mailing line, such as
/// `"House 12, Model Town, Lahore, Punjab 54000"`.
///
/// Only the components given are included; no postal code is invented.
/// [city] is used in preference to [district]. Returns [raw] (or `""`) when
/// no component is given. Pass the fields of a [ParsedAddress] to reformat
/// it.
String formatAddress({
  String? raw,
  String? street,
  String? area,
  String? city,
  String? district,
  String? province,
  String? postalCode,
}) {
  final segments = [
    for (final part in [street, area, city ?? district, province])
      if (part != null && part.isNotEmpty) part,
  ];
  var formatted = segments.join(', ');
  if (postalCode != null && postalCode.isNotEmpty) {
    formatted = formatted.isNotEmpty ? '$formatted $postalCode' : postalCode;
  }
  return formatted.isNotEmpty ? formatted : (raw ?? '');
}

/// Finds the last standalone 5-digit number that is not a house, plot, box
/// or street number.
({String code, int index})? _findPostalCode(String text) {
  ({String code, int index})? result;
  for (final match in _postalCandidate.allMatches(text)) {
    final before = text.substring(0, match.start);
    if (!_nonPostalPrefix.hasMatch(before)) {
      result = (code: match[1]!, index: match.start);
    }
  }
  return result;
}

String? _matchExact(String segment, List<String> options) {
  final key = normalizeKey(segment);
  if (key.isEmpty) return null;
  for (final option in options) {
    if (normalizeKey(option) == key) return option;
  }
  return null;
}

({String match, String rest})? _matchTrailing(
  String segment,
  List<String> options,
) {
  final key = normalizeKey(segment);
  for (final option in options) {
    if (key.endsWith(' ${normalizeKey(option)}')) {
      return (
        match: option,
        rest: normalizeWhitespace(
          jsSlice(segment, 0, segment.length - option.length),
        ),
      );
    }
  }
  return null;
}
