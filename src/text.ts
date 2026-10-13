import {
  normalizeWhitespace,
  toAsciiDigits,
} from './internal/normalize.js';

const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Common Roman Urdu spelling normalizations (informal → preferred).
 *
 * Only unambiguous variants are listed: words like "men"/"mein" ("in") and
 * "main" ("I") are left alone because rewriting them changes the meaning.
 */
const ROMAN_URDU_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bkia\b/gi, 'kya'],
  [/\bker\b/gi, 'kar'],
  [/\bkr\b/gi, 'kar'],
  [/\bhy\b/gi, 'hai'],
  [/\bmujhay\b/gi, 'mujhe'],
  [/\bap\b/gi, 'aap'],
  [/\bshukria\b/gi, 'shukriya'],
  [/\bnhi\b/gi, 'nahi'],
  [/\bassalamu alaikum\b/gi, 'assalamualaikum'],
  [/\bassalam o alaikum\b/gi, 'assalamualaikum'],
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
 * A capitalized word keeps its capital; all-caps words (acronyms such as "AP")
 * are left unchanged.
 *
 * @param text - Roman Urdu input
 * @returns Normalized Roman Urdu string
 */
export function normalizeRomanUrdu(text: string): string {
  let result = normalizeText(toEnglishDigits(text));

  for (const [pattern, replacement] of ROMAN_URDU_REPLACEMENTS) {
    result = result.replace(pattern, (match) => matchCase(match, replacement));
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
  return toAsciiDigits(text).replace(
    /\d/g,
    (digit) => URDU_DIGITS[Number(digit)] as string,
  );
}

/**
 * Converts Urdu/Arabic-Indic digits in a string to English digits (0–9).
 *
 * @param text - Input text
 * @returns Text with English digits
 */
export function toEnglishDigits(text: string): string {
  return toAsciiDigits(text);
}

function matchCase(original: string, replacement: string): string {
  if (original.length > 1 && original === original.toUpperCase()) {
    return original;
  }
  const first = original[0] as string;
  if (first !== first.toLowerCase()) {
    return replacement[0]?.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}
