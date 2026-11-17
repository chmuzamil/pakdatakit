/**
 * Exact money arithmetic in whole paisa, shared by the sales tax and FBR
 * invoice modules. Every port does the same steps so results match to the
 * paisa.
 */

/** Largest amount accepted, in rupees (one trillion). */
export const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Converts a number to an integer count of `10^-scale` units, rounding half
 * up from the decimal digits as written (`1.005` with scale 2 is 101, not
 * the 100 that floating-point `1.005 * 100` gives).
 *
 * Returns `null` for anything that is not a finite number from 0 to
 * {@link MAX_AMOUNT}.
 */
export function toUnits(value: number, scale: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > MAX_AMOUNT) return null;
  // The shortest decimal form, e.g. "1.005", "1e-7" or "123".
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(value));
  if (!match) return null;
  const intPart = match[1] as string;
  const fracPart = match[2] ?? '';
  const exponent = Number(match[3] ?? '0');
  // All digits, and where the decimal point sits after shifting by the exponent.
  const digits = (intPart + fracPart).replace(/^0+(?=\d)/, '');
  const point =
    intPart.length + exponent - (intPart + fracPart).length + digits.length;
  // Units = digits shifted so that `scale` digits follow the point.
  const keep = point + scale;
  if (keep <= 0) {
    // Everything is below half a unit unless the first dropped digit is >= 5
    // and sits exactly at the rounding position.
    return keep === 0 && Number(digits[0]) >= 5 ? 1 : 0;
  }
  if (keep >= digits.length) {
    return Number(digits + '0'.repeat(keep - digits.length));
  }
  const whole = Number(digits.slice(0, keep));
  return Number(digits[keep]) >= 5 ? whole + 1 : whole;
}

/** Rupees from paisa, as a JavaScript number with at most 2 decimals. */
export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

/**
 * `numerator / denominator`, both non-negative integers, rounded half up,
 * computed exactly with BigInt.
 */
export function divideHalfUp(numerator: bigint, denominator: bigint): number {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return Number(remainder * 2n >= denominator ? quotient + 1n : quotient);
}
