import { stripSeparators } from './normalize.js';

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
