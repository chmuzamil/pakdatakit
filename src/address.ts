import citiesData from '../data/cities.json';
import districtsData from '../data/districts.json';
import { getCityByPostalCode } from './postal.js';
import { getDistrictProvince, getProvince } from './geo.js';
import { lazy, normalizeKey, normalizeWhitespace } from './internal/normalize.js';

interface CityEntry {
  city: string;
  province: string;
}

interface DistrictEntry {
  district: string;
  province: string;
}

/** Longest names first so "Dera Ghazi Khan" wins over "Ghazi". */
function byLengthDesc(a: string, b: string): number {
  return b.length - a.length;
}

const cityNames = lazy(() =>
  (citiesData as CityEntry[]).map((entry) => entry.city).sort(byLengthDesc),
);

const districtNames = lazy(() =>
  (districtsData as DistrictEntry[])
    .map((entry) => entry.district)
    .sort(byLengthDesc),
);

const PROVINCES = [
  'Islamabad Capital Territory',
  'Azad Jammu and Kashmir',
  'Gilgit-Baltistan',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Punjab',
  'Sindh',
];

/** Words that mark a following 5-digit number as something other than a postal code. */
const NON_POSTAL_PREFIX =
  /(?:\b(?:p\.?\s*o\.?\s*box|box|house|h\.?\s*no\.?|plot|street|st\.?|flat|shop|office|suite|no\.?)|#)\s*$/i;

/** Parsed components of a Pakistani mailing address. */
export interface ParsedAddress {
  raw: string;
  street: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  /** Inconsistencies found while parsing, e.g. a city in a different province. */
  warnings: string[];
}

/**
 * Parses a free-form Pakistani address into structured components.
 *
 * Extracts postal codes, matches known cities/districts/provinces from datasets,
 * and assigns remaining segments to street and area fields. Works with or
 * without commas between components.
 *
 * @param address - Raw address string
 * @returns Structured address components
 */
export function parseAddress(address: string): ParsedAddress {
  const raw = normalizeWhitespace(address);
  if (raw.length === 0) {
    return emptyParsedAddress(raw);
  }

  const warnings: string[] = [];
  let working = raw;
  const postalMatch = findPostalCode(working);
  const postalCode = postalMatch?.code ?? null;
  if (postalMatch) {
    working =
      working.slice(0, postalMatch.index) +
      ' ' +
      working.slice(postalMatch.index + postalMatch.code.length);
  }

  const segments = working
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length > 0);

  let province: string | null = null;
  let city: string | null = null;
  let district: string | null = null;

  // Match whole segments first, from the end of the address.
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i] as string;

    const matchedProvince: string | null =
      province === null ? matchExact(segment, PROVINCES) : null;
    if (matchedProvince) {
      province = matchedProvince;
      segments[i] = '';
      continue;
    }

    const matchedCity: string | null = city === null ? matchExact(segment, cityNames()) : null;
    if (matchedCity) {
      city = matchedCity;
      segments[i] = '';
      continue;
    }

    const matchedDistrict: string | null =
      district === null ? matchExact(segment, districtNames()) : null;
    if (matchedDistrict) {
      district = matchedDistrict;
      segments[i] = '';
    }
  }

  // Then look for names at the end of a segment ("12 Model Town Lahore").
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (province === null) {
      const found = matchTrailing(segments[i] as string, PROVINCES);
      if (found) {
        province = found.match;
        segments[i] = found.rest;
      }
    }
    if (city === null) {
      const found = matchTrailing(segments[i] as string, cityNames());
      if (found) {
        city = found.match;
        segments[i] = found.rest;
      }
    }
  }

  if (city === null && district !== null) {
    city = district;
  }

  if (postalCode !== null && city === null) {
    city = getCityByPostalCode(postalCode);
  }

  const inferredProvince =
    city !== null
      ? (getProvince(city) ?? getDistrictProvince(city))
      : district !== null
        ? getDistrictProvince(district)
        : null;

  if (province === null) {
    province = inferredProvince;
  } else if (inferredProvince !== null && inferredProvince !== province) {
    warnings.push(
      `${city ?? district} is in ${inferredProvince}, but the address says ${province}`,
    );
  }

  const remaining = segments.filter((part) => part.length > 0);
  const street = remaining[0] ?? null;
  const area = remaining.length > 1 ? remaining.slice(1).join(', ') : null;

  return {
    raw,
    street,
    area,
    city,
    district,
    province,
    postalCode,
    warnings,
  };
}

/**
 * Formats structured address components into a single mailing line.
 *
 * Only the components provided are included; no postal code is invented.
 *
 * @param parts - Address components to format
 * @returns Formatted address string
 */
export function formatAddress(
  parts: Partial<ParsedAddress> & { raw?: string },
): string {
  const segments = [
    parts.street,
    parts.area,
    parts.city ?? parts.district,
    parts.province,
  ].filter((part): part is string => typeof part === 'string' && part.length > 0);

  let formatted = segments.join(', ');

  if (parts.postalCode) {
    formatted =
      formatted.length > 0
        ? `${formatted} ${parts.postalCode}`
        : parts.postalCode;
  }

  return formatted.length > 0 ? formatted : (parts.raw ?? '');
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
    warnings: [],
  };
}

/**
 * Finds the last standalone 5-digit number that is not a house, plot, box or
 * street number.
 */
function findPostalCode(
  text: string,
): { code: string; index: number } | null {
  let result: { code: string; index: number } | null = null;
  for (const match of text.matchAll(/(?<![\w#/-])([1-9]\d{4})(?![\w/-])/g)) {
    const before = text.slice(0, match.index);
    if (!NON_POSTAL_PREFIX.test(before)) {
      result = { code: match[1] as string, index: match.index };
    }
  }
  return result;
}

function matchExact(segment: string, options: string[]): string | null {
  const key = normalizeKey(segment);
  if (key.length === 0) {
    return null;
  }
  return options.find((option) => normalizeKey(option) === key) ?? null;
}

function matchTrailing(
  segment: string,
  options: string[],
): { match: string; rest: string } | null {
  const key = normalizeKey(segment);
  for (const option of options) {
    const optionKey = normalizeKey(option);
    if (key.endsWith(` ${optionKey}`)) {
      return {
        match: option,
        rest: normalizeWhitespace(segment.slice(0, segment.length - option.length)),
      };
    }
  }
  return null;
}
