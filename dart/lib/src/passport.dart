import 'internal/js.dart';
import 'internal/normalize.dart';

final RegExp _separators = RegExp(r'[-‐‑‒–— ]');
final RegExp _passport = RegExp(r'^[A-Z]{2}\d{7}$');

/// Validates the format of a Pakistani passport number: two letters followed
/// by seven digits, e.g. `AB1234567`. Case, surrounding spaces and spaces or
/// dashes between the letters and digits are ignored.
///
/// DGIP does not publish the format, so this checks the common shape only;
/// other passport types may differ. See DATA.md in the repository.
bool validatePassport(String passport) {
  final compact = jsToUpperCase(toAsciiDigits(jsTrim(passport)))
      .replaceAll(_separators, '');
  return _passport.hasMatch(compact);
}
