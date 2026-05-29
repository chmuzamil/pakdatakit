import { stripSeparators } from './internal/normalize.js';

const VALID_PHONE_PATTERN = /^\+923\d{9}$/;

/**
 * Normalizes a phone string to digits with country code (no leading plus).
 * Returns `null` when the input cannot be normalized to a valid Pakistani mobile number.
 */
export function normalizePhoneDigits(phone: string): string | null {
  let digits = stripSeparators(phone);

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('92')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  if (digits.length !== 10 || !digits.startsWith('3')) {
    return null;
  }

  return `92${digits}`;
}

/**
 * Validates a Pakistani mobile phone number.
 *
 * Accepts local (`03001234567`), international (`+923001234567`),
 * and short (`3001234567`) formats. Ignores spaces and dashes.
 *
 * @param phone - The phone number string to validate
 * @returns `true` if valid, otherwise `false`
 */
export function validatePhone(phone: string): boolean {
  const digits = normalizePhoneDigits(phone);
  if (digits === null) {
    return false;
  }
  return VALID_PHONE_PATTERN.test(`+${digits}`);
}

/**
 * Formats a Pakistani mobile number to international E.164 style (`+923001234567`).
 *
 * Returns an empty string when the input is not a valid Pakistani mobile number.
 *
 * @param phone - The phone number string to format
 * @returns Formatted phone number or empty string if invalid
 */
export function formatPhone(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits === null) {
    return '';
  }
  return `+${digits}`;
}

/**
 * Returns the local Pakistani mobile prefix (`0XXX`) from a phone number.
 * Returns `null` when the phone cannot be normalized.
 */
export function getPhonePrefix(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits === null) {
    return null;
  }
  const local = digits.slice(2);
  return `0${local.slice(0, 3)}`;
}
