import citiesData from '../data/cities.json';
import { normalizeKey } from './internal/normalize.js';

interface CityEntry {
  city: string;
  province: string;
}

const CITIES = citiesData as CityEntry[];

const CITY_LOOKUP = new Map<string, string>(
  CITIES.map((entry) => [normalizeKey(entry.city), entry.province]),
);

/**
 * Returns the province for a given Pakistani city name.
 *
 * Matching is case-insensitive and ignores inconsistent spacing.
 * Returns `null` when no exact city match is found.
 *
 * @param city - The city name to look up
 * @returns Province name or `null` if not found
 */
export function getProvince(city: string): string | null {
  const key = normalizeKey(city);
  if (key.length === 0) {
    return null;
  }
  return CITY_LOOKUP.get(key) ?? null;
}

/**
 * Searches cities by partial, case-insensitive name match.
 *
 * @param query - Partial city name to search for
 * @returns Alphabetically sorted list of matching city names
 */
export function searchCities(query: string): string[] {
  const normalizedQuery = normalizeKey(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const matches = CITIES.filter((entry) =>
    normalizeKey(entry.city).includes(normalizedQuery),
  ).map((entry) => entry.city);

  return [...new Set(matches)].sort((a, b) => a.localeCompare(b));
}
