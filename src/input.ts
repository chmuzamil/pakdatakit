import { validateCNIC } from './cnic.js';
import { validateIBAN } from './iban.js';
import { isAllocatedPrefix } from './internal/phone-utils.js';
import { toAsciiDigits } from './internal/normalize.js';

/**
 * State of a form field while the user is typing.
 *
 * - `empty`: nothing entered yet
 * - `incomplete`: what has been typed so far can still become valid
 * - `valid`: complete and valid
 * - `invalid`: cannot become valid by typing more (wrong character, prefix or length)
 */
export type InputState = 'empty' | 'incomplete' | 'valid' | 'invalid';

/** Characters people use between groups of digits. */
const SEPARATORS = /[\s\-‐‑‒–—./()]/g;

/**
 * Formats a CNIC as the user types: `35202-1234567-1`.
 *
 * Keeps up to 13 digits (Urdu digits are converted) and inserts the dashes
 * as the groups fill. Other characters are dropped.
 *
 * @param value - Current input value
 * @returns Value to show in the input
 */
export function formatCNICInput(value: string): string {
  const digits = toAsciiDigits(value).replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Checks a CNIC while the user is typing. See {@link InputState}.
 *
 * @example
 * checkCNICInput('35202-12');        // 'incomplete'
 * checkCNICInput('35202-1234567-1'); // 'valid'
 * checkCNICInput('05202');           // 'invalid' (no province starts with 0)
 */
export function checkCNICInput(value: string): InputState {
  const text = toAsciiDigits(value).replace(SEPARATORS, '');
  if (text === '') return 'empty';
  if (!/^\d+$/.test(text) || text.length > 13) return 'invalid';
  if (!/^[1-8]/.test(text)) return 'invalid';
  if (text.length < 13) return 'incomplete';
  return validateCNIC(text) ? 'valid' : 'invalid';
}

/**
 * Splits phone input into what was typed before the mobile number (country
 * code or trunk 0) and the mobile number itself, without its leading 0.
 * Returns `null` when the start cannot be a Pakistani number, and
 * `incomplete` while the country code is still being typed.
 */
function splitPhone(
  value: string,
): { national: string; international: boolean } | 'incomplete' | null {
  const text = toAsciiDigits(value).replace(SEPARATORS, '');
  if (!/^\+?\d*$/.test(text)) return null;

  for (const code of ['+92', '0092', '92']) {
    if (code.startsWith(text) && text.length < code.length) {
      // "0" and "9" could also be the start of a local or short number.
      return text === '0'
        ? { national: '', international: false }
        : 'incomplete';
    }
    // Mobile numbers start with 3, so a leading 92 is always the country code.
    if (text.startsWith(code)) {
      const rest = text.slice(code.length);
      return {
        national: rest.startsWith('0') ? rest.slice(1) : rest,
        international: true,
      };
    }
  }
  if (text.startsWith('+')) return null;
  return {
    national: text.startsWith('0') ? text.slice(1) : text,
    international: false,
  };
}

/**
 * Formats a Pakistani mobile number as the user types: `0300-1234567`, or
 * `+92 300 1234567` when the user starts with the country code.
 *
 * @param value - Current input value
 * @returns Value to show in the input
 */
export function formatPhoneInput(value: string): string {
  const split = splitPhone(value);
  if (split === null) return value;
  if (split === 'incomplete')
    return toAsciiDigits(value).replace(SEPARATORS, '');

  const digits = split.national.replace(/\D/g, '').slice(0, 10);
  if (split.international) {
    return digits.length <= 3
      ? `+92 ${digits}`.trimEnd()
      : `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  const local = `0${digits}`;
  return local.length <= 4 ? local : `${local.slice(0, 4)}-${local.slice(4)}`;
}

/**
 * Checks a Pakistani mobile number while the user is typing. The `03XX`
 * prefix is checked as soon as it is complete. See {@link InputState}.
 *
 * @example
 * checkPhoneInput('0300 12');     // 'incomplete'
 * checkPhoneInput('0360');        // 'invalid' (prefix not allocated)
 * checkPhoneInput('03001234567'); // 'valid'
 */
export function checkPhoneInput(value: string): InputState {
  if (toAsciiDigits(value).replace(SEPARATORS, '') === '') return 'empty';
  const split = splitPhone(value);
  if (split === null) return 'invalid';
  if (split === 'incomplete') return 'incomplete';

  const { national } = split;
  if (national === '') return 'incomplete';
  if (!national.startsWith('3')) return 'invalid';
  if (national.length >= 3 && !isAllocatedPrefix(`0${national.slice(0, 3)}`)) {
    return 'invalid';
  }
  if (national.length < 10) return 'incomplete';
  return national.length === 10 ? 'valid' : 'invalid';
}

/**
 * Formats an IBAN as the user types: uppercase, in groups of four
 * (`PK36 SCBL 0000 0011 2345 6702`), up to 24 characters.
 *
 * @param value - Current input value
 * @returns Value to show in the input
 */
export function formatIBANInput(value: string): string {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);
  return clean.replace(/(.{4})(?=.)/g, '$1 ');
}

/** What each position of a Pakistani IBAN may hold. */
const IBAN_SHAPE =
  /^(P(K(\d(\d([A-Z]([A-Z]([A-Z]([A-Z]([A-Z0-9]{0,16})?)?)?)?)?)?)?)?)?$/;

/**
 * Checks a Pakistani IBAN while the user is typing: the `PK` prefix, check
 * digits and bank code are checked as they are typed, and the full checksum
 * once all 24 characters are in. See {@link InputState}.
 *
 * @example
 * checkIBANInput('PK36 SC');                       // 'incomplete'
 * checkIBANInput('GB29');                          // 'invalid'
 * checkIBANInput('PK36 SCBL 0000 0011 2345 6702'); // 'valid'
 */
export function checkIBANInput(value: string): InputState {
  const clean = value.toUpperCase().replace(/[\s-]/g, '');
  if (clean === '') return 'empty';
  if (clean.length > 24 || !IBAN_SHAPE.test(clean)) return 'invalid';
  if (clean.length < 24) return 'incomplete';
  return validateIBAN(clean) ? 'valid' : 'invalid';
}
