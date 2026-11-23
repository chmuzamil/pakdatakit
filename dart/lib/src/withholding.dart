import 'data/withholding_rates.g.dart';
import 'data_info.dart';
import 'incometax.dart';
import 'internal/equality.dart';
import 'internal/js.dart';
import 'internal/money.dart';

/// A value band: the rate for amounts over [over] up to [upTo] (inclusive;
/// `null` = no limit).
class WithholdingSlab {
  /// Creates a withholding slab value.
  const WithholdingSlab({
    required this.over,
    required this.upTo,
    required this.rate,
  });

  /// Lower bound in rupees (the amount must exceed it).
  final int over;

  /// Upper bound in rupees, or `null` for the top band.
  final int? upTo;

  /// Percent of the whole amount, e.g. `3.5`.
  final double rate;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'over': over, 'upTo': upTo, 'rate': rate};

  @override
  bool operator ==(Object other) =>
      other is WithholdingSlab &&
      other.over == over &&
      other.upTo == upTo &&
      other.rate == rate;

  @override
  int get hashCode => Object.hash(over, upTo, rate);

  @override
  String toString() => 'WithholdingSlab${toJson()}';
}

/// How the rate for a person not on the Active Taxpayers List is set for a
/// case. See [Withholding.nonAtlRule].
enum WithholdingNonAtlRule {
  /// The Tenth Schedule's 100% increase: double the rate.
  doubled('double'),

  /// Its own rate (236C, or 231AB, which applies only to them).
  fixed('fixed'),

  /// Its own value bands (236K).
  slabs('slabs'),

  /// The same rate for all (149).
  notApplicable('not-applicable');

  const WithholdingNonAtlRule(this.value);

  /// The value used by the npm package, e.g. `"double"`.
  final String value;

  /// Returns [value].
  String toJson() => value;

  static WithholdingNonAtlRule _fromValue(Object? value) =>
      values.firstWhere((rule) => rule.value == value);
}

/// Whether a 154B tax is a minimum or a final tax. See
/// [Withholding.taxNature].
enum WithholdingTaxNature {
  /// A minimum tax: the recipient is resident.
  minimum('minimum'),

  /// A final tax: the recipient is a non-resident without a permanent
  /// establishment in Pakistan.
  finalTax('final');

  const WithholdingTaxNature(this.value);

  /// The value used by the npm package, e.g. `"final"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// The amount at or below which nothing is collected (231AB: Rs 50,000 of
/// cash withdrawn in a day, all withdrawals added up).
class WithholdingThreshold {
  /// Creates a withholding threshold value.
  const WithholdingThreshold({
    required this.amount,
    required this.per,
    this.withinThreshold,
  });

  /// The amount in rupees.
  final int amount;

  /// The period it applies to, e.g. `day`.
  final String per;

  /// From [calculateWithholding]: whether the amount was within the
  /// threshold, so nothing was collected. `null` in [getWithholdingRates].
  final bool? withinThreshold;

  /// JSON form, with the same keys as the npm package. `withinThreshold` is
  /// left out when it is `null`.
  Map<String, Object?> toJson() => {
        'amount': amount,
        'per': per,
        if (withinThreshold != null) 'withinThreshold': withinThreshold,
      };

  @override
  bool operator ==(Object other) =>
      other is WithholdingThreshold &&
      other.amount == amount &&
      other.per == per &&
      other.withinThreshold == withinThreshold;

  @override
  int get hashCode => Object.hash(amount, per, withinThreshold);

  @override
  String toString() => 'WithholdingThreshold${toJson()}';
}

/// Result of [calculateWithholding].
class Withholding {
  /// Creates a withholding value.
  const Withholding({
    required this.section,
    required this.subType,
    required this.description,
    required this.taxYear,
    required this.atl,
    required this.lateFiler,
    required this.rate,
    required this.tax,
    required this.nonAtlRule,
    required this.slab,
    required this.threshold,
    required this.cardRef,
    required this.lawRef,
    required this.statuteOverride,
    this.taxNature,
    required this.source,
  });

  /// Section of the Income Tax Ordinance 2001, e.g. `236K`.
  final String section;

  /// The case of the section, e.g. `purchase`.
  final String subType;

  /// The case as the rate card describes it.
  final String description;

  /// The tax year used.
  final int taxYear;

  /// Whether the person is on FBR's Active Taxpayers List.
  final bool atl;

  /// Whether the late-filer rate was asked for (only for a person on the
  /// list).
  final bool lateFiler;

  /// Percent applied to the whole amount (for 149, the effective rate).
  final double rate;

  /// Tax to withhold or collect, in whole rupees: section 219 of the
  /// Ordinance disregards fractions under 50 paisa and counts 50 paisa or
  /// more as a rupee.
  final int tax;

  /// How the rate for a person not on the list is set for this case.
  final WithholdingNonAtlRule nonAtlRule;

  /// The value band used (236C, 236K), or `null`.
  final WithholdingSlab? slab;

  /// The amount at or below which nothing is collected, and whether this
  /// amount was within it. `null` where there is none.
  final WithholdingThreshold? threshold;

  /// The rate card reference, as printed on the card.
  final String cardRef;

  /// The law reference, as printed on the card.
  final String lawRef;

  /// Where the statute differs from the card and the statute is used, why;
  /// otherwise `null`.
  final String? statuteOverride;

  /// 154B with `resident` given: [WithholdingTaxNature.minimum] for a
  /// resident, [WithholdingTaxNature.finalTax] for a non-resident without a
  /// permanent establishment in Pakistan; otherwise `null`.
  final WithholdingTaxNature? taxNature;

  /// The rate card and law (dataset `withholding-rates`).
  final DataSource source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'section': section,
        'subType': subType,
        'description': description,
        'taxYear': taxYear,
        'atl': atl,
        'lateFiler': lateFiler,
        'rate': rate,
        'tax': tax,
        'nonAtlRule': nonAtlRule.value,
        'slab': slab?.toJson(),
        'threshold': threshold?.toJson(),
        'cardRef': cardRef,
        'lawRef': lawRef,
        'statuteOverride': statuteOverride,
        'taxNature': taxNature?.value,
        'source': source.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is Withholding &&
      other.section == section &&
      other.subType == subType &&
      other.description == description &&
      other.taxYear == taxYear &&
      other.atl == atl &&
      other.lateFiler == lateFiler &&
      other.rate == rate &&
      other.tax == tax &&
      other.nonAtlRule == nonAtlRule &&
      other.slab == slab &&
      other.threshold == threshold &&
      other.cardRef == cardRef &&
      other.lawRef == lawRef &&
      other.statuteOverride == statuteOverride &&
      other.taxNature == taxNature &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
        section,
        subType,
        description,
        taxYear,
        atl,
        lateFiler,
        rate,
        tax,
        nonAtlRule,
        slab,
        threshold,
        cardRef,
        lawRef,
        statuteOverride,
        taxNature,
        source,
      );

  @override
  String toString() => 'Withholding${toJson()}';
}

/// One case of a section in a tax year, as in the rate card. Result of
/// [getWithholdingRates].
class WithholdingRate {
  /// Creates a withholding rate value.
  const WithholdingRate({
    required this.taxYear,
    required this.section,
    required this.subType,
    required this.description,
    required this.atlRate,
    required this.atlSlabs,
    required this.nonAtlRule,
    required this.nonAtlRate,
    required this.nonAtlSlabs,
    required this.lateFilerSlabs,
    required this.threshold,
    required this.cardRef,
    required this.lawRef,
    required this.statuteOverride,
    required this.note,
    required this.source,
  });

  /// The tax year, e.g. `2027`.
  final int taxYear;

  /// Section of the Income Tax Ordinance 2001, e.g. `153`.
  final String section;

  /// The case of the section, e.g. `goods-company`.
  final String subType;

  /// The case as the rate card describes it.
  final String description;

  /// Percent for a person on the list; `null` where it does not apply or
  /// depends on the value (see [atlSlabs]).
  final double? atlRate;

  /// Value bands for a person on the list, or `null`.
  final List<WithholdingSlab>? atlSlabs;

  /// How the rate for a person not on the list is set.
  final WithholdingNonAtlRule nonAtlRule;

  /// Percent for a person not on the list, or `null` (see [nonAtlSlabs]).
  final double? nonAtlRate;

  /// Value bands for a person not on the list, or `null`.
  final List<WithholdingSlab>? nonAtlSlabs;

  /// Late-filer value bands, where the year has them; otherwise `null`.
  final List<WithholdingSlab>? lateFilerSlabs;

  /// The amount at or below which nothing is collected, or `null`.
  final WithholdingThreshold? threshold;

  /// The rate card reference, as printed on the card.
  final String cardRef;

  /// The law reference, as printed on the card.
  final String lawRef;

  /// Where the statute differs from the card and the statute is used, why;
  /// otherwise `null`.
  final String? statuteOverride;

  /// A note on the case, or `null`.
  final String? note;

  /// The rate card and law (dataset `withholding-rates`).
  final DataSource source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'taxYear': taxYear,
        'section': section,
        'subType': subType,
        'description': description,
        'atlRate': atlRate,
        'atlSlabs': atlSlabs?.map((s) => s.toJson()).toList(),
        'nonAtlRule': nonAtlRule.value,
        'nonAtlRate': nonAtlRate,
        'nonAtlSlabs': nonAtlSlabs?.map((s) => s.toJson()).toList(),
        'lateFilerSlabs': lateFilerSlabs?.map((s) => s.toJson()).toList(),
        'threshold': threshold?.toJson(),
        'cardRef': cardRef,
        'lawRef': lawRef,
        'statuteOverride': statuteOverride,
        'note': note,
        'source': source.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is WithholdingRate &&
      other.taxYear == taxYear &&
      other.section == section &&
      other.subType == subType &&
      other.description == description &&
      other.atlRate == atlRate &&
      listEquals(other.atlSlabs, atlSlabs) &&
      other.nonAtlRule == nonAtlRule &&
      other.nonAtlRate == nonAtlRate &&
      listEquals(other.nonAtlSlabs, nonAtlSlabs) &&
      listEquals(other.lateFilerSlabs, lateFilerSlabs) &&
      other.threshold == threshold &&
      other.cardRef == cardRef &&
      other.lawRef == lawRef &&
      other.statuteOverride == statuteOverride &&
      other.note == note &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
        taxYear,
        section,
        subType,
        description,
        atlRate,
        listHash(atlSlabs),
        nonAtlRule,
        nonAtlRate,
        listHash(nonAtlSlabs),
        listHash(lateFilerSlabs),
        threshold,
        cardRef,
        lawRef,
        statuteOverride,
        note,
        source,
      );

  @override
  String toString() => 'WithholdingRate${toJson()}';
}

/// A rate specification of the data: a rate, value bands, or the salaried
/// rate table.
typedef _Spec = ({double? rate, List<WithholdingSlab>? slabs, bool salary});

typedef _Row = ({
  int taxYear,
  String section,
  String subType,
  String description,
  _Spec atl,
  _Spec nonAtl,
  WithholdingNonAtlRule nonAtlRule,
  _Spec? lateFiler,
  WithholdingThreshold? threshold,
  ({int? over, int? under})? returnBand,
  bool hasTaxNature,
  String? note,
  String cardRef,
  String lawRef,
  String? statuteOverride,
  DataSource source,
});

_Spec _spec(Object? value) {
  final e = value! as Map<String, Object?>;
  final slabs = e['slabs'] as List<Object?>?;
  return (
    rate: (e['rate'] as num?)?.toDouble(),
    slabs: slabs == null
        ? null
        : List.unmodifiable([
            for (final s in slabs.cast<Map<String, Object?>>())
              WithholdingSlab(
                over: s['over']! as int,
                upTo: s['upTo'] as int?,
                rate: (s['rate']! as num).toDouble(),
              ),
          ]),
    salary: e['salarySlabs'] != null,
  );
}

// Only the withholding functions reference the rate card, so builds that do
// not call them leave it out.
final List<_Row> _rows = List.unmodifiable([
  for (final e in withholdingRatesJson.cast<Map<String, Object?>>())
    (
      taxYear: e['taxYear']! as int,
      section: e['section']! as String,
      subType: e['subType']! as String,
      description: e['description']! as String,
      atl: _spec(e['atl']),
      nonAtl: _spec(e['nonAtl']),
      nonAtlRule: WithholdingNonAtlRule._fromValue(
        (e['nonAtl']! as Map<String, Object?>)['rule'],
      ),
      lateFiler: e['lateFiler'] == null ? null : _spec(e['lateFiler']),
      threshold: switch (e['threshold']) {
        final Map<String, Object?> t => WithholdingThreshold(
            amount: t['amount']! as int,
            per: t['per']! as String,
          ),
        _ => null,
      },
      returnBand: switch (e['returnBand']) {
        final Map<String, Object?> b => (
            over: b['over'] as int?,
            under: b['under'] as int?,
          ),
        _ => null,
      },
      hasTaxNature: e['taxNature'] != null,
      note: e['note'] as String?,
      cardRef: e['cardRef']! as String,
      lawRef: e['lawRef']! as String,
      statuteOverride: e['statuteOverride'] as String?,
      source: DataSource(
        id: 'withholding-rates',
        effectiveFrom: e['from']! as String,
        effectiveTo: e['to'] as String?,
        sourceReference: '${e['lawRef']} (FBR Withholding Tax Rate Card, '
            'tax year ${e['taxYear']}, ${e['cardRef']})',
        sourceUrl: e['card']! as String,
      ),
    ),
]);

/// Every case FBR's Withholding Tax Rate Card lists for the covered sections
/// in a tax year (2025 to 2027), with its rates for persons on and not on the
/// Active Taxpayers List and its references.
///
/// [taxYear] is e.g. `2027`. Give [section] (e.g. `'153'`, in any case) for
/// that section only.
///
/// Returns the cases, or an empty list for a year that is not covered.
/// Never throws.
///
/// ```dart
/// getWithholdingRates(2027, '236K').first.nonAtlRule;
/// // WithholdingNonAtlRule.slabs
/// ```
List<WithholdingRate> getWithholdingRates(int taxYear, [String? section]) {
  final wanted = section == null ? null : jsToUpperCase(section);
  return [
    for (final r in _rows)
      if (r.taxYear == taxYear && (wanted == null || r.section == wanted))
        WithholdingRate(
          taxYear: r.taxYear,
          section: r.section,
          subType: r.subType,
          description: r.description,
          atlRate: r.atl.rate,
          atlSlabs: r.atl.slabs,
          nonAtlRule: r.nonAtlRule,
          nonAtlRate: r.nonAtl.rate,
          nonAtlSlabs: r.nonAtl.slabs,
          lateFilerSlabs: r.lateFiler?.slabs,
          threshold: r.threshold,
          cardRef: r.cardRef,
          lawRef: r.lawRef,
          statuteOverride: r.statuteOverride,
          note: r.note,
          source: r.source,
        ),
  ];
}

WithholdingSlab _inSlab(int paisa, List<WithholdingSlab> slabs) {
  for (final s in slabs) {
    if (paisa > s.over * 100 && (s.upTo == null || paisa <= s.upTo! * 100)) {
      return s;
    }
  }
  return slabs.first;
}

/// Income tax to withhold or collect under one section of the Income Tax
/// Ordinance 2001, for a person on or not on FBR's Active Taxpayers List
/// (ATL), from FBR's Withholding Tax Rate Card for tax years 2025 to 2027.
///
/// Covered: 231AB cash withdrawal, 236C sale and 236K purchase of immovable
/// property, 151 profit on debt, 150 dividends, 153 goods, services and
/// contracts, 154B social media income (from 2027) and 149 salary (the
/// salaried rate table, as [calculateSalaryTax]).
///
/// - [section]: `'231AB'`, `'236C'`, `'236K'`, `'151'`, `'150'`, `'153'`,
///   `'154B'` or `'149'` (in any case, surrounding spaces ignored).
/// - [subType]: which case of the section, e.g. `'bank-deposit'` (151) or
///   `'goods-company'` (153); see [getWithholdingRates]. May be left out for
///   sections with one case.
/// - [amount]: the payment (for 236C/236K, the value; for 149, the year's
///   taxable salary) in rupees, 0 to 1 trillion (at most 2 decimals count).
/// - [atl]: `true` if the person is on FBR's Active Taxpayers List.
/// - [lateFiler]: `true` for a person on the list who filed the return
///   late. Changes the rate only where the year has a late-filer rate (236C
///   and 236K in tax years 2025 and 2026).
/// - [taxYear] (July to June, e.g. `2027`), or [date], a `YYYY-MM-DD`
///   [String] or a [DateTime] in the tax year. [taxYear] takes precedence;
///   one of them is required.
/// - [returnOnInvestment]: 151 sukuk, individual or AOP: the holder's return
///   on investment in rupees, which decides the case (more than Rs 1
///   million: `sukuk-individual-above-1m`; less than Rs 1 million:
///   `sukuk-individual-below-1m`). Defaults to [amount]. The law gives no
///   rate for exactly Rs 1 million, so that, an invalid value, or a case
///   that does not fit the return gives `null`.
/// - [resident]: 154B: whether the recipient is resident. The rate is the
///   same; it decides [Withholding.taxNature]: a minimum tax (resident) or
///   a final tax (non-resident without a permanent establishment in
///   Pakistan).
///
/// The npm `WithholdingInput` object is these named parameters.
///
/// The rate for a person not on the list follows each case's own rule in the
/// Tenth Schedule: usually double, but a fixed rate (236C, and 151 in 2025),
/// its own value bands (236K), or none (149; 231AB applies only to them).
/// The rate applies to the whole amount (236C and 236K value bands are not
/// marginal), and the tax is rounded to the nearest rupee (section 219).
/// Where FBR's card and the Ordinance differ, the Ordinance is used and
/// [Withholding.statuteOverride] says so. For 231AB, pass the day's total of
/// all cash withdrawals: nothing is collected up to Rs 50,000. For 150
/// mutual fund dividends received by a company, the debt part is
/// `mutual-fund-debt-part-company` (29%). For 151 sukuk held by an
/// individual or AOP, the case must fit the return on investment, and
/// exactly Rs 1 million gives `null`.
///
/// This is an estimate from the rate card, not tax advice: exemptions,
/// reduced-rate certificates, adjustable or final status and the many cases
/// not listed here are not applied.
///
/// Returns the rate, tax and references, or `null` for an unknown section,
/// case or tax year, an invalid amount or date, or neither [taxYear] nor
/// [date]. Never throws.
///
/// ```dart
/// calculateWithholding(
///     section: '236K', amount: 60000000, atl: false, taxYear: 2027);
/// // Withholding{..., rate: 14.5, tax: 8700000, nonAtlRule: slabs, ...}
/// calculateWithholding(
///     section: '231AB', amount: 80000, atl: false, taxYear: 2027)?.tax; // 640
/// calculateWithholding(
///   section: '151',
///   subType: 'bank-deposit',
///   amount: 10000,
///   atl: true,
///   taxYear: 2027,
/// )?.tax; // 2000
/// ```
Withholding? calculateWithholding({
  required String section,
  String? subType,
  required num amount,
  required bool atl,
  bool lateFiler = false,
  int? taxYear,
  Object? date,
  num? returnOnInvestment,
  bool? resident,
}) {
  final paisa = toUnits(amount, 2);
  if (paisa == null) return null;
  final year = taxYear ?? (date == null ? null : getTaxYear(date));
  if (year == null) return null;
  final name = jsToUpperCase(jsTrim(section));
  final cases = [
    for (final r in _rows)
      if (r.taxYear == year && r.section == name) r,
  ];
  if (cases.isEmpty) return null;
  _Row? row;
  if (subType == null) {
    if (cases.length == 1) row = cases.first;
  } else {
    for (final r in cases) {
      if (r.subType == subType) {
        row = r;
        break;
      }
    }
  }
  if (row == null) return null;

  // 151 sukuk (individual or AOP): the case must fit the return; the law
  // says "more than" and "less than" Rs 1 million, so exactly Rs 1 million
  // fits neither.
  final band = row.returnBand;
  if (band != null) {
    final ret =
        returnOnInvestment == null ? paisa : toUnits(returnOnInvestment, 2);
    if (ret == null) return null;
    if (band.over != null && !(ret > band.over! * 100)) return null;
    if (band.under != null && !(ret < band.under! * 100)) return null;
  }

  final late = atl && lateFiler;
  double rate;
  // Tax in whole rupees (section 219).
  int taxRupees;
  WithholdingSlab? slab;
  WithholdingThreshold? threshold;

  if (row.atl.salary) {
    // The salaried rate table, computed exactly and rounded once.
    final table = getSalaryTaxSlabs(year);
    if (table == null) return null;
    var slab = table.slabs.first;
    for (final candidate in table.slabs) {
      if (paisa > candidate.over * 100) slab = candidate;
    }
    final above = paisa > slab.over * 100 ? paisa - slab.over * 100 : 0;
    taxRupees = slab.fixed +
        divideHalfUp(
          BigInt.from(above) * BigInt.from((slab.rate * 100).round()),
          BigInt.from(1000000),
        );
    rate = paisa == 0
        ? 0
        : divideHalfUp(
              BigInt.from(taxRupees) * BigInt.from(1000000),
              BigInt.from(paisa),
            ) /
            100;
  } else {
    final _Spec spec;
    if (!atl) {
      spec = row.nonAtl;
    } else if (late && row.lateFiler != null) {
      spec = row.lateFiler!;
    } else {
      spec = row.atl;
    }
    if (spec.slabs != null) {
      slab = _inSlab(paisa, spec.slabs!);
      rate = slab.rate;
    } else {
      rate = spec.rate ?? 0;
    }
    // Percent as hundredths (basis points), exact for rates with up to 2
    // decimals.
    taxRupees = divideHalfUp(
      BigInt.from(paisa) * BigInt.from((rate * 100).round()),
      BigInt.from(1000000),
    );
    final limit = row.threshold;
    if (limit != null) {
      final within = paisa <= limit.amount * 100;
      threshold = WithholdingThreshold(
        amount: limit.amount,
        per: limit.per,
        withinThreshold: within,
      );
      if (within) taxRupees = 0;
    }
  }

  return Withholding(
    section: row.section,
    subType: row.subType,
    description: row.description,
    taxYear: year,
    atl: atl,
    lateFiler: late,
    rate: rate,
    tax: taxRupees,
    nonAtlRule: row.nonAtlRule,
    slab: slab,
    threshold: threshold,
    cardRef: row.cardRef,
    lawRef: row.lawRef,
    statuteOverride: row.statuteOverride,
    taxNature: row.hasTaxNature && resident != null
        ? (resident
            ? WithholdingTaxNature.minimum
            : WithholdingTaxNature.finalTax)
        : null,
    source: row.source,
  );
}
