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

/**
 * Province of registration encoded in a CNIC's first digit. Code 2 was issued
 * in the former FATA, which merged into Khyber Pakhtunkhwa in 2018.
 */
const CNIC_PROVINCES: Readonly<Record<string, string>> = {
  '1': 'Khyber Pakhtunkhwa',
  '2': 'Khyber Pakhtunkhwa',
  '3': 'Punjab',
  '4': 'Sindh',
  '5': 'Balochistan',
  '6': 'Islamabad Capital Territory',
  '7': 'Gilgit-Baltistan',
  '8': 'Azad Jammu and Kashmir',
};

/** Information encoded in a CNIC number. */
export interface CNICInfo {
  /** The CNIC as 13 digits without separators. */
  digits: string;
  /** The CNIC in `#####-#######-#` form. */
  formatted: string;
  /**
   * Province where the CNIC was first registered (from the first digit).
   * This is not necessarily where the holder lives now.
   */
  province: string;
  /** Gender encoded in the last digit: odd for male, even for female. */
  gender: 'male' | 'female';
}

/**
 * Reads the province of registration and gender encoded in a CNIC.
 *
 * @param cnic - CNIC in any format accepted by {@link validateCNIC}
 * @returns Decoded information, or `null` if the CNIC is invalid
 */
export function getCNICInfo(cnic: string): CNICInfo | null {
  if (!validateCNIC(cnic)) {
    return null;
  }

  const digits = toAsciiDigits(cnic).replace(/\D/g, '');
  const lastDigit = Number(digits[12]);

  return {
    digits,
    formatted: `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`,
    province: CNIC_PROVINCES[digits[0] as string] as string,
    gender: lastDigit % 2 === 1 ? 'male' : 'female',
  };
}
