import postalData from '../data/postal-codes.json';
import { normalizeKey } from './internal/normalize.js';

interface PostalEntry {
  city: string;
  postalCode: string;
  area?: string;
  primary?: boolean;
}

const POSTAL_ENTRIES = postalData as PostalEntry[];

const POSTAL_BY_CODE = new Map<string, string>(
  POSTAL_ENTRIES.map((entry) => [entry.postalCode, entry.city]),
);

const POSTAL_BY_CITY = new Map<string, string>();

for (const entry of POSTAL_ENTRIES) {
  const key = normalizeKey(entry.city);
  const existing = POSTAL_BY_CITY.get(key);
  if (existing === undefined || entry.primary === true) {
    POSTAL_BY_CITY.set(key, entry.postalCode);
  }
}

/**
 * Returns the city name for a Pakistani postal code.
 *
 * @param postalCode - Postal code to look up (whitespace is ignored)
 * @returns City name or `null` if not found
 */
export function getCityByPostalCode(postalCode: string): string | null {
  const code = stripPostalCode(postalCode);
  if (code.length === 0) {
    return null;
  }
  return POSTAL_BY_CODE.get(code) ?? null;
}

/**
 * Returns the primary postal code for a Pakistani city.
 *
 * Matching is case-insensitive and whitespace-tolerant.
 * When multiple postal codes exist, returns the primary GPO code.
 *
 * @param city - City name to look up
 * @returns Postal code or `null` if not found
 */
export function getPostalCode(city: string): string | null {
  const key = normalizeKey(city);
  if (key.length === 0) {
    return null;
  }
  return POSTAL_BY_CITY.get(key) ?? null;
}

/**
 * Returns all known postal codes for a city (case-insensitive).
 *
 * @param city - City name to look up
 * @returns Alphabetically sorted postal codes
 */
export function getPostalCodes(city: string): string[] {
  const key = normalizeKey(city);
  if (key.length === 0) {
    return [];
  }

  return POSTAL_ENTRIES.filter((entry) => normalizeKey(entry.city) === key)
    .map((entry) => entry.postalCode)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Searches postal entries by city name, area, or postal code prefix.
 *
 * @param query - Partial search term
 * @returns Matching postal code strings, sorted alphabetically
 */
export function searchPostalCodes(query: string): string[] {
  const normalizedQuery = normalizeKey(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const matches = POSTAL_ENTRIES.filter((entry) => {
    const cityKey = normalizeKey(entry.city);
    const areaKey = entry.area ? normalizeKey(entry.area) : '';
    return (
      cityKey.includes(normalizedQuery) ||
      areaKey.includes(normalizedQuery) ||
      entry.postalCode.startsWith(query.trim())
    );
  }).map((entry) => entry.postalCode);

  return [...new Set(matches)].sort((a, b) => a.localeCompare(b));
}

/**
 * Returns known area names for a city's postal entries.
 *
 * @param city - City name to look up
 * @returns Alphabetically sorted area names
 */
export function getPostalAreas(city: string): string[] {
  const key = normalizeKey(city);
  if (key.length === 0) {
    return [];
  }

  return POSTAL_ENTRIES.filter(
    (entry) => normalizeKey(entry.city) === key && entry.area,
  )
    .map((entry) => entry.area as string)
    .sort((a, b) => a.localeCompare(b));
}

function stripPostalCode(postalCode: string): string {
  return postalCode.trim().replace(/\s+/g, '');
}
