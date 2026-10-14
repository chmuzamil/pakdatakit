const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const NON_LATIN_DIGIT_PATTERN = /[۰-۹٠-٩]/g;

/**
 * Converts Urdu (Extended Arabic-Indic) and Arabic-Indic digits to ASCII digits.
 */
export function toAsciiDigits(input: string): string {
  return input.replace(NON_LATIN_DIGIT_PATTERN, (char) => {
    const urdu = URDU_DIGITS.indexOf(char);
    return String(urdu >= 0 ? urdu : ARABIC_INDIC_DIGITS.indexOf(char));
  });
}

/**
 * Removes common separators from input: whitespace, hyphens and dashes,
 * dots, slashes, and parentheses.
 */
export function stripSeparators(input: string): string {
  return input.replace(/[\s\-‐‑‒–—./()]/g, '');
}

/**
 * Collapses internal whitespace and trims leading/trailing spaces.
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes a lookup key: lowercase with collapsed whitespace.
 */
export function normalizeKey(input: string): string {
  return normalizeWhitespace(input).toLowerCase();
}

/**
 * Wraps a factory so it runs once, on first call. Used to build lookup tables
 * lazily so that importing one function does not eagerly process every dataset.
 */
export function lazy<T>(factory: () => T): () => T {
  let value: T | undefined;
  let ready = false;
  return () => {
    if (!ready) {
      value = factory();
      ready = true;
    }
    return value as T;
  };
}
