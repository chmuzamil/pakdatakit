/// FBR Digital Invoicing (DI): the invoice JSON that is posted to PRAL's
/// gateway, a builder that works out the sales tax, and an offline validator
/// for the rules that can be checked without FBR's reference APIs.
///
/// Built from PRAL's "Technical Specification for DI API", version 1.12 (last
/// updated 24 July 2025), and PRAL's "Error Message Guide (Sales)"; see
/// DATA.md. Nothing here talks to FBR: there is no HTTP client and no token
/// handling. Values that only FBR's reference APIs can confirm (provinces, HS
/// codes, units, rates, sale types, SRO numbers) are checked for presence,
/// not against FBR's lists, unless the app passes the lists it synced from
/// those APIs (`validateFbrInvoice(invoice, reference: ...)`).
library;

import 'data/fbr_sale_types.g.dart';
import 'internal/equality.dart';
import 'internal/js.dart';
import 'internal/money.dart';
import 'internal/normalize.dart';
import 'salestax.dart';

/// Version of PRAL's technical specification this module follows
/// (`FBR_DI_SPEC_VERSION` in the npm package).
const String fbrDiSpecVersion = '1.12';

/// `invoiceType` values in the specification.
enum FbrInvoiceType {
  /// `Sale Invoice`.
  saleInvoice('Sale Invoice'),

  /// `Debit Note`.
  debitNote('Debit Note');

  const FbrInvoiceType(this.value);

  /// The value in the invoice JSON, e.g. `"Sale Invoice"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// `buyerRegistrationType` values in the specification.
enum FbrRegistrationType {
  /// `Registered`.
  registered('Registered'),

  /// `Unregistered`.
  unregistered('Unregistered');

  const FbrRegistrationType(this.value);

  /// The value in the invoice JSON, e.g. `"Registered"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// The invoice body for `postinvoicedata` and `validateinvoicedata` (spec
/// §4.1, §4.2), as JSON: `invoiceType`, `invoiceDate` (`YYYY-MM-DD`),
/// `sellerNTNCNIC`, `sellerBusinessName`, `sellerProvince`, `sellerAddress`,
/// `buyerNTNCNIC`, `buyerBusinessName`, `buyerProvince`, `buyerAddress`,
/// `buyerRegistrationType`, `invoiceRefNo`, `scenarioId` (sandbox only) and
/// `items`, a list of [FbrInvoiceItem]s.
typedef FbrInvoice = Map<String, Object?>;

/// One line of an invoice (spec §4.1, `items`), as JSON. Amounts are in
/// rupees: `hsCode`, `productDescription`, `rate` (`18%`, `Rs.3`, `Exempt` …),
/// `uoM`, `quantity` (up to 4 decimals), `totalValues`,
/// `valueSalesExcludingST`, `fixedNotifiedValueOrRetailPrice`,
/// `salesTaxApplicable`, `salesTaxWithheldAtSource`, `extraTax`,
/// `furtherTax`, `sroScheduleNo`, `fedPayable`, `discount`, `saleType` and
/// `sroItemSerialNo`.
typedef FbrInvoiceItem = Map<String, Object?>;

/// Input for [buildFbrInvoice]: an [FbrInvoice] whose `invoiceRefNo` and
/// `buyerNTNCNIC` may be left out.
typedef FbrInvoiceInput = Map<String, Object?>;

/// An item for [buildFbrInvoice]: an [FbrInvoiceItem] whose
/// `salesTaxApplicable`, `salesTaxWithheldAtSource`, `totalValues` and
/// `fixedNotifiedValueOrRetailPrice` may be left out.
typedef FbrInvoiceItemInput = Map<String, Object?>;

/// Column totals of an invoice, in rupees. Not sent to FBR.
class FbrInvoiceTotals {
  /// Creates an invoice totals value.
  const FbrInvoiceTotals({
    required this.quantity,
    required this.valueSalesExcludingST,
    required this.salesTaxApplicable,
    required this.salesTaxWithheldAtSource,
    required this.extraTax,
    required this.furtherTax,
    required this.fedPayable,
    required this.discount,
  });

  /// Total quantity.
  final double quantity;

  /// Total value excluding sales tax.
  final double valueSalesExcludingST;

  /// Total sales tax.
  final double salesTaxApplicable;

  /// Total sales tax withheld at source.
  final double salesTaxWithheldAtSource;

  /// Total extra tax.
  final double extraTax;

  /// Total further tax.
  final double furtherTax;

  /// Total federal excise duty.
  final double fedPayable;

  /// Total discount.
  final double discount;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'quantity': quantity,
        'valueSalesExcludingST': valueSalesExcludingST,
        'salesTaxApplicable': salesTaxApplicable,
        'salesTaxWithheldAtSource': salesTaxWithheldAtSource,
        'extraTax': extraTax,
        'furtherTax': furtherTax,
        'fedPayable': fedPayable,
        'discount': discount,
      };

  @override
  bool operator ==(Object other) =>
      other is FbrInvoiceTotals &&
      other.quantity == quantity &&
      other.valueSalesExcludingST == valueSalesExcludingST &&
      other.salesTaxApplicable == salesTaxApplicable &&
      other.salesTaxWithheldAtSource == salesTaxWithheldAtSource &&
      other.extraTax == extraTax &&
      other.furtherTax == furtherTax &&
      other.fedPayable == fedPayable &&
      other.discount == discount;

  @override
  int get hashCode => Object.hash(
        quantity,
        valueSalesExcludingST,
        salesTaxApplicable,
        salesTaxWithheldAtSource,
        extraTax,
        furtherTax,
        fedPayable,
        discount,
      );

  @override
  String toString() => 'FbrInvoiceTotals${toJson()}';
}

/// Result of [buildFbrInvoice].
class FbrInvoiceBuild {
  /// Creates a build result.
  const FbrInvoiceBuild({required this.invoice, required this.totals});

  /// The invoice, ready to post as JSON.
  final FbrInvoice invoice;

  /// Column totals, for your own records.
  final FbrInvoiceTotals totals;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'invoice': invoice,
        'totals': totals.toJson(),
      };

  @override
  String toString() => 'FbrInvoiceBuild${toJson()}';
}

/// One problem found by [validateFbrInvoice].
class FbrInvoiceError {
  /// Creates an invoice error.
  const FbrInvoiceError(this.code, this.field, this.message);

  /// FBR's error code (spec §7 and the Error Message Guide), or `null` for a
  /// required field the specification gives no code for.
  final String? code;

  /// Where: `invoiceDate`, `items[0].rate` …
  final String field;

  /// What is wrong, in English.
  final String message;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'code': code,
        'field': field,
        'message': message,
      };

  @override
  bool operator ==(Object other) =>
      other is FbrInvoiceError &&
      other.code == code &&
      other.field == field &&
      other.message == message;

  @override
  int get hashCode => Object.hash(code, field, message);

  @override
  String toString() => 'FbrInvoiceError${toJson()}';
}

/// Result of [validateFbrInvoice].
class FbrInvoiceValidation {
  /// Creates a validation result.
  const FbrInvoiceValidation({required this.valid, required this.errors});

  /// `true` when there are no errors.
  final bool valid;

  /// Every problem found, in the order the fields are checked.
  final List<FbrInvoiceError> errors;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'valid': valid,
        'errors': [for (final error in errors) error.toJson()],
      };

  @override
  bool operator ==(Object other) =>
      other is FbrInvoiceValidation &&
      other.valid == valid &&
      listEquals(other.errors, errors);

  @override
  int get hashCode => Object.hash(valid, listHash(errors));

  @override
  String toString() => 'FbrInvoiceValidation${toJson()}';
}

/// Reference lists from FBR's own APIs (PRAL's `/pdi/v1/provinces`,
/// `/pdi/v1/uom`, `/pdi/v2/HS_UOM`, sale types from `/pdi/v2/SaleTypeToRate`
/// ...), which an app syncs with its token, for
/// `validateFbrInvoice(invoice, reference: ...)`. FBR's APIs are
/// authoritative; this library ships no copy of these lists.
///
/// Each list given is checked; a list left out (`null`) is not. Values are
/// compared ignoring case and extra whitespace.
class FbrInvoiceReference {
  /// Creates reference lists; give only the ones to check.
  const FbrInvoiceReference({
    this.provinces,
    this.saleTypes,
    this.uoms,
    this.hsUom,
  });

  /// Province names as FBR lists them, e.g. `['PUNJAB', 'SINDH', ...]`.
  /// Checks `sellerProvince` (0073) and `buyerProvince` (0074).
  final List<String>? provinces;

  /// Sale type descriptions as FBR lists them. Checks each item's
  /// `saleType` (0013).
  final List<String>? saleTypes;

  /// Unit of measure descriptions as FBR lists them. Checks each item's
  /// `uoM` (0099).
  final List<String>? uoms;

  /// The units allowed for each HS code, as FBR's HS_UOM API returns them:
  /// `{'0101.2100': ['Numbers, pieces, units']}`. An item's `hsCode` must be
  /// listed (an error with no code) and its `uoM` allowed for it (0099).
  final Map<String, List<String>>? hsUom;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        if (provinces != null) 'provinces': [...provinces!],
        if (saleTypes != null) 'saleTypes': [...saleTypes!],
        if (uoms != null) 'uoms': [...uoms!],
        if (hsUom != null)
          'hsUom': {
            for (final e in hsUom!.entries) e.key: [...e.value],
          },
      };

  @override
  bool operator ==(Object other) =>
      other is FbrInvoiceReference &&
      listEquals(other.provinces, provinces) &&
      listEquals(other.saleTypes, saleTypes) &&
      listEquals(other.uoms, uoms) &&
      _hsUomEquals(other.hsUom, hsUom);

  @override
  int get hashCode => Object.hash(
        listHash(provinces),
        listHash(saleTypes),
        listHash(uoms),
        hsUom == null
            ? 0
            : Object.hashAllUnordered(
                hsUom!.entries
                    .map((e) => Object.hash(e.key, listHash(e.value))),
              ),
      );

  @override
  String toString() => 'FbrInvoiceReference${toJson()}';
}

bool _hsUomEquals(Map<String, List<String>>? a, Map<String, List<String>>? b) {
  if (identical(a, b)) return true;
  if (a == null || b == null || a.length != b.length) return false;
  for (final e in a.entries) {
    if (!b.containsKey(e.key) || !listEquals(b[e.key], e.value)) return false;
  }
  return true;
}

/// A sale type as PRAL's specification names it, with its sandbox
/// scenarios. Result of [getSaleTypes].
class FbrSaleType {
  /// Creates a sale type value.
  const FbrSaleType({required this.saleType, required this.scenarioIds});

  /// The sale type, e.g. `Goods at Standard Rate (default)`.
  final String saleType;

  /// The specification's sandbox scenarios (`SN001`-`SN028`) that use it.
  final List<String> scenarioIds;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'saleType': saleType,
        'scenarioIds': [...scenarioIds],
      };

  @override
  bool operator ==(Object other) =>
      other is FbrSaleType &&
      other.saleType == saleType &&
      listEquals(other.scenarioIds, scenarioIds);

  @override
  int get hashCode => Object.hash(saleType, listHash(scenarioIds));

  @override
  String toString() => 'FbrSaleType${toJson()}';
}

/// The sale types named in PRAL's DI specification (v1.12, section 9,
/// "Scenarios for Sandbox Testing"), with the scenarios that use each.
///
/// FBR's full, current list comes from its reference API; this is a
/// convenience for building forms and tests, and [validateFbrInvoice] does
/// not reject a sale type that is not in it. Never throws.
///
/// ```dart
/// getSaleTypes().first;
/// // FbrSaleType{saleType: Goods at Standard Rate (default),
/// //   scenarioIds: [SN001, SN002, SN026]}
/// ```
List<FbrSaleType> getSaleTypes() => [
      for (final e in fbrSaleTypesJson.cast<Map<String, Object?>>())
        FbrSaleType(
          saleType: e['saleType']! as String,
          scenarioIds: List.unmodifiable(
            (e['scenarioIds']! as List<Object?>).cast<String>(),
          ),
        ),
    ];

/// A reference list as a set of normalized keys, or `null` if not given.
Set<String>? _keySet(List<String>? list) =>
    list == null ? null : {for (final v in list) normalizeKey(v)};

const Set<String> _invoiceTypes = {'Sale Invoice', 'Debit Note'};
const Set<String> _registrationTypes = {'Registered', 'Unregistered'};
final RegExp _ntnOrCnic = RegExp(r'^(?:\d{7}|\d{13})$');

/// An FBR invoice number: the seller's NTN (7) or CNIC (13), "DI", 13 digits.
final RegExp _fbrInvoiceNumber = RegExp(r'^(?:\d{7}|\d{13})DI\d{13}$');
final RegExp _scenario = RegExp(r'^SN0(?:0[1-9]|1\d|2[0-8])$');
final RegExp _percentRate = RegExp(r'^(\d+(?:\.\d+)?)%$');
// `/^rs\.?\s*(\d+(?:\.\d+)?)$/i`: only the ASCII letters fold.
final RegExp _perUnitRate = RegExp('^[rR][sS]\\.?[$ws]*(\\d+(?:\\.\\d+)?)\$');
final RegExp _datePattern = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');
final RegExp _numberForm = RegExp(r'^-?\d+(?:\.(\d+))?(?:e([+-]\d+))?$');

bool _filled(Object? value) => value is String && jsTrim(value).isNotEmpty;

String _saleTypeKey(Object? value) =>
    value is String ? normalizeKey(value) : '';

/// Decimal places in a number's shortest decimal form, or `null` if not
/// finite.
int? _decimalPlaces(num value) {
  if (!value.isFinite) return null;
  final match = _numberForm.firstMatch(jsNumberToString(value));
  if (match == null) return null;
  final places =
      (match.group(1) ?? '').length - int.parse(match.group(2) ?? '0');
  return places > 0 ? places : 0;
}

/// The sales tax FBR expects on a line, in rupees, or `null` when the rate is
/// not a plain percentage or per-unit amount (spec §7, errors 0102, 0104,
/// 0105):
///
/// - `N%` on Third Schedule goods: retail price × rate (0102);
/// - `N%` otherwise: value excluding sales tax × rate (0104);
/// - `Rs.N`: quantity × N (0105).
///
/// [item] is an [FbrInvoiceItem] (only `rate`, `saleType`, `quantity`,
/// `valueSalesExcludingST` and `fixedNotifiedValueOrRetailPrice` are read).
/// Rounded half up to the paisa (the specification allows 2 decimals and
/// gives no rounding rule). Never throws.
///
/// ```dart
/// expectedSalesTax({'rate': 'Rs.3', 'quantity': 12}); // 36
/// expectedSalesTax({'rate': '18%', 'valueSalesExcludingST': 1234}); // 222.12
/// ```
double? expectedSalesTax(Object? item) {
  if (item is! Map) return null;
  final rateText = item['rate'];
  if (rateText is! String) return null;
  final rate = jsTrim(rateText);
  final percent = _percentRate.firstMatch(rate);
  if (percent != null) {
    final base = _saleTypeKey(item['saleType']) == '3rd schedule goods'
        ? item['fixedNotifiedValueOrRetailPrice']
        : item['valueSalesExcludingST'];
    if (base is! num) return null;
    return calculateSalesTax(base, rate: double.parse(percent.group(1)!))?.tax;
  }
  final perUnit = _perUnitRate.firstMatch(rate);
  if (perUnit != null) {
    final quantityValue = item['quantity'];
    if (quantityValue is! num) return null;
    final quantity = toUnits(quantityValue, 4);
    final price = toUnits(double.parse(perUnit.group(1)!), 2);
    if (quantity == null || price == null) return null;
    // As `divideHalfUp`, but kept as a BigInt until the end: the product can
    // pass 2^63, and JavaScript then rounds it to the nearest double.
    final numerator = BigInt.from(quantity) * BigInt.from(price);
    final denominator = BigInt.from(10000);
    final quotient = numerator ~/ denominator;
    final paisa = numerator.remainder(denominator) * BigInt.two >= denominator
        ? quotient + BigInt.one
        : quotient;
    return paisa.toDouble() / 100;
  }
  return null;
}

const List<String> _numberFields = [
  'quantity',
  'valueSalesExcludingST',
  'salesTaxApplicable',
  'salesTaxWithheldAtSource',
  'extraTax',
  'furtherTax',
  'fedPayable',
  'discount',
];

/// Adds up a column in paisa (quantity in ten-thousandths) so the sum is
/// exact.
double _columnTotal(List<FbrInvoiceItem> items, String key) {
  final scale = key == 'quantity' ? 4 : 2;
  // A double, as in JavaScript.
  var sum = 0.0;
  for (final item in items) {
    final value = item[key];
    if (value is! num) continue;
    final units = toUnits(value, scale);
    if (units != null) sum += units;
  }
  return sum / (scale == 4 ? 10000 : 100);
}

/// A copy of a JSON object with its string keys, in order.
Map<String, Object?> _copy(Map<Object?, Object?> map) => {
      for (final entry in map.entries)
        if (entry.key is String) entry.key! as String: entry.value,
    };

/// Builds an FBR digital invoice from your own fields, working out
/// `salesTaxApplicable` on each line where you leave it out (see
/// [expectedSalesTax]; uses [calculateSalesTax]). Lines with a rate that is
/// neither `N%` nor `Rs.N` (`Exempt`, combined rates) get 0 unless you give
/// the tax.
///
/// [input] is an [FbrInvoiceInput] (a JSON map with an `items` list).
/// `salesTaxWithheldAtSource`, `totalValues` and
/// `fixedNotifiedValueOrRetailPrice` default to 0, and `invoiceRefNo` and
/// `buyerNTNCNIC` to `""`, as in FBR's samples. Nothing else is filled in or
/// changed (other keys are kept); check the result with [validateFbrInvoice].
///
/// Also returns column totals, which are for your own records: the
/// specification has no invoice-level totals.
///
/// Returns `null` if [input] is not a map with an `items` list of maps.
/// Never throws.
///
/// ```dart
/// final built = buildFbrInvoice({
///   'invoiceType': 'Sale Invoice',
///   // … the other header fields …
///   'items': [
///     {'rate': '18%', 'quantity': 2, 'valueSalesExcludingST': 1234, /* … */},
///   ],
/// })!;
/// (built.invoice['items']! as List).first['salesTaxApplicable']; // 222.12
/// built.totals.salesTaxApplicable; // 222.12
/// ```
FbrInvoiceBuild? buildFbrInvoice(Object? input) {
  if (input is! Map) return null;
  final rawItems = input['items'];
  if (rawItems is! List) return null;
  final items = <FbrInvoiceItem>[];
  for (final raw in rawItems) {
    if (raw is! Map) return null;
    final line = _copy(raw);
    final item = <String, Object?>{
      ...line,
      'totalValues': line['totalValues'] ?? 0,
      'fixedNotifiedValueOrRetailPrice':
          line['fixedNotifiedValueOrRetailPrice'] ?? 0,
      'salesTaxWithheldAtSource': line['salesTaxWithheldAtSource'] ?? 0,
    };
    item['salesTaxApplicable'] =
        line['salesTaxApplicable'] ?? expectedSalesTax(item) ?? 0;
    items.add(item);
  }
  final header = _copy(input);
  final invoice = <String, Object?>{
    ...header,
    'buyerNTNCNIC': header['buyerNTNCNIC'] ?? '',
    'invoiceRefNo': header['invoiceRefNo'] ?? '',
    'items': items,
  };
  final totals = [for (final key in _numberFields) _columnTotal(items, key)];
  return FbrInvoiceBuild(
    invoice: invoice,
    totals: FbrInvoiceTotals(
      quantity: totals[0],
      valueSalesExcludingST: totals[1],
      salesTaxApplicable: totals[2],
      salesTaxWithheldAtSource: totals[3],
      extraTax: totals[4],
      furtherTax: totals[5],
      fedPayable: totals[6],
      discount: totals[7],
    ),
  );
}

bool _validDate(String text) {
  final match = _datePattern.firstMatch(text);
  if (match == null) return false;
  final y = int.parse(match.group(1)!);
  final m = int.parse(match.group(2)!);
  final d = int.parse(match.group(3)!);
  final leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
  final days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1];
}

/// Codes for the required amounts, or `null` where the specification gives
/// none.
const Map<String, String?> _missingCodes = {
  'quantity': '0098',
  'valueSalesExcludingST': '0021',
  'salesTaxApplicable': '0023',
  'salesTaxWithheldAtSource': '0024',
  'totalValues': null,
  'fixedNotifiedValueOrRetailPrice': null,
};

const List<String> _amountKeys = [
  'quantity',
  'valueSalesExcludingST',
  'salesTaxApplicable',
  'salesTaxWithheldAtSource',
  'totalValues',
  'fixedNotifiedValueOrRetailPrice',
  'extraTax',
  'furtherTax',
  'fedPayable',
  'discount',
];

bool _present(Object? value) => value != null && value != '';

/// Checks an FBR digital invoice against the rules of PRAL's specification
/// (v1.12) and Error Message Guide that need no call to FBR, and returns every
/// problem with FBR's error code.
///
/// [invoice] is an [FbrInvoice]: a JSON map, e.g. from `jsonDecode` or
/// [buildFbrInvoice]. Anything else gives one error. Give [today]
/// (`YYYY-MM-DD`) to reject invoices dated later (error 0043); it is not
/// checked otherwise.
///
/// Checked: invoice type (0003, 0011), date format (0005, 0042, 0113) and,
/// with [today], a future date (0043); seller and buyer NTN/CNIC (0401, 0402,
/// 0009), self-invoicing (0058), names, provinces (0073, 0074), addresses,
/// buyer registration type (0012), the reference number of a debit note
/// (0026), the sandbox scenario, and on each line: HS code (0044), rate
/// (0020), unit, sale type (0013), required and valid amounts (0021, 0023,
/// 0024, 0098, 0300, 0302), SRO schedule and serial (0077, 0078), Third
/// Schedule retail price (0090), extra tax on reduced-rate goods (0091) and
/// the sales tax arithmetic (0102, 0104, 0105, to within one paisa).
///
/// Not checked, because they need FBR's data: registration status, whether a
/// province, HS code, unit, rate, sale type or SRO is in FBR's lists or fits
/// the others, and the original invoice of a debit note. Pass the lists your
/// app syncs from FBR's reference APIs as [reference] to check provinces
/// (0073, 0074), sale types (0013), units (0099) and HS code/unit pairs
/// against them (an HS code that is not listed has no code; a unit not
/// allowed for it is 0099); lists left out are not checked. FBR's APIs are
/// authoritative.
///
/// Never throws.
///
/// ```dart
/// validateFbrInvoice(invoice); // FbrInvoiceValidation{valid: true, errors: []}
/// validateFbrInvoice({...invoice, 'invoiceDate': '21-04-2025'}).errors.first;
/// // FbrInvoiceError{code: 0005, field: invoiceDate,
/// //   message: Invoice date must be in YYYY-MM-DD format}
/// validateFbrInvoice(
///   invoice,
///   reference: const FbrInvoiceReference(provinces: ['PUNJAB', 'SINDH']),
/// ).valid; // true when both provinces are in the list
/// ```
FbrInvoiceValidation validateFbrInvoice(
  Object? invoice, {
  String? today,
  FbrInvoiceReference? reference,
}) {
  final errors = <FbrInvoiceError>[];
  void add(String? code, String field, String message) =>
      errors.add(FbrInvoiceError(code, field, message));
  if (invoice is! Map) {
    add(null, 'invoice', 'The invoice must be an object');
    return FbrInvoiceValidation(valid: false, errors: errors);
  }
  final inv = invoice;

  // Invoice type
  final invoiceType = inv['invoiceType'];
  if (!_filled(invoiceType)) {
    add('0011', 'invoiceType', 'Invoice type is empty');
  } else if (!_invoiceTypes.contains(invoiceType)) {
    add(
      '0003',
      'invoiceType',
      'Invoice type must be "Sale Invoice" or "Debit Note"',
    );
  }

  // Date
  final invoiceDate = inv['invoiceDate'];
  if (invoiceDate is! String || jsTrim(invoiceDate).isEmpty) {
    add('0042', 'invoiceDate', 'Invoice date is empty');
  } else if (!_datePattern.hasMatch(invoiceDate)) {
    add('0005', 'invoiceDate', 'Invoice date must be in YYYY-MM-DD format');
  } else if (!_validDate(invoiceDate)) {
    add('0113', 'invoiceDate', 'Invoice date is not a valid date');
  } else if (today != null &&
      _validDate(today) &&
      invoiceDate.compareTo(today) > 0) {
    add('0043', 'invoiceDate', 'Invoice date is later than today');
  }

  // Seller
  final sellerId = inv['sellerNTNCNIC'];
  if (sellerId is! String || !_ntnOrCnic.hasMatch(sellerId)) {
    add('0401', 'sellerNTNCNIC', 'Seller NTN or CNIC must be 7 or 13 digits');
  }
  if (!_filled(inv['sellerBusinessName'])) {
    add(null, 'sellerBusinessName', 'Seller business name is required');
  }
  if (!_filled(inv['sellerProvince'])) {
    add('0073', 'sellerProvince', 'Seller province is empty');
  }
  if (!_filled(inv['sellerAddress'])) {
    add(null, 'sellerAddress', 'Seller address is required');
  }

  // Buyer
  final registration = inv['buyerRegistrationType'];
  if (registration is! String || !_registrationTypes.contains(registration)) {
    add(
      '0012',
      'buyerRegistrationType',
      'Buyer registration type must be "Registered" or "Unregistered"',
    );
  }
  final buyerId = inv['buyerNTNCNIC'];
  if (buyerId is! String || jsTrim(buyerId).isEmpty) {
    if (registration != 'Unregistered') {
      add('0009', 'buyerNTNCNIC', 'Buyer NTN or CNIC is empty');
    }
  } else if (!_ntnOrCnic.hasMatch(buyerId)) {
    add('0402', 'buyerNTNCNIC', 'Buyer NTN or CNIC must be 7 or 13 digits');
  } else if (buyerId == sellerId) {
    add(
      '0058',
      'buyerNTNCNIC',
      'Buyer and seller must be different (self-invoicing is not allowed)',
    );
  }
  if (!_filled(inv['buyerBusinessName'])) {
    add('0010', 'buyerBusinessName', 'Buyer business name is empty');
  }
  if (!_filled(inv['buyerProvince'])) {
    add('0074', 'buyerProvince', 'Buyer province is empty');
  }
  if (!_filled(inv['buyerAddress'])) {
    add(null, 'buyerAddress', 'Buyer address is required');
  }

  // Reference number and scenario
  final refNo = inv['invoiceRefNo'];
  if (refNo is String && jsTrim(refNo).isNotEmpty) {
    if (!_fbrInvoiceNumber.hasMatch(jsTrim(refNo))) {
      add(
        null,
        'invoiceRefNo',
        'Invoice reference number must be an FBR invoice number '
            '(NTN or CNIC, "DI", 13 digits)',
      );
    }
  } else if (invoiceType == 'Debit Note') {
    add(
      '0026',
      'invoiceRefNo',
      'Invoice reference number is required for a debit note',
    );
  }
  final scenarioId = inv['scenarioId'];
  if (_present(scenarioId)) {
    if (scenarioId is! String || !_scenario.hasMatch(scenarioId)) {
      add(null, 'scenarioId', 'Scenario ID must be SN001 to SN028');
    }
  }

  // Reference lists synced from FBR's APIs ([reference]), if given.
  final provinces = _keySet(reference?.provinces);
  if (provinces != null) {
    for (final (field, code, who) in const [
      ('sellerProvince', '0073', 'Seller'),
      ('buyerProvince', '0074', 'Buyer'),
    ]) {
      final value = inv[field];
      if (_filled(value) &&
          !provinces.contains(normalizeKey(value as String))) {
        add(code, field, "$who province is not in FBR's province list");
      }
    }
  }

  // Items
  final items = inv['items'];
  if (items is! List || items.isEmpty) {
    add(null, 'items', 'The invoice needs at least one item');
    return FbrInvoiceValidation(valid: errors.isEmpty, errors: errors);
  }
  for (final (index, raw) in items.indexed) {
    String at(String key) => 'items[$index].$key';
    if (raw is! Map) {
      add(null, 'items[$index]', 'Each item must be an object');
      continue;
    }
    final item = raw;
    if (!_filled(item['hsCode'])) add('0044', at('hsCode'), 'HS code is empty');
    if (item['productDescription'] is! String) {
      add(null, at('productDescription'), 'Product description is required');
    }
    if (!_filled(item['rate'])) add('0020', at('rate'), 'Rate is empty');
    if (!_filled(item['uoM'])) {
      add(null, at('uoM'), 'Unit of measure is required');
    }
    if (!_filled(item['saleType'])) {
      add('0013', at('saleType'), 'Sale type is empty');
    }

    final numbersOk = <String>{};
    for (final key in _amountKeys) {
      final value = item[key];
      final required = _missingCodes.containsKey(key);
      if (value == null || (!required && value == '')) {
        if (required) add(_missingCodes[key], at(key), '$key is required');
        continue;
      }
      if (value is! num || !value.isFinite || value < 0) {
        add('0300', at(key), '$key must be a number, not negative');
        continue;
      }
      final places = _decimalPlaces(value)!;
      final limit = key == 'quantity' ? 4 : 2;
      if (places > limit) {
        add('0302', at(key), '$key has more than $limit decimal places');
        continue;
      }
      numbersOk.add(key);
    }

    final rateValue = item['rate'];
    final rate = rateValue is String ? jsTrim(rateValue) : '';
    if (_filled(rateValue) &&
        rate != '18%' &&
        !_filled(item['sroScheduleNo'])) {
      add(
        '0077',
        at('sroScheduleNo'),
        'SRO/schedule number is required when the rate is not 18%',
      );
    }
    if (_filled(item['sroScheduleNo']) && !_filled(item['sroItemSerialNo'])) {
      add(
        '0078',
        at('sroItemSerialNo'),
        'Item serial number is required when an SRO/schedule number is given',
      );
    }
    final saleType = _saleTypeKey(item['saleType']);
    if (saleType == '3rd schedule goods' &&
        numbersOk.contains('fixedNotifiedValueOrRetailPrice') &&
        item['fixedNotifiedValueOrRetailPrice'] == 0) {
      add(
        '0090',
        at('fixedNotifiedValueOrRetailPrice'),
        'Retail price is required for Third Schedule goods',
      );
    }
    if (saleType == 'goods at reduced rate' && _present(item['extraTax'])) {
      add(
        '0091',
        at('extraTax'),
        'Extra tax must be empty for goods at a reduced rate',
      );
    }

    // Sales tax arithmetic
    if (numbersOk.contains('salesTaxApplicable')) {
      final percent = _percentRate.hasMatch(rate);
      final perUnit = _perUnitRate.hasMatch(rate);
      final baseKey = perUnit
          ? 'quantity'
          : saleType == '3rd schedule goods'
              ? 'fixedNotifiedValueOrRetailPrice'
              : 'valueSalesExcludingST';
      if ((percent || perUnit) && numbersOk.contains(baseKey)) {
        final expected = expectedSalesTax(item);
        if (expected != null) {
          final actual = toUnits(item['salesTaxApplicable']! as num, 2);
          final wanted = toUnits(expected, 2);
          if (actual != null && wanted != null && (actual - wanted).abs() > 1) {
            final code = perUnit
                ? '0105'
                : saleType == '3rd schedule goods'
                    ? '0102'
                    : '0104';
            add(
              code,
              at('salesTaxApplicable'),
              'Sales tax should be ${jsToFixed(expected, 2)} for this rate',
            );
          }
        }
      }
    }
  }

  final saleTypes = _keySet(reference?.saleTypes);
  final uoms = _keySet(reference?.uoms);
  final hsUom = reference?.hsUom == null
      ? null
      : {
          for (final e in reference!.hsUom!.entries)
            normalizeKey(e.key): _keySet(e.value)!,
        };
  if (saleTypes != null || uoms != null || hsUom != null) {
    for (final (index, raw) in items.indexed) {
      if (raw is! Map) continue;
      String at(String key) => 'items[$index].$key';
      final saleType = raw['saleType'];
      if (saleTypes != null &&
          _filled(saleType) &&
          !saleTypes.contains(normalizeKey(saleType as String))) {
        add('0013', at('saleType'), "Sale type is not in FBR's sale type list");
      }
      final uoM = raw['uoM'];
      final unit = _filled(uoM) ? normalizeKey(uoM as String) : null;
      if (uoms != null && unit != null && !uoms.contains(unit)) {
        add('0099', at('uoM'), "Unit of measure is not in FBR's unit list");
      }
      final hsCode = raw['hsCode'];
      if (hsUom != null && _filled(hsCode)) {
        final allowed = hsUom[normalizeKey(hsCode as String)];
        if (allowed == null) {
          add(null, at('hsCode'), "HS code is not in FBR's HS code list");
        } else if (unit != null && !allowed.contains(unit)) {
          add(
            '0099',
            at('uoM'),
            'Unit of measure is not allowed for this HS code',
          );
        }
      }
    }
  }

  return FbrInvoiceValidation(valid: errors.isEmpty, errors: errors);
}
