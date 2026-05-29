import citiesData from '../data/cities.json';
import districtsData from '../data/districts.json';
import { normalizeKey } from './internal/normalize.js';

interface CityEntry {
  city: string;
  province: string;
}

interface DistrictEntry {
  district: string;
  province: string;
}

const CITIES = citiesData as CityEntry[];
const DISTRICTS = districtsData as DistrictEntry[];

const CITY_LOOKUP = new Map<string, string>(
  CITIES.map((entry) => [normalizeKey(entry.city), entry.province]),
);

const DISTRICT_LOOKUP = new Map<string, string>(
  DISTRICTS.map((entry) => [normalizeKey(entry.district), entry.province]),
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

/**
 * Returns the province for a given Pakistani district name.
 *
 * Matching is case-insensitive and ignores inconsistent spacing.
 * Returns `null` when no exact district match is found.
 *
 * @param district - The district name to look up
 * @returns Province name or `null` if not found
 */
export function getDistrictProvince(district: string): string | null {
  const key = normalizeKey(district);
  if (key.length === 0) {
    return null;
  }
  return DISTRICT_LOOKUP.get(key) ?? null;
}

/**
 * Searches districts by partial, case-insensitive name match.
 *
 * @param query - Partial district name to search for
 * @returns Alphabetically sorted list of matching district names
 */
export function searchDistricts(query: string): string[] {
  const normalizedQuery = normalizeKey(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const matches = DISTRICTS.filter((entry) =>
    normalizeKey(entry.district).includes(normalizedQuery),
  ).map((entry) => entry.district);

  return [...new Set(matches)].sort((a, b) => a.localeCompare(b));
}

/**
 * Returns all districts for a given province (case-insensitive).
 *
 * @param province - Province name to filter by
 * @returns Alphabetically sorted district names
 */
export function getDistrictsByProvince(province: string): string[] {
  const key = normalizeKey(province);
  if (key.length === 0) {
    return [];
  }

  return DISTRICTS.filter((entry) => normalizeKey(entry.province) === key)
    .map((entry) => entry.district)
    .sort((a, b) => a.localeCompare(b));
}
