import ratesData from '../data/withholding-rates.json';
import type { DataSource } from './data-info.js';
import { getSalaryTaxSlabs, getTaxYear } from './incometax.js';
import { divideHalfUp, toUnits } from './internal/money.js';

/** A value band: the rate for amounts over `over` up to `upTo` (inclusive; `null` = no limit). */
export interface WithholdingSlab {
  over: number;
  upTo: number | null;
  rate: number;
}

/** Input of {@link calculateWithholding}. */
export interface WithholdingInput {
  /** Section of the Income Tax Ordinance 2001: `'231AB'`, `'236C'`, `'236K'`, `'151'`, `'150'`, `'153'`, `'154B'` or `'149'`. */
  section: string;
  /**
   * Which case of the section, e.g. `'bank-deposit'` (151) or
   * `'goods-company'` (153); see {@link getWithholdingRates}. Optional for
   * sections with one case.
   */
  subType?: string;
  /** The payment (or, for 236C/236K, the value; for 149, the year's taxable salary) in rupees. */
  amount: number;
  /** `true` if the person is on FBR's Active Taxpayers List. */
  atl: boolean;
  /**
   * `true` for a person on the list who filed the return late. Changes the
   * rate only where the year has a late-filer rate (236C and 236K in tax
   * years 2025 and 2026).
   */
  lateFiler?: boolean;
  /**
   * 151 sukuk, individual or AOP: the holder's return on investment, which
   * decides the case (more than Rs 1 million: `sukuk-individual-above-1m`;
   * less than Rs 1 million: `sukuk-individual-below-1m`). Defaults to
   * `amount`. The law gives no rate for exactly Rs 1 million, so that, or a
   * case that does not fit the return, gives `null`.
   */
  returnOnInvestment?: number;
  /**
   * 154B: whether the recipient is resident. The rate is the same; it
   * decides whether the tax is a minimum tax (resident) or a final tax
   * (non-resident without a permanent establishment in Pakistan), given in
   * `taxNature`.
   */
  resident?: boolean;
  /** Tax year (July to June), e.g. `2027`. Or give `date`. */
  taxYear?: number;
  /** A date in the tax year, instead of `taxYear`. */
  date?: string | Date;
}

/** Result of {@link calculateWithholding}. */
export interface Withholding {
  section: string;
  subType: string;
  /** The case as the rate card describes it. */
  description: string;
  taxYear: number;
  atl: boolean;
  lateFiler: boolean;
  /** Percent applied to the whole amount (for 149, the effective rate). */
  rate: number;
  /**
   * Tax to withhold or collect, in whole rupees: section 219 of the
   * Ordinance disregards fractions under 50 paisa and counts 50 paisa or
   * more as a rupee.
   */
  tax: number;
  /**
   * How the rate for a person not on the list is set for this case:
   * `double` (the Tenth Schedule's 100% increase), `fixed` (its own rate,
   * as for 236C, or 231AB, which applies only to them), `slabs` (its own
   * value bands, 236K) or `not-applicable` (149: the same rate for all).
   */
  nonAtlRule: 'double' | 'fixed' | 'slabs' | 'not-applicable';
  /** The value band used (236C, 236K), or `null`. */
  slab: WithholdingSlab | null;
  /**
   * The amount at or below which nothing is collected (231AB: Rs 50,000 of
   * cash withdrawn in a day, all withdrawals added up), and whether this
   * amount was within it. `null` where there is none.
   */
  threshold: { amount: number; per: string; withinThreshold: boolean } | null;
  /** Rate card and law references, as printed on the card. */
  cardRef: string;
  lawRef: string;
  /** Where the statute differs from the card and the statute is used, why. */
  statuteOverride: string | null;
  /**
   * 154B with `resident` given: `'minimum'` for a resident, `'final'` for a
   * non-resident without a permanent establishment in Pakistan; otherwise
   * `null`.
   */
  taxNature: 'minimum' | 'final' | null;
  source: DataSource;
}

interface RateSpec {
  rate?: number | null;
  exempt?: boolean;
  slabs?: WithholdingSlab[];
  salarySlabs?: string;
}

interface NonAtlSpec {
  rule: 'double' | 'fixed' | 'slabs' | 'not-applicable';
  rate?: number | null;
  slabs?: WithholdingSlab[];
  law?: string;
}

interface Row {
  taxYear: number;
  from: string;
  to: string;
  section: string;
  subType: string;
  description: string;
  atl: RateSpec;
  nonAtl: NonAtlSpec;
  lateFiler?: RateSpec;
  threshold?: { amount: number; per: string; aggregate: boolean; law: string };
  /** The return on investment the case is for: more than `over`, or less than `under`. */
  returnBand?: { over?: number; under?: number };
  taxNature?: { resident: 'minimum'; nonResident: 'final' };
  cardRef: string;
  lawRef: string;
  card: string;
  statuteOverride?: string;
  note?: string;
}

const ROWS = ratesData as unknown as Row[];

/** One case of a section in a tax year, as in the rate card. */
export interface WithholdingRate {
  taxYear: number;
  section: string;
  subType: string;
  description: string;
  /** Percent for a person on the list; `null` where it does not apply or depends on the value (see `atlSlabs`). */
  atlRate: number | null;
  atlSlabs: WithholdingSlab[] | null;
  nonAtlRule: 'double' | 'fixed' | 'slabs' | 'not-applicable';
  /** Percent for a person not on the list, or `null` (see `nonAtlSlabs`). */
  nonAtlRate: number | null;
  nonAtlSlabs: WithholdingSlab[] | null;
  /** Late-filer value bands, where the year has them. */
  lateFilerSlabs: WithholdingSlab[] | null;
  threshold: { amount: number; per: string } | null;
  cardRef: string;
  lawRef: string;
  statuteOverride: string | null;
  note: string | null;
  source: DataSource;
}

function source(row: Row): DataSource {
  return {
    id: 'withholding-rates',
    effectiveFrom: row.from,
    effectiveTo: row.to,
    sourceReference: `${row.lawRef} (FBR Withholding Tax Rate Card, tax year ${row.taxYear}, ${row.cardRef})`,
    sourceUrl: row.card,
  };
}

const copySlabs = (s?: WithholdingSlab[]) =>
  s ? s.map((x) => ({ ...x })) : null;

/**
 * Every case FBR's Withholding Tax Rate Card lists for the covered sections
 * in a tax year (2025 to 2027), with its rates for persons on and not on the
 * Active Taxpayers List and its references.
 *
 * @param taxYear - e.g. `2027`
 * @param section - Optional: only this section, e.g. `'153'`
 * @returns The cases, or `[]` for a year that is not covered. Never throws.
 */
export function getWithholdingRates(
  taxYear: number,
  section?: string,
): WithholdingRate[] {
  return ROWS.filter(
    (r) =>
      r.taxYear === taxYear &&
      (section === undefined || r.section === String(section).toUpperCase()),
  ).map((r) => ({
    taxYear: r.taxYear,
    section: r.section,
    subType: r.subType,
    description: r.description,
    atlRate: r.atl.rate ?? null,
    atlSlabs: copySlabs(r.atl.slabs),
    nonAtlRule: r.nonAtl.rule,
    nonAtlRate: r.nonAtl.rate ?? null,
    nonAtlSlabs: copySlabs(r.nonAtl.slabs),
    lateFilerSlabs: copySlabs(r.lateFiler?.slabs),
    threshold: r.threshold
      ? { amount: r.threshold.amount, per: r.threshold.per }
      : null,
    cardRef: r.cardRef,
    lawRef: r.lawRef,
    statuteOverride: r.statuteOverride ?? null,
    note: r.note ?? null,
    source: source(r),
  }));
}

function inSlab(paisa: number, slabs: WithholdingSlab[]): WithholdingSlab {
  return (slabs.find(
    (s) => paisa > s.over * 100 && (s.upTo === null || paisa <= s.upTo * 100),
  ) ?? slabs[0]) as WithholdingSlab;
}

/** Percent as hundredths (basis points), exact for rates with up to 2 decimals. */
const bp = (rate: number) => Math.round(rate * 100);

/**
 * Income tax to withhold or collect under one section of the Income Tax
 * Ordinance 2001, for a person on or not on FBR's Active Taxpayers List
 * (ATL), from FBR's Withholding Tax Rate Card for tax years 2025 to 2027.
 *
 * Covered: 231AB cash withdrawal, 236C sale and 236K purchase of immovable
 * property, 151 profit on debt, 150 dividends, 153 goods, services and
 * contracts, 154B social media income (from 2027) and 149 salary (the
 * salaried rate table, as {@link calculateSalaryTax}).
 *
 * The rate for a person not on the list follows each case's own rule in the
 * Tenth Schedule: usually double, but a fixed rate (236C, and 151 in 2025),
 * its own value bands (236K), or none (149; 231AB applies only to them).
 * The rate applies to the whole amount (236C and 236K value bands are not
 * marginal), and the tax is rounded to the nearest rupee (section 219).
 * Where FBR's card and the Ordinance differ, the Ordinance is used and
 * `statuteOverride` says so. For 231AB, pass the day's total of all cash
 * withdrawals: nothing is collected up to Rs 50,000. For 150 mutual fund
 * dividends received by a company, the debt part is
 * `mutual-fund-debt-part-company` (29%). For 151 sukuk held by an
 * individual or AOP, the case must fit the return on investment, and
 * exactly Rs 1 million gives `null`.
 *
 * This is an estimate from the rate card, not tax advice: exemptions,
 * reduced-rate certificates, adjustable or final status and the many cases
 * not listed here are not applied.
 *
 * @returns The rate, tax and references, or `null` for an unknown section,
 *   case or tax year, an invalid amount, or a missing `atl`. Never throws.
 *
 * @example
 * calculateWithholding({ section: '236K', amount: 60_000_000, atl: false, taxYear: 2027 });
 * // { rate: 14.5, tax: 8700000, nonAtlRule: 'slabs', … }
 * calculateWithholding({ section: '231AB', amount: 80_000, atl: false, taxYear: 2027 })?.tax; // 640
 * calculateWithholding({ section: '151', subType: 'bank-deposit', amount: 10_000, atl: true, taxYear: 2027 })?.tax; // 2000
 */
export function calculateWithholding(
  input: WithholdingInput,
): Withholding | null {
  if (input === null || typeof input !== 'object') return null;
  if (typeof input.atl !== 'boolean') return null;
  if (typeof input.section !== 'string') return null;
  const paisa = toUnits(input.amount, 2);
  if (paisa === null) return null;
  let taxYear: number | null = null;
  if (input.taxYear !== undefined) {
    taxYear = Number.isInteger(input.taxYear) ? input.taxYear : null;
  } else if (input.date !== undefined) {
    taxYear = getTaxYear(input.date);
  }
  if (taxYear === null) return null;
  const section = input.section.trim().toUpperCase();
  const cases = ROWS.filter(
    (r) => r.taxYear === taxYear && r.section === section,
  );
  if (cases.length === 0) return null;
  let row: Row | undefined;
  if (input.subType === undefined) {
    if (cases.length === 1) row = cases[0];
  } else if (typeof input.subType === 'string') {
    row = cases.find((r) => r.subType === input.subType);
  }
  if (!row) return null;

  // 151 sukuk (individual or AOP): the case must fit the return; the law
  // says "more than" and "less than" Rs 1 million, so exactly Rs 1 million
  // fits neither.
  if (row.returnBand) {
    const ret =
      input.returnOnInvestment === undefined
        ? paisa
        : toUnits(input.returnOnInvestment, 2);
    if (ret === null) return null;
    const { over, under } = row.returnBand;
    if (over !== undefined && !(ret > over * 100)) return null;
    if (under !== undefined && !(ret < under * 100)) return null;
  }

  const atl = input.atl;
  const lateFiler = atl && input.lateFiler === true;
  let rate: number;
  /** Tax in whole rupees (section 219). */
  let taxRupees: number;
  let slab: WithholdingSlab | null = null;
  let threshold: Withholding['threshold'] = null;

  if (row.atl.salarySlabs) {
    // The salaried rate table, computed exactly and rounded once.
    const table = getSalaryTaxSlabs(taxYear);
    if (table === null) return null;
    let band = table.slabs[0] as SalaryBand;
    for (const candidate of table.slabs)
      if (paisa > candidate.over * 100) band = candidate as SalaryBand;
    const above = paisa > band.over * 100 ? paisa - band.over * 100 : 0;
    taxRupees =
      band.fixed +
      divideHalfUp(BigInt(above) * BigInt(bp(band.rate)), 1000000n);
    rate =
      paisa === 0
        ? 0
        : divideHalfUp(BigInt(taxRupees) * 1000000n, BigInt(paisa)) / 100;
  } else {
    let spec: RateSpec | NonAtlSpec;
    if (!atl) spec = row.nonAtl;
    else if (lateFiler && row.lateFiler) spec = row.lateFiler;
    else spec = row.atl;
    if (spec.slabs) {
      slab = { ...inSlab(paisa, spec.slabs) };
      rate = slab.rate;
    } else {
      rate = typeof spec.rate === 'number' ? spec.rate : 0;
    }
    taxRupees = divideHalfUp(BigInt(paisa) * BigInt(bp(rate)), 1000000n);
    if (row.threshold) {
      const within = paisa <= row.threshold.amount * 100;
      threshold = {
        amount: row.threshold.amount,
        per: row.threshold.per,
        withinThreshold: within,
      };
      if (within) taxRupees = 0;
    }
  }

  return {
    section: row.section,
    subType: row.subType,
    description: row.description,
    taxYear,
    atl,
    lateFiler,
    rate,
    tax: taxRupees,
    nonAtlRule: row.nonAtl.rule,
    slab,
    threshold,
    cardRef: row.cardRef,
    lawRef: row.lawRef,
    statuteOverride: row.statuteOverride ?? null,
    taxNature:
      row.taxNature && typeof input.resident === 'boolean'
        ? input.resident
          ? row.taxNature.resident
          : row.taxNature.nonResident
        : null,
    source: source(row),
  };
}

interface SalaryBand {
  over: number;
  fixed: number;
  rate: number;
}
