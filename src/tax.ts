import { validateCNIC } from './cnic.js';
import { stripSeparators, toAsciiDigits } from './internal/normalize.js';

/** Kind of taxpayer an NTN belongs to. */
export type NTNType = 'individual' | 'business';

/** Result of {@link analyzeNTN}. */
export interface NTNInfo {
  /** `individual` when the NTN is a CNIC; `business` for a 7-digit company/AOP NTN. */
  type: NTNType;
  /** Digits without separators (7, 8 or 13 digits). */
  digits: string;
  /** Display form: `1234567-8` for business NTNs with a check digit, `#####-#######-#` for CNICs. */
  formatted: string;
}

/**
 * Analyzes a Pakistani National Tax Number (NTN).
 *
 * - Individuals use their 13-digit CNIC as their NTN (since the Finance Act 2015).
 * - Companies and associations of persons have a 7-digit NTN, often written
 *   with an 8th check digit as `1234567-8`.
 *
 * FBR does not publish the check-digit algorithm, so the check digit is not
 * verified; this validates the format only.
 *
 * @param ntn - NTN in any common format
 * @returns NTN details, or `null` if the format is invalid
 */
export function analyzeNTN(ntn: string): NTNInfo | null {
  const trimmed = toAsciiDigits(ntn.trim());

  if (validateCNIC(trimmed)) {
    const digits = stripSeparators(trimmed);
    return {
      type: 'individual',
      digits,
      formatted: `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`,
    };
  }

  const match = /^(\d{7})(?:[-‐‑‒–— ]?(\d))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, base, check] = match as unknown as [
    string,
    string,
    string | undefined,
  ];
  return {
    type: 'business',
    digits: `${base}${check ?? ''}`,
    formatted: check === undefined ? base : `${base}-${check}`,
  };
}

/**
 * Validates the format of a Pakistani National Tax Number (NTN): a CNIC for
 * individuals, or 7 digits (optionally followed by a check digit) for
 * businesses. See {@link analyzeNTN}.
 *
 * @param ntn - NTN to validate
 * @returns `true` if the format is valid
 */
export function validateNTN(ntn: string): boolean {
  return analyzeNTN(ntn) !== null;
}

/**
 * Validates the format of a Sales Tax Registration Number (STRN): 13 digits,
 * with optional spaces or dashes.
 *
 * FBR does not publish a check-digit algorithm or the meaning of the digit
 * groups, so this validates the format only.
 *
 * @param strn - STRN to validate
 * @returns `true` if the format is valid
 */
export function validateSTRN(strn: string): boolean {
  return /^\d{13}$/.test(stripSeparators(toAsciiDigits(strn)));
}
