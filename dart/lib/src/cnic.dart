import 'internal/js.dart';
import 'internal/normalize.dart';

/// 13 digits, optionally grouped as `#####-#######-#` with a dash, dash-like
/// character, dot, or space between the groups. The first digit is the
/// province code (1–8), so a leading 0 or 9 is rejected.
final RegExp _cnicPattern = RegExp(r'^[1-8]\d{4}([-‐‑‒–—. ]?)\d{7}\1\d$');
final RegExp _nonDigit = RegExp(r'\D');

/// Province of registration encoded in a CNIC's first digit.
const Map<String, String> _cnicProvinces = {
  '1': 'Khyber Pakhtunkhwa',
  '2': 'Khyber Pakhtunkhwa',
  '3': 'Punjab',
  '4': 'Sindh',
  '5': 'Balochistan',
  '6': 'Islamabad Capital Territory',
  '7': 'Gilgit-Baltistan',
  '8': 'Azad Jammu and Kashmir',
};

/// Gender encoded in the last digit of a CNIC.
enum Gender {
  /// Odd last digit.
  male('male'),

  /// Even last digit.
  female('female');

  const Gender(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Information encoded in a CNIC number. See [getCNICInfo].
class CNICInfo {
  /// Creates a CNIC info value.
  const CNICInfo({
    required this.digits,
    required this.formatted,
    required this.province,
    required this.gender,
  });

  /// The CNIC as 13 digits without separators.
  final String digits;

  /// The CNIC in `#####-#######-#` form.
  final String formatted;

  /// Province where the CNIC was first registered (from the first digit).
  /// This is not necessarily where the holder lives now.
  final String province;

  /// Gender encoded in the last digit: odd for male, even for female.
  final Gender gender;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'digits': digits,
        'formatted': formatted,
        'province': province,
        'gender': gender.value,
      };

  @override
  bool operator ==(Object other) =>
      other is CNICInfo &&
      other.digits == digits &&
      other.formatted == formatted &&
      other.province == province &&
      other.gender == gender;

  @override
  int get hashCode => Object.hash(digits, formatted, province, gender);

  @override
  String toString() => 'CNICInfo${toJson()}';
}

/// Validates a Pakistani CNIC number.
///
/// Accepts `3520212345671`, `35202-1234567-1`, `35202 1234567 1` and Urdu
/// digits. Separators must sit between the 5-7-1 digit groups and be used
/// consistently.
///
/// NADRA does not publish a check-digit algorithm, so this validates
/// structure only.
bool validateCNIC(String cnic) =>
    _cnicPattern.hasMatch(toAsciiDigits(jsTrim(cnic)));

/// Reads the province of registration and gender encoded in a CNIC.
///
/// Returns `null` if the CNIC is invalid (see [validateCNIC]).
CNICInfo? getCNICInfo(String cnic) {
  if (!validateCNIC(cnic)) return null;
  final digits = toAsciiDigits(cnic).replaceAll(_nonDigit, '');
  final last = int.parse(digits[12]);
  return CNICInfo(
    digits: digits,
    formatted:
        '${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits[12]}',
    province: _cnicProvinces[digits[0]]!,
    gender: last.isOdd ? Gender.male : Gender.female,
  );
}
