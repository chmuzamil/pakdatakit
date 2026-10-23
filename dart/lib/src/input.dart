import 'cnic.dart';
import 'iban.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';
import 'internal/phone_utils.dart';

/// State of a form field while the user is typing.
enum InputState {
  /// Nothing entered yet.
  empty('empty'),

  /// What has been typed so far can still become valid.
  incomplete('incomplete'),

  /// Complete and valid.
  valid('valid'),

  /// Cannot become valid by typing more (wrong character, prefix or length).
  invalid('invalid');

  const InputState(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Characters people use between groups of digits.
final RegExp _separators = RegExp('[$ws\\-‐‑‒–—./()]');
final RegExp _nonDigit = RegExp(r'\D');
final RegExp _digitsOnly = RegExp(r'^\d+$');
final RegExp _provinceStart = RegExp('^[1-8]');
final RegExp _phoneShape = RegExp(r'^\+?\d*$');
final RegExp _nonAlphanumeric = RegExp('[^A-Z0-9]');
final RegExp _groupOfFour = RegExp('(.{4})(?=.)');
final RegExp _ibanSpacing = RegExp('[$ws-]');

/// What each position of a Pakistani IBAN may hold.
final RegExp _ibanShape = RegExp(
  r'^(P(K(\d(\d([A-Z]([A-Z]([A-Z]([A-Z]([A-Z0-9]{0,16})?)?)?)?)?)?)?)?)?$',
);

String _take(String text, int count) =>
    text.length > count ? text.substring(0, count) : text;

/// Formats a CNIC as the user types: `35202-1234567-1`.
///
/// Keeps up to 13 digits (Urdu digits are converted) and inserts the dashes
/// as the groups fill. Other characters are dropped.
String formatCNICInput(String value) {
  final digits = _take(toAsciiDigits(value).replaceAll(_nonDigit, ''), 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) {
    return '${digits.substring(0, 5)}-${digits.substring(5)}';
  }
  return '${digits.substring(0, 5)}-${digits.substring(5, 12)}-'
      '${digits.substring(12)}';
}

/// Checks a CNIC while the user is typing.
///
/// ```dart
/// checkCNICInput('35202-12');        // InputState.incomplete
/// checkCNICInput('35202-1234567-1'); // InputState.valid
/// checkCNICInput('05202');           // InputState.invalid
/// ```
InputState checkCNICInput(String value) {
  final text = toAsciiDigits(value).replaceAll(_separators, '');
  if (text.isEmpty) return InputState.empty;
  if (!_digitsOnly.hasMatch(text) || text.length > 13) {
    return InputState.invalid;
  }
  if (!_provinceStart.hasMatch(text)) return InputState.invalid;
  if (text.length < 13) return InputState.incomplete;
  return validateCNIC(text) ? InputState.valid : InputState.invalid;
}

/// Phone input split into the mobile number without its leading 0
/// ([national]) and whether a country code was typed. [incomplete] is set
/// while the country code is still being typed.
typedef _Split = ({String national, bool international, bool incomplete});

/// Splits phone input; `null` when the start cannot be a Pakistani number.
_Split? _splitPhone(String value) {
  final text = toAsciiDigits(value).replaceAll(_separators, '');
  if (!_phoneShape.hasMatch(text)) return null;

  for (final code in const ['+92', '0092', '92']) {
    if (code.startsWith(text) && text.length < code.length) {
      // "0" and "9" could also be the start of a local or short number.
      return (
        national: '',
        international: false,
        incomplete: text != '0',
      );
    }
    // Mobile numbers start with 3, so a leading 92 is always the country
    // code.
    if (text.startsWith(code)) {
      final rest = text.substring(code.length);
      return (
        national: rest.startsWith('0') ? rest.substring(1) : rest,
        international: true,
        incomplete: false,
      );
    }
  }
  if (text.startsWith('+')) return null;
  return (
    national: text.startsWith('0') ? text.substring(1) : text,
    international: false,
    incomplete: false,
  );
}

/// Formats a Pakistani mobile number as the user types: `0300-1234567`, or
/// `+92 300 1234567` when the user starts with the country code.
String formatPhoneInput(String value) {
  final split = _splitPhone(value);
  if (split == null) return value;
  if (split.incomplete) {
    return toAsciiDigits(value).replaceAll(_separators, '');
  }

  final digits = _take(split.national.replaceAll(_nonDigit, ''), 10);
  if (split.international) {
    return digits.length <= 3
        ? jsTrimEnd('+92 $digits')
        : '+92 ${digits.substring(0, 3)} ${digits.substring(3)}';
  }
  final local = '0$digits';
  return local.length <= 4
      ? local
      : '${local.substring(0, 4)}-${local.substring(4)}';
}

/// Checks a Pakistani mobile number while the user is typing. The `03XX`
/// prefix is checked as soon as it is complete.
///
/// ```dart
/// checkPhoneInput('0300 12');     // InputState.incomplete
/// checkPhoneInput('0360');        // InputState.invalid (not allocated)
/// checkPhoneInput('03001234567'); // InputState.valid
/// ```
InputState checkPhoneInput(String value) {
  if (toAsciiDigits(value).replaceAll(_separators, '').isEmpty) {
    return InputState.empty;
  }
  final split = _splitPhone(value);
  if (split == null) return InputState.invalid;
  if (split.incomplete) return InputState.incomplete;

  final national = split.national;
  if (national.isEmpty) return InputState.incomplete;
  if (!national.startsWith('3')) return InputState.invalid;
  if (national.length >= 3 &&
      !isAllocatedPrefix('0${national.substring(0, 3)}')) {
    return InputState.invalid;
  }
  if (national.length < 10) return InputState.incomplete;
  return national.length == 10 ? InputState.valid : InputState.invalid;
}

/// Formats an IBAN as the user types: uppercase, in groups of four
/// (`PK36 SCBL 0000 0011 2345 6702`), up to 24 characters.
String formatIBANInput(String value) {
  final clean =
      _take(jsToUpperCase(value).replaceAll(_nonAlphanumeric, ''), 24);
  return clean.replaceAllMapped(_groupOfFour, (match) => '${match[1]} ');
}

/// Checks a Pakistani IBAN while the user is typing: the `PK` prefix, check
/// digits and bank code are checked as they are typed, and the full checksum
/// once all 24 characters are in.
///
/// ```dart
/// checkIBANInput('PK36 SC');                       // InputState.incomplete
/// checkIBANInput('GB29');                          // InputState.invalid
/// checkIBANInput('PK36 SCBL 0000 0011 2345 6702'); // InputState.valid
/// ```
InputState checkIBANInput(String value) {
  final clean = jsToUpperCase(value).replaceAll(_ibanSpacing, '');
  if (clean.isEmpty) return InputState.empty;
  if (clean.length > 24 || !_ibanShape.hasMatch(clean)) {
    return InputState.invalid;
  }
  if (clean.length < 24) return InputState.incomplete;
  return validateIBAN(clean) ? InputState.valid : InputState.invalid;
}
