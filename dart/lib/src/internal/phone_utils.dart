/// Mobile number normalization (mirrors src/internal/phone-utils.ts).
library;

import 'data.dart';
import 'normalize.dart';

final Set<String> _allocatedPrefixes = {for (final e in networks) e.prefix};
final RegExp _mobile = RegExp(r'^3\d{9}$');

/// Whether a `03XX` mobile prefix is allocated to an operator.
bool isAllocatedPrefix(String prefix) => _allocatedPrefixes.contains(prefix);

/// Normalizes a phone string to digits with country code (no leading plus),
/// such as `923001234567`.
///
/// Accepts local (`0300…`), international (`+92300…`, `0092300…`), short
/// (`300…`) and the common `+92 (0) 300…` / `+920300…` forms, with spaces,
/// dashes, dots, slashes or parentheses, and Urdu or Arabic-Indic digits.
///
/// Returns `null` when the input is not a Pakistani mobile number on an
/// allocated `03XX` prefix.
String? normalizePhoneDigits(String phone) {
  var digits = stripSeparators(toAsciiDigits(phone));
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  } else if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }
  if (digits.startsWith('92') && digits.length > 10) {
    digits = digits.substring(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (!_mobile.hasMatch(digits)) return null;
  if (!_allocatedPrefixes.contains('0${digits.substring(0, 3)}')) return null;
  return '92$digits';
}

/// Returns the local mobile prefix (`0XXX`) of a phone number, or `null` if
/// it is not a valid Pakistani mobile number.
String? getPhonePrefix(String phone) {
  final digits = normalizePhoneDigits(phone);
  if (digits == null) return null;
  return '0${digits.substring(2, 5)}';
}
