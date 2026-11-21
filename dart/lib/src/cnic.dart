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

/// Validates the format of a Pakistani CNIC number: 13 digits, in 5-7-1
/// groups or together, starting with a province code from 1 to 8.
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

/// One digit: ASCII, Urdu (U+06F0-06F9) or Arabic-Indic (U+0660-0669).
const String _anyDigit = r'[0-9\u06F0-\u06F9\u0660-\u0669]';

/// A CNIC separator: a hyphen or dash, a dot, or a space.
const String _cnicSeparator = r'[-\u2010\u2011\u2012\u2013\u2014. ]';

/// A CNIC in running text: a province digit (1-8), then 4, 7 and 1 more
/// digits with an optional separator between the groups (the two may
/// differ), not touching another digit on either side.
final RegExp _cnicInText = RegExp(
  '(?<!$_anyDigit)'
  r'[1-8\u06F1-\u06F8\u0661-\u0668]'
  '$_anyDigit{4}$_cnicSeparator?$_anyDigit{7}$_cnicSeparator?$_anyDigit'
  '(?!$_anyDigit)',
);
final RegExp _anyDigitPattern = RegExp(_anyDigit);

/// A CNIC found by [findCNICs].
class CNICMatch {
  /// Creates a CNIC match.
  const CNICMatch({
    required this.raw,
    required this.digits,
    required this.formatted,
    required this.start,
    required this.end,
  });

  /// The text as written, e.g. `35202 1234567-1` or with Urdu digits.
  final String raw;

  /// The 13 digits, in ASCII.
  final String digits;

  /// The CNIC in `#####-#######-#` form.
  final String formatted;

  /// Offset of the first character in the text (UTF-16 code units, the
  /// index `String.substring` takes).
  final int start;

  /// Offset just after the last character (UTF-16 code units), so
  /// `text.substring(start, end) == raw`.
  final int end;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'raw': raw,
        'digits': digits,
        'formatted': formatted,
        'start': start,
        'end': end,
      };

  @override
  bool operator ==(Object other) =>
      other is CNICMatch &&
      other.raw == raw &&
      other.digits == digits &&
      other.formatted == formatted &&
      other.start == start &&
      other.end == end;

  @override
  int get hashCode => Object.hash(raw, digits, formatted, start, end);

  @override
  String toString() => 'CNICMatch${toJson()}';
}

/// Result of [maskCNICs].
class MaskedText {
  /// Creates a masked text value.
  const MaskedText({required this.text, required this.count});

  /// The text with every CNIC's digits masked; separators are kept.
  final String text;

  /// How many CNICs were masked.
  final int count;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'text': text, 'count': count};

  @override
  bool operator ==(Object other) =>
      other is MaskedText && other.text == text && other.count == count;

  @override
  int get hashCode => Object.hash(text, count);

  @override
  String toString() => 'MaskedText${toJson()}';
}

/// Finds CNIC numbers in free text, such as a chat message, a note or an
/// uploaded document, for example to mask them before logging.
///
/// A match is 13 digits whose first digit is a province code (1-8), written
/// together or in 5-7-1 groups with a hyphen, dash, dot or space between the
/// groups (the two separators may differ). Digits may be ASCII, Urdu or
/// Arabic-Indic, even mixed. A match never starts or ends next to another
/// digit, so a longer number is not cut into a CNIC.
///
/// This is looser than [validateCNIC], which needs the same separator
/// twice: text is written carelessly. It is a pattern match, so any other
/// 13-digit number that starts with 1-8 (an account or order number, say)
/// also matches.
///
/// Offsets are UTF-16 code units, so `text.substring(m.start, m.end)` is
/// `m.raw`.
///
/// ```dart
/// findCNICs('CNIC: 35202-1234567-1, phone 0300-1234567');
/// // [CNICMatch(raw: 35202-1234567-1, digits: 3520212345671,
/// //   formatted: 35202-1234567-1, start: 6, end: 21)]
/// ```
///
/// Returns the matches in order, or an empty list. Never throws.
List<CNICMatch> findCNICs(String text) => [
      for (final match in _cnicInText.allMatches(text))
        _toMatch(match[0]!, match.start),
    ];

CNICMatch _toMatch(String raw, int start) {
  final digits = toAsciiDigits(raw).replaceAll(_nonDigit, '');
  return CNICMatch(
    raw: raw,
    digits: digits,
    formatted:
        '${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits[12]}',
    start: start,
    end: start + raw.length,
  );
}

/// Masks every CNIC in free text, as found by [findCNICs]: each digit
/// becomes [mask] and the separators stay, so `35202-1234567-1` becomes
/// `XXXXX-XXXXXXX-X`. The rest of the text is unchanged.
///
/// Like [findCNICs], it also masks any other 13-digit number that starts
/// with 1-8.
///
/// ```dart
/// maskCNICs('My CNIC is 35202-1234567-1');
/// // MaskedText(text: 'My CNIC is XXXXX-XXXXXXX-X', count: 1)
/// maskCNICs('35202 1234567 1', mask: '*');
/// // MaskedText(text: '***** ******* *', count: 1)
/// ```
///
/// [mask] is the string that replaces each digit (default `'X'`). Returns
/// the masked text and the number of CNICs masked. Never throws.
MaskedText maskCNICs(String text, {String mask = 'X'}) {
  var count = 0;
  final masked = text.replaceAllMapped(_cnicInText, (match) {
    count += 1;
    return match[0]!.replaceAll(_anyDigitPattern, mask);
  });
  return MaskedText(text: masked, count: count);
}
