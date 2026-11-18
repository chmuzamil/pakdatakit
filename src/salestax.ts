import ratesData from '../data/sales-tax-rates.json';
import { divideHalfUp, fromPaisa, toUnits } from './internal/money.js';
import { normalizeKey } from './internal/normalize.js';

/** What is taxed: goods (federal sales tax) or services (provincial or ICT). */
export type SalesTaxKind = 'goods' | 'services';

/** One standard rate and the period it applied. */
export interface SalesTaxRate {
  kind: SalesTaxKind;
  /** `FBR`, `PRA`, `SRB`, `KPRA` or `BRA`. FBR also collects ICT's tax on services. */
  authority: string;
  /** For services: the province or `Islamabad Capital Territory`. `null` for goods. */
  province: string | null;
  /** Percent, e.g. `18`. */
  rate: number;
  /** First day it applied (`YYYY-MM-DD`). Coverage starts on 1 July 2019. */
  from: string;
  /** Last day it applied, or `null` if it still applies. */
  to: string | null;
  /** The law that sets it. */
  law: string;
  /** Official document. */
  source: string;
}

/** Options for {@link getSalesTaxRate}. */
export interface SalesTaxRateQuery {
  kind: SalesTaxKind;
  /**
   * For services: Punjab, Sindh, Khyber Pakhtunkhwa (`KP`, `KPK`),
   * Balochistan or Islamabad Capital Territory (`ICT`, `Islamabad`). For
   * goods it may be left out; Azad Jammu and Kashmir and Gilgit-Baltistan
   * return `null`.
   */
  province?: string;
  /** `YYYY-MM-DD` or a `Date` (its local calendar date). Defaults to today. */
  date?: string | Date;
}

/** Result of {@link calculateSalesTax} and {@link splitInclusive}. */
export interface SalesTaxAmounts {
  /** Value excluding tax, in rupees (2 decimals at most). */
  net: number;
  tax: number;
  /** Value including tax. */
  gross: number;
  /** Percent used. */
  rate: number;
}

/** Options for {@link calculateSalesTax}: a `rate`, or a `province`/`kind` to look one up. */
export interface SalesTaxOptions {
  /** Percent, 0 to 100, at most 2 decimals. Takes precedence over `province`. */
  rate?: number;
  province?: string;
  /** Defaults to `services` when a province is given. */
  kind?: SalesTaxKind;
  date?: string | Date;
  /** `true` if `amount` already includes the tax. */
  inclusive?: boolean;
}

const RATES = ratesData as SalesTaxRate[];

const PROVINCES: Readonly<Record<string, string>> = {
  punjab: 'Punjab',
  sindh: 'Sindh',
  'khyber pakhtunkhwa': 'Khyber Pakhtunkhwa',
  kp: 'Khyber Pakhtunkhwa',
  kpk: 'Khyber Pakhtunkhwa',
  balochistan: 'Balochistan',
  baluchistan: 'Balochistan',
  'islamabad capital territory': 'Islamabad Capital Territory',
  ict: 'Islamabad Capital Territory',
  islamabad: 'Islamabad Capital Territory',
  'azad jammu and kashmir': 'Azad Jammu and Kashmir',
  ajk: 'Azad Jammu and Kashmir',
  'gilgit-baltistan': 'Gilgit-Baltistan',
  'gilgit baltistan': 'Gilgit-Baltistan',
  gb: 'Gilgit-Baltistan',
};

/** Provinces outside the federal Sales Tax Act's territory. */
const OUTSIDE_FEDERAL = new Set(['Azad Jammu and Kashmir', 'Gilgit-Baltistan']);

function provinceName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const key = normalizeKey(input);
  return Object.prototype.hasOwnProperty.call(PROVINCES, key)
    ? (PROVINCES[key] as string)
    : null;
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** `YYYY-MM-DD` for a valid calendar date, otherwise `null`. */
function isoDate(input: unknown): string | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return `${pad(input.getFullYear(), 4)}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`;
  }
  if (typeof input !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > (days[m - 1] as number)) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Returns the standard sales tax rate for goods (federal, Sales Tax Act
 * 1990) or for services in a province or Islamabad Capital Territory, on a
 * given date.
 *
 * Only standard rates are covered, from 1 July 2019. Reduced, higher and
 * sector rates (telecom, restaurants paid by card, Third Schedule goods and
 * so on) are not. Every rate comes from the authority's own Act or Finance
 * Act; see DATA.md.
 *
 * @returns The rate and its source, or `null` for an unknown province or
 *   kind, an invalid date, or a date before 1 July 2019. Never throws.
 *
 * @example
 * getSalesTaxRate({ kind: 'goods', date: '2026-11-18' })?.rate; // 18
 * getSalesTaxRate({ kind: 'services', province: 'Sindh', date: '2024-06-30' })?.rate; // 13
 */
export function getSalesTaxRate(query: SalesTaxRateQuery): SalesTaxRate | null {
  if (query === null || typeof query !== 'object') return null;
  const { kind } = query;
  if (kind !== 'goods' && kind !== 'services') return null;
  const date =
    query.date === undefined ? isoDate(new Date()) : isoDate(query.date);
  if (date === null) return null;

  let province: string | null = null;
  if (query.province !== undefined && query.province !== null) {
    province = provinceName(query.province);
    if (province === null) return null;
  }
  if (kind === 'goods') {
    if (province !== null && OUTSIDE_FEDERAL.has(province)) return null;
  } else if (province === null) {
    return null;
  }

  const entry = RATES.find(
    (r) =>
      r.kind === kind &&
      (kind === 'goods' || r.province === province) &&
      r.from <= date &&
      (r.to === null || date <= r.to),
  );
  return entry ? { ...entry } : null;
}

/** Basis points (hundredths of a percent) for a rate from 0 to 100 with at most 2 decimals. */
function basisPoints(rate: unknown): number | null {
  if (
    typeof rate !== 'number' ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 100
  ) {
    return null;
  }
  const exact = toUnits(rate, 4); // ten-thousandths of a percent
  if (exact === null || exact % 100 !== 0) return null;
  return exact / 100;
}

function amounts(
  netPaisa: number,
  taxPaisa: number,
  bp: number,
): SalesTaxAmounts {
  return {
    net: fromPaisa(netPaisa),
    tax: fromPaisa(taxPaisa),
    gross: fromPaisa(netPaisa + taxPaisa),
    rate: bp / 100,
  };
}

/**
 * Splits an amount that includes sales tax into its value and tax.
 *
 * The value is rounded half up to the paisa, and the tax is the rest, so
 * `net + tax` is always `gross`.
 *
 * @param gross - Amount including tax, 0 to 1 trillion rupees
 * @param rate - Percent, 0 to 100, at most 2 decimals
 * @returns The split, or `null` for an invalid amount or rate. Never throws.
 *
 * @example
 * splitInclusive(1180, 18); // { net: 1000, tax: 180, gross: 1180, rate: 18 }
 */
export function splitInclusive(
  gross: number,
  rate: number,
): SalesTaxAmounts | null {
  const grossPaisa = toUnits(gross, 2);
  const bp = basisPoints(rate);
  if (grossPaisa === null || bp === null) return null;
  const netPaisa = divideHalfUp(
    BigInt(grossPaisa) * 10000n,
    BigInt(10000 + bp),
  );
  return amounts(netPaisa, grossPaisa - netPaisa, bp);
}

/**
 * Adds sales tax to an amount, or splits it out when `inclusive` is set.
 *
 * Give a `rate`, or a `province` (and `kind`, default `services`, and
 * `date`) to use the standard rate from {@link getSalesTaxRate}. The tax is
 * rounded half up to the paisa.
 *
 * @param amount - 0 to 1 trillion rupees
 * @returns The amounts, or `null` if the amount, rate or province is
 *   invalid or no rate applies. Never throws.
 *
 * @example
 * calculateSalesTax(1000, { rate: 18 }); // { net: 1000, tax: 180, gross: 1180, rate: 18 }
 * calculateSalesTax(1000, { province: 'Punjab', date: '2026-11-18' }); // { net: 1000, tax: 160, gross: 1160, rate: 16 }
 * calculateSalesTax(1150, { province: 'Sindh', date: '2026-11-18', inclusive: true }); // { net: 1000, tax: 150, gross: 1150, rate: 15 }
 */
export function calculateSalesTax(
  amount: number,
  options: SalesTaxOptions,
): SalesTaxAmounts | null {
  if (options === null || typeof options !== 'object') return null;
  let rate: number;
  if (options.rate !== undefined && options.rate !== null) {
    rate = options.rate;
  } else {
    const kind =
      options.kind ?? (options.province !== undefined ? 'services' : undefined);
    if (kind === undefined) return null;
    const found = getSalesTaxRate({
      kind,
      ...(options.province !== undefined ? { province: options.province } : {}),
      ...(options.date !== undefined ? { date: options.date } : {}),
    });
    if (found === null) return null;
    rate = found.rate;
  }
  if (options.inclusive === true) return splitInclusive(amount, rate);

  const netPaisa = toUnits(amount, 2);
  const bp = basisPoints(rate);
  if (netPaisa === null || bp === null) return null;
  const taxPaisa = divideHalfUp(BigInt(netPaisa) * BigInt(bp), 10000n);
  return amounts(netPaisa, taxPaisa, bp);
}
