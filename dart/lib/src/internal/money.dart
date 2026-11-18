/// Exact money arithmetic in whole paisa, the same steps as the npm package's
/// `internal/money.ts`, so results match to the paisa on every platform.
library;

import 'js.dart';

/// Largest amount accepted, in rupees (one trillion).
const int maxAmount = 1000000000000;

final RegExp _decimal = RegExp(r'^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$');

int _digit(String digits, int index) => digits.codeUnitAt(index) - 0x30;

/// Converts a number to an integer count of `10^-scale` units, rounding half
/// up from the decimal digits as JavaScript writes them (`1.005` with scale 2
/// is 101, not the 100 that floating-point `1.005 * 100` gives).
///
/// Returns `null` for anything that is not a finite number from 0 to
/// [maxAmount].
int? toUnits(num value, int scale) {
  if (!value.isFinite || value < 0 || value > maxAmount) return null;
  // The shortest decimal form, e.g. "1.005", "1e-7" or "123".
  final match = _decimal.firstMatch(jsNumberToString(value));
  if (match == null) return null;
  final intPart = match.group(1)!;
  final fracPart = match.group(2) ?? '';
  final exponent = int.parse(match.group(3) ?? '0');
  // All digits, and where the decimal point sits after shifting by the
  // exponent.
  final all = intPart + fracPart;
  var start = 0;
  while (start < all.length - 1 && all.codeUnitAt(start) == 0x30) {
    start++;
  }
  final digits = all.substring(start);
  final point = intPart.length + exponent - all.length + digits.length;
  // Units = digits shifted so that `scale` digits follow the point.
  final keep = point + scale;
  if (keep <= 0) {
    // Everything is below half a unit unless the first dropped digit is >= 5
    // and sits exactly at the rounding position.
    return keep == 0 && _digit(digits, 0) >= 5 ? 1 : 0;
  }
  if (keep >= digits.length) {
    return int.parse(digits + '0' * (keep - digits.length));
  }
  final whole = int.parse(digits.substring(0, keep));
  return _digit(digits, keep) >= 5 ? whole + 1 : whole;
}

/// Rupees from paisa, as a double with at most 2 decimals.
double fromPaisa(int paisa) => paisa / 100;

/// `numerator / denominator`, both non-negative, rounded half up and computed
/// exactly with [BigInt] (products reach 10^18, beyond JavaScript's 2^53).
int divideHalfUp(BigInt numerator, BigInt denominator) {
  final quotient = numerator ~/ denominator;
  final remainder = numerator.remainder(denominator);
  return (remainder * BigInt.two >= denominator
          ? quotient + BigInt.one
          : quotient)
      .toInt();
}
