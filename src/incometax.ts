import slabsData from '../data/income-tax-slabs.json';
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
}

/** Options for {@link calculateSalaryTax} and {@link calculateMonthlySalaryTax}. */
export interface SalaryTaxOptions {
  /** Tax year, e.g. `2026`. Takes precedence over `date`. */
  taxYear?: number;
  /** A day in the tax year (`YYYY-MM-DD` or a `Date`). Defaults to today. */
  date?: string | Date;
}

/** Result of {@link calculateSalaryTax}. */
export interface SalaryTax {
  /** Tax for the year, in rupees, rounded half up to the paisa. */
  tax: number;
  /** `tax / 12`, rounded half up to the paisa. */
  monthly: number;
  /** `tax` as a percent of the income, rounded half up to 2 decimals. */
  effectiveRate: number;
  /** The band the income falls in. */
  slab: SalaryTaxSlab;
  taxYear: number;
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

function compute(incomePaisa: number, year: SalaryTaxYear): SalaryTax {
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
  return {
    tax: fromPaisa(taxPaisa),
    monthly: fromPaisa(divideHalfUp(BigInt(taxPaisa), 12n)),
    effectiveRate:
      incomePaisa === 0
        ? 0
        : divideHalfUp(BigInt(taxPaisa) * 10000n, BigInt(incomePaisa)) / 100,
    slab: { ...slab },
    taxYear: year.taxYear,
  };
}

/**
 * Income tax on a salaried individual's taxable income for a tax year, from
 * the salaried rate table (see {@link getSalaryTaxSlabs}).
 *
 * The rate table only: the surcharge, tax credits, exemptions, the separate
 * pension rate and withholding adjustments are not applied.
 *
 * @param annualIncome - Taxable income for the year in rupees, 0 to 1
 *   trillion (at most 2 decimals count)
 * @returns The tax, or `null` for an invalid amount or a tax year that is
 *   not covered. Never throws.
 *
 * @example
 * calculateSalaryTax(1_800_000, { taxYear: 2026 });
 * // { tax: 72000, monthly: 6000, effectiveRate: 4, slab: { over: 1200000, … }, taxYear: 2026 }
 */
export function calculateSalaryTax(
  annualIncome: number,
  options?: SalaryTaxOptions,
): SalaryTax | null {
  const paisa = toUnits(annualIncome, 2);
  if (paisa === null) return null;
  const year = findYear(options);
  return year ? compute(paisa, year) : null;
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
  return year ? compute(paisa * 12, year) : null;
}
