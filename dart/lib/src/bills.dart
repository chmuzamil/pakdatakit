import 'internal/js.dart';
import 'internal/normalize.dart';

/// Kind of electricity bill identifier. Used by [ElectricityRef].
enum ElectricityRefType {
  /// The 14-digit reference number on a DISCO (WAPDA) bill, optionally
  /// followed by `U` (urban) or `R` (rural).
  reference('reference'),

  /// The customer ID on a DISCO bill: 10 digits, or 11 for LESCO.
  customerId('customer-id'),

  /// A 13-digit K-Electric account number (`04000…`).
  kElectric('k-electric');

  const ElectricityRefType(this.value);

  /// The value used by the npm package, e.g. `"customer-id"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Result of [parseElectricityRef].
class ElectricityRef {
  /// Creates an electricity bill identifier value.
  const ElectricityRef({
    required this.type,
    required this.digits,
    required this.formatted,
    required this.urbanRural,
    required this.disco,
  });

  /// Reference number, customer ID or K-Electric account number.
  final ElectricityRefType type;

  /// The digits, without separators or the U/R letter.
  final String digits;

  /// Display form: `01 14111 1234567 U` for a reference (2, 5 and 7 digits,
  /// as on PITC's bill illustration), the digits for the others.
  final String formatted;

  /// `U` or `R` when given after a reference number, otherwise `null`.
  final String? urbanRural;

  /// The distribution company. `K-Electric` for a K-Electric account;
  /// otherwise always `null`, because no official source maps reference or
  /// customer ID digits to a DISCO.
  final String? disco;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'type': type.value,
        'digits': digits,
        'formatted': formatted,
        'urbanRural': urbanRural,
        'disco': disco,
      };

  @override
  bool operator ==(Object other) =>
      other is ElectricityRef &&
      other.type == type &&
      other.digits == digits &&
      other.formatted == formatted &&
      other.urbanRural == urbanRural &&
      other.disco == disco;

  @override
  int get hashCode => Object.hash(type, digits, formatted, urbanRural, disco);

  @override
  String toString() => 'ElectricityRef${toJson()}';
}

/// Separators people type inside bill numbers.
final RegExp _separators = RegExp('[$ws\\-‐‑‒–—./]');
final RegExp _withLetter = RegExp(r'^(\d{14})([UR])$');
final RegExp _allDigits = RegExp(r'^\d+$');

/// Parses a Pakistani electricity bill identifier: a DISCO reference number,
/// a DISCO customer ID or a K-Electric account number.
///
/// Formats are those the utilities' own bill pages ask for (retrieved
/// 2026-11-18; see DATA.md in the repository): PITC's bill pages take a
/// 14-digit reference number with a separate U/R choice, or a 10-digit
/// customer ID (11 digits for LESCO); K-Electric asks for a 13-digit account
/// number starting with `04000`. No check digit is published, so only the
/// format is checked.
///
/// Spaces, dashes and dots are ignored, and Urdu digits are accepted.
///
/// Returns `null` if the input matches none of the formats. Never throws.
///
/// ```dart
/// parseElectricityRef('02-12624-0045901 R')?.formatted;
/// // '02 12624 0045901 R'
/// parseElectricityRef('0400012345678')?.disco; // 'K-Electric'
/// ```
ElectricityRef? parseElectricityRef(String input) {
  var text = jsToUpperCase(toAsciiDigits(input).replaceAll(_separators, ''));
  String? urbanRural;
  final letter = _withLetter.firstMatch(text);
  if (letter != null) {
    text = letter.group(1)!;
    urbanRural = letter.group(2);
  }
  if (!_allDigits.hasMatch(text)) return null;

  if (text.length == 14) {
    final formatted =
        '${text.substring(0, 2)} ${text.substring(2, 7)} ${text.substring(7)}';
    return ElectricityRef(
      type: ElectricityRefType.reference,
      digits: text,
      formatted: urbanRural != null ? '$formatted $urbanRural' : formatted,
      urbanRural: urbanRural,
      disco: null,
    );
  }
  if (urbanRural != null) return null;
  if (text.length == 13 && text.startsWith('04000')) {
    return ElectricityRef(
      type: ElectricityRefType.kElectric,
      digits: text,
      formatted: text,
      urbanRural: null,
      disco: 'K-Electric',
    );
  }
  if (text.length == 10 || text.length == 11) {
    return ElectricityRef(
      type: ElectricityRefType.customerId,
      digits: text,
      formatted: text,
      urbanRural: null,
      disco: null,
    );
  }
  return null;
}

/// Validates a Pakistani electricity bill identifier. See
/// [parseElectricityRef].
bool validateElectricityRef(String input) => parseElectricityRef(input) != null;

/// A gas company whose consumer number format is published.
enum GasCompany {
  /// Sui Northern Gas Pipelines Limited: 11-digit consumer numbers.
  sngpl('SNGPL', 11),

  /// Sui Southern Gas Company: 10-digit consumer numbers.
  ssgc('SSGC', 10);

  const GasCompany(this.value, this._digits);

  /// The value used by the npm package, e.g. `"SNGPL"`.
  final String value;

  final int _digits;

  /// Returns [value].
  String toJson() => value;
}

/// Validates a gas bill consumer number: 11 digits for SNGPL, 10 digits for
/// SSGC, as their bill pages ask for (retrieved 2026-11-18; see DATA.md in the
/// repository). No check digit is published, so only the format is checked.
///
/// [company] is `'SNGPL'` or `'SSGC'` in any case, e.g.
/// `GasCompany.sngpl.value`; anything else returns `false`. Never throws.
///
/// ```dart
/// validateGasConsumerNumber('12345678901', 'SNGPL'); // true
/// validateGasConsumerNumber('1234567890', GasCompany.ssgc.value); // true
/// ```
bool validateGasConsumerNumber(String input, String company) {
  final name = jsToUpperCase(company);
  int? digits;
  for (final c in GasCompany.values) {
    if (c.value == name) digits = c._digits;
  }
  if (digits == null) return false;
  final text = toAsciiDigits(input).replaceAll(_separators, '');
  return text.length == digits && _allDigits.hasMatch(text);
}
