import { useMemo } from 'react';
import {
  getDistrictsByProvince,
  getProvince,
  getTehsils,
  searchCities,
} from 'pakdatakit/geo';
import { PAK_PROVINCES } from './rules.js';

/** The location part of the form values. */
export interface PakLocationValues {
  province: string;
  district: string;
  tehsil: string;
  city: string;
}

/** Options for {@link useLocationOptions}. */
export interface UseLocationOptionsInput {
  province?: string | undefined;
  district?: string | undefined;
  /** What the user has typed in the city field; suggestions match it. */
  cityQuery?: string | undefined;
  /** Look up tehsils of the district (default `true`). */
  tehsil?: boolean | undefined;
  /** Most city suggestions to return (default 20). */
  maxCities?: number | undefined;
}

/** Choices for the location fields. */
export interface LocationOptions {
  /** The 7 provinces and territories. */
  provinces: readonly string[];
  /** Districts of the province (empty without a province). */
  districts: string[];
  /** Tehsils of the district (empty without a district or when off). */
  tehsils: string[];
  /** Cities in the province matching `cityQuery` (empty without both). */
  cities: string[];
}

/** Cities in `province` whose name matches `query`. */
export function suggestCities(
  query: string,
  province: string,
  max = 20,
): string[] {
  const q = query.trim();
  if (!q || !province) return [];
  const out: string[] = [];
  for (const city of searchCities(q)) {
    if (getProvince(city) === province) {
      out.push(city);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * Province, district, tehsil and city choices for a cascading address form,
 * from pakdatakit's geo data. There is no official city-to-district mapping,
 * so cities are suggestions for a text field, limited to the province.
 *
 * @example
 * const { provinces, districts, tehsils, cities } = useLocationOptions({
 *   province: watch('province'), district: watch('district'), cityQuery: watch('city'),
 * });
 */
export function useLocationOptions(
  input: UseLocationOptionsInput = {},
): LocationOptions {
  const province = input.province ?? '';
  const district = input.district ?? '';
  const cityQuery = input.cityQuery ?? '';
  const withTehsil = input.tehsil ?? true;
  const maxCities = input.maxCities ?? 20;

  const districts = useMemo(
    () => (province ? getDistrictsByProvince(province) : []),
    [province],
  );
  const tehsils = useMemo(
    () => (withTehsil && district ? getTehsils(district) : []),
    [withTehsil, district],
  );
  const cities = useMemo(
    () => suggestCities(cityQuery, province, maxCities),
    [cityQuery, province, maxCities],
  );
  return { provinces: PAK_PROVINCES, districts, tehsils, cities };
}

/**
 * Applies a change to one location field and clears the fields that depend
 * on it: a new province clears district, tehsil and city; a new district
 * clears tehsil.
 *
 * @example
 * setValues((v) => applyLocationChange(v, 'province', 'Sindh'));
 */
export function applyLocationChange<T extends PakLocationValues>(
  values: T,
  field: keyof PakLocationValues,
  value: string,
): T {
  if (values[field] === value) return values;
  const next = { ...values, [field]: value };
  if (field === 'province') {
    next.district = '';
    next.tehsil = '';
    next.city = '';
  } else if (field === 'district') {
    next.tehsil = '';
  }
  return next;
}
