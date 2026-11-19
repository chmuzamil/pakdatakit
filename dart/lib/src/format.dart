import 'internal/js.dart';

const int _lakh = 100000;
const int _crore = 10000000;

void _assertFinite(num amount) {
  if (!amount.isFinite) {
    throw ArgumentError.value(amount, 'amount', 'Must be a finite number');
  }
}

double _roundTo2(double value) => jsRound(value * 100) / 100;

String _group(double value) {
  final digits = integerDigits(value);
  final out = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write(',');
    out.write(digits[i]);
  }
  return out.toString();
}

/// Formats an amount as Pakistani Rupees with comma separators, rounded to
/// whole rupees: `"Rs. 150,000"`. Negative amounts are prefixed with `-`
/// (`"-Rs. 500"`).
///
/// Throws an [ArgumentError] (a `RangeError` in the npm package) if [amount]
/// is NaN or infinite.
String formatPKR(num amount) {
  _assertFinite(amount);
  final value = amount.toDouble();
  final rounded = jsRound(value.abs());
  final sign = value < 0 && rounded != 0 ? '-' : '';
  return '${sign}Rs. ${_group(rounded)}';
}

/// Formats an amount using Pakistani lakh/crore conventions.
///
/// - 1 crore or more renders as `"N Crore"` (`10000000` → `"1 Crore"`)
/// - 1 lakh or more renders as `"N Lakh"` (`2500000` → `"25 Lakh"`)
/// - smaller amounts fall back to [formatPKR]
///
/// Values are rounded to two decimals before the unit is chosen, so `9999999`
/// renders as `"1 Crore"` rather than `"100 Lakh"`. Negative amounts are
/// prefixed with `-`.
///
/// Throws an [ArgumentError] (a `RangeError` in the npm package) if [amount]
/// is NaN or infinite.
String formatLakh(num amount) {
  _assertFinite(amount);
  final value = amount.toDouble();
  final sign = value < 0 ? '-' : '';
  final absolute = value.abs();

  final crores = _roundTo2(absolute / _crore);
  if (crores >= 1) return '$sign${jsNumberToString(crores)} Crore';

  final lakhs = _roundTo2(absolute / _lakh);
  if (lakhs >= 1) return '$sign${jsNumberToString(lakhs)} Lakh';

  return formatPKR(amount);
}

/// The result of [parseAmount].
class ParsedAmount {
  /// Creates a parsed amount.
  const ParsedAmount({required this.value, required this.raw});

  /// The amount in rupees, rounded half-up to the paisa (2 decimals).
  final double value;

  /// The input with surrounding whitespace removed.
  final String raw;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {'value': value, 'raw': raw};

  @override
  bool operator ==(Object other) =>
      other is ParsedAmount && other.value == value && other.raw == raw;

  @override
  int get hashCode => Object.hash(value, raw);

  @override
  String toString() => 'ParsedAmount${toJson()}';
}

/// Whitespace around and inside an amount: space, tab, line breaks, no-break
/// spaces.
const String _space = r'[ \t\n\r  ]';
final RegExp _trim = RegExp('^$_space+|$_space+\$');

/// Rs, Rs., PKR or ₨ (after ASCII letters are lower-cased).
const String _currency = r'(rs\.?|pkr|₨)';

/// 1,234,567 (international) | 12,34,567 (Pakistani) | 1234567, then an
/// optional decimal part.
const String _number =
    r'([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,2}(?:,[0-9]{2})+,[0-9]{3}|[0-9]+)?'
    r'(?:\.([0-9]*))?';

/// × 1,000: k, thousand(s), hazar, ہزار.
const String _thousand = r'k|thousands?|hazar|ہزار';

/// × 100,000: lakh(s), lac(s), لاکھ.
const String _lakhUnit = r'lakhs?|lacs?|لاکھ';

/// × 10,000,000: crore(s), cr, کروڑ.
const String _croreUnit = r'crores?|cr|کروڑ';

final RegExp _amount = RegExp('^(?:$_currency$_space*)?$_number'
    '(?:$_space*($_thousand|$_lakhUnit|$_croreUnit))?'
    '(?:$_space*$_currency)?(?:$_space*(\\/-))?\$');
final RegExp _thousandOnly = RegExp('^(?:$_thousand)\$');
final RegExp _lakhOnly = RegExp('^(?:$_lakhUnit)\$');

/// The power of ten a shorthand unit multiplies by.
int _unitExponent(String? unit) {
  if (unit == null) return 0;
  if (_thousandOnly.hasMatch(unit)) return 3;
  if (_lakhOnly.hasMatch(unit)) return 5;
  return 7;
}

/// The largest amount, in paisa: Rs. 50 trillion (50 lakh crore). Below 2^46
/// rupees (about 70 trillion) a double holds every paisa exactly.
final BigInt _maxPaisa = BigInt.parse('5000000000000000');

/// Reads a rupee amount the way people type it in Pakistan, and returns it in
/// rupees, rounded half-up to the paisa. Returns `null` for anything that is
/// not exactly one non-negative amount; it never throws.
///
/// Accepted:
/// - digits, with or without grouping: `150000`, `150,000` (international) or
///   `1,50,000` (Pakistani: groups of two, then three), and decimals
///   (`1,234.50`, `.5`, `5.`); a grouping must be complete and consistent;
/// - Urdu (`۱۵۰۰۰۰`) and Arabic-Indic (`١٥٠٠٠٠`) digits, also mixed with
///   0-9, and the Arabic decimal and thousands separators (`٫`, `٬`);
/// - one currency mark before or after the number: `Rs`, `Rs.`, `PKR` or `₨`
///   (any case), and a trailing `/-` (`Rs. 5,000/-`);
/// - one shorthand unit after the number, with or without a space, in any
///   case: `k`, `thousand(s)`, `hazar`, `ہزار` (× 1,000); `lakh(s)`, `lac(s)`,
///   `لاکھ` (× 100,000); `crore(s)`, `cr`, `کروڑ` (× 10,000,000). Decimals
///   work with units: `1.5 lakh` is 150,000 and `2.25cr` is 22,500,000;
/// - whitespace around and between the parts (spaces, tabs, line breaks and
///   no-break spaces).
///
/// Rejected (`null`): empty input, negative or signed amounts (`-500`,
/// `+500`), ranges (`5-10k`), more than one number (`500 600`), two currency
/// marks or two units, leftover letters (`500 rupees`, `5kk`), grouping that
/// could be read two ways or is broken (`1,50`, `1.500,00`, `1,5000`), and
/// amounts over Rs. 50 trillion (50 lakh crore), beyond which a number can no
/// longer hold every paisa exactly.
///
/// The arithmetic is done on the digits, so the result is exact: `1.005`
/// rounds to 1.01 and `1.5 lakh` is exactly 150000.
///
/// ```dart
/// parseAmount('Rs. 1,50,000/-'); // ParsedAmount(value: 150000, raw: 'Rs. 1,50,000/-')
/// parseAmount('2.25cr');         // ParsedAmount(value: 22500000, raw: '2.25cr')
/// parseAmount('5-10k');          // null
/// ```
ParsedAmount? parseAmount(String input) {
  final raw = input.replaceAll(_trim, '');
  final buffer = StringBuffer();
  for (final unit in raw.codeUnits) {
    if (unit >= 0x06F0 && unit <= 0x06F9) {
      // Urdu (Extended Arabic-Indic) digits.
      buffer.writeCharCode(unit - 0x06F0 + 0x30);
    } else if (unit >= 0x0660 && unit <= 0x0669) {
      // Arabic-Indic digits.
      buffer.writeCharCode(unit - 0x0660 + 0x30);
    } else if (unit == 0x066B) {
      // Arabic decimal separator.
      buffer.writeCharCode(0x2E);
    } else if (unit == 0x066C) {
      // Arabic thousands separator.
      buffer.writeCharCode(0x2C);
    } else if (unit >= 0x41 && unit <= 0x5A) {
      // ASCII letters only, as in the npm package.
      buffer.writeCharCode(unit + 0x20);
    } else {
      buffer.writeCharCode(unit);
    }
  }
  final match = _amount.firstMatch(buffer.toString());
  if (match == null) return null;
  final before = match.group(1);
  final whole = match.group(2) ?? '';
  final fraction = match.group(3);
  final unit = match.group(4);
  final after = match.group(5);
  if (before != null && after != null) return null;
  if (whole.isEmpty && (fraction == null || fraction.isEmpty)) return null;

  // Move the decimal point by the unit's power of ten, on the digit string.
  final integer = whole.replaceAll(',', '');
  final digits = integer + (fraction ?? '');
  final point = integer.length + _unitExponent(unit);
  final padded = digits.padRight(point + 3, '0');
  final rupees = point == 0 ? '0' : padded.substring(0, point);
  final paisa = padded.substring(point, point + 2);
  var cents = BigInt.parse(rupees + paisa);
  if (padded.codeUnitAt(point + 2) >= 0x35) cents += BigInt.one; // half-up
  if (cents > _maxPaisa) return null;
  return ParsedAmount(value: cents.toDouble() / 100, raw: raw);
}

/// Writes back an amount typed in any form [parseAmount] accepts, for
/// showing next to the field ("= Rs. 150,000"): `Rs.`, international
/// grouping, and paisa only when there are any (`Rs. 1,234.50`). Returns
/// `null` when [parseAmount] does; it never throws.
///
/// E.g. `"Rs. 150,000"` for `"1.5 lakh"`, or `null`.
String? formatAmountInput(String input) {
  final parsed = parseAmount(input);
  if (parsed == null) return null;
  final cents = jsRound(parsed.value * 100).toInt();
  final rupees = (cents ~/ 100).toString();
  final out = StringBuffer();
  for (var i = 0; i < rupees.length; i++) {
    if (i > 0 && (rupees.length - i) % 3 == 0) out.write(',');
    out.write(rupees[i]);
  }
  final paisa = cents % 100;
  return 'Rs. $out${paisa != 0 ? '.${paisa.toString().padLeft(2, '0')}' : ''}';
}
