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
