/// Helpers that reproduce JavaScript semantics, so results match the npm
/// package exactly on every Dart platform.
///
/// Dart and JavaScript differ in small ways that matter for exact parity:
/// whitespace sets, case mapping, `Math.round`, number-to-string conversion,
/// `toFixed`, `localeCompare` and sort stability.
library;

import '../data/collation.g.dart';
import '../data/unicode.g.dart';

/// Regex character-class body equivalent to JavaScript's `\s`.
const String ws = r'\t\n\v\f\r    -   '
    r'  　﻿';

bool _isWhitespace(int unit) {
  switch (unit) {
    case 0x09:
    case 0x0a:
    case 0x0b:
    case 0x0c:
    case 0x0d:
    case 0x20:
    case 0xa0:
    case 0x1680:
    case 0x2028:
    case 0x2029:
    case 0x202f:
    case 0x205f:
    case 0x3000:
    case 0xfeff:
      return true;
    default:
      return unit >= 0x2000 && unit <= 0x200a;
  }
}

/// `String.prototype.trim`.
String jsTrim(String value) {
  var start = 0;
  var end = value.length;
  while (start < end && _isWhitespace(value.codeUnitAt(start))) {
    start++;
  }
  while (end > start && _isWhitespace(value.codeUnitAt(end - 1))) {
    end--;
  }
  return value.substring(start, end);
}

/// `String.prototype.trimEnd`.
String jsTrimEnd(String value) {
  var end = value.length;
  while (end > 0 && _isWhitespace(value.codeUnitAt(end - 1))) {
    end--;
  }
  return value.substring(0, end);
}

bool _isAscii(String value) {
  for (var i = 0; i < value.length; i++) {
    if (value.codeUnitAt(i) > 0x7f) return false;
  }
  return true;
}

/// `String.prototype.toUpperCase` (full Unicode case mapping, e.g. `ß` to `SS`).
String jsToUpperCase(String value) {
  if (_isAscii(value)) return value.toUpperCase();
  final out = StringBuffer();
  for (final rune in value.runes) {
    final mapped = upperCaseMap[rune];
    if (mapped != null) {
      out.write(mapped);
    } else {
      out.writeCharCode(rune);
    }
  }
  return out.toString();
}

bool _inRanges(List<int> ranges, int rune) {
  var low = 0;
  var high = ranges.length ~/ 2 - 1;
  while (low <= high) {
    final mid = (low + high) ~/ 2;
    if (rune < ranges[mid * 2]) {
      high = mid - 1;
    } else if (rune > ranges[mid * 2 + 1]) {
      low = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

/// `String.prototype.toLowerCase`, including the final sigma rule.
String jsToLowerCase(String value) {
  if (_isAscii(value)) return value.toLowerCase();
  final runes = value.runes.toList();
  final out = StringBuffer();
  for (var i = 0; i < runes.length; i++) {
    final rune = runes[i];
    if (rune == 0x3a3 && _isFinalSigma(runes, i)) {
      out.writeCharCode(0x3c2);
      continue;
    }
    final mapped = lowerCaseMap[rune];
    if (mapped != null) {
      out.write(mapped);
    } else {
      out.writeCharCode(rune);
    }
  }
  return out.toString();
}

bool _isFinalSigma(List<int> runes, int index) {
  var before = index - 1;
  while (before >= 0 && _inRanges(caseIgnorableRanges, runes[before])) {
    before--;
  }
  if (before < 0 || !_inRanges(casedRanges, runes[before])) return false;
  var after = index + 1;
  while (after < runes.length && _inRanges(caseIgnorableRanges, runes[after])) {
    after++;
  }
  return after >= runes.length || !_inRanges(casedRanges, runes[after]);
}

/// `Number.isInteger`.
bool isInteger(num value) =>
    value is int || (value.isFinite && value == value.truncateToDouble());

/// `Number.MAX_SAFE_INTEGER`.
const int maxSafeInteger = 9007199254740991;

/// `Number.isSafeInteger`.
bool isSafeInteger(num value) =>
    isInteger(value) && value.abs() <= maxSafeInteger;

/// `Math.round`: halves round towards positive infinity.
double jsRound(double value) {
  if (!value.isFinite) return value;
  final floor = value.floorToDouble();
  return value - floor >= 0.5 ? floor + 1 : floor;
}

/// Shortest round-trip decimal digits of a positive finite number, and the
/// position of the decimal point (`value = 0.digits * 10^point`).
(String, int) _shortestDigits(double value) {
  final text = value.toStringAsExponential();
  final e = text.indexOf('e');
  final digits = text.substring(0, e).replaceAll('.', '');
  return (digits, int.parse(text.substring(e + 1)) + 1);
}

/// `String(number)`: JavaScript's number-to-string conversion.
String jsNumberToString(num number) {
  final value = number.toDouble();
  if (value.isNaN) return 'NaN';
  if (value.isInfinite) return value > 0 ? 'Infinity' : '-Infinity';
  if (value == 0) return '0';
  final sign = value < 0 ? '-' : '';
  final (digits, n) = _shortestDigits(value.abs());
  final k = digits.length;
  String text;
  if (k <= n && n <= 21) {
    text = digits + '0' * (n - k);
  } else if (0 < n && n <= 21) {
    text = '${digits.substring(0, n)}.${digits.substring(n)}';
  } else if (-6 < n && n <= 0) {
    text = '0.${'0' * -n}$digits';
  } else {
    final e = n - 1;
    final exponent = '${e >= 0 ? '+' : '-'}${e.abs()}';
    text = k == 1
        ? '${digits}e$exponent'
        : '${digits[0]}.${digits.substring(1)}e$exponent';
  }
  return sign + text;
}

/// An integer-valued number written out in full from its shortest digits, as
/// `Intl.NumberFormat` does (no exponent).
String integerDigits(double value) {
  if (value == 0) return '0';
  final (digits, n) = _shortestDigits(value.abs());
  return n >= digits.length
      ? digits + '0' * (n - digits.length)
      : digits.substring(0, n < 0 ? 0 : n);
}

/// `Number.prototype.toFixed`.
String jsToFixed(num number, int places) {
  var value = number.toDouble();
  if (!value.isFinite || value.abs() >= 1e21) return jsNumberToString(value);
  if (value == 0) value = 0.0; // no "-0.00"
  return value.toStringAsFixed(places);
}

/// `a.localeCompare(b)` for the dataset strings the library sorts.
///
/// The order comes from JavaScript's `localeCompare` at generation time (see
/// `scripts/generate-dart-data.mjs`). Strings outside the datasets fall back
/// to code-unit order.
int localeCompare(String a, String b) {
  final rankA = collationRanks[a];
  final rankB = collationRanks[b];
  if (rankA != null && rankB != null) return rankA.compareTo(rankB);
  return a.compareTo(b);
}

/// A stable sort (JavaScript's `Array.prototype.sort` is stable; Dart's
/// `List.sort` is not), returning a new list.
List<T> stableSorted<T>(Iterable<T> items, int Function(T a, T b) compare) {
  final indexed = items.toList();
  final order = List<int>.generate(indexed.length, (i) => i);
  order.sort((i, j) {
    final result = compare(indexed[i], indexed[j]);
    return result != 0 ? result : i.compareTo(j);
  });
  return [for (final i in order) indexed[i]];
}

/// Sorts strings like `values.sort((a, b) => a.localeCompare(b))`.
List<String> localeSorted(Iterable<String> values) =>
    stableSorted(values, localeCompare);

/// Removes duplicates, keeping first occurrences (`[...new Set(values)]`).
List<T> unique<T>(Iterable<T> values) => values.toSet().toList();

/// `String.prototype.slice` (negative indices count from the end).
String jsSlice(String value, int start, [int? end]) {
  int clamp(int index) => index < 0
      ? (value.length + index < 0 ? 0 : value.length + index)
      : (index > value.length ? value.length : index);
  final from = clamp(start);
  final to = clamp(end ?? value.length);
  return from < to ? value.substring(from, to) : '';
}
