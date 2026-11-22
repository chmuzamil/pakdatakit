import districtData from '../data/district-population.json';
import tehsilData from '../data/tehsil-population.json';
import type { DataSource } from './data-info.js';
import { lazy, normalizeKey } from './internal/normalize.js';

/** Census 2023 counts for a district or tehsil. */
export interface CensusCounts {
  /** Total population (all sexes), or `null` where the census has no figure. */
  population: number | null;
  /** Households, or `null`. */
  households: number | null;
  /** Urban population, or `null`. */
  urban: number | null;
  /** Rural population, or `null`. */
  rural: number | null;
  /** Always `2023`: the 7th Population and Housing Census. */
  census: 2023;
  source: DataSource;
}

/** Result of {@link getDistrictPopulation}. */
export interface DistrictPopulation extends CensusCounts {
  district: string;
  province: string;
  /**
   * The census district the figures belong to. For a district created after
   * the census, the one its area was part of (its own figures are `null`);
   * `null` in Gilgit-Baltistan and Azad Jammu and Kashmir, which the census
   * did not cover.
   */
  censusDistrict: string | null;
  /**
   * `true` when the district has lost area to a district created after the
   * census: the figures are for the district as it was at the census.
   */
  boundaryChanged: boolean;
  /** Why figures are missing or what they cover, or `null`. */
  note: string | null;
}

/** Result of {@link getTehsilPopulation}. */
export interface TehsilPopulation extends CensusCounts {
  tehsil: string;
  /** The district at the census. */
  censusDistrict: string;
  /** The district today. */
  currentDistrict: string;
  province: string;
  note: string | null;
}

interface DistrictRow {
  district: string;
  province: string;
  population: number | null;
  households: number | null;
  urban: number | null;
  rural: number | null;
  inCensusDistrict: string | null;
  boundaryChanged: boolean;
  note: string | null;
}

/*
 * The data files call the census district `inCensusDistrict`, so that they
 * are not mistaken for tehsils.json (whose marker in scripts/check-size.mjs
 * is `censusDistrict`).
 */
interface TehsilRow {
  tehsil: string;
  inCensusDistrict: string;
  currentDistrict: string;
  province: string;
  population: number;
  households: number;
  urban: number;
  rural: number;
  note: string | null;
}

const SOURCE = {
  effectiveFrom: '2023-03-01',
  effectiveTo: null,
  sourceReference:
    '7th Population and Housing Census 2023, Table 1 (population, urban and rural) and Table 20 (households)',
  sourceUrl: 'https://www.pbs.gov.pk/result-excel/',
};

const districts = /* @__PURE__ */ lazy(() => {
  const map = new Map<string, DistrictRow>();
  for (const row of districtData as DistrictRow[])
    map.set(normalizeKey(row.district), row);
  return map;
});

const tehsils = /* @__PURE__ */ lazy(() => {
  const map = new Map<string, TehsilRow[]>();
  for (const row of tehsilData as TehsilRow[]) {
    const key = normalizeKey(row.tehsil);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
});

/**
 * A district's population, households and urban/rural split from Pakistan's
 * 2023 census (Pakistan Bureau of Statistics), for any of the 177 districts
 * in {@link getDistrictsByProvince}.
 *
 * - Districts created after the census have `null` figures and name the
 *   census district their area was part of; nothing is estimated.
 * - Districts that lost area to a new district keep their census figures,
 *   with `boundaryChanged: true`.
 * - Gilgit-Baltistan and Azad Jammu and Kashmir were not enumerated by this
 *   census, so their figures are `null`.
 *
 * @param district - A district name, in any case
 * @returns The figures and their source, or `null` for an unknown
 *   district. Never throws.
 *
 * @example
 * getDistrictPopulation('Lahore')?.population; // 13004135
 * getDistrictPopulation('Murree')?.population; // null (created after the census)
 */
export function getDistrictPopulation(
  district: string,
): DistrictPopulation | null {
  if (typeof district !== 'string') return null;
  const row = districts().get(normalizeKey(district));
  if (!row) return null;
  return {
    district: row.district,
    province: row.province,
    population: row.population,
    households: row.households,
    urban: row.urban,
    rural: row.rural,
    census: 2023,
    censusDistrict: row.inCensusDistrict,
    boundaryChanged: row.boundaryChanged,
    note: row.note,
    source: { id: 'district-population', ...SOURCE },
  };
}

/**
 * A tehsil's (or taluka's, sub-division's) population, households and
 * urban/rural split from the 2023 census, for the 591 units in the census
 * tables. A few names occur in more than one district; give the district
 * (at the census or today) to choose.
 *
 * @param tehsil - A tehsil name, in any case
 * @param district - Its district, needed only when the name is not unique
 * @returns The figures and their source, or `null` for an unknown or
 *   ambiguous name. Never throws.
 *
 * @example
 * getTehsilPopulation('Murree')?.currentDistrict; // 'Murree'
 */
export function getTehsilPopulation(
  tehsil: string,
  district?: string,
): TehsilPopulation | null {
  if (typeof tehsil !== 'string') return null;
  let rows = tehsils().get(normalizeKey(tehsil)) ?? [];
  if (typeof district === 'string') {
    const d = normalizeKey(district);
    rows = rows.filter(
      (r) =>
        normalizeKey(r.inCensusDistrict) === d ||
        normalizeKey(r.currentDistrict) === d,
    );
  }
  if (rows.length !== 1) return null;
  const row = rows[0] as TehsilRow;
  return {
    tehsil: row.tehsil,
    censusDistrict: row.inCensusDistrict,
    currentDistrict: row.currentDistrict,
    province: row.province,
    population: row.population,
    households: row.households,
    urban: row.urban,
    rural: row.rural,
    census: 2023,
    note: row.note,
    source: { id: 'tehsil-population', ...SOURCE },
  };
}
