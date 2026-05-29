import {
  getPhonePrefix,
  normalizePhoneDigits,
} from './internal/phone-utils.js';
import { getNetwork, type NetworkName } from './networks.js';

export type { NetworkName };

/** Combined phone validation, formatting, and network analysis result. */
export interface PhoneAnalysis {
  valid: boolean;
  formatted: string | null;
  network: NetworkName;
}

const VALID_PHONE_PATTERN = /^\+923\d{9}$/;

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

export { getPhonePrefix, normalizePhoneDigits };

/**
 * Analyzes a Pakistani mobile number in a single call.
 *
 * Combines validation, E.164 formatting, and network detection.
 * Invalid numbers return `{ valid: false, formatted: null, network: "Unknown" }`.
 *
 * @param phone - Phone number in any supported format
 * @returns Structured phone analysis result
 */
export function analyzePhone(phone: string): PhoneAnalysis {
  if (!validatePhone(phone)) {
    return {
      valid: false,
      formatted: null,
      network: 'Unknown',
    };
  }

  return {
    valid: true,
    formatted: formatPhone(phone),
    network: getNetwork(phone),
  };
}
