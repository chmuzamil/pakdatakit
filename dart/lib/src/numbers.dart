import 'internal/data.dart';
import 'internal/equality.dart';
import 'internal/normalize.dart';
import 'internal/phone_utils.dart';

/// Kind of Pakistani telephone number.
enum NumberType {
  /// Mobile number (`03XX`).
  mobile('mobile'),

  /// Landline (fixed-line) number.
  landline('landline'),

  /// Universal Access Number (`111`).
  uan('uan'),

  /// Toll-free number (`0800`).
  tollFree('toll-free'),

  /// Premium-rate number (`0900`).
  premium('premium'),

  /// Personal number (`0122`).
  personal('personal');

  const NumberType(this.value);

  /// The value used by the npm package, e.g. `"toll-free"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Result of [analyzeNumber].
class NumberInfo {
  /// Creates a number info value.
  const NumberInfo({
    required this.type,
    required this.formatted,
    required this.e164,
    this.areaCode,
    this.cities = const [],
  });

  /// Kind of number.
  final NumberType type;

  /// National format with trunk prefix and separators, e.g.
  /// `021-111-825-888`.
  final String formatted;

  /// E.164 format; `null` for a UAN dialled without an area code.
  final String? e164;

  /// Area code with trunk prefix (e.g. `021`) for landlines and UANs.
  final String? areaCode;

  /// Cities served by the area code, when known.
  final List<String> cities;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'type': type.value,
        'formatted': formatted,
        'e164': e164,
        'areaCode': areaCode,
        'cities': List.of(cities),
      };

  @override
  bool operator ==(Object other) =>
      other is NumberInfo &&
      other.type == type &&
      other.formatted == formatted &&
      other.e164 == e164 &&
      other.areaCode == areaCode &&
      listEquals(other.cities, cities);

  @override
  int get hashCode =>
      Object.hash(type, formatted, e164, areaCode, listHash(cities));

  @override
  String toString() => 'NumberInfo${toJson()}';
}

// Number patterns from Google libphonenumber's PK metadata (v9.0.41). They
// apply to the national significant number, without the trunk prefix 0.
final RegExp _fixedLine = RegExp(
  r'^(?:(?:(?:21|42)[2-9]|58[126])\d{7}|(?:2[25]|4[0146-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9]\d{6,7}|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8]))[2-9]\d{5,6})$',
);
final RegExp _uan = RegExp(
  r'^((?:2(?:[125]|3[2358]|4[2-4]|9[2-8])|4(?:[0-246-9]|5[3479])|5(?:[1-35-7]|4[2-467])|6(?:0[468]|[1-8])|7(?:[14]|2[236])|8(?:[16]|2[2-689]|3[23578]|4[3478]|5[2356])|9(?:1|22|3[27-9]|4[2-6]|6[3569]|9[2-7])))111(\d{6})$',
);
final RegExp _uanWithoutAreaCode = RegExp(r'^111(\d{6})$');
final RegExp _tollFree = RegExp(r'^800(\d{5}(?:\d{3})?)$');
final RegExp _premium = RegExp(r'^900(\d{5})$');
final RegExp _personal = RegExp(r'^122(\d{6})$');
final RegExp _national = RegExp(r'^\d{8,12}$');
final RegExp _digitGroup = RegExp(r'\d{1,3}');

final Map<String, List<String>> _areaCodeMap = {
  for (final e in areaCodes) e.code: e.cities,
};

/// Strips the country code and trunk prefix, leaving the national
/// significant number.
String? _toNationalNumber(String input) {
  var digits = stripSeparators(toAsciiDigits(input));
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
    if (!digits.startsWith('92')) return null;
    digits = digits.substring(2);
  } else if (digits.startsWith('0092')) {
    digits = digits.substring(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = digits.substring(2);
  }
  if (digits.startsWith('0')) digits = digits.substring(1);
  return _national.hasMatch(digits) ? digits : null;
}

/// Finds the longest known area code at the start of a national number.
String? _findAreaCode(String national) {
  for (var length = 4; length >= 2; length--) {
    if (national.length < length) continue;
    final prefix = national.substring(0, length);
    if (_areaCodeMap.containsKey(prefix)) return prefix;
  }
  return null;
}

String _groupDigits(String digits) {
  final groups = [for (final m in _digitGroup.allMatches(digits)) m[0]!];
  return groups.isEmpty ? digits : groups.join('-');
}

/// Identifies and formats any Pakistani telephone number: mobile, landline,
/// UAN (`111`), toll-free (`0800`), premium-rate (`0900`) or personal
/// (`0122`).
///
/// ```dart
/// analyzeNumber('021-111-825-888');
/// // type: uan, formatted: 021-111-825-888, e164: +9221111825888,
/// // areaCode: 021, cities: [Karachi]
/// ```
///
/// Returns `null` if it is not a valid Pakistani number.
NumberInfo? analyzeNumber(String phone) {
  final mobile = normalizePhoneDigits(phone);
  if (mobile != null) {
    final national = mobile.substring(2);
    return NumberInfo(
      type: NumberType.mobile,
      formatted: '0${national.substring(0, 3)}-${national.substring(3)}',
      e164: '+$mobile',
    );
  }

  final bareUan =
      _uanWithoutAreaCode.firstMatch(stripSeparators(toAsciiDigits(phone)));
  if (bareUan != null) {
    return NumberInfo(
      type: NumberType.uan,
      formatted: '111-${_groupDigits(bareUan[1]!)}',
      e164: null,
    );
  }

  final national = _toNationalNumber(phone);
  if (national == null) return null;

  NumberInfo service(NumberType type, String prefix, String rest) =>
      NumberInfo(type: type, formatted: '0$prefix-$rest', e164: '+92$national');

  final tollFree = _tollFree.firstMatch(national);
  if (tollFree != null) {
    return service(NumberType.tollFree, '800', tollFree[1]!);
  }
  final premium = _premium.firstMatch(national);
  if (premium != null) return service(NumberType.premium, '900', premium[1]!);
  final personal = _personal.firstMatch(national);
  if (personal != null) {
    return service(NumberType.personal, '122', personal[1]!);
  }

  final uan = _uan.firstMatch(national);
  if (uan != null) {
    final code = uan[1]!;
    return NumberInfo(
      type: NumberType.uan,
      formatted: '0$code-111-${_groupDigits(uan[2]!)}',
      e164: '+92$national',
      areaCode: '0$code',
      cities: _areaCodeMap[code] ?? const [],
    );
  }

  if (_fixedLine.hasMatch(national)) {
    final code = _findAreaCode(national);
    return NumberInfo(
      type: NumberType.landline,
      formatted: code != null
          ? '0$code-${national.substring(code.length)}'
          : '0$national',
      e164: '+92$national',
      areaCode: code != null ? '0$code' : null,
      cities: code != null ? (_areaCodeMap[code] ?? const []) : const [],
    );
  }

  return null;
}

/// Returns the type of a Pakistani telephone number, or `null` if it is not
/// a valid Pakistani number. See [analyzeNumber].
NumberType? getNumberType(String phone) => analyzeNumber(phone)?.type;

/// Validates a Pakistani landline (fixed-line) number such as
/// `042-35761234`.
bool validateLandline(String phone) =>
    getNumberType(phone) == NumberType.landline;

/// Returns the landline area code for a city, with trunk prefix (e.g.
/// `"042"`), or `null` if the city is not in the dataset. Case-insensitive.
String? getAreaCode(String city) {
  final key = normalizeKey(city);
  for (final entry in areaCodes) {
    if (entry.cities.any((name) => normalizeKey(name) == key)) {
      return '0${entry.code}';
    }
  }
  return null;
}
