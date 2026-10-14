import networksData from '../../data/networks.json';
import { lazy, stripSeparators, toAsciiDigits } from './normalize.js';

/** Mobile prefixes (`03XX`) allocated to an operator in the dataset. */
const allocatedPrefixes = lazy(
  () =>
    new Set(
      (networksData as Array<{ prefix: string }>).map((entry) => entry.prefix),
    ),
);

/** Whether a `03XX` mobile prefix is allocated to an operator. */
export function isAllocatedPrefix(prefix: string): boolean {
  return allocatedPrefixes().has(prefix);
}

/**
 * Normalizes a phone string to digits with country code (no leading plus).
 *
 * Accepts local (`0300…`), international (`+92300…`, `0092300…`), short
 * (`300…`) and the common `+92 (0) 300…` / `+920300…` forms, with spaces,
 * dashes, dots, slashes or parentheses, and Urdu or Arabic-Indic digits.
 *
 * Returns `null` when the input is not a Pakistani mobile number on an
 * allocated `03XX` prefix.
 */
export function normalizePhoneDigits(phone: string): string | null {
  let digits = stripSeparators(toAsciiDigits(phone));

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('92') && digits.length > 10) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!/^3\d{9}$/.test(digits)) {
    return null;
  }

  if (!allocatedPrefixes().has(`0${digits.slice(0, 3)}`)) {
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
  return `0${digits.slice(2, 5)}`;
}
