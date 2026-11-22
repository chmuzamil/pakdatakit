import slabsData from '../data/income-tax-slabs.json';
import type { DataSource } from './data-info.js';
import { isoDate } from './internal/date.js';
import { divideHalfUp, fromPaisa, toUnits } from './internal/money.js';

/**
 * One band of the salaried rate table: income above `over` (and up to
 * `upTo`) pays `fixed` plus `rate` percent of the amount above `over`.
 */
export interface SalaryTaxSlab {
  /** Lower bound in rupees (income must exceed it). */
  over: number;
  /** Upper bound in rupees, or `null` for the top band. */
  upTo: number | null;
  /** Tax on the income up to `over`, in rupees. */
  fixed: number;
  /** Percent of the income above `over`. */
  rate: number;
}

/**
 * The surcharge under section 4AB of the Income Tax Ordinance: `rate`
 * percent of the tax from the rate table, payable when taxable income
 * exceeds `over` rupees.
 */
export interface SalaryTaxSurcharge {
  /** Percent of the tax from the rate table. `0` where the law sets none. */
  rate: number;
  /** Taxable income must exceed this many rupees (Rs 10 million). */
  over: number;
  /** The law that sets it. */
  law: string;
  /** Official document. */
  source: string;
}

/** The salaried rate table for one tax year (1 July to 30 June). */
export interface SalaryTaxYear {
  /** The tax year, named after the June it ends in: 2026 is 1 July 2025 to 30 June 2026. */
  taxYear: number;
  /** `YYYY-MM-DD`, always 1 July. */
  from: string;
  /** `YYYY-MM-DD`, always 30 June. */
  to: string;
  /** The law that sets the table. */
  law: string;
  /** Official document. */
  source: string;
  slabs: SalaryTaxSlab[];
  /**
   * The section 4AB surcharge on salaried individuals for the year, or
   * `null` for years before it existed (tax years up to 2024).
   */
  surcharge: SalaryTaxSurcharge | null;
}

/** Options for {@link calculateSalaryTax} and {@link calculateMonthlySalaryTax}. */
export interface SalaryTaxOptions {
  /** Tax year, e.g. `2026`. Takes precedence over `date`. */
  taxYear?: number;
  /** A day in the tax year (`YYYY-MM-DD` or a `Date`). Defaults to today. */
  date?: string | Date;
  /**
   * Add the section 4AB surcharge (tax years 2025 and 2026, above Rs 10
   * million). Default `false` in 2.x, so existing results do not change; it
   * will default to `true` in 3.0.
   */
  includeSurcharge?: boolean;
}

/** Result of {@link calculateSalaryTax}. */
export interface SalaryTax {
  /** Tax for the year from the rate table, in rupees, rounded half up to the paisa. */
  tax: number;
  /**
   * The section 4AB surcharge, rounded half up to the paisa. `0` unless
   * `includeSurcharge` is set and the year and income attract one.
   */
  surcharge: number;
  /** `tax + surcharge`: the year's total. */
  total: number;
  /** `total / 12`, rounded half up to the paisa. */
  monthly: number;
  /** `total` as a percent of the income, rounded half up to 2 decimals. */
  effectiveRate: number;
  /** The band the income falls in. */
  slab: SalaryTaxSlab;
  taxYear: number;
  /** The rate table used: its tax year's dates, law and official source. */
  source: DataSource;
}

const YEARS = slabsData as SalaryTaxYear[];

/** The tax year (July to June) that contains a date, or `null` for an invalid date. */
export function getTaxYear(date?: string | Date): number | null {
  const iso = date === undefined ? isoDate(new Date()) : isoDate(date);
  if (iso === null) return null;
  const year = Number(iso.slice(0, 4));
  return Number(iso.slice(5, 7)) >= 7 ? year + 1 : year;
}

function findYear(options: unknown): SalaryTaxYear | null {
  let taxYear: number | null;
  if (options === undefined || options === null) {
    taxYear = getTaxYear();
  } else if (typeof options !== 'object') {
    return null;
  } else {
    const { taxYear: given, date } = options as SalaryTaxOptions;
    if (given !== undefined && given !== null) {
      if (typeof given !== 'number' || !Number.isInteger(given)) return null;
      taxYear = given;
    } else {
      taxYear =
        date === undefined || date === null ? getTaxYear() : getTaxYear(date);
    }
  }
  return YEARS.find((y) => y.taxYear === taxYear) ?? null;
}

const copyYear = (year: SalaryTaxYear): SalaryTaxYear => ({
  ...year,
  slabs: year.slabs.map((slab) => ({ ...slab })),
  surcharge: year.surcharge === null ? null : { ...year.surcharge },
});

/**
 * Returns the salaried rate table for a tax year: Division I of Part I of
 * the First Schedule to the Income Tax Ordinance 2001, clause (2), which
 * applies when salary is more than 75% of taxable income.
 *
 * Covers tax years 2020 to 2027, each from FBR's consolidated Ordinance.
 *
 * @param taxYear - e.g. `2026` (1 July 2025 to 30 June 2026). Defaults to
 *   the current tax year.
 * @returns The table, or `null` for a year that is not covered. Never throws.
 */
export function getSalaryTaxSlabs(taxYear?: number): SalaryTaxYear | null {
  const year = findYear(taxYear === undefined ? undefined : { taxYear });
  return year ? copyYear(year) : null;
}

/** Which tax years {@link getSalaryTaxSlabs} covers, oldest first. */
export function getSalaryTaxYears(): number[] {
  return YEARS.map((y) => y.taxYear);
}

function compute(
  incomePaisa: number,
  year: SalaryTaxYear,
  includeSurcharge: boolean,
): SalaryTax {
  const slabs = year.slabs;
  let slab = slabs[0] as SalaryTaxSlab;
  for (const candidate of slabs) {
    if (incomePaisa > candidate.over * 100) slab = candidate;
  }
  const rateBp = Math.round(slab.rate * 100);
  const above = BigInt(incomePaisa - slab.over * 100);
  const taxPaisa =
    incomePaisa > slab.over * 100
      ? slab.fixed * 100 + divideHalfUp(above * BigInt(rateBp), 10000n)
      : slab.fixed * 100;
  const surcharge = year.surcharge;
  const surchargePaisa =
    includeSurcharge &&
    surcharge !== null &&
    surcharge.rate > 0 &&
    incomePaisa > surcharge.over * 100
      ? divideHalfUp(
          BigInt(taxPaisa) * BigInt(Math.round(surcharge.rate * 100)),
          10000n,
        )
      : 0;
  const totalPaisa = taxPaisa + surchargePaisa;
  return {
    tax: fromPaisa(taxPaisa),
    surcharge: fromPaisa(surchargePaisa),
    total: fromPaisa(totalPaisa),
    monthly: fromPaisa(divideHalfUp(BigInt(totalPaisa), 12n)),
    effectiveRate:
      incomePaisa === 0
        ? 0
        : divideHalfUp(BigInt(totalPaisa) * 10000n, BigInt(incomePaisa)) / 100,
    slab: { ...slab },
    taxYear: year.taxYear,
    source: {
      id: 'income-tax-slabs',
      effectiveFrom: year.from,
      effectiveTo: year.to,
      sourceReference: year.law,
      sourceUrl: year.source,
    },
  };
}

/**
 * Income tax on a salaried individual's taxable income for a tax year, from
 * the salaried rate table (see {@link getSalaryTaxSlabs}).
 *
 * With `includeSurcharge: true` it adds the section 4AB surcharge: a
 * percentage of the whole tax once taxable income exceeds Rs 10 million (10%
 * in tax year 2025, 9% for salaried individuals in 2026, none in 2027 or
 * before 2025). Because it applies to the whole tax, one rupee over Rs 10
 * million adds it in full. It is off by default in 2.x so that existing
 * results do not change, and will be on by default in 3.0.
 *
 * Tax credits, exemptions, the separate pension rate, super tax and
 * withholding adjustments are not applied. This is an estimate, not tax
 * advice.
 *
 * @param annualIncome - Taxable income for the year in rupees, 0 to 1
 *   trillion (at most 2 decimals count)
 * @returns The tax, or `null` for an invalid amount or a tax year that is
 *   not covered. Never throws.
 *
 * @example
 * calculateSalaryTax(1_800_000, { taxYear: 2026 });
 * // { tax: 72000, surcharge: 0, total: 72000, monthly: 6000, effectiveRate: 4,
 * //   slab: { over: 1200000, … }, taxYear: 2026,
 * //   source: { id: 'income-tax-slabs', effectiveFrom: '2025-07-01', … } }
 * calculateSalaryTax(12_000_000, { taxYear: 2026, includeSurcharge: true });
 * // { tax: 3381000, surcharge: 304290, total: 3685290, monthly: 307107.5, … }
 */
export function calculateSalaryTax(
  annualIncome: number,
  options?: SalaryTaxOptions,
): SalaryTax | null {
  const paisa = toUnits(annualIncome, 2);
  if (paisa === null) return null;
  const year = findYear(options);
  return year ? compute(paisa, year, options?.includeSurcharge === true) : null;
}

/**
 * {@link calculateSalaryTax} for a monthly salary: the income is
 * `monthlySalary × 12`, and `monthly` is the tax to withhold each month.
 *
 * @example
 * calculateMonthlySalaryTax(150_000, { taxYear: 2026 })?.monthly; // 6000
 */
export function calculateMonthlySalaryTax(
  monthlySalary: number,
  options?: SalaryTaxOptions,
): SalaryTax | null {
  const paisa = toUnits(monthlySalary, 2);
  if (paisa === null) return null;
  const year = findYear(options);
  return year
    ? compute(paisa * 12, year, options?.includeSurcharge === true)
    : null;
}
