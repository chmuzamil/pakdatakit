import { describe, expect, it } from 'vitest';
import rates from '../data/sales-tax-rates.json';
import { toUnits } from '../src/internal/money.js';
import {
  calculateSalesTax,
  getSalesTaxRate,
  splitInclusive,
} from '../src/salestax.js';

describe('getSalesTaxRate', () => {
  it('gives the federal rate on goods over time', () => {
    expect(getSalesTaxRate({ kind: 'goods', date: '2019-07-01' })?.rate).toBe(
      17,
    );
    expect(getSalesTaxRate({ kind: 'goods', date: '2023-02-22' })?.rate).toBe(
      17,
    );
    expect(getSalesTaxRate({ kind: 'goods', date: '2023-02-23' })?.rate).toBe(
      18,
    );
    const now = getSalesTaxRate({ kind: 'goods', date: '2026-11-18' });
    expect(now).toMatchObject({ rate: 18, authority: 'FBR', to: null });
    expect(now?.source).toMatch(/^https:\/\/download1\.fbr\.gov\.pk\//);
  });

  it('gives each province’s standard rate on services', () => {
    const on = (province: string, date = '2026-11-18') =>
      getSalesTaxRate({ kind: 'services', province, date })?.rate;
    expect(on('Punjab')).toBe(16);
    expect(on('Sindh')).toBe(15);
    expect(on('Sindh', '2024-06-30')).toBe(13);
    expect(on('Sindh', '2024-07-01')).toBe(15);
    expect(on('KP')).toBe(15);
    expect(on('kpk')).toBe(15);
    expect(on('Khyber Pakhtunkhwa')).toBe(15);
    expect(on('Balochistan')).toBe(15);
    expect(on('ICT')).toBe(15);
    expect(on('Islamabad', '2022-06-30')).toBe(16);
    expect(on('Islamabad Capital Territory', '2022-07-01')).toBe(15);
  });

  it('returns null outside what it covers', () => {
    expect(getSalesTaxRate({ kind: 'goods', date: '2019-06-30' })).toBeNull();
    expect(
      getSalesTaxRate({
        kind: 'services',
        province: 'AJK',
        date: '2026-01-01',
      }),
    ).toBeNull();
    expect(
      getSalesTaxRate({
        kind: 'goods',
        province: 'Gilgit-Baltistan',
        date: '2026-01-01',
      }),
    ).toBeNull();
    expect(
      getSalesTaxRate({ kind: 'services', date: '2026-01-01' }),
    ).toBeNull();
    expect(
      getSalesTaxRate({
        kind: 'services',
        province: 'Mars',
        date: '2026-01-01',
      }),
    ).toBeNull();
    expect(getSalesTaxRate({ kind: 'goods', date: '2026-02-30' })).toBeNull();
    expect(getSalesTaxRate({ kind: 'goods', date: 'yesterday' })).toBeNull();
    expect(
      getSalesTaxRate({ kind: 'food' as 'goods', date: '2026-01-01' }),
    ).toBeNull();
    expect(getSalesTaxRate(null as unknown as { kind: 'goods' })).toBeNull();
  });

  it('defaults to today and accepts a Date', () => {
    expect(getSalesTaxRate({ kind: 'goods' })?.rate).toBe(18);
    expect(
      getSalesTaxRate({ kind: 'goods', date: new Date(2020, 0, 15) })?.rate,
    ).toBe(17);
  });

  it('has no overlapping or missing periods', () => {
    const groups = new Map<string, typeof rates>();
    for (const r of rates) {
      const key = `${r.kind}/${r.province}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    for (const list of groups.values()) {
      expect(list[0]?.from).toBe('2019-07-01');
      expect(list.at(-1)?.to).toBeNull();
      for (let i = 1; i < list.length; i++) {
        const prev = new Date(`${list[i - 1]?.to}T00:00:00Z`);
        prev.setUTCDate(prev.getUTCDate() + 1);
        expect(prev.toISOString().slice(0, 10)).toBe(list[i]?.from);
      }
    }
  });
});

describe('calculateSalesTax', () => {
  it('adds tax at a rate, rounding half up to the paisa', () => {
    expect(calculateSalesTax(1000, { rate: 18 })).toEqual({
      net: 1000,
      tax: 180,
      gross: 1180,
      rate: 18,
    });
    expect(calculateSalesTax(1234, { rate: 18 })?.tax).toBe(222.12);
    expect(calculateSalesTax(100, { rate: 1.43 })?.tax).toBe(1.43);
    // 0.25 x 18% = 0.045 -> 0.05 (half up)
    expect(calculateSalesTax(0.25, { rate: 18 })?.tax).toBe(0.05);
    // The amount is read as written: 1.005 is 1.01, not 1.00.
    expect(calculateSalesTax(1.005, { rate: 0 })?.net).toBe(1.01);
  });

  it('looks up the rate from a province, kind and date', () => {
    expect(
      calculateSalesTax(1000, { province: 'Punjab', date: '2026-11-18' }),
    ).toEqual({ net: 1000, tax: 160, gross: 1160, rate: 16 });
    expect(
      calculateSalesTax(1000, { kind: 'goods', date: '2022-01-01' })?.tax,
    ).toBe(170);
    expect(
      calculateSalesTax(1150, {
        province: 'Sindh',
        date: '2026-11-18',
        inclusive: true,
      }),
    ).toEqual({ net: 1000, tax: 150, gross: 1150, rate: 15 });
  });

  it('returns null instead of throwing', () => {
    for (const amount of [-1, Number.NaN, Infinity, 1e13]) {
      expect(
        calculateSalesTax(amount, { rate: 18 }),
        String(amount),
      ).toBeNull();
    }
    expect(calculateSalesTax(100, { rate: 101 })).toBeNull();
    expect(calculateSalesTax(100, { rate: -1 })).toBeNull();
    expect(calculateSalesTax(100, { rate: 16.666 })).toBeNull();
    expect(calculateSalesTax(100, {})).toBeNull();
    expect(calculateSalesTax(100, { province: 'Mars' })).toBeNull();
    expect(
      calculateSalesTax(100, null as unknown as { rate: number }),
    ).toBeNull();
    expect(
      calculateSalesTax('100' as unknown as number, { rate: 18 }),
    ).toBeNull();
  });
});

describe('splitInclusive', () => {
  it('splits so that net + tax = gross', () => {
    expect(splitInclusive(1180, 18)).toEqual({
      net: 1000,
      tax: 180,
      gross: 1180,
      rate: 18,
    });
    const odd = splitInclusive(99.99, 18);
    expect(odd).toEqual({ net: 84.74, tax: 15.25, gross: 99.99, rate: 18 });
    expect(splitInclusive(0, 18)).toEqual({
      net: 0,
      tax: 0,
      gross: 0,
      rate: 18,
    });
    expect(splitInclusive(1e12, 100)?.net).toBe(5e11);
  });

  it('returns null for invalid input', () => {
    expect(splitInclusive(-5, 18)).toBeNull();
    expect(splitInclusive(5, Number.NaN)).toBeNull();
  });
});

describe('toUnits', () => {
  it('reads decimals as written', () => {
    expect(toUnits(1.005, 2)).toBe(101);
    expect(toUnits(1.004, 2)).toBe(100);
    expect(toUnits(0.125, 2)).toBe(13);
    expect(toUnits(1e-7, 2)).toBe(0);
    expect(toUnits(0.005, 2)).toBe(1);
    expect(toUnits(0.0049, 2)).toBe(0);
    expect(toUnits(1e12, 2)).toBe(1e14);
    expect(toUnits(123456789.99, 2)).toBe(12345678999);
    expect(toUnits(0, 2)).toBe(0);
    expect(toUnits(18, 4)).toBe(180000);
  });
});
