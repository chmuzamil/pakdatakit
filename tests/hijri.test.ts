import { describe, expect, it } from 'vitest';
import {
  formatHijri,
  fromHijri,
  getHijriMonthName,
  isRamadan,
  toHijri,
} from '../src/hijri.js';

const islamicCivil = new Intl.DateTimeFormat('en-u-ca-islamic-civil', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function referenceHijri(date: Date): { year: number; month: number; day: number } {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const parts = Object.fromEntries(
    islamicCivil
      .formatToParts(utc)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function eachDay(from: Date, to: Date, step = 1): Date[] {
  const days: Date[] = [];
  for (
    let d = new Date(from);
    d <= to;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step)
  ) {
    days.push(d);
  }
  return days;
}

describe('toHijri', () => {
  it('converts known Gregorian dates (Eid ul Adha 2025 = 10 Dhu al-Hijjah)', () => {
    expect(toHijri(new Date(2024, 2, 11))).toEqual({
      year: 1445,
      month: 9,
      day: 1,
    });
    expect(toHijri(new Date(2025, 5, 7))).toEqual({
      year: 1446,
      month: 12,
      day: 10,
    });
  });

  it('matches the islamic-civil calendar for every day 2000-2029', () => {
    for (const day of eachDay(new Date(2000, 0, 1), new Date(2029, 11, 31))) {
      expect(toHijri(day)).toEqual(referenceHijri(day));
    }
  });

  it('applies a moon-sighting offset', () => {
    expect(toHijri(new Date(2025, 5, 7), { offset: -1 }).day).toBe(9);
  });

  it('throws on invalid input', () => {
    expect(() => toHijri(new Date('garbage'))).toThrow(RangeError);
    expect(() => toHijri(new Date(), { offset: 0.5 })).toThrow(RangeError);
  });
});

describe('fromHijri', () => {
  it('round-trips every day 1950-2076', () => {
    for (const day of eachDay(new Date(1950, 0, 1), new Date(2076, 11, 31))) {
      expect(fromHijri(toHijri(day)).getTime()).toBe(day.getTime());
    }
  });

  it('round-trips with an offset', () => {
    const day = new Date(2026, 2, 21);
    expect(fromHijri(toHijri(day, { offset: 1 }), { offset: 1 })).toEqual(day);
  });

  it('throws on out-of-range components', () => {
    expect(() => fromHijri({ year: 1447, month: 13, day: 1 })).toThrow(
      RangeError,
    );
    expect(() => fromHijri({ year: 1447, month: 1, day: 31 })).toThrow(
      RangeError,
    );
  });
});

describe('formatHijri', () => {
  it('returns formatted string with month name', () => {
    expect(formatHijri(new Date(2024, 2, 11))).toBe('1 Ramadan 1445');
  });
});

describe('getHijriMonthName', () => {
  it('returns Ramadan for month 9', () => {
    expect(getHijriMonthName(9)).toBe('Ramadan');
  });

  it('returns null for invalid month', () => {
    expect(getHijriMonthName(0)).toBeNull();
    expect(getHijriMonthName(1.5)).toBeNull();
  });
});

describe('isRamadan', () => {
  it('detects Ramadan', () => {
    expect(isRamadan(new Date(2026, 2, 1))).toBe(true);
    expect(isRamadan(new Date(2026, 5, 1))).toBe(false);
  });
});
