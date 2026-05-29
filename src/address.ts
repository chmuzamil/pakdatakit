import citiesData from '../data/cities.json';
import districtsData from '../data/districts.json';
import { getCityByPostalCode, getPostalCode } from './postal.js';
import { getDistrictProvince, getProvince } from './geo.js';
import { normalizeKey, normalizeWhitespace } from './internal/normalize.js';

interface CityEntry {
  city: string;
  province: string;
}

interface DistrictEntry {
  district: string;
  province: string;
}

const CITY_NAMES = (citiesData as CityEntry[])
  .map((entry) => entry.city)
  .sort((a, b) => b.length - a.length);

const DISTRICT_NAMES = (districtsData as DistrictEntry[])
  .map((entry) => entry.district)
  .sort((a, b) => b.length - a.length);

const PROVINCES = [
  'Islamabad Capital Territory',
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Punjab',
  'Sindh',
];

/** Parsed components of a Pakistani mailing address. */
export interface ParsedAddress {
  raw: string;
  street: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
}

/**
 * Parses a free-form Pakistani address into structured components.
 *
 * Extracts postal codes, matches known cities/districts/provinces from datasets,
 * and assigns remaining segments to street and area fields.
 *
 * @param address - Raw address string
 * @returns Structured address components
 */
export function parseAddress(address: string): ParsedAddress {
  const raw = normalizeWhitespace(address);
  if (raw.length === 0) {
    return emptyParsedAddress(raw);
  }

  let working = raw;
  let postalCode: string | null = null;

  const postalMatch = working.match(/\b(\d{5})\b/);
  if (postalMatch?.[1]) {
    postalCode = postalMatch[1];
    working = working.replace(postalMatch[0], ' ').trim();
  }

  const segments = working
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 0);

  const consumed = new Set<number>();
  let province: string | null = null;
  let city: string | null = null;
  let district: string | null = null;

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i];
    if (segment === undefined || consumed.has(i)) {
      continue;
    }

    if (province === null) {
      const matchedProvince = matchFromList(segment, PROVINCES);
      if (matchedProvince) {
        province = matchedProvince;
        consumed.add(i);
        continue;
      }
    }

    if (city === null) {
      const matchedCity = matchFromList(segment, CITY_NAMES);
      if (matchedCity) {
        city = matchedCity;
        consumed.add(i);
        continue;
      }
    }

    if (district === null) {
      const matchedDistrict = matchFromList(segment, DISTRICT_NAMES);
      if (matchedDistrict) {
        district = matchedDistrict;
        if (city === null) {
          city = matchedDistrict;
        }
        consumed.add(i);
      }
    }
  }

  if (postalCode !== null && city === null) {
    city = getCityByPostalCode(postalCode);
  }

  if (city !== null && province === null) {
    province = getProvince(city) ?? getDistrictProvince(city);
  }

  if (district !== null && province === null) {
    province = getDistrictProvince(district);
  }

  const remaining = segments.filter((_, index) => !consumed.has(index));
  const street = remaining.length > 0 ? (remaining[0] ?? null) : null;
  const area =
    remaining.length > 1 ? remaining.slice(1).join(', ') : null;

  return {
    raw,
    street,
    area,
    city,
    district,
    province,
    postalCode,
  };
}

/**
 * Formats structured address components into a single mailing line.
 *
 * @param parts - Address components to format
 * @returns Formatted address string
 */
export function formatAddress(parts: ParsedAddress): string {
  const segments: string[] = [];

  if (parts.street) {
    segments.push(parts.street);
  }
  if (parts.area) {
    segments.push(parts.area);
  }
  if (parts.city) {
    segments.push(parts.city);
  } else if (parts.district) {
    segments.push(parts.district);
  }
  if (parts.province) {
    segments.push(parts.province);
  }

  let formatted = segments.join(', ');

  const postal =
    parts.postalCode ??
    (parts.city ? getPostalCode(parts.city) : null);

  if (postal) {
    formatted = formatted.length > 0 ? `${formatted} ${postal}` : postal;
  }

  return formatted.length > 0 ? formatted : parts.raw;
}

function emptyParsedAddress(raw: string): ParsedAddress {
  return {
    raw,
    street: null,
    area: null,
    city: null,
    district: null,
    province: null,
    postalCode: null,
  };
}

function matchFromList(segment: string, options: string[]): string | null {
  const key = normalizeKey(segment);
  for (const option of options) {
    if (normalizeKey(option) === key) {
      return option;
    }
  }
  return null;
}
