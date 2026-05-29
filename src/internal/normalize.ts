/**
 * Removes spaces, dashes, and parentheses from input.
 */
export function stripSeparators(input: string): string {
  return input.replace(/[\s\-()]/g, '');
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
