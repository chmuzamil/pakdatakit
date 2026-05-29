import { normalizePhoneDigits } from './internal/phone-utils.js';

/**
 * Creates a WhatsApp click-to-chat link for a Pakistani mobile number.
 *
 * Accepts local, international, and short phone formats. Returns an empty
 * string when the phone number is invalid.
 *
 * @param phone - Pakistani mobile number in any supported format
 * @param message - Optional pre-filled message (URL-encoded)
 * @returns WhatsApp wa.me link or empty string if invalid
 */
export function createWhatsAppLink(phone: string, message?: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits === null) {
    return '';
  }

  const baseUrl = `https://wa.me/${digits}`;

  if (message === undefined || message.length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
