import 'internal/data.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

final RegExp _pkIbanPattern = RegExp(r'^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$');
final RegExp _bankCode = RegExp(r'^[A-Z]{4}$');
final RegExp _letter = RegExp('[A-Z]');

/// Kind of institution that issues Pakistani IBANs.
enum BankType {
  /// Commercial bank.
  commercial('commercial'),

  /// Islamic bank.
  islamic('islamic'),

  /// Microfinance bank.
  microfinance('microfinance'),

  /// Digital bank.
  digital('digital'),

  /// Electronic money institution, such as a wallet.
  emi('emi'),

  /// Foreign bank.
  foreign('foreign'),

  /// Specialized (development) bank.
  specialized('specialized'),

  /// The State Bank of Pakistan.
  central('central');

  const BankType(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;

  /// The type whose [value] is [value].
  static BankType fromValue(String value) =>
      BankType.values.firstWhere((type) => type.value == value);
}

/// A bank (or other institution) that issues Pakistani IBANs.
class BankInfo {
  /// Creates a bank info value.
  const BankInfo({
    required this.code,
    required this.name,
    required this.type,
    required this.active,
    this.mergedInto,
    this.aliasOf,
  });

  /// 4-letter IBAN bank code (characters 5–8 of the IBAN).
  final String code;

  /// Bank name.
  final String name;

  /// Kind of institution.
  final BankType type;

  /// `false` for banks that merged into another and no longer exist.
  final bool active;

  /// Code of the bank this one merged into, if it no longer exists.
  final String? mergedInto;

  /// Main code of the same bank, when this is an older code still in use.
  final String? aliasOf;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'code': code,
        'name': name,
        'type': type.value,
        'active': active,
        'mergedInto': mergedInto,
        'aliasOf': aliasOf,
      };

  @override
  bool operator ==(Object other) =>
      other is BankInfo &&
      other.code == code &&
      other.name == name &&
      other.type == type &&
      other.active == active &&
      other.mergedInto == mergedInto &&
      other.aliasOf == aliasOf;

  @override
  int get hashCode =>
      Object.hash(code, name, type, active, mergedInto, aliasOf);

  @override
  String toString() => 'BankInfo${toJson()}';
}

final List<BankInfo> _banks = List.unmodifiable([
  for (final e in banks)
    BankInfo(
      code: e.code,
      name: e.name,
      type: BankType.fromValue(e.type),
      active: e.mergedInto == null,
      mergedInto: e.mergedInto,
      aliasOf: e.aliasOf,
    ),
]);

final Map<String, BankInfo> _bankByCode = {
  for (final bank in _banks) bank.code: bank,
};

/// Expands IBAN letters to digits for the mod-97 checksum (A=10 … Z=35).
String _expand(String value) => value.replaceAllMapped(
    _letter, (match) => '${match[0]!.codeUnitAt(0) - 55}');

int _mod97(String numeric) {
  var remainder = 0;
  for (var i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + numeric.codeUnitAt(i) - 0x30) % 97;
  }
  return remainder;
}

String _normalize(String iban) => jsToUpperCase(stripSeparators(iban));

/// Validates a Pakistani IBAN: format and ISO 13616 mod-97 checksum.
///
/// Accepts spaced or unspaced input. Only `PK` IBANs of exactly 24 characters
/// are supported.
bool validateIBAN(String iban) {
  final normalized = _normalize(iban);
  if (!_pkIbanPattern.hasMatch(normalized)) return false;
  final rearranged = normalized.substring(4) + normalized.substring(0, 4);
  return _mod97(_expand(rearranged)) == 1;
}

/// Returns the bank name for a valid Pakistani IBAN from its 4-letter bank
/// code, or `null` if the IBAN is invalid or the code is not in the dataset.
String? getBankFromIBAN(String iban) {
  if (!validateIBAN(iban)) return null;
  return _bankByCode[_normalize(iban).substring(4, 8)]?.name;
}

/// Returns details of the bank that issued an IBAN: name, type (commercial,
/// Islamic, microfinance, digital bank, wallet …) and whether it still
/// exists. Also accepts a 4-letter bank code on its own, such as `MEZN`.
///
/// Returns `null` if the IBAN is invalid or the code unknown.
BankInfo? getBankInfo(String ibanOrCode) {
  final value = _normalize(ibanOrCode);
  if (_bankCode.hasMatch(value)) return _bankByCode[value];
  if (!validateIBAN(value)) return null;
  return _bankByCode[value.substring(4, 8)];
}

/// Lists every bank code in the dataset, sorted by code, including merged
/// banks and older alias codes. Filter it for a bank picker, e.g.
/// `getBanks().where((b) => b.active && b.aliasOf == null)`.
List<BankInfo> getBanks() => List.of(_banks);
