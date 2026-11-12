import { toAsciiDigits } from './internal/normalize.js';

/** Result of {@link parseVehiclePlate}. */
export interface VehiclePlate {
  /** Letters before the number, e.g. `LEA`. */
  series: string;
  /** Digits of the registration number, e.g. `1234`. */
  number: string;
  /** Two-digit year printed on some older Punjab plates, e.g. `19`; otherwise `null`. */
  year: string | null;
  /** Series and number joined with a dash, e.g. `LEA-1234` (without the year). */
  formatted: string;
}

const PLATE = /^([A-Z]{1,4})[-‐‑‒–— ]?(\d{1,4})(?:[-‐‑‒–— /]{1,3}(\d{2}))?$/;

/**
 * Splits a Pakistani vehicle registration number into its series letters,
 * number and optional year, e.g. `LEA-1234` or `ABC 123`.
 *
 * There is no single national format: each province's excise department sets
 * its own, and several changed in 2024–2026 (numbers that stay with the
 * owner, new series). This accepts the common shape shared by all of them:
 * 1–4 letters, then 1–4 digits, optionally followed by the two-digit year
 * that older Punjab plates carry (`LEA-1234-19`). Series letters are not
 * checked against a list of districts, as no official list is published.
 * Pass the registration number only, without labels such as "ICT" or
 * "PUNJAB" printed elsewhere on the plate. Sources: see DATA.md.
 *
 * @example
 * parseVehiclePlate('lea 1234');
 * // { series: 'LEA', number: '1234', year: null, formatted: 'LEA-1234' }
 *
 * @param plate - Registration number as written on the plate
 * @returns The parts, or `null` if it does not have the common shape
 */
export function parseVehiclePlate(plate: string): VehiclePlate | null {
  const match = PLATE.exec(toAsciiDigits(plate.trim()).toUpperCase());
  if (!match) {
    return null;
  }

  const [, series, number, year] = match as unknown as [
    string,
    string,
    string,
    string | undefined,
  ];
  return {
    series,
    number,
    year: year ?? null,
    formatted: `${series}-${number}`,
  };
}

/**
 * Validates the format of a Pakistani vehicle registration number. Checks the
 * common shape only; see {@link parseVehiclePlate}.
 *
 * @param plate - Registration number to validate
 * @returns `true` if the format is valid
 */
export function validateVehiclePlate(plate: string): boolean {
  return parseVehiclePlate(plate) !== null;
}
