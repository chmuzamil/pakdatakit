/// Islamic (Hijri) date components. See [toHijri].
class HijriDate {
  /// Creates a Hijri date. [month] is 1–12 and [day] 1–30.
  const HijriDate({required this.year, required this.month, required this.day});

  /// Hijri year (AH).
  final int year;

  /// Hijri month, 1 (Muharram) to 12 (Dhu al-Hijjah).
  final int month;

  /// Day of the month, 1–30.
  final int day;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'year': year, 'month': month, 'day': day};

  @override
  bool operator ==(Object other) =>
      other is HijriDate &&
      other.year == year &&
      other.month == month &&
      other.day == day;

  @override
  int get hashCode => Object.hash(year, month, day);

  @override
  String toString() => 'HijriDate${toJson()}';
}

const List<String> _hijriMonths = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaaban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qadah',
  'Dhu al-Hijjah',
];

/// `Math.floor(a / b)`.
int _fdiv(int a, int b) => (a / b).floor();

/// Converts a Gregorian date to a Hijri (Islamic) date.
///
/// Uses the tabular (arithmetic, "islamic-civil") calendar. Actual dates in
/// Pakistan follow moon sighting and can differ by a day or two; pass
/// [offset] (whole days, e.g. `-1` when Pakistan's Ruet-e-Hilal calendar runs
/// a day behind the tabular date) to adjust. The local calendar date of
/// [date] is used; the time of day is ignored.
HijriDate toHijri(DateTime date, {int offset = 0}) {
  final jdn = _gregorianToJdn(date.year, date.month, date.day);
  return _jdnToHijri(jdn + offset);
}

/// Converts a Hijri date to a Gregorian date (local midnight).
///
/// Use the same [offset] as with [toHijri]. Throws an [ArgumentError] (a
/// `RangeError` in the npm package) if the components are out of range
/// (year below 1, month outside 1–12 or day outside 1–30).
DateTime fromHijri(HijriDate hijri, {int offset = 0}) {
  final HijriDate(:year, :month, :day) = hijri;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 30) {
    throw ArgumentError.value(
      hijri,
      'hijri',
      'Invalid Hijri date: $year-$month-$day',
    );
  }
  final jdn = _hijriToJdn(year, month, day) - offset;
  final g = _jdnToGregorian(jdn);
  return DateTime(g.year, g.month, g.day);
}

/// Formats a Gregorian date as a Hijri date string, e.g. `"14 Ramadan 1447"`.
/// See [toHijri] for [offset].
String formatHijri(DateTime date, {int offset = 0}) {
  final hijri = toHijri(date, offset: offset);
  return '${hijri.day} ${_hijriMonths[hijri.month - 1]} ${hijri.year}';
}

/// Returns the English name of a Hijri month (1–12), or `null` if [month] is
/// out of range.
String? getHijriMonthName(int month) {
  if (month < 1 || month > 12) return null;
  return _hijriMonths[month - 1];
}

/// Whether a Gregorian date falls in the month of Ramadan. See [toHijri] for
/// [offset].
bool isRamadan(DateTime date, {int offset = 0}) =>
    toHijri(date, offset: offset).month == 9;

/// Gregorian calendar date → Julian Day Number.
int _gregorianToJdn(int year, int month, int day) {
  final a = _fdiv(14 - month, 12);
  final y = year + 4800 - a;
  final m = month + 12 * a - 3;
  return day +
      _fdiv(153 * m + 2, 5) +
      365 * y +
      _fdiv(y, 4) -
      _fdiv(y, 100) +
      _fdiv(y, 400) -
      32045;
}

/// Julian Day Number → Gregorian calendar date.
({int year, int month, int day}) _jdnToGregorian(int jdn) {
  final a = jdn + 32044;
  final b = _fdiv(4 * a + 3, 146097);
  final c = a - _fdiv(146097 * b, 4);
  final d = _fdiv(4 * c + 3, 1461);
  final e = c - _fdiv(1461 * d, 4);
  final m = _fdiv(5 * e + 2, 153);
  return (
    day: e - _fdiv(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * _fdiv(m, 10),
    year: 100 * b + d - 4800 + _fdiv(m, 10),
  );
}

/// Julian Day Number → tabular Hijri date.
HijriDate _jdnToHijri(int jdn) {
  final l = jdn - 1948440 + 10632;
  final n = _fdiv(l - 1, 10631);
  final l2 = l - 10631 * n + 354;
  final j = _fdiv(10985 - l2, 5316) * _fdiv(50 * l2, 17719) +
      _fdiv(l2, 5670) * _fdiv(43 * l2, 15238);
  final l3 = l2 -
      _fdiv(30 - j, 15) * _fdiv(17719 * j, 50) -
      _fdiv(j, 16) * _fdiv(15238 * j, 43) +
      29;
  final month = _fdiv(24 * l3, 709);
  final day = l3 - _fdiv(709 * month, 24);
  final year = 30 * n + j - 30;
  return HijriDate(year: year, month: month, day: day);
}

/// Tabular Hijri date → Julian Day Number.
int _hijriToJdn(int year, int month, int day) =>
    _fdiv(11 * year + 3, 30) +
    354 * year +
    30 * month -
    _fdiv(month - 1, 2) +
    day +
    1948440 -
    385;
