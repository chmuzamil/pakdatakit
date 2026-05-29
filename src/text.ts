import { normalizeWhitespace } from './internal/normalize.js';

const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Common Roman Urdu spelling normalizations (informal → preferred). */
const ROMAN_URDU_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bkia\b/gi, 'kya'],
  [/\bker\b/gi, 'kar'],
  [/\bkr\b/gi, 'kar'],
  [/\bhai\b/gi, 'hai'],
  [/\bhy\b/gi, 'hai'],
  [/\bmujhe\b/gi, 'mujhe'],
  [/\bmujhay\b/gi, 'mujhe'],
  [/\bap\b/gi, 'aap'],
  [/\btum\b/gi, 'tum'],
  [/\bshukria\b/gi, 'shukriya'],
  [/\bmein\b/gi, 'main'],
  [/\bmen\b/gi, 'main'],
  [/\bnahi\b/gi, 'nahi'],
  [/\bnhi\b/gi, 'nahi'],
  [/\bassalamu alaikum\b/gi, 'assalamualaikum'],
  [/\bassalam o alaikum\b/gi, 'assalamualaikum'],
  [/\bkhuda hafiz\b/gi, 'khuda hafiz'],
  [/\ballah hafiz\b/gi, 'allah hafiz'],
];

/**
 * Normalizes general text: trims, collapses whitespace, and applies Unicode NFC.
 *
 * @param text - Input text
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return normalizeWhitespace(text.normalize('NFC'));
}

/**
 * Normalizes informal Roman Urdu spellings to common canonical forms.
 *
 * Also applies {@link normalizeText} and converts Urdu/Arabic digits to English.
 *
 * @param text - Roman Urdu input
 * @returns Normalized Roman Urdu string
 */
export function normalizeRomanUrdu(text: string): string {
  let result = normalizeText(toEnglishDigits(text));

  for (const [pattern, replacement] of ROMAN_URDU_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Converts English/Arabic-Indic digits in a string to Urdu digits (۰–۹).
 *
 * @param text - Input text
 * @returns Text with Urdu digits
 */
export function toUrduDigits(text: string): string {
  return replaceDigitSets(text, ENGLISH_DIGITS, URDU_DIGITS, ARABIC_INDIC_DIGITS);
}

/**
 * Converts Urdu/Arabic-Indic digits in a string to English digits (0–9).
 *
 * @param text - Input text
 * @returns Text with English digits
 */
export function toEnglishDigits(text: string): string {
  let result = text;

  for (let i = 0; i < URDU_DIGITS.length; i += 1) {
    const urdu = URDU_DIGITS[i];
    const english = ENGLISH_DIGITS[i];
    if (urdu !== undefined && english !== undefined) {
      result = result.replaceAll(urdu, english);
    }
  }

  for (let i = 0; i < ARABIC_INDIC_DIGITS.length; i += 1) {
    const arabic = ARABIC_INDIC_DIGITS[i];
    const english = ENGLISH_DIGITS[i];
    if (arabic !== undefined && english !== undefined) {
      result = result.replaceAll(arabic, english);
    }
  }

  return result;
}

function replaceDigitSets(
  text: string,
  fromEnglish: readonly string[],
  toUrdu: readonly string[],
  fromArabic: string,
): string {
  let result = text;

  for (let i = 0; i < fromEnglish.length; i += 1) {
    const english = fromEnglish[i];
    const urdu = toUrdu[i];
    if (english !== undefined && urdu !== undefined) {
      result = result.replaceAll(english, urdu);
    }
  }

  for (let i = 0; i < fromArabic.length; i += 1) {
    const arabic = fromArabic[i];
    const urdu = toUrdu[i];
    if (arabic !== undefined && urdu !== undefined) {
      result = result.replaceAll(arabic, urdu);
    }
  }

  return result;
}
