import postalData from '../data/postal-codes.json';
import { lazy, normalizeKey } from './internal/normalize.js';

/**
 * A post office in one of the cities in pakdatakit's city list, from Pakistan
 * Post's directory. `area` is the office name. Offices in other towns and
 * villages are in `post-offices.json` (see `getPostOffice`).
 */
interface PostalEntry {
  city: string;
  postalCode: string;
  area?: string;
  primary?: boolean;
  district?: string;
  province?: string;
}

const POSTAL_ENTRIES = postalData as PostalEntry[];

const postalByCode = /* @__PURE__ */ lazy(
  () =>
    new Map<string, string>(
      POSTAL_ENTRIES.map((entry) => [entry.postalCode, entry.city]),
    ),
);

const postalByCity = /* @__PURE__ */ lazy(() => {
  const map = new Map<string, string>();
  for (const entry of POSTAL_ENTRIES) {
    const key = normalizeKey(entry.city);
    if (!map.has(key) || entry.primary === true) {
      map.set(key, entry.postalCode);
    }
  }
  return map;
});

/**
 * Returns the city for a Pakistani postal code.
 *
 * Only codes of post offices in a city on pakdatakit's city list return a
 * city (`54660` → `Lahore`). The code of a post office in a town or village
 * that is not on the list returns `null`; use `getPostOffice` for those.
 *
 * @param postalCode - Postal code to look up (whitespace is ignored)
 * @returns City name or `null` if not found
 */
export function getCityByPostalCode(postalCode: string): string | null {
  const code = stripPostalCode(postalCode);
  if (code.length === 0) {
    return null;
  }
  return postalByCode().get(code) ?? null;
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
  return postalByCity().get(key) ?? null;
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

export { getPostOffice, searchPostOffices } from './post-offices.js';
export type { PostOffice } from './post-offices.js';
