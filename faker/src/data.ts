/*
 * Datasets shared with pakdatakit. They are imported straight from the
 * repository's data/ folder and bundled into dist by tsup, so the generated
 * values always agree with the validators of the same release.
 */
import areaCodesData from '../../data/area-codes.json';
import banksData from '../../data/banks.json';
import citiesData from '../../data/cities.json';
import districtsData from '../../data/districts.json';
import networksData from '../../data/networks.json';
import postalCodesData from '../../data/postal-codes.json';

/** A province or territory, spelt as pakdatakit returns it. */
export type Province =
  | 'Punjab'
  | 'Sindh'
  | 'Khyber Pakhtunkhwa'
  | 'Balochistan'
  | 'Islamabad Capital Territory'
  | 'Gilgit-Baltistan'
  | 'Azad Jammu and Kashmir';

/** Short forms accepted wherever a province is expected. */
export type ProvinceAlias = 'KP' | 'KPK' | 'ICT' | 'GB' | 'AJK';

/** Mobile network a `03XX` prefix was originally allocated to. */
export type Network = 'Jazz' | 'Zong' | 'Telenor' | 'Ufone' | 'SCO';

/** Kind of institution, as in pakdatakit's `BankType`. */
export type BankType =
  | 'commercial'
  | 'islamic'
  | 'microfinance'
  | 'digital'
  | 'emi'
  | 'foreign'
  | 'specialized'
  | 'central';

export interface CityEntry {
  city: string;
  province: Province;
}

export interface PostalEntry {
  city: string;
  postalCode: string;
  area?: string;
  primary?: boolean;
}

export interface BankEntry {
  code: string;
  name: string;
  type: BankType;
  mergedInto?: string;
  aliasOf?: string;
}

export interface AreaCodeEntry {
  code: string;
  cities: string[];
}

export interface NetworkEntry {
  prefix: string;
  network: Network;
}

export const CITIES = citiesData as CityEntry[];
export const DISTRICTS = districtsData as Array<{
  district: string;
  province: Province;
}>;
export const POSTAL_CODES = postalCodesData as PostalEntry[];
export const BANKS = banksData as BankEntry[];
export const AREA_CODES = areaCodesData as AreaCodeEntry[];
export const NETWORKS = networksData as NetworkEntry[];

export const PROVINCES: readonly Province[] = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
];

const PROVINCE_ALIASES: Readonly<Record<string, Province>> = {
  kp: 'Khyber Pakhtunkhwa',
  kpk: 'Khyber Pakhtunkhwa',
  ict: 'Islamabad Capital Territory',
  islamabad: 'Islamabad Capital Territory',
  gb: 'Gilgit-Baltistan',
  ajk: 'Azad Jammu and Kashmir',
};

export function key(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Resolves a province name or alias (case-insensitive). Throws if unknown. */
export function resolveProvince(value: string): Province {
  const k = key(value);
  const found =
    PROVINCES.find((province) => key(province) === k) ?? PROVINCE_ALIASES[k];
  if (!found) {
    throw new RangeError(`Unknown province: ${value}`);
  }
  return found;
}

function memo<T>(factory: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= factory());
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    for (const k of keyOf(item)) {
      const list = map.get(k);
      if (list) list.push(item);
      else map.set(k, [item]);
    }
  }
  return map;
}

const cityByKey = memo(
  () => new Map(CITIES.map((entry) => [key(entry.city), entry])),
);
const citiesByProvince = memo(() =>
  groupBy(CITIES, (entry) => [entry.province]),
);
const areaCodeByCity = memo(() =>
  groupBy(AREA_CODES, (e) => e.cities.map(key)),
);
const areaCodesByProvince = memo(() =>
  groupBy(AREA_CODES, (entry) => [
    ...new Set(
      entry.cities
        .map((name) => cityByKey().get(key(name))?.province)
        .filter((p): p is Province => p !== undefined),
    ),
  ]),
);
const postalByCity = memo(() =>
  groupBy(POSTAL_CODES, (entry) => [key(entry.city)]),
);
const districtByKey = memo(
  () =>
    new Map(DISTRICTS.map((entry) => [key(entry.district), entry.district])),
);

/** Finds a city in cities.json (case-insensitive). Throws if unknown. */
export function resolveCity(value: string): CityEntry {
  const found = cityByKey().get(key(value));
  if (!found) {
    throw new RangeError(`Unknown city: ${value}`);
  }
  return found;
}

/** Cities of a province. */
export function citiesIn(province: Province): CityEntry[] {
  return citiesByProvince().get(province) ?? [];
}

/** Area code entry serving a city (case-insensitive), if any. */
export function areaCodeFor(city: string): AreaCodeEntry | undefined {
  return areaCodeByCity().get(key(city))?.[0];
}

/** Area codes serving at least one city of a province. */
export function areaCodesIn(province: Province): AreaCodeEntry[] {
  return areaCodesByProvince().get(province) ?? [];
}

/** Postal entries for a city. */
export function postalEntriesFor(city: string): PostalEntry[] {
  return postalByCity().get(key(city)) ?? [];
}

/** District with the same name as the city, if there is one. */
export function districtFor(city: string): string | undefined {
  return districtByKey().get(key(city));
}

/** Province of a city according to cities.json. */
export function provinceOfCity(city: string): Province | undefined {
  return cityByKey().get(key(city))?.province;
}
