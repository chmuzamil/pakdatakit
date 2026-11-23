import 'data/banks.g.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

final RegExp _pkIbanPattern = RegExp(r'^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$');
final RegExp _bankCode = RegExp(r'^[A-Z]{4}$');
final RegExp _letter = RegExp('[A-Z]');

/// Kind of institution that issues Pakistani IBANs.
enum BankType {
  /// Private commercial bank.
  commercial('commercial'),

  /// Public sector commercial bank, such as National Bank of Pakistan.
  publicSector('public-sector'),

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

/// Whether a bank still exists. See [BankInfo.status].
enum BankStatus {
  /// Operating.
  active('active'),

  /// Merged into another bank (see [BankInfo.mergedInto]).
  merged('merged'),

  /// Liquidated.
  liquidated('liquidated');

  const BankStatus(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;

  /// The status whose [value] is [value].
  static BankStatus fromValue(String value) =>
      BankStatus.values.firstWhere((status) => status.value == value);
}

/// Where a bank's SWIFT/BIC code is printed. See [BankInfo.swiftSource].
enum BankBicSource {
  /// The State Bank of Pakistan.
  sbp('sbp'),

  /// The institution's own website (its own domain).
  bankSite('bank-site');

  const BankBicSource(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;

  /// The source whose [value] is [value].
  static BankBicSource fromValue(String value) =>
      BankBicSource.values.firstWhere((source) => source.value == value);
}

/// Where a bank's SWIFT/BIC code is printed, and when it was checked.
class BankSwiftSource {
  /// Creates a SWIFT source value.
  const BankSwiftSource({
    required this.bicSource,
    required this.printed,
    required this.sourceUrl,
    this.page,
    required this.checkedAt,
  });

  /// SBP or the institution's own website.
  final BankBicSource bicSource;

  /// The code as printed, e.g. `HABBPKKAXXX` or `MEZN PK KA`.
  final String printed;

  /// The document or page that prints it.
  final String sourceUrl;

  /// The PDF page, or `null` for a web page.
  final int? page;

  /// When the source was checked (`YYYY-MM-DD`).
  final String checkedAt;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'bicSource': bicSource.value,
        'printed': printed,
        'sourceUrl': sourceUrl,
        'page': page,
        'checkedAt': checkedAt,
      };

  @override
  bool operator ==(Object other) =>
      other is BankSwiftSource &&
      other.bicSource == bicSource &&
      other.printed == printed &&
      other.sourceUrl == sourceUrl &&
      other.page == page &&
      other.checkedAt == checkedAt;

  @override
  int get hashCode =>
      Object.hash(bicSource, printed, sourceUrl, page, checkedAt);

  @override
  String toString() => 'BankSwiftSource${toJson()}';
}

/// A bank (or other institution) that issues Pakistani IBANs.
///
/// Values are immutable, so each result can be kept or passed on without
/// changing the shared data.
class BankInfo {
  /// Creates a bank info value.
  const BankInfo({
    required this.code,
    required this.name,
    required this.type,
    required this.active,
    this.mergedInto,
    this.aliasOf,
    this.status = BankStatus.active,
    this.website,
    this.websiteSbpListed,
    this.swift,
    this.swiftSource,
    this.swiftReason,
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

  /// Active, merged (see [mergedInto]) or liquidated.
  final BankStatus status;

  /// The institution's official website (from SBP's lists of regulated
  /// institutions, or its own site where SBP lists none or an old domain),
  /// or `null` for a bank that no longer exists.
  final String? website;

  /// What SBP's list gives, where it differs from [website] (an older
  /// domain); otherwise `null`.
  final String? websiteSbpListed;

  /// The 8-character SWIFT/BIC code, only where SBP or the institution's own
  /// website prints it; otherwise `null` (see [swiftReason]).
  final String? swift;

  /// Where [swift] is printed, and when it was checked; `null` without one.
  final BankSwiftSource? swiftSource;

  /// Why [swift] is `null`, or `null` when it is set.
  final String? swiftReason;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'code': code,
        'name': name,
        'type': type.value,
        'active': active,
        'mergedInto': mergedInto,
        'aliasOf': aliasOf,
        'status': status.value,
        'website': website,
        'websiteSbpListed': websiteSbpListed,
        'swift': swift,
        'swiftSource': swiftSource?.toJson(),
        'swiftReason': swiftReason,
      };

  @override
  bool operator ==(Object other) =>
      other is BankInfo &&
      other.code == code &&
      other.name == name &&
      other.type == type &&
      other.active == active &&
      other.mergedInto == mergedInto &&
      other.aliasOf == aliasOf &&
      other.status == status &&
      other.website == website &&
      other.websiteSbpListed == websiteSbpListed &&
      other.swift == swift &&
      other.swiftSource == swiftSource &&
      other.swiftReason == swiftReason;

  @override
  int get hashCode => Object.hash(
        code,
        name,
        type,
        active,
        mergedInto,
        aliasOf,
        status,
        website,
        websiteSbpListed,
        swift,
        swiftSource,
        swiftReason,
      );

  @override
  String toString() => 'BankInfo${toJson()}';
}

final List<BankInfo> _banks = List.unmodifiable([
  for (final e in banksJson.cast<Map<String, Object?>>())
    BankInfo(
      code: e['code']! as String,
      name: e['name']! as String,
      type: BankType.fromValue(e['type']! as String),
      active: e['mergedInto'] == null && e['active'] != false,
      mergedInto: e['mergedInto'] as String?,
      aliasOf: e['aliasOf'] as String?,
      status: BankStatus.fromValue(e['status']! as String),
      website: e['website'] as String?,
      websiteSbpListed: e['websiteSbpListed'] as String?,
      swift: e['swift'] as String?,
      swiftSource: switch (e['swiftSource']) {
        final Map<String, Object?> s => BankSwiftSource(
            bicSource: BankBicSource.fromValue(s['bicSource']! as String),
            printed: s['printed']! as String,
            sourceUrl: s['sourceUrl']! as String,
            page: s['page'] as int?,
            checkedAt: s['checkedAt']! as String,
          ),
        _ => null,
      },
      swiftReason: e['swiftReason'] as String?,
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
/// Islamic, microfinance, digital bank, wallet …), whether it still
/// exists ([BankInfo.status]), its official website and its SWIFT/BIC code
/// where SBP or the bank's own website prints it. Also accepts a 4-letter
/// bank code on its own, such as `MEZN`.
///
/// ```dart
/// getBankInfo('PK36SCBL0000001123456702');
/// // BankInfo{code: SCBL, name: Standard Chartered Bank (Pakistan) Limited,
/// //   type: commercial, active: true, mergedInto: null, aliasOf: null,
/// //   status: active, website: https://www.sc.com/pk/,
/// //   websiteSbpListed: standardchartered.com.pk, swift: SCBLPKKX,
/// //   swiftSource: {bicSource: bank-site, ...}, swiftReason: null}
/// getBankInfo('SADA')?.type; // BankType.emi
/// ```
///
/// Returns `null` if the IBAN is invalid or the code unknown. Never throws.
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
