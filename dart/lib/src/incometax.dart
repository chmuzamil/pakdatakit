import 'data/income_tax_slabs.g.dart';
import 'data_info.dart';
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

/// The surcharge under section 4AB of the Income Tax Ordinance: [rate]
/// percent of the tax from the rate table, payable when taxable income
/// exceeds [over] rupees. See [SalaryTaxYear.surcharge].
class SalaryTaxSurcharge {
  /// Creates a salary tax surcharge value.
  const SalaryTaxSurcharge({
    required this.rate,
    required this.over,
    required this.law,
    required this.source,
  });

  /// Percent of the tax from the rate table. `0` where the law sets none.
  final double rate;

  /// Taxable income must exceed this many rupees (Rs 10 million).
  final int over;

  /// The law that sets it.
  final String law;

  /// Official document.
  final String source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'rate': rate,
        'over': over,
        'law': law,
        'source': source,
      };

  @override
  bool operator ==(Object other) =>
      other is SalaryTaxSurcharge &&
      other.rate == rate &&
      other.over == over &&
      other.law == law &&
      other.source == source;

  @override
  int get hashCode => Object.hash(rate, over, law, source);

  @override
  String toString() => 'SalaryTaxSurcharge${toJson()}';
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
    this.surcharge,
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

  /// The section 4AB surcharge on salaried individuals for the year, or
  /// `null` for years before it existed (tax years up to 2024).
  final SalaryTaxSurcharge? surcharge;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'taxYear': taxYear,
        'from': from,
        'to': to,
        'law': law,
        'source': source,
        'slabs': [for (final slab in slabs) slab.toJson()],
        'surcharge': surcharge?.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is SalaryTaxYear &&
      other.taxYear == taxYear &&
      other.from == from &&
      other.to == to &&
      other.law == law &&
      other.source == source &&
      listEquals(other.slabs, slabs) &&
      other.surcharge == surcharge;

  @override
  int get hashCode =>
      Object.hash(taxYear, from, to, law, source, listHash(slabs), surcharge);

  @override
  String toString() => 'SalaryTaxYear${toJson()}';
}

/// Result of [calculateSalaryTax] and [calculateMonthlySalaryTax].
class SalaryTax {
  /// Creates a salary tax value.
  const SalaryTax({
    required this.tax,
    this.surcharge = 0,
    double? total,
    required this.monthly,
    required this.effectiveRate,
    required this.slab,
    required this.taxYear,
    this.source,
  }) : total = total ?? tax + surcharge;

  /// Tax for the year from the rate table, in rupees, rounded half up to the
  /// paisa.
  final double tax;

  /// The section 4AB surcharge, rounded half up to the paisa. `0` unless
  /// `includeSurcharge` is set and the year and income attract one.
  final double surcharge;

  /// `tax + surcharge`: the year's total.
  final double total;

  /// `total / 12`, rounded half up to the paisa.
  final double monthly;

  /// [total] as a percent of the income, rounded half up to 2 decimals.
  final double effectiveRate;

  /// The band the income falls in.
  final SalaryTaxSlab slab;

  /// The tax year used.
  final int taxYear;

  /// The rate table used: its tax year's dates, law and official source
  /// (dataset `income-tax-slabs`). Always set by [calculateSalaryTax] and
  /// [calculateMonthlySalaryTax].
  final DataSource? source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'tax': tax,
        'surcharge': surcharge,
        'total': total,
        'monthly': monthly,
        'effectiveRate': effectiveRate,
        'slab': slab.toJson(),
        'taxYear': taxYear,
        if (source != null) 'source': source!.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is SalaryTax &&
      other.tax == tax &&
      other.surcharge == surcharge &&
      other.total == total &&
      other.monthly == monthly &&
      other.effectiveRate == effectiveRate &&
      other.slab == slab &&
      other.taxYear == taxYear &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
      tax, surcharge, total, monthly, effectiveRate, slab, taxYear, source);

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
      surcharge: switch (e['surcharge']) {
        final Map<String, Object?> s => SalaryTaxSurcharge(
            rate: (s['rate']! as num).toDouble(),
            over: s['over']! as int,
            law: s['law']! as String,
            source: s['source']! as String,
          ),
        _ => null,
      },
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

SalaryTax _compute(
  int incomePaisa,
  SalaryTaxYear year,
  bool includeSurcharge,
) {
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
  final surcharge = year.surcharge;
  final surchargePaisa = includeSurcharge &&
          surcharge != null &&
          surcharge.rate > 0 &&
          incomePaisa > surcharge.over * 100
      ? divideHalfUp(
          BigInt.from(taxPaisa) * BigInt.from((surcharge.rate * 100).round()),
          BigInt.from(10000),
        )
      : 0;
  final totalPaisa = taxPaisa + surchargePaisa;
  return SalaryTax(
    tax: fromPaisa(taxPaisa),
    surcharge: fromPaisa(surchargePaisa),
    total: fromPaisa(totalPaisa),
    monthly: fromPaisa(divideHalfUp(BigInt.from(totalPaisa), BigInt.from(12))),
    effectiveRate: incomePaisa == 0
        ? 0
        : divideHalfUp(
              BigInt.from(totalPaisa) * BigInt.from(10000),
              BigInt.from(incomePaisa),
            ) /
            100,
    slab: slab,
    taxYear: year.taxYear,
    source: DataSource(
      id: 'income-tax-slabs',
      effectiveFrom: year.from,
      effectiveTo: year.to,
      sourceReference: year.law,
      sourceUrl: year.source,
    ),
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
/// With [includeSurcharge] set to `true` it adds the section 4AB surcharge:
/// a percentage of the whole tax once taxable income exceeds Rs 10 million
/// (10% in tax year 2025, 9% for salaried individuals in 2026, none in 2027
/// or before 2025). Because it applies to the whole tax, one rupee over
/// Rs 10 million adds it in full. It is off by default in 2.x so that
/// existing results do not change, and will be on by default in 3.0.
///
/// Tax credits, exemptions, the separate pension rate, super tax and
/// withholding adjustments are not applied. This is an estimate, not tax
/// advice.
///
/// Returns `null` for an invalid amount or date, or a tax year that is not
/// covered. Never throws.
///
/// ```dart
/// calculateSalaryTax(1800000, taxYear: 2026);
/// // SalaryTax{tax: 72000.0, surcharge: 0.0, total: 72000.0,
/// //   monthly: 6000.0, effectiveRate: 4.0,
/// //   slab: {over: 1200000, upTo: 2200000, fixed: 6000, rate: 11.0},
/// //   taxYear: 2026, source: {id: income-tax-slabs,
/// //   effectiveFrom: 2025-07-01, ...}}
/// calculateSalaryTax(12000000, taxYear: 2026, includeSurcharge: true);
/// // SalaryTax{tax: 3381000.0, surcharge: 304290.0, total: 3685290.0,
/// //   monthly: 307107.5, ...}
/// ```
SalaryTax? calculateSalaryTax(
  num annualIncome, {
  int? taxYear,
  Object? date,
  bool includeSurcharge = false,
}) {
  final paisa = toUnits(annualIncome, 2);
  if (paisa == null) return null;
  final year = _findYear(taxYear, date);
  return year == null ? null : _compute(paisa, year, includeSurcharge);
}

/// [calculateSalaryTax] for a monthly salary: the income is
/// `monthlySalary × 12`, and [SalaryTax.monthly] is the tax to withhold each
/// month. [includeSurcharge] adds the section 4AB surcharge, as in
/// [calculateSalaryTax]. Never throws.
///
/// ```dart
/// calculateMonthlySalaryTax(150000, taxYear: 2026)?.monthly; // 6000
/// ```
SalaryTax? calculateMonthlySalaryTax(
  num monthlySalary, {
  int? taxYear,
  Object? date,
  bool includeSurcharge = false,
}) {
  final paisa = toUnits(monthlySalary, 2);
  if (paisa == null) return null;
  final year = _findYear(taxYear, date);
  return year == null ? null : _compute(paisa * 12, year, includeSurcharge);
}
