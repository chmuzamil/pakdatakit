import { toAsciiDigits } from './internal/normalize.js';

/**
 * Validates the format of a Pakistani passport number: two letters followed by
 * seven digits, e.g. `AB1234567`. Case, surrounding spaces and spaces or
 * dashes between the letters and digits are ignored.
 *
 * DGIP does not publish the format, so this checks the common shape only. Two
 * letters and seven digits is the number format given for the 2013 ordinary
 * passport in the EU's PRADO register
 * (https://www.consilium.europa.eu/prado/en/PAK-AO-02003/index.html) and fits
 * the 9-character document-number field of ICAO Doc 9303
 * (https://www.icao.int/publications/Documents/9303_p4_cons_en.pdf). No source
 * was found for later models (2017, 2022 e-passport) or for diplomatic and
 * official passports, which may differ, so treat `false` as "unusual", not
 * "fake". The letters' meaning is not documented and is not checked; the MRZ
 * check digit is not part of the number.
 *
 * @example
 * validatePassport('AB1234567');  // true
 * validatePassport('ab 1234567'); // true
 * validatePassport('A12345678');  // false
 *
 * @param passport - Passport number to validate
 * @returns `true` if the format is valid
 */
export function validatePassport(passport: string): boolean {
  const compact = toAsciiDigits(passport.trim())
    .toUpperCase()
    .replace(/[-‐‑‒–— ]/g, '');
  return /^[A-Z]{2}\d{7}$/.test(compact);
}
