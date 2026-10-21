import 'hijri.dart';
import 'internal/data.dart';
import 'internal/js.dart';

/// Identifier of a Pakistani federal public holiday.
enum HolidayId {
  /// Eid ul Fitr (Islamic).
  eidUlFitr('eid-ul-fitr', 'eidUlFitr'),

  /// Eid ul Adha (Islamic).
  eidUlAdha('eid-ul-adha', 'eidUlAdha'),

  /// Ashura, 9–10 Muharram (Islamic).
  ashura('ashura', 'ashura'),

  /// Eid Milad un Nabi, 12 Rabi al-Awwal (Islamic).
  eidMiladUnNabi('eid-milad-un-nabi', 'eidMiladUnNabi'),

  /// Kashmir Solidarity Day, 5 February.
  kashmirDay('kashmir-day'),

  /// Pakistan Day, 23 March.
  pakistanDay('pakistan-day'),

  /// Labour Day, 1 May.
  labourDay('labour-day'),

  /// Youm-e-Takbeer, 28 May (from 2024).
  youmETakbeer('youm-e-takbeer'),

  /// Independence Day, 14 August.
  independenceDay('independence-day'),

  /// Iqbal Day, 9 November (not 2015–2021).
  iqbalDay('iqbal-day'),

  /// Quaid-e-Azam Day / Christmas, 25 December.
  quaidEAzamDay('quaid-e-azam-day'),

  /// Day after Christmas, 26 December (Christian employees only).
  dayAfterChristmas('day-after-christmas');

  const HolidayId(this.value, [this._dataKey]);

  /// The value used by the npm package, e.g. `"eid-ul-fitr"`.
  final String value;

  final String? _dataKey;

  /// Whether this is an Islamic holiday, whose date depends on moon sighting.
  bool get isIslamic => _dataKey != null;

  /// Returns [value].
  String toJson() => value;

  /// The holiday whose [value] is [value].
  static HolidayId fromValue(String value) =>
      HolidayId.values.firstWhere((id) => id.value == value);
}

/// Kind of public holiday.
enum HolidayType {
  /// A national day.
  national('national'),

  /// A religious holiday.
  religious('religious');

  const HolidayType(this.value);

  /// The value used by the npm package.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// A public holiday on a specific date. See [getPakistanHolidays].
class Holiday {
  /// Creates a holiday.
  const Holiday({
    required this.id,
    required this.name,
    required this.date,
    required this.type,
    required this.estimated,
    this.christiansOnly = false,
    this.source,
  });

  /// Holiday identifier.
  final HolidayId id;

  /// English name.
  final String name;

  /// Date as `YYYY-MM-DD`.
  final String date;

  /// National or religious.
  final HolidayType type;

  /// `true` when an Islamic holiday's date is calculated from the tabular
  /// Hijri calendar because the observed dates are not in the dataset yet.
  /// The real date depends on the moon-sighting announcement.
  final bool estimated;

  /// `true` for holidays that apply to Christian employees only.
  final bool christiansOnly;

  /// Source of an observed Islamic holiday date.
  final String? source;

  /// The date as a local [DateTime] at midnight.
  DateTime get dateTime => DateTime.parse(date);

  /// JSON form, with the same keys as the npm package (`christiansOnly` and
  /// `source` are left out unless set).
  Map<String, Object?> toJson() => {
        'id': id.value,
        'name': name,
        'date': date,
        'type': type.value,
        'estimated': estimated,
        if (christiansOnly) 'christiansOnly': true,
        if (source != null) 'source': source,
      };

  @override
  bool operator ==(Object other) =>
      other is Holiday &&
      other.id == id &&
      other.name == name &&
      other.date == date &&
      other.type == type &&
      other.estimated == estimated &&
      other.christiansOnly == christiansOnly &&
      other.source == source;

  @override
  int get hashCode =>
      Object.hash(id, name, date, type, estimated, christiansOnly, source);

  @override
  String toString() => 'Holiday${toJson()}';
}

typedef _Fixed = ({
  HolidayId id,
  String name,
  int month,
  int day,
  HolidayType type,
  bool Function(int year)? appliesIn,
  bool christiansOnly,
});

final List<_Fixed> _fixedHolidays = [
  (
    id: HolidayId.kashmirDay,
    name: 'Kashmir Solidarity Day',
    month: 2,
    day: 5,
    type: HolidayType.national,
    appliesIn: null,
    christiansOnly: false,
  ),
  (
    id: HolidayId.pakistanDay,
    name: 'Pakistan Day',
    month: 3,
    day: 23,
    type: HolidayType.national,
    appliesIn: null,
    christiansOnly: false,
  ),
  (
    id: HolidayId.labourDay,
    name: 'Labour Day',
    month: 5,
    day: 1,
    type: HolidayType.national,
    appliesIn: null,
    christiansOnly: false,
  ),
  (
    id: HolidayId.youmETakbeer,
    name: 'Youm-e-Takbeer',
    month: 5,
    day: 28,
    type: HolidayType.national,
    // A one-off holiday in 2024, on the annual list since 2025.
    appliesIn: (year) => year >= 2024,
    christiansOnly: false,
  ),
  (
    id: HolidayId.independenceDay,
    name: 'Independence Day',
    month: 8,
    day: 14,
    type: HolidayType.national,
    appliesIn: null,
    christiansOnly: false,
  ),
  (
    id: HolidayId.iqbalDay,
    name: 'Iqbal Day',
    month: 11,
    day: 9,
    type: HolidayType.national,
    // Dropped from 2015 to 2021, restored in 2022.
    appliesIn: (year) => year <= 2014 || year >= 2022,
    christiansOnly: false,
  ),
  (
    id: HolidayId.quaidEAzamDay,
    name: 'Quaid-e-Azam Day / Christmas',
    month: 12,
    day: 25,
    type: HolidayType.national,
    appliesIn: null,
    christiansOnly: false,
  ),
  (
    id: HolidayId.dayAfterChristmas,
    name: 'Day after Christmas',
    month: 12,
    day: 26,
    type: HolidayType.religious,
    appliesIn: null,
    christiansOnly: true,
  ),
];

typedef _Islamic = ({
  HolidayId id,
  String name,
  int hijriMonth,
  int hijriDay,
  int days,
});

const List<_Islamic> _islamicHolidays = [
  (
    id: HolidayId.eidUlFitr,
    name: 'Eid ul Fitr',
    hijriMonth: 10,
    hijriDay: 1,
    days: 3,
  ),
  (
    id: HolidayId.eidUlAdha,
    name: 'Eid ul Adha',
    hijriMonth: 12,
    hijriDay: 10,
    days: 3,
  ),
  (id: HolidayId.ashura, name: 'Ashura', hijriMonth: 1, hijriDay: 9, days: 2),
  (
    id: HolidayId.eidMiladUnNabi,
    name: 'Eid Milad un Nabi',
    hijriMonth: 3,
    hijriDay: 12,
    days: 1,
  ),
];

String _pad(int n, int width) => n.toString().padLeft(width, '0');

String _isoDate(int year, int month, int day) =>
    '${_pad(year, 4)}-${_pad(month, 2)}-${_pad(day, 2)}';

final RegExp _isoPattern = RegExp(r'^\d{4}-\d{2}-\d{2}$');

void _assertIsoDate(String value) {
  if (!_isoPattern.hasMatch(value)) {
    throw ArgumentError.value(value, 'date', 'Expected a YYYY-MM-DD date');
  }
}

/// Estimates the dates of an Islamic holiday in a Gregorian year.
List<String> _estimateIslamicDates(_Islamic holiday, int year, int offset) {
  final firstHijriYear = toHijri(DateTime(year)).year;
  final dates = <String>[];
  for (var hijriYear = firstHijriYear;
      hijriYear <= firstHijriYear + 1;
      hijriYear++) {
    final start = fromHijri(
      HijriDate(
        year: hijriYear,
        month: holiday.hijriMonth,
        day: holiday.hijriDay,
      ),
      offset: offset,
    );
    for (var i = 0; i < holiday.days; i++) {
      // Calendar arithmetic in UTC, so daylight saving cannot shift the date.
      final day = DateTime.utc(start.year, start.month, start.day + i);
      if (day.year == year) dates.add(_isoDate(day.year, day.month, day.day));
    }
  }
  return dates;
}

/// Lists Pakistan's federal public holidays for a [year], sorted by date.
///
/// Islamic holidays use the dates actually observed after moon sighting
/// (2020 onwards, from Cabinet Division and SBP notifications). For years not
/// yet in the dataset they are estimated from the tabular Hijri calendar and
/// marked [Holiday.estimated]; pass [announced] to use official dates
/// instead.
///
/// - [includeChristianHolidays]: include 26 December, a holiday for
///   Christian employees only.
/// - [announced]: observed or announced dates (`YYYY-MM-DD`) for Islamic
///   holidays, used instead of the dataset or estimate. An empty list removes
///   that holiday for the year. Entries for non-Islamic holidays are ignored.
/// - [hijriOffset]: day offset applied to estimated Islamic dates.
///
/// Optional holidays (e.g. Shab-e-Barat, Easter, Youm-e-Ali) are not
/// included. Throws an [ArgumentError] (a `RangeError` in the npm package) if
/// [year] is not from 1948 to 9999 or an announced date is not `YYYY-MM-DD`.
List<Holiday> getPakistanHolidays(
  int year, {
  bool includeChristianHolidays = false,
  Map<HolidayId, List<String>>? announced,
  int hijriOffset = 0,
}) {
  if (year < 1948 || year > 9999) {
    throw ArgumentError.value(year, 'year', 'Expected a year from 1948');
  }

  final holidays = <Holiday>[];
  for (final fixed in _fixedHolidays) {
    if (fixed.appliesIn != null && !fixed.appliesIn!(year)) continue;
    if (fixed.christiansOnly && !includeChristianHolidays) continue;
    holidays.add(Holiday(
      id: fixed.id,
      name: fixed.name,
      date: _isoDate(year, fixed.month, fixed.day),
      type: fixed.type,
      estimated: false,
      christiansOnly: fixed.christiansOnly,
    ));
  }

  final observed = observedHolidays['$year'];
  for (final islamic in _islamicHolidays) {
    final announcedDates = announced?[islamic.id];
    final recorded = observed?[islamic.id._dataKey];
    List<String> dates;
    var estimated = false;
    String? source;

    if (announcedDates != null) {
      announcedDates.forEach(_assertIsoDate);
      dates = announcedDates;
    } else if (recorded != null) {
      dates = recorded.dates;
      source = recorded.source;
    } else {
      dates = _estimateIslamicDates(islamic, year, hijriOffset);
      estimated = true;
    }

    for (final date in dates) {
      holidays.add(Holiday(
        id: islamic.id,
        name: islamic.name,
        date: date,
        type: HolidayType.religious,
        estimated: estimated,
        source: source != null && source.isNotEmpty ? source : null,
      ));
    }
  }

  return stableSorted(holidays, (a, b) => a.date.compareTo(b.date));
}

/// Returns the public holidays that fall on a date: a [DateTime] (its local
/// calendar date) or a `YYYY-MM-DD` [String]. Empty if it is not a public
/// holiday.
///
/// Takes the same options as [getPakistanHolidays]. Throws an
/// [ArgumentError] for any other kind of value or a malformed string.
List<Holiday> getHolidaysOn(
  Object date, {
  bool includeChristianHolidays = false,
  Map<HolidayId, List<String>>? announced,
  int hijriOffset = 0,
}) {
  final String iso;
  if (date is String) {
    _assertIsoDate(date);
    iso = date;
  } else if (date is DateTime) {
    iso = _isoDate(date.year, date.month, date.day);
  } else {
    throw ArgumentError.value(date, 'date', 'Expected a DateTime or String');
  }
  return getPakistanHolidays(
    int.parse(iso.substring(0, 4)),
    includeChristianHolidays: includeChristianHolidays,
    announced: announced,
    hijriOffset: hijriOffset,
  ).where((holiday) => holiday.date == iso).toList();
}

/// Whether a date is a Pakistani federal public holiday. See
/// [getHolidaysOn].
bool isPakistanHoliday(
  Object date, {
  bool includeChristianHolidays = false,
  Map<HolidayId, List<String>>? announced,
  int hijriOffset = 0,
}) =>
    getHolidaysOn(
      date,
      includeChristianHolidays: includeChristianHolidays,
      announced: announced,
      hijriOffset: hijriOffset,
    ).isNotEmpty;
