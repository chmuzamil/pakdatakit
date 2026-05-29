import { stripSeparators } from './internal/normalize.js';

const CNIC_PATTERN = /^\d{13}$/;

/**
 * Validates a Pakistani CNIC number.
 *
 * Accepts formats with or without dashes/spaces (e.g. `3520212345671` or `35202-1234567-1`).
 * Strips separators before checking for exactly 13 numeric digits.
 *
 * @param cnic - The CNIC string to validate
 * @returns `true` if the CNIC is valid, otherwise `false`
 */
export function validateCNIC(cnic: string): boolean {
  const digits = stripSeparators(cnic);
  if (digits.length === 0) {
    return false;
  }
  return CNIC_PATTERN.test(digits);
}
