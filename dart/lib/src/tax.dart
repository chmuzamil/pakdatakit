import 'cnic.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

final RegExp _businessNtn = RegExp(r'^(\d{7})(?:[-‐‑‒–— ]?(\d))?$');
final RegExp _strn = RegExp(r'^\d{13}$');

/// Kind of National Tax Number.
enum NTNType {
  /// An individual's NTN: their 13-digit CNIC.
  individual('individual'),

  /// A business NTN: 7 digits, optionally followed by a check digit.
  business('business');

  const NTNType(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Result of [analyzeNTN].
class NTNInfo {
  /// Creates an NTN info value.
  const NTNInfo({
    required this.type,
    required this.digits,
    required this.formatted,
  });

  /// Individual (a CNIC) or business (7-digit NTN).
  final NTNType type;

  /// Digits without separators (7, 8 or 13 digits).
  final String digits;

  /// `1234567-8` for business NTNs with a check digit, `#####-#######-#` for
  /// CNICs.
  final String formatted;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() =>
      {'type': type.value, 'digits': digits, 'formatted': formatted};

  @override
  bool operator ==(Object other) =>
      other is NTNInfo &&
      other.type == type &&
      other.digits == digits &&
      other.formatted == formatted;

  @override
  int get hashCode => Object.hash(type, digits, formatted);

  @override
  String toString() => 'NTNInfo${toJson()}';
}

/// Analyzes a Pakistani National Tax Number (NTN): a 13-digit CNIC for
/// individuals, or 7 digits (optionally followed by a check digit) for
/// businesses.
///
/// FBR does not publish a check-digit algorithm, so this checks the format
/// only. Returns `null` if the format is invalid.
NTNInfo? analyzeNTN(String ntn) {
  final trimmed = toAsciiDigits(jsTrim(ntn));
  if (validateCNIC(trimmed)) {
    final digits = stripSeparators(trimmed);
    return NTNInfo(
      type: NTNType.individual,
      digits: digits,
      formatted:
          '${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits[12]}',
    );
  }
  final match = _businessNtn.firstMatch(trimmed);
  if (match == null) return null;
  final base = match[1]!;
  final check = match[2];
  return NTNInfo(
    type: NTNType.business,
    digits: '$base${check ?? ''}',
    formatted: check == null ? base : '$base-$check',
  );
}

/// Validates the format of a Pakistani National Tax Number. See [analyzeNTN].
bool validateNTN(String ntn) => analyzeNTN(ntn) != null;

/// Validates the format of a Sales Tax Registration Number (STRN): 13
/// digits, with optional spaces or dashes.
///
/// FBR does not publish a check-digit algorithm or the meaning of the digit
/// groups, so this validates the format only.
bool validateSTRN(String strn) =>
    _strn.hasMatch(stripSeparators(toAsciiDigits(strn)));
