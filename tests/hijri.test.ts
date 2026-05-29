import { describe, expect, it } from 'vitest';
import {
  formatHijri,
  fromHijri,
  getHijriMonthName,
  isRamadan,
  toHijri,
} from '../src/hijri.js';

describe('toHijri', () => {
  it('converts known Gregorian date', () => {
    const hijri = toHijri(new Date(2024, 2, 11));
    expect(hijri.year).toBeGreaterThan(1400);
    expect(hijri.month).toBeGreaterThanOrEqual(1);
    expect(hijri.month).toBeLessThanOrEqual(12);
    expect(hijri.day).toBeGreaterThanOrEqual(1);
    expect(hijri.day).toBeLessThanOrEqual(30);
  });
});

describe('fromHijri', () => {
  it('produces a Gregorian date matching Hijri components within one day', () => {
    const hijri = { year: 1445, month: 12, day: 23 };
    const converted = toHijri(fromHijri(hijri));
    expect(converted.year).toBe(hijri.year);
    expect(converted.month).toBe(hijri.month);
    expect(Math.abs(converted.day - hijri.day)).toBeLessThanOrEqual(1);
  });
});

describe('formatHijri', () => {
  it('returns formatted string with month name', () => {
    const formatted = formatHijri(new Date(2024, 2, 11));
    expect(formatted).toMatch(/\d+ \w+ \d+/);
  });
});

describe('getHijriMonthName', () => {
  it('returns Ramadan for month 9', () => {
    expect(getHijriMonthName(9)).toBe('Ramadan');
  });

  it('returns empty string for invalid month', () => {
    expect(getHijriMonthName(0)).toBe('');
  });
});

describe('isRamadan', () => {
  it('returns boolean', () => {
    expect(typeof isRamadan(new Date())).toBe('boolean');
  });
});
