import 'data/income_tax_slabs.g.dart';
import 'internal/date.dart';
import 'internal/equality.dart';
import 'internal/money.dart';

/// One band of the salaried rate table: income above [over] (and up to
/// [upTo]) pays [fixed] plus [rate] percent of the amount above [over].
class SalaryTaxSlab {
  /// Creates a salary tax slab value.
  const SalaryTaxSlab({
    required this.over,
    required this.upTo,
    required this.fixed,
    required this.rate,
  });

  /// Lower bound in rupees (income must exceed it).
  final int over;

  /// Upper bound in rupees, or `null` for the top band.
  final int? upTo;

  /// Tax on the income up to [over], in rupees.
  final int fixed;

  /// Percent of the income above [over], e.g. `17.5`.
  final double rate;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'over': over,
        'upTo': upTo,
        'fixed': fixed,
        'rate': rate,
      };

  @override
  bool operator ==(Object other) =>
      other is SalaryTaxSlab &&
      other.over == over &&
      other.upTo == upTo &&
      other.fixed == fixed &&
      other.rate == rate;

  @override
  int get hashCode => Object.hash(over, upTo, fixed, rate);

  @override
  String toString() => 'SalaryTaxSlab${toJson()}';
}

/// The salaried rate table for one tax year (1 July to 30 June). Result of
/// [getSalaryTaxSlabs].
class SalaryTaxYear {
  /// Creates a salary tax year value.
  const SalaryTaxYear({
    required this.taxYear,
    required this.from,
    required this.to,
    required this.law,
    required this.source,
    required this.slabs,
  });

  /// The tax year, named after the June it ends in: 2026 is 1 July 2025 to
  /// 30 June 2026.
  final int taxYear;

  /// `YYYY-MM-DD`, always 1 July.
  final String from;

  /// `YYYY-MM-DD`, always 30 June.
  final String to;

  /// The law that sets the table.
  final String law;

  /// Official document.
  final String source;

  /// The bands, lowest first.
  final List<SalaryTaxSlab> slabs;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'taxYear': taxYear,
        'from': from,
        'to': to,
        'law': law,
        'source': source,
        'slabs': [for (final slab in slabs) slab.toJson()],
      };

  @override
  bool operator ==(Object other) =>
      other is SalaryTaxYear &&
      other.taxYear == taxYear &&
      other.from == from &&
      other.to == to &&
      other.law == law &&
      other.source == source &&
      listEquals(other.slabs, slabs);

  @override
  int get hashCode =>
      Object.hash(taxYear, from, to, law, source, listHash(slabs));

  @override
  String toString() => 'SalaryTaxYear${toJson()}';
}

/// Result of [calculateSalaryTax] and [calculateMonthlySalaryTax].
class SalaryTax {
  /// Creates a salary tax value.
  const SalaryTax({
    required this.tax,
    required this.monthly,
    required this.effectiveRate,
    required this.slab,
    required this.taxYear,
  });

  /// Tax for the year, in rupees, rounded half up to the paisa.
  final double tax;

  /// `tax / 12`, rounded half up to the paisa.
  final double monthly;

  /// [tax] as a percent of the income, rounded half up to 2 decimals.
  final double effectiveRate;

  /// The band the income falls in.
  final SalaryTaxSlab slab;

  /// The tax year used.
  final int taxYear;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'tax': tax,
        'monthly': monthly,
        'effectiveRate': effectiveRate,
        'slab': slab.toJson(),
        'taxYear': taxYear,
      };

  @override
  bool operator ==(Object other) =>
      other is SalaryTax &&
      other.tax == tax &&
      other.monthly == monthly &&
      other.effectiveRate == effectiveRate &&
      other.slab == slab &&
      other.taxYear == taxYear;

  @override
  int get hashCode => Object.hash(tax, monthly, effectiveRate, slab, taxYear);

  @override
  String toString() => 'SalaryTax${toJson()}';
}

// Only the income tax functions reference the table, so builds that do not
// call them leave it out.
final List<SalaryTaxYear> _years = List.unmodifiable([
  for (final e in incomeTaxSlabsJson.cast<Map<String, Object?>>())
    SalaryTaxYear(
      taxYear: e['taxYear']! as int,
      from: e['from']! as String,
      to: e['to']! as String,
      law: e['law']! as String,
      source: e['source']! as String,
      slabs: List.unmodifiable([
        for (final s in (e['slabs']! as List).cast<Map<String, Object?>>())
          SalaryTaxSlab(
            over: s['over']! as int,
            upTo: s['upTo'] as int?,
            fixed: s['fixed']! as int,
            rate: (s['rate']! as num).toDouble(),
          ),
      ]),
    ),
]);

/// The tax year (July to June) that contains [date], or `null` for an
/// invalid date.
///
/// [date] is a `YYYY-MM-DD` [String] or a [DateTime] (its local calendar
/// date), and defaults to today. A tax year is named after the June it ends
/// in. Never throws.
///
/// ```dart
/// getTaxYear('2025-06-30'); // 2025
/// getTaxYear('2025-07-01'); // 2026
/// ```
int? getTaxYear([Object? date]) {
  final iso = isoDate(date ?? DateTime.now());
  if (iso == null) return null;
  // A DateTime outside years 0-9999 does not give `YYYY-MM-DD`; the same
  // slices are read as the npm package reads them (a year that is not a
  // number gives no tax year, a month that is not a number counts as June).
  final year = int.tryParse(iso.substring(0, 4));
  if (year == null) return null;
  final month = int.tryParse(iso.substring(5, 7));
  return month != null && month >= 7 ? year + 1 : year;
}

SalaryTaxYear? _findYear(int? taxYear, Object? date) {
  final year = taxYear ?? getTaxYear(date);
  for (final y in _years) {
    if (y.taxYear == year) return y;
  }
  return null;
}

/// Returns the salaried rate table for a tax year: Division I of Part I of
/// the First Schedule to the Income Tax Ordinance 2001, clause (2), which
/// applies when salary is more than 75% of taxable income.
///
/// Covers tax years 2020 to 2027, each from FBR's consolidated Ordinance.
/// [taxYear] is e.g. `2026` (1 July 2025 to 30 June 2026) and defaults to the
/// current tax year.
///
/// Returns `null` for a year that is not covered. Never throws.
SalaryTaxYear? getSalaryTaxSlabs([int? taxYear]) => _findYear(taxYear, null);

/// Which tax years [getSalaryTaxSlabs] covers, oldest first.
List<int> getSalaryTaxYears() => [for (final y in _years) y.taxYear];

SalaryTax _compute(int incomePaisa, SalaryTaxYear year) {
  var slab = year.slabs.first;
  for (final candidate in year.slabs) {
    if (incomePaisa > candidate.over * 100) slab = candidate;
  }
  final rateBp = (slab.rate * 100).round();
  // Paisa stay below 2^53, but their products with basis points do not, so
  // they are multiplied as BigInt (exact on every platform).
  final taxPaisa = incomePaisa > slab.over * 100
      ? slab.fixed * 100 +
          divideHalfUp(
            BigInt.from(incomePaisa - slab.over * 100) * BigInt.from(rateBp),
            BigInt.from(10000),
          )
      : slab.fixed * 100;
  return SalaryTax(
    tax: fromPaisa(taxPaisa),
    monthly: fromPaisa(divideHalfUp(BigInt.from(taxPaisa), BigInt.from(12))),
    effectiveRate: incomePaisa == 0
        ? 0
        : divideHalfUp(
              BigInt.from(taxPaisa) * BigInt.from(10000),
              BigInt.from(incomePaisa),
            ) /
            100,
    slab: slab,
    taxYear: year.taxYear,
  );
}

/// Income tax on a salaried individual's taxable income for a tax year, from
/// the salaried rate table (see [getSalaryTaxSlabs]).
///
/// [annualIncome] is the taxable income for the year in rupees, 0 to 1
/// trillion (at most 2 decimals count). [taxYear] takes precedence over
/// [date] (a `YYYY-MM-DD` [String] or a [DateTime] in the tax year); with
/// neither, the current tax year is used. The npm `SalaryTaxOptions` object
/// is these named parameters.
///
/// The rate table only: the surcharge, tax credits, exemptions, the separate
/// pension rate and withholding adjustments are not applied.
///
/// Returns `null` for an invalid amount or date, or a tax year that is not
/// covered. Never throws.
///
/// ```dart
/// calculateSalaryTax(1800000, taxYear: 2026);
/// // SalaryTax{tax: 72000.0, monthly: 6000.0, effectiveRate: 4.0,
/// //   slab: {over: 1200000, upTo: 2200000, fixed: 6000, rate: 11.0},
/// //   taxYear: 2026}
/// ```
SalaryTax? calculateSalaryTax(num annualIncome, {int? taxYear, Object? date}) {
  final paisa = toUnits(annualIncome, 2);
  if (paisa == null) return null;
  final year = _findYear(taxYear, date);
  return year == null ? null : _compute(paisa, year);
}

/// [calculateSalaryTax] for a monthly salary: the income is
/// `monthlySalary × 12`, and [SalaryTax.monthly] is the tax to withhold each
/// month. Never throws.
///
/// ```dart
/// calculateMonthlySalaryTax(150000, taxYear: 2026)?.monthly; // 6000
/// ```
SalaryTax? calculateMonthlySalaryTax(
  num monthlySalary, {
  int? taxYear,
  Object? date,
}) {
  final paisa = toUnits(monthlySalary, 2);
  if (paisa == null) return null;
  final year = _findYear(taxYear, date);
  return year == null ? null : _compute(paisa * 12, year);
}
