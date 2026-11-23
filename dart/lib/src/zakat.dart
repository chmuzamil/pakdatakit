import 'data/zakat_nisab.g.dart';
import 'data_info.dart';
import 'internal/date.dart';
import 'internal/js.dart';
import 'internal/money.dart';

/// A document behind a Zakat year's nisab: its number, date and URL.
class ZakatDocument {
  /// Creates a Zakat document value.
  const ZakatDocument({
    required this.number,
    required this.date,
    required this.url,
  });

  /// Its number or title, as printed.
  final String number;

  /// Its date (`YYYY-MM-DD`).
  final String date;

  /// The official document.
  final String url;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'number': number, 'date': date, 'url': url};

  @override
  bool operator ==(Object other) =>
      other is ZakatDocument &&
      other.number == number &&
      other.date == date &&
      other.url == url;

  @override
  int get hashCode => Object.hash(number, date, url);

  @override
  String toString() => 'ZakatDocument${toJson()}';
}

/// Who announced 1 Ramazan, and where the announcement was reported. See
/// [ZakatNisab.ramazan1Source].
class ZakatRamazan1Source {
  /// Creates a 1 Ramazan source value.
  const ZakatRamazan1Source({
    required this.announcedBy,
    required this.reportedBy,
    this.reportedOn,
    this.url,
  });

  /// Who announced it: `Central Ruet-e-Hilal Committee`.
  final String announcedBy;

  /// The outlet that reported the announcement, e.g. `Dawn`.
  final String reportedBy;

  /// The report's date (`YYYY-MM-DD`), or `null` if not recorded.
  final String? reportedOn;

  /// The report's URL, or `null` if not recorded.
  final String? url;

  /// JSON form, with the same keys as the npm package. `url` is left out
  /// when it is `null`.
  Map<String, Object?> toJson() => {
        'announcedBy': announcedBy,
        'reportedBy': reportedBy,
        'reportedOn': reportedOn,
        if (url != null) 'url': url,
      };

  @override
  bool operator ==(Object other) =>
      other is ZakatRamazan1Source &&
      other.announcedBy == announcedBy &&
      other.reportedBy == reportedBy &&
      other.reportedOn == reportedOn &&
      other.url == url;

  @override
  int get hashCode => Object.hash(announcedBy, reportedBy, reportedOn, url);

  @override
  String toString() => 'ZakatRamazan1Source${toJson()}';
}

/// One Zakat year's nisab for deduction at source, as notified. Result of
/// [getZakatNisab].
class ZakatNisab {
  /// Creates a Zakat nisab value.
  const ZakatNisab({
    required this.zakatYear,
    required this.label,
    required this.nisab,
    required this.valuationDateHijri,
    required this.ramazan1,
    required this.ramazan1Source,
    required this.bankHolidayDate,
    required this.notification,
    required this.sbpCircular,
    this.note,
    required this.source,
  });

  /// The Hijri year of the valuation date (1 Ramazan), e.g. `1447`.
  final int zakatYear;

  /// The year as the Ministry's notification writes it, e.g. `1446-47`.
  final String label;

  /// Nisab in rupees: accounts with a lower balance are not deducted.
  final int nisab;

  /// The valuation date in the Hijri calendar, e.g. `1 Ramazan 1447 AH`.
  final String valuationDateHijri;

  /// The valuation date: 1 Ramazan in the Gregorian calendar
  /// (`YYYY-MM-DD`), as announced by the Central Ruet-e-Hilal Committee.
  /// Zakat years are assigned to dates by it.
  final String ramazan1;

  /// Who announced [ramazan1], and where it was reported.
  final ZakatRamazan1Source ramazan1Source;

  /// The deduction day: the bank holiday SBP declares for it
  /// (`YYYY-MM-DD`). It is [ramazan1], or the next working day when 1
  /// Ramazan falls on a weekend or public holiday (for example 24 March
  /// 2023, after Pakistan Day). `null` where no SBP holiday circular was
  /// found.
  final String? bankHolidayDate;

  /// The Ministry of Poverty Alleviation & Social Safety notification.
  final ZakatDocument notification;

  /// The SBP BPRD circular letter that conveys it to banks.
  final ZakatDocument sbpCircular;

  /// Notes on the documents, including the notification's "likely to fall
  /// on" text, or `null`.
  final String? note;

  /// The notification and SBP circular, as a [DataSource] (dataset
  /// `zakat-nisab`).
  final DataSource source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'zakatYear': zakatYear,
        'label': label,
        'nisab': nisab,
        'valuationDateHijri': valuationDateHijri,
        'ramazan1': ramazan1,
        'ramazan1Source': ramazan1Source.toJson(),
        'bankHolidayDate': bankHolidayDate,
        'notification': notification.toJson(),
        'sbpCircular': sbpCircular.toJson(),
        'note': note,
        'source': source.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is ZakatNisab &&
      other.zakatYear == zakatYear &&
      other.label == label &&
      other.nisab == nisab &&
      other.valuationDateHijri == valuationDateHijri &&
      other.ramazan1 == ramazan1 &&
      other.ramazan1Source == ramazan1Source &&
      other.bankHolidayDate == bankHolidayDate &&
      other.notification == notification &&
      other.sbpCircular == sbpCircular &&
      other.note == note &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
        zakatYear,
        label,
        nisab,
        valuationDateHijri,
        ramazan1,
        ramazan1Source,
        bankHolidayDate,
        notification,
        sbpCircular,
        note,
        source,
      );

  @override
  String toString() => 'ZakatNisab${toJson()}';
}

/// Why [zakatDeduction] deducts nothing. See [ZakatDeduction.reason].
enum ZakatExemptReason {
  /// The holder has a valid exemption declaration (Form CZ-50).
  exempt('exempt'),

  /// The balance is below the year's nisab.
  belowNisab('below-nisab');

  const ZakatExemptReason(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Result of [zakatDeduction].
class ZakatDeduction {
  /// Creates a Zakat deduction value.
  const ZakatDeduction({
    required this.zakatYear,
    required this.nisab,
    required this.balance,
    required this.deductible,
    required this.reason,
    required this.rate,
    required this.zakat,
    required this.source,
  });

  /// The Zakat year used, e.g. `1447`.
  final int zakatYear;

  /// That year's nisab in rupees.
  final int nisab;

  /// The balance, in rupees (2 decimals at most).
  final double balance;

  /// Whether Zakat is deducted from this balance.
  final bool deductible;

  /// Why not, when [deductible] is `false`; otherwise `null`.
  final ZakatExemptReason? reason;

  /// Percent of the whole balance: `2.5`.
  final double rate;

  /// The amount deducted, in whole rupees (First Schedule, Note 2: less than
  /// a rupee is not charged, 50 paisa or more counts as a rupee); `0` if not
  /// deductible.
  final int zakat;

  /// The year's notification and SBP circular (dataset `zakat-nisab`).
  final DataSource source;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'zakatYear': zakatYear,
        'nisab': nisab,
        'balance': balance,
        'deductible': deductible,
        'reason': reason?.value,
        'rate': rate,
        'zakat': zakat,
        'source': source.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      other is ZakatDeduction &&
      other.zakatYear == zakatYear &&
      other.nisab == nisab &&
      other.balance == balance &&
      other.deductible == deductible &&
      other.reason == reason &&
      other.rate == rate &&
      other.zakat == zakat &&
      other.source == source;

  @override
  int get hashCode => Object.hash(
      zakatYear, nisab, balance, deductible, reason, rate, zakat, source);

  @override
  String toString() => 'ZakatDeduction${toJson()}';
}

ZakatDocument _document(Object? value) {
  final e = value! as Map<String, Object?>;
  return ZakatDocument(
    number: e['number']! as String,
    date: e['date']! as String,
    url: e['url']! as String,
  );
}

/// Days after the last notified year's 1 Ramazan that it still certainly
/// covers.
const int _lunarYearDays = 353;

String _addDays(String iso, int days) {
  final [y, m, d] = iso.split('-').map(int.parse).toList();
  final date = DateTime.utc(y, m, d + days);
  return '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}

ZakatNisab _toNisab(Map<String, Object?> e, List<Map<String, Object?>> rows) {
  final zakatYear = e['zakatYear']! as int;
  final ramazan1 = e['ramazan1']! as String;
  final announced = e['ramazan1Source']! as Map<String, Object?>;
  final notification = _document(e['notification']);
  final sbpCircular = _document(e['sbpCircular']);
  final next = rows.where((r) => r['zakatYear'] == zakatYear + 1);
  return ZakatNisab(
    zakatYear: zakatYear,
    label: e['label']! as String,
    nisab: e['nisab']! as int,
    valuationDateHijri: e['valuationDateHijri']! as String,
    ramazan1: ramazan1,
    ramazan1Source: ZakatRamazan1Source(
      announcedBy: announced['announcedBy']! as String,
      reportedBy: announced['reportedBy']! as String,
      reportedOn: announced['reportedOn'] as String?,
      url: announced['url'] as String?,
    ),
    bankHolidayDate: e['bankHolidayDate'] as String?,
    notification: notification,
    sbpCircular: sbpCircular,
    note: e['note'] as String?,
    source: DataSource(
      id: 'zakat-nisab',
      // From 1 Ramazan to the day before the next year's; open while it is
      // the latest year.
      effectiveFrom: ramazan1,
      effectiveTo:
          next.isEmpty ? null : _addDays(next.first['ramazan1']! as String, -1),
      sourceReference: 'Notification No. ${notification.number} '
          '(${notification.date}); '
          'SBP ${sbpCircular.number} (${sbpCircular.date})',
      sourceUrl: notification.url,
    ),
  );
}

// Only the Zakat functions reference the table, so builds that do not call
// them leave it out.
final List<ZakatNisab> _years = List.unmodifiable([
  for (final e in zakatNisabJson.cast<Map<String, Object?>>())
    _toNisab(e, zakatNisabJson.cast<Map<String, Object?>>()),
]);

final RegExp _fourDigits = RegExp(r'^\d{4}$');

ZakatNisab? _byYear(Object? value) {
  int? year;
  if (value is int) {
    year = value;
  } else if (value is double) {
    if (!value.isFinite || value != value.truncateToDouble()) return null;
    year = value.toInt();
  } else if (value is String) {
    final text = jsTrim(value);
    if (_fourDigits.hasMatch(text)) {
      year = int.parse(text);
    } else {
      for (final y in _years) {
        if (y.label == text) return y;
      }
      return null;
    }
  }
  if (year == null) return null;
  for (final y in _years) {
    if (y.zakatYear == year) return y;
  }
  return null;
}

/// The Zakat year a date falls in: the last year whose 1 Ramazan is on or
/// before it. A date before the first covered year, or 353 days or more
/// after the last year's 1 Ramazan (next year not yet notified), gives
/// `null`.
ZakatNisab? _byDate(Object? value) {
  final date = isoDate(value);
  if (date == null) return null;
  for (var i = _years.length - 1; i >= 0; i--) {
    final row = _years[i];
    if (date.compareTo(row.ramazan1) < 0) continue;
    if (i == _years.length - 1 &&
        date.compareTo(_addDays(row.ramazan1, _lunarYearDays)) >= 0) {
      return null;
    }
    return row;
  }
  return null;
}

ZakatNisab? _find(Object? zakatYear, Object? date) {
  if (zakatYear != null) return _byYear(zakatYear);
  if (date != null) return _byDate(date);
  return null;
}

/// The nisab for compulsory Zakat deduction at source in Pakistan for a
/// Zakat year, as notified by the Administrator-General Zakat (Ministry of
/// Poverty Alleviation & Social Safety) and conveyed to banks by SBP, Zakat
/// years 1433 to 1447 AH (2012-2026).
///
/// Give [zakatYear], an [int] (`1447`) or a [String] (`'1447'`, or the
/// notification's `'1446-47'`), or [date], a `YYYY-MM-DD` [String] or a
/// [DateTime] (its local calendar date); [zakatYear] takes precedence. A
/// Zakat year starts on 1 Ramazan ([ZakatNisab.ramazan1], as the Central
/// Ruet-e-Hilal Committee announced it), and a date belongs to the last year
/// whose 1 Ramazan is on or before it. The npm `ZakatYearQuery` object is
/// these named parameters.
///
/// This is the nisab for deduction from savings and similar bank accounts
/// under the Zakat and Ushr Ordinance 1980, not a religious ruling on
/// personal Zakat.
///
/// Returns the year's nisab, dates and sources, or `null` for a year that is
/// not covered or an invalid query. Never throws.
///
/// ```dart
/// getZakatNisab(zakatYear: 1447)?.nisab; // 503529
/// getZakatNisab(zakatYear: '1445-46')?.zakatYear; // 1446
/// getZakatNisab(date: '2025-06-01')?.nisab; // 179689
/// ```
ZakatNisab? getZakatNisab({Object? zakatYear, Object? date}) =>
    _find(zakatYear, date);

/// Every notified Zakat year, oldest first. Never throws.
///
/// ```dart
/// getZakatYears().last; // 1447
/// ```
List<int> getZakatYears() => [for (final y in _years) y.zakatYear];

/// Zakat deducted at source from one account on the valuation date (1
/// Ramazan): 2.5% of the whole balance, rounded to the nearest rupee (First
/// Schedule, Note 2: less than a rupee is not charged), when it is at or
/// above that year's nisab, and nothing when it is below or the holder has a
/// valid exemption declaration (Form CZ-50, [exempt]).
///
/// Set [exempt] to `true` if the holder has a valid Form CZ-50 with the bank:
/// filed at least 30 days before the valuation date, sworn before a
/// magistrate, oath commissioner, notary public or other person authorised
/// to administer oaths, in the presence of two witnesses (Zakat and Ushr
/// Ordinance 1980, s. 1(3), proviso (a)). The library does not check the
/// declaration.
///
/// A balance exactly equal to the nisab is deducted: every notification
/// says no deduction where the balance is "less than" the nisab, and the
/// Ordinance (s. 2(xxiii)) defines a sahib-e-nisab as owning "not less than
/// nisab". The First Schedule's own wording ("does not exceed") would not
/// deduct it. In Punjab the Punjab Zakat and Ushr Act 2018 replaced the
/// Ordinance, with the same First Schedule wording.
///
/// [balance] is the account balance in rupees at the start of the valuation
/// date, 0 to 1 trillion (at most 2 decimals count). The year is chosen by
/// [zakatYear] or [date], as in [getZakatNisab]. The npm
/// `ZakatDeductionInput` object is these named parameters.
///
/// It applies to the accounts the Ordinance subjects to deduction at source:
/// savings, profit-and-loss sharing and similar accounts (asset code 101).
/// Current accounts and foreign currency accounts are not deducted. It is
/// not a religious ruling on how much Zakat a person owes.
///
/// Returns the deduction and its source, or `null` for an invalid balance
/// or a year that is not covered. Never throws.
///
/// ```dart
/// zakatDeduction(balance: 600000, zakatYear: 1447);
/// // ZakatDeduction{zakatYear: 1447, nisab: 503529, balance: 600000.0,
/// //   deductible: true, reason: null, rate: 2.5, zakat: 15000, ...}
/// zakatDeduction(balance: 600000, zakatYear: 1447, exempt: true)?.zakat; // 0
/// ```
ZakatDeduction? zakatDeduction({
  required num balance,
  Object? zakatYear,
  Object? date,
  bool exempt = false,
}) {
  final paisa = toUnits(balance, 2);
  if (paisa == null) return null;
  final row = _find(zakatYear, date);
  if (row == null) return null;
  final below = paisa < row.nisab * 100;
  final deductible = !exempt && !below;
  return ZakatDeduction(
    zakatYear: row.zakatYear,
    nisab: row.nisab,
    balance: fromPaisa(paisa),
    deductible: deductible,
    reason: exempt
        ? ZakatExemptReason.exempt
        : below
            ? ZakatExemptReason.belowNisab
            : null,
    rate: 2.5,
    zakat: deductible ? _zakatRupees(paisa) : 0,
    source: row.source,
  );
}

/// 2.5% of a balance in paisa, as the First Schedule's Note 2 rounds it:
/// less than a rupee is not charged; otherwise 50 paisa or more counts as a
/// rupee and less than 50 paisa is dropped.
int _zakatRupees(int balancePaisa) {
  // Thousandths of a paisa.
  final exact = BigInt.from(balancePaisa) * BigInt.from(25);
  if (exact < BigInt.from(100000)) return 0;
  return divideHalfUp(exact, BigInt.from(100000));
}
