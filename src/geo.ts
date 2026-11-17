import citiesData from '../data/cities.json';
import districtsData from '../data/districts.json';
import divisionsData from '../data/divisions.json';
import tehsilsData from '../data/tehsils.json';
import { lazy, normalizeKey } from './internal/normalize.js';

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

const cityLookup = /* @__PURE__ */ lazy(
  () =>
    new Map<string, string>(
      CITIES.map((entry) => [normalizeKey(entry.city), entry.province]),
    ),
);

const districtLookup = /* @__PURE__ */ lazy(
  () =>
    new Map<string, string>(
      DISTRICTS.map((entry) => [normalizeKey(entry.district), entry.province]),
    ),
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
  return cityLookup().get(key) ?? null;
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
  return (
    districtLookup().get(key) ??
    (Object.hasOwn(FORMER_DISTRICTS, key) ? FORMER_DISTRICTS[key] : null) ??
    null
  );
}

/**
 * Districts that were split or renamed, so names stored before the change
 * still resolve. They are not listed by searchDistricts or getDistrictsByProvince.
 */
const FORMER_DISTRICTS: Readonly<Record<string, string>> = {
  // Split into Lower and Upper South Waziristan (2022).
  'south waziristan': 'Khyber Pakhtunkhwa',
  // Split into Quetta East and Quetta West (2026).
  quetta: 'Balochistan',
  // Became South Dera Bugti; Upper Dera Bugti became North Dera Bugti (2026).
  'dera bugti': 'Balochistan',
  'upper dera bugti': 'Balochistan',
  // Notified as Bar Swat (2026); reported as Upper Swat before that.
  'upper swat': 'Khyber Pakhtunkhwa',
};

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

interface DivisionEntry {
  division: string;
  province: string;
  districts: string[];
}

interface TehsilEntry {
  tehsil: string;
  type: string;
  censusDistrict: string;
  currentDistrict: string | null;
  province: string;
}

const DIVISIONS = divisionsData as DivisionEntry[];
const TEHSILS = tehsilsData as TehsilEntry[];

const divisionOfDistrict = /* @__PURE__ */ lazy(() => {
  const map = new Map<string, string>();
  for (const entry of DIVISIONS) {
    for (const district of entry.districts) {
      map.set(normalizeKey(district), entry.division);
    }
  }
  return map;
});

const censusDistrictKeys = /* @__PURE__ */ lazy(
  () => new Set(TEHSILS.map((entry) => normalizeKey(entry.censusDistrict))),
);

/**
 * Returns the administrative divisions of Pakistan, or of one province.
 *
 * The list is the 30 divisions of the 2023 census: Punjab 9, Sindh 6, Khyber
 * Pakhtunkhwa 7 and Balochistan 8. Islamabad has no division, and the census
 * tables do not cover Azad Jammu and Kashmir or Gilgit-Baltistan. Divisions
 * created since the census (such as Gujrat in Punjab) are not included.
 *
 * @param province - Optional province name (case-insensitive)
 * @returns Alphabetically sorted division names
 */
export function getDivisions(province?: string): string[] {
  if (province === undefined) {
    return DIVISIONS.map((entry) => entry.division).sort((a, b) =>
      a.localeCompare(b),
    );
  }
  const key = normalizeKey(province);
  if (key.length === 0) {
    return [];
  }
  return DIVISIONS.filter((entry) => normalizeKey(entry.province) === key)
    .map((entry) => entry.division)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Returns the division a district belonged to in the 2023 census.
 *
 * Census-district caveat: only the 136 districts of the 2023 census have a
 * division here, under the name they had then (so `Quetta`, `Dera Bugti` and
 * `South Waziristan` work, and their successors do not). Districts created
 * after the census, and those of Azad Jammu and Kashmir, Gilgit-Baltistan and
 * Islamabad, return `null`.
 *
 * @param district - District name (case-insensitive)
 * @returns Division name or `null` if not known
 */
export function getDivisionOfDistrict(district: string): string | null {
  const key = normalizeKey(district);
  if (key.length === 0) {
    return null;
  }
  return divisionOfDistrict().get(key) ?? null;
}

/**
 * Returns the tehsils (talukas, sub-divisions) of a district.
 *
 * Census-district caveat: the data is the 591 tehsil-level units of the 2023
 * census, each recorded under the district it was in then. For a district of
 * the 2023 census this returns its census tehsils, even if some have since
 * moved to a new district (so `Rawalpindi` still lists Murree). For a
 * district created after the census it returns only the tehsils an official
 * source places in it, which can be an empty list. Azad Jammu and Kashmir
 * and Gilgit-Baltistan are not covered.
 *
 * @param district - District name (case-insensitive); former names such as
 *   `Quetta` and `South Waziristan` work
 * @returns Alphabetically sorted tehsil names
 */
export function getTehsils(district: string): string[] {
  const key = normalizeKey(district);
  if (key.length === 0) {
    return [];
  }
  const inCensus = censusDistrictKeys().has(key);
  return TEHSILS.filter((entry) =>
    inCensus
      ? normalizeKey(entry.censusDistrict) === key
      : entry.currentDistrict !== null &&
        normalizeKey(entry.currentDistrict) === key,
  )
    .map((entry) => entry.tehsil)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Returns the district a tehsil was in at the 2023 census.
 *
 * Census-district caveat: the result is the census district, which may have
 * been split since (a tehsil of `Quetta` is now in Quetta East or Quetta
 * West). A few names are shared by tehsils in different districts (`Saddar`,
 * `Sahiwal`, `Khanpur`); pass the province to tell them apart. Returns
 * `null` when the name is unknown or still matches more than one district.
 *
 * @param tehsil - Tehsil, taluka or sub-division name (case-insensitive)
 * @param province - Optional province to narrow the search
 * @returns District name or `null`
 */
export function getTehsilDistrict(
  tehsil: string,
  province?: string,
): string | null {
  const key = normalizeKey(tehsil);
  if (key.length === 0) {
    return null;
  }
  const provinceKey = province === undefined ? null : normalizeKey(province);
  const matches = new Set(
    TEHSILS.filter(
      (entry) =>
        normalizeKey(entry.tehsil) === key &&
        (provinceKey === null || normalizeKey(entry.province) === provinceKey),
    ).map((entry) => entry.censusDistrict),
  );
  if (matches.size !== 1) {
    return null;
  }
  return [...matches][0] ?? null;
}
