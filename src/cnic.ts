import { toAsciiDigits } from './internal/normalize.js';

/**
 * 13 digits, optionally grouped as `#####-#######-#` with a dash, dash-like
 * character, dot, or space between the groups. The first digit is the province
 * code (1–8), so a leading 0 or 9 is rejected.
 */
const CNIC_PATTERN = /^[1-8]\d{4}([-‐‑‒–—. ]?)\d{7}\1\d$/;

/**
 * Validates a Pakistani CNIC number.
 *
 * Accepts `3520212345671`, `35202-1234567-1`, `35202 1234567 1` and Urdu digits.
 * Separators must sit between the 5-7-1 digit groups and be used consistently.
 *
 * NADRA does not publish a check-digit algorithm, so this validates structure only.
 *
 * @param cnic - The CNIC string to validate
 * @returns `true` if the CNIC is valid, otherwise `false`
 */
export function validateCNIC(cnic: string): boolean {
  return CNIC_PATTERN.test(toAsciiDigits(cnic.trim()));
}
