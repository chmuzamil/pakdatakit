import { normalizePhoneDigits } from './internal/phone-utils.js';

/**
 * Creates a WhatsApp click-to-chat link for a Pakistani mobile number.
 *
 * Accepts local, international, and short phone formats.
 *
 * @param phone - Pakistani mobile number in any supported format
 * @param message - Optional pre-filled message (URL-encoded)
 * @returns WhatsApp wa.me link, or `null` if the phone number is invalid
 */
export function createWhatsAppLink(
  phone: string,
  message?: string,
): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits === null) {
    return null;
  }

  const baseUrl = `https://wa.me/${digits}`;

  if (message === undefined || message.length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
