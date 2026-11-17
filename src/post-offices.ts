import postOfficesData from '../data/post-offices.json';
import { lazy, normalizeKey } from './internal/normalize.js';

/** A delivery post office from Pakistan Post's post code directory. */
export interface PostOffice {
  /** 5-digit post code, e.g. `48330`. */
  code: string;
  /** Office name as the directory gives it, in title case, e.g. `Dulmial`. */
  office: string;
  /**
   * The city the office belongs to when that is known (`Lahore` for an office
   * in Lahore); otherwise the office's own name, which for most offices is
   * its town or village.
   */
  town: string;
  /**
   * The district, when the town is the headquarters a district is named
   * after; otherwise `null`. The directory has no district column.
   */
  district: string | null;
  /** Province or territory. */
  province: string;
}

const POST_OFFICES = postOfficesData as PostOffice[];

const byCode = /* @__PURE__ */ lazy(
  () => new Map(POST_OFFICES.map((office) => [office.code, office])),
);

const copy = (office: PostOffice): PostOffice => ({ ...office });

/**
 * Returns the delivery post office for a post code, from Pakistan Post's
 * directory of about 2,560 offices.
 *
 * Unlike `getCityByPostalCode`, which only answers for codes in the cities
 * pakdatakit lists, this knows every delivery office, including those in
 * towns and villages.
 *
 * @param code - Post code (whitespace is ignored)
 * @returns The post office, or `null` if the code is not in the directory
 *
 * @example
 * getPostOffice('48330');
 * // { code: '48330', office: 'Dulmial', town: 'Dulmial', district: null, province: 'Punjab' }
 */
export function getPostOffice(code: string): PostOffice | null {
  const key = code.trim().replace(/\s+/g, '');
  if (key.length === 0) {
    return null;
  }
  const office = byCode().get(key);
  return office ? copy(office) : null;
}

/**
 * Searches Pakistan Post's directory by office name, town or post code.
 *
 * Matching is case-insensitive: an office matches when its name or town
 * contains the query, or its code starts with it.
 *
 * @param query - Partial office name, town or post code
 * @returns Matching post offices, sorted by post code
 */
export function searchPostOffices(query: string): PostOffice[] {
  const key = normalizeKey(query);
  if (key.length === 0) {
    return [];
  }
  const codePrefix = query.trim();
  return POST_OFFICES.filter(
    (office) =>
      normalizeKey(office.office).includes(key) ||
      normalizeKey(office.town).includes(key) ||
      office.code.startsWith(codePrefix),
  ).map(copy);
}
