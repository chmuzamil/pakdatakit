import { toAsciiDigits } from './internal/normalize.js';

/**
 * Kind of electricity bill identifier.
 *
 * - `reference`: the 14-digit reference number on a DISCO (WAPDA) bill,
 *   optionally followed by `U` (urban) or `R` (rural).
 * - `customer-id`: the customer ID on a DISCO bill: 10 digits, or 11 for
 *   LESCO.
 * - `k-electric`: a 13-digit K-Electric account number (`04000…`).
 */
export type ElectricityRefType = 'reference' | 'customer-id' | 'k-electric';

/** Result of {@link parseElectricityRef}. */
export interface ElectricityRef {
  type: ElectricityRefType;
  /** The digits, without separators or the U/R letter. */
  digits: string;
  /**
   * Display form: `01 14111 1234567 U` for a reference (2, 5 and 7 digits,
   * as on PITC's bill illustration), the digits for the others.
   */
  formatted: string;
  /** `U` or `R` when given after a reference number, otherwise `null`. */
  urbanRural: 'U' | 'R' | null;
  /**
   * The distribution company. `K-Electric` for a K-Electric account;
   * otherwise always `null`, because no official source maps reference or
   * customer ID digits to a DISCO.
   */
  disco: 'K-Electric' | null;
}

/** Separators people type inside bill numbers. */
const SEPARATORS = /[\s\-‐‑‒–—./]/g;

/**
 * Parses a Pakistani electricity bill identifier: a DISCO reference number,
 * a DISCO customer ID or a K-Electric account number.
 *
 * Formats are those the utilities' own bill pages ask for (retrieved
 * 2026-11-18; see DATA.md): PITC's bill pages take a 14-digit reference
 * number with a separate U/R choice, or a 10-digit customer ID (11 digits
 * for LESCO); K-Electric asks for a "13 digits KE Account Number starting
 * from 04000". No check digit is published, so only the format is checked.
 *
 * Spaces, dashes and dots are ignored, and Urdu digits are accepted.
 *
 * @returns The identifier, or `null` if it matches none of the formats.
 *   Never throws.
 */
export function parseElectricityRef(input: string): ElectricityRef | null {
  if (typeof input !== 'string') return null;
  let text = toAsciiDigits(input).replace(SEPARATORS, '').toUpperCase();
  let urbanRural: 'U' | 'R' | null = null;
  const letter = /^(\d{14})([UR])$/.exec(text);
  if (letter) {
    text = letter[1] as string;
    urbanRural = letter[2] as 'U' | 'R';
  }
  if (!/^\d+$/.test(text)) return null;

  if (text.length === 14) {
    const formatted = `${text.slice(0, 2)} ${text.slice(2, 7)} ${text.slice(7)}`;
    return {
      type: 'reference',
      digits: text,
      formatted: urbanRural ? `${formatted} ${urbanRural}` : formatted,
      urbanRural,
      disco: null,
    };
  }
  if (urbanRural !== null) return null;
  if (text.length === 13 && text.startsWith('04000')) {
    return {
      type: 'k-electric',
      digits: text,
      formatted: text,
      urbanRural: null,
      disco: 'K-Electric',
    };
  }
  if (text.length === 10 || text.length === 11) {
    return {
      type: 'customer-id',
      digits: text,
      formatted: text,
      urbanRural: null,
      disco: null,
    };
  }
  return null;
}

/**
 * Validates a Pakistani electricity bill identifier. See
 * {@link parseElectricityRef}.
 */
export function validateElectricityRef(input: string): boolean {
  return parseElectricityRef(input) !== null;
}

/** A gas company whose consumer number format is published. */
export type GasCompany = 'SNGPL' | 'SSGC';

const GAS_DIGITS: Readonly<Record<GasCompany, number>> = {
  SNGPL: 11,
  SSGC: 10,
};

/**
 * Validates a gas bill consumer number: 11 digits for SNGPL, 10 digits for
 * SSGC, as their bill pages ask for (retrieved 2026-11-18; see DATA.md). No
 * check digit is published, so only the format is checked.
 *
 * @param company - `SNGPL` or `SSGC`; anything else returns `false`
 */
export function validateGasConsumerNumber(
  input: string,
  company: GasCompany,
): boolean {
  if (typeof input !== 'string' || typeof company !== 'string') return false;
  const digits = GAS_DIGITS[company.toUpperCase() as GasCompany];
  if (digits === undefined) return false;
  const text = toAsciiDigits(input).replace(SEPARATORS, '');
  return text.length === digits && /^\d+$/.test(text);
}
