import { describe, expect, it } from 'vitest';
import slabsData from '../data/income-tax-slabs.json';
import {
  calculateMonthlySalaryTax,
  calculateSalaryTax,
  getSalaryTaxSlabs,
  getSalaryTaxYears,
  getTaxYear,
} from '../src/incometax.js';

describe('income tax slabs data', () => {
  it('covers tax years 2020 to 2027 with consistent fixed amounts', () => {
    expect(getSalaryTaxYears()).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ]);
    for (const year of slabsData) {
      expect(year.from).toBe(`${year.taxYear - 1}-07-01`);
      expect(year.to).toBe(`${year.taxYear}-06-30`);
      expect(year.source).toMatch(/^https:\/\/download1\.fbr\.gov\.pk\//);
      const slabs = year.slabs;
      expect(slabs[0]).toEqual({ over: 0, upTo: 600000, fixed: 0, rate: 0 });
      expect(slabs.at(-1)?.upTo).toBeNull();
      for (let i = 1; i < slabs.length; i++) {
        const prev = slabs[i - 1]!;
        const slab = slabs[i]!;
        expect(slab.over).toBe(prev.upTo);
        expect(slab.fixed).toBeCloseTo(
          prev.fixed + (prev.rate * ((prev.upTo as number) - prev.over)) / 100,
          6,
        );
      }
    }
  });
});

describe('calculateSalaryTax', () => {
  it('applies the slab for the year', () => {
    expect(calculateSalaryTax(1_800_000, { taxYear: 2026 })).toEqual({
      tax: 72000,
      surcharge: 0,
      total: 72000,
      monthly: 6000,
      effectiveRate: 4,
      slab: { over: 1200000, upTo: 2200000, fixed: 6000, rate: 11 },
      taxYear: 2026,
    });
    expect(calculateSalaryTax(1_800_000, { taxYear: 2025 })?.tax).toBe(120000);
    expect(calculateSalaryTax(8_000_000, { taxYear: 2027 })?.tax).toBe(1774000);
    expect(calculateSalaryTax(3_000_000, { taxYear: 2020 })?.tax).toBe(282500);
  });
  it('adds the section 4AB surcharge only when asked', () => {
    // Off by default: the 2.x results stay the same.
    const plain = calculateSalaryTax(12_000_000, { taxYear: 2026 });
    expect(plain?.surcharge).toBe(0);
    expect(plain?.total).toBe(plain?.tax);
    // TY2026: 9% of the whole tax for salaried individuals above Rs 10 million.
    expect(
      calculateSalaryTax(12_000_000, { taxYear: 2026, includeSurcharge: true }),
    ).toMatchObject({
      tax: 3381000,
      surcharge: 304290,
      total: 3685290,
      monthly: 307107.5,
    });
    // TY2025: 10%.
    expect(
      calculateSalaryTax(12_000_000, { taxYear: 2025, includeSurcharge: true })
        ?.surcharge,
    ).toBe(346500);
    // TY2027 (none for salaried) and before 2025 (no section 4AB): nothing.
    for (const taxYear of [2027, 2024, 2020])
      expect(
        calculateSalaryTax(12_000_000, { taxYear, includeSurcharge: true })
          ?.surcharge,
      ).toBe(0);
  });
  it('charges the surcharge only above Rs 10 million, on the whole tax', () => {
    const at = (income: number) =>
      calculateSalaryTax(income, { taxYear: 2026, includeSurcharge: true });
    expect(at(10_000_000)?.surcharge).toBe(0);
    expect(at(10_000_000.01)?.surcharge).toBe(241290);
  });
  it('gives each year its surcharge with the law and source', () => {
    expect(getSalaryTaxSlabs(2024)?.surcharge).toBeNull();
    expect(getSalaryTaxSlabs(2025)?.surcharge).toMatchObject({
      rate: 10,
      over: 10_000_000,
    });
    expect(getSalaryTaxSlabs(2026)?.surcharge?.rate).toBe(9);
    expect(getSalaryTaxSlabs(2027)?.surcharge?.rate).toBe(0);
    for (const year of [2025, 2026, 2027])
      expect(getSalaryTaxSlabs(year)?.surcharge?.source).toMatch(
        /^https:\/\/download1\.fbr\.gov\.pk\//,
      );
  });
  it('treats a bound as the lower band (income must exceed it)', () => {
    expect(calculateSalaryTax(600_000, { taxYear: 2026 })?.tax).toBe(0);
    expect(calculateSalaryTax(1_200_000, { taxYear: 2026 })?.slab.over).toBe(
      600000,
    );
    expect(calculateSalaryTax(1_200_000.01, { taxYear: 2026 })?.slab.over).toBe(
      1200000,
    );
  });
  it('rounds half up to the paisa', () => {
    expect(calculateSalaryTax(600_000.5, { taxYear: 2026 })?.tax).toBe(0.01);
    expect(calculateSalaryTax(600_000.49, { taxYear: 2026 })?.tax).toBe(0);
  });
  it('picks the year from a date', () => {
    expect(getTaxYear('2025-06-30')).toBe(2025);
    expect(getTaxYear('2025-07-01')).toBe(2026);
    expect(calculateSalaryTax(1_800_000, { date: '2025-07-01' })?.taxYear).toBe(
      2026,
    );
  });
  it('returns null for bad input or uncovered years', () => {
    expect(calculateSalaryTax(-1, { taxYear: 2026 })).toBeNull();
    expect(calculateSalaryTax(Number.NaN, { taxYear: 2026 })).toBeNull();
    expect(calculateSalaryTax(1, { taxYear: 2019 })).toBeNull();
    expect(calculateSalaryTax(1, { taxYear: 2026.5 })).toBeNull();
    expect(
      calculateSalaryTax('1' as unknown as number, { taxYear: 2026 }),
    ).toBeNull();
    expect(getSalaryTaxSlabs(2030)).toBeNull();
    expect(getTaxYear('2026-02-30')).toBeNull();
  });
  it('returns copies', () => {
    const year = getSalaryTaxSlabs(2026)!;
    year.slabs[0]!.rate = 99;
    expect(getSalaryTaxSlabs(2026)!.slabs[0]!.rate).toBe(0);
  });
});

describe('calculateMonthlySalaryTax', () => {
  it('annualises the salary', () => {
    expect(calculateMonthlySalaryTax(150_000, { taxYear: 2026 })?.monthly).toBe(
      6000,
    );
    expect(calculateMonthlySalaryTax(50_000, { taxYear: 2026 })?.tax).toBe(0);
  });
});
