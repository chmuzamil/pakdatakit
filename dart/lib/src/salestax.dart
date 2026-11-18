import 'data/sales_tax_rates.g.dart';
import 'internal/date.dart';
import 'internal/money.dart';
import 'internal/normalize.dart';

/// What is taxed: goods (federal sales tax) or services (provincial or ICT).
enum SalesTaxKind {
  /// Goods: federal sales tax under the Sales Tax Act 1990.
  goods('goods'),

  /// Services: provincial sales tax, or FBR's in Islamabad Capital Territory.
  services('services');

  const SalesTaxKind(this.value);

  /// The value used by the npm package, e.g. `"goods"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// One standard rate and the period it applied. Result of [getSalesTaxRate].
class SalesTaxRate {
  /// Creates a sales tax rate value.
  const SalesTaxRate({
    required this.kind,
    required this.authority,
    required this.province,
    required this.rate,
    required this.from,
    required this.to,
    required this.law,
    required this.source,
  });

  /// Goods or services.
  final SalesTaxKind kind;

  /// `FBR`, `PRA`, `SRB`, `KPRA` or `BRA`. FBR also collects ICT's tax on
  /// services.
  final String authority;

  /// For services: the province or `Islamabad Capital Territory`. `null` for
  /// goods.
  final String? province;

  /// Percent, e.g. `18`.
  final double rate;

  /// First day it applied (`YYYY-MM-DD`). Coverage starts on 1 July 2019.
  final String from;

  /// Last day it applied, or `null` if it still applies.
  final String? to;

  /// The law that sets it.
  final String law;

  /// Official document.
  final String source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'kind': kind.value,
        'authority': authority,
        'province': province,
        'rate': rate,
        'from': from,
        'to': to,
        'law': law,
        'source': source,
      };

  @override
  bool operator ==(Object other) =>
      other is SalesTaxRate &&
      other.kind == kind &&
      other.authority == authority &&
      other.province == province &&
      other.rate == rate &&
      other.from == from &&
      other.to == to &&
      other.law == law &&
      other.source == source;

  @override
  int get hashCode =>
      Object.hash(kind, authority, province, rate, from, to, law, source);

  @override
  String toString() => 'SalesTaxRate${toJson()}';
}

/// Result of [calculateSalesTax] and [splitInclusive].
class SalesTaxAmounts {
  /// Creates a sales tax amounts value.
  const SalesTaxAmounts({
    required this.net,
    required this.tax,
    required this.gross,
    required this.rate,
  });

  /// Value excluding tax, in rupees (2 decimals at most).
  final double net;

  /// Tax, in rupees.
  final double tax;

  /// Value including tax, in rupees.
  final double gross;

  /// Percent used.
  final double rate;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'net': net,
        'tax': tax,
        'gross': gross,
        'rate': rate,
      };

  @override
  bool operator ==(Object other) =>
      other is SalesTaxAmounts &&
      other.net == net &&
      other.tax == tax &&
      other.gross == gross &&
      other.rate == rate;

  @override
  int get hashCode => Object.hash(net, tax, gross, rate);

  @override
  String toString() => 'SalesTaxAmounts${toJson()}';
}

// Only the sales tax functions reference the rates, so builds that do not
// call them leave them out.
final List<SalesTaxRate> _rates = List.unmodifiable([
  for (final e in salesTaxRatesJson.cast<Map<String, Object?>>())
    SalesTaxRate(
      kind: e['kind'] == 'goods' ? SalesTaxKind.goods : SalesTaxKind.services,
      authority: e['authority']! as String,
      province: e['province'] as String?,
      rate: (e['rate']! as num).toDouble(),
      from: e['from']! as String,
      to: e['to'] as String?,
      law: e['law']! as String,
      source: e['source']! as String,
    ),
]);

const Map<String, String> _provinces = {
  'punjab': 'Punjab',
  'sindh': 'Sindh',
  'khyber pakhtunkhwa': 'Khyber Pakhtunkhwa',
  'kp': 'Khyber Pakhtunkhwa',
  'kpk': 'Khyber Pakhtunkhwa',
  'balochistan': 'Balochistan',
  'baluchistan': 'Balochistan',
  'islamabad capital territory': 'Islamabad Capital Territory',
  'ict': 'Islamabad Capital Territory',
  'islamabad': 'Islamabad Capital Territory',
  'azad jammu and kashmir': 'Azad Jammu and Kashmir',
  'ajk': 'Azad Jammu and Kashmir',
  'gilgit-baltistan': 'Gilgit-Baltistan',
  'gilgit baltistan': 'Gilgit-Baltistan',
  'gb': 'Gilgit-Baltistan',
};

/// Provinces outside the federal Sales Tax Act's territory.
const Set<String> _outsideFederal = {
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
};

/// Returns the standard sales tax rate for goods (federal, Sales Tax Act
/// 1990) or for services in a province or Islamabad Capital Territory, on a
/// given date.
///
/// [province] accepts the province names and `KP`, `KPK`, `ICT` and
/// `Islamabad`; for goods it may be left out. [date] is a `YYYY-MM-DD`
/// [String] or a [DateTime] (its local calendar date), and defaults to today.
///
/// Only standard rates are covered, from 1 July 2019. Reduced, higher and
/// sector rates are not.
///
/// Returns `null` for an unknown province, services without a province,
/// goods in Azad Jammu and Kashmir or Gilgit-Baltistan, an invalid date, or a
/// date before 1 July 2019. Never throws.
///
/// ```dart
/// getSalesTaxRate(kind: SalesTaxKind.goods, date: '2026-11-18')?.rate; // 18
/// getSalesTaxRate(
///     kind: SalesTaxKind.services, province: 'Sindh', date: '2024-06-30')
///   ?.rate; // 13
/// ```
SalesTaxRate? getSalesTaxRate({
  required SalesTaxKind kind,
  String? province,
  Object? date,
}) {
  final iso = isoDate(date ?? DateTime.now());
  if (iso == null) return null;

  String? name;
  if (province != null) {
    name = _provinces[normalizeKey(province)];
    if (name == null) return null;
  }
  if (kind == SalesTaxKind.goods) {
    if (name != null && _outsideFederal.contains(name)) return null;
  } else if (name == null) {
    return null;
  }

  for (final r in _rates) {
    if (r.kind == kind &&
        (kind == SalesTaxKind.goods || r.province == name) &&
        r.from.compareTo(iso) <= 0 &&
        (r.to == null || iso.compareTo(r.to!) <= 0)) {
      return r;
    }
  }
  return null;
}

/// Basis points (hundredths of a percent) for a rate from 0 to 100 with at
/// most 2 decimals.
int? _basisPoints(num rate) {
  if (!rate.isFinite || rate < 0 || rate > 100) return null;
  final exact = toUnits(rate, 4); // ten-thousandths of a percent
  if (exact == null || exact % 100 != 0) return null;
  return exact ~/ 100;
}

SalesTaxAmounts _amounts(int netPaisa, int taxPaisa, int bp) => SalesTaxAmounts(
      net: fromPaisa(netPaisa),
      tax: fromPaisa(taxPaisa),
      gross: fromPaisa(netPaisa + taxPaisa),
      rate: bp / 100,
    );

/// Splits an amount that includes sales tax into its value and tax.
///
/// The value is rounded half up to the paisa, and the tax is the rest, so
/// `net + tax` is always `gross`. [gross] is 0 to 1 trillion rupees; [rate]
/// is a percent, 0 to 100, with at most 2 decimals.
///
/// Returns `null` for an invalid amount or rate. Never throws.
///
/// ```dart
/// splitInclusive(1180, 18);
/// // SalesTaxAmounts{net: 1000.0, tax: 180.0, gross: 1180.0, rate: 18.0}
/// ```
SalesTaxAmounts? splitInclusive(num gross, num rate) {
  final grossPaisa = toUnits(gross, 2);
  final bp = _basisPoints(rate);
  if (grossPaisa == null || bp == null) return null;
  final netPaisa = divideHalfUp(
    BigInt.from(grossPaisa) * BigInt.from(10000),
    BigInt.from(10000 + bp),
  );
  return _amounts(netPaisa, grossPaisa - netPaisa, bp);
}

/// Adds sales tax to [amount] (0 to 1 trillion rupees), or splits it out
/// when [inclusive] is `true`.
///
/// Give a [rate] (percent, 0 to 100, at most 2 decimals), or a [province]
/// (and [kind], default [SalesTaxKind.services] when a province is given,
/// and [date]) to use the standard rate from [getSalesTaxRate]. [rate] takes
/// precedence over [province]. The tax is rounded half up to the paisa.
///
/// Returns `null` if the amount, rate or province is invalid or no rate
/// applies. Never throws.
///
/// ```dart
/// calculateSalesTax(1000, rate: 18);
/// // SalesTaxAmounts{net: 1000.0, tax: 180.0, gross: 1180.0, rate: 18.0}
/// calculateSalesTax(1000, province: 'Punjab', date: '2026-11-18')?.tax; // 160
/// calculateSalesTax(1150,
///     province: 'Sindh', date: '2026-11-18', inclusive: true)?.net; // 1000
/// ```
SalesTaxAmounts? calculateSalesTax(
  num amount, {
  num? rate,
  String? province,
  SalesTaxKind? kind,
  Object? date,
  bool inclusive = false,
}) {
  num percent;
  if (rate != null) {
    percent = rate;
  } else {
    final resolved = kind ?? (province != null ? SalesTaxKind.services : null);
    if (resolved == null) return null;
    final found =
        getSalesTaxRate(kind: resolved, province: province, date: date);
    if (found == null) return null;
    percent = found.rate;
  }
  if (inclusive) return splitInclusive(amount, percent);

  final netPaisa = toUnits(amount, 2);
  final bp = _basisPoints(percent);
  if (netPaisa == null || bp == null) return null;
  final taxPaisa = divideHalfUp(
    BigInt.from(netPaisa) * BigInt.from(bp),
    BigInt.from(10000),
  );
  return _amounts(netPaisa, taxPaisa, bp);
}
