import { describe, expect, it } from 'vitest';
import {
  getHolidaysOn,
  getPakistanHolidays,
  isPakistanHoliday,
} from '../src/holidays.js';
import { fromHijri, toHijri } from '../src/hijri.js';

function datesOf(year: number, id: string): string[] {
  return getPakistanHolidays(year)
    .filter((holiday) => holiday.id === id)
    .map((holiday) => holiday.date);
}

describe('getPakistanHolidays', () => {
  it('uses observed moon-sighting dates', () => {
    expect(datesOf(2025, 'eid-ul-fitr')).toEqual([
      '2025-03-31',
      '2025-04-01',
      '2025-04-02',
    ]);
    expect(datesOf(2025, 'eid-ul-adha')).toEqual([
      '2025-06-06',
      '2025-06-07',
      '2025-06-08',
      '2025-06-09',
    ]);
    expect(datesOf(2024, 'eid-milad-un-nabi')).toEqual(['2024-09-17']);
    expect(datesOf(2026, 'ashura')).toEqual(['2026-06-25', '2026-06-26']);
  });

  it('marks observed holidays with a source', () => {
    const eid = getPakistanHolidays(2025).find((h) => h.id === 'eid-ul-fitr');
    expect(eid).toMatchObject({ estimated: false, type: 'religious' });
    expect(eid?.source).toMatch(/^https:\/\//);
  });

  it('applies year rules for fixed holidays', () => {
    expect(datesOf(2023, 'youm-e-takbeer')).toEqual([]);
    expect(datesOf(2025, 'youm-e-takbeer')).toEqual(['2025-05-28']);
    expect(datesOf(2020, 'iqbal-day')).toEqual([]);
    expect(datesOf(2022, 'iqbal-day')).toEqual(['2022-11-09']);
  });

  it('includes Christian holidays only when asked', () => {
    expect(datesOf(2025, 'day-after-christmas')).toEqual([]);
    expect(
      getPakistanHolidays(2025, { includeChristianHolidays: true }).find(
        (h) => h.id === 'day-after-christmas',
      ),
    ).toMatchObject({ date: '2025-12-26', christiansOnly: true });
  });

  it('estimates Islamic holidays for future years', () => {
    const eid = getPakistanHolidays(2027).filter((h) => h.id === 'eid-ul-fitr');
    expect(eid).toHaveLength(3);
    expect(eid.every((h) => h.estimated)).toBe(true);
    // Tabular 1 Shawwal 1448 is 10 March 2027.
    expect(eid[0]?.date).toBe('2027-03-10');
  });

  it('estimates fall within two days of observed dates', () => {
    const anchors = [
      ['eid-ul-fitr', 10, 1],
      ['eid-ul-adha', 12, 10],
      ['eid-milad-un-nabi', 3, 12],
    ] as const;
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026]) {
      for (const [id, month, day] of anchors) {
        const hijriYear = toHijri(new Date(year, 6, 1)).year;
        const candidates = [hijriYear - 1, hijriYear, hijriYear + 1]
          .map((y) => fromHijri({ year: y, month, day }))
          .filter((d) => d.getFullYear() === year);
        const observed = datesOf(year, id).map((d) => new Date(d).getTime());
        for (const estimate of candidates) {
          const utc = Date.UTC(
            estimate.getFullYear(),
            estimate.getMonth(),
            estimate.getDate(),
          );
          const nearest = Math.min(
            ...observed.map((o) => Math.abs(o - utc) / 86_400_000),
          );
          expect(nearest, `${id} ${year}`).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('accepts announced dates', () => {
    const holidays = getPakistanHolidays(2027, {
      announced: { 'eid-ul-fitr': ['2027-03-11', '2027-03-12'] },
    }).filter((h) => h.id === 'eid-ul-fitr');
    expect(holidays.map((h) => h.date)).toEqual(['2027-03-11', '2027-03-12']);
    expect(holidays.every((h) => !h.estimated)).toBe(true);
  });

  it('returns holidays in date order', () => {
    const dates = getPakistanHolidays(2025).map((h) => h.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('rejects invalid years', () => {
    expect(() => getPakistanHolidays(1.5)).toThrow(RangeError);
  });
});

describe('isPakistanHoliday / getHolidaysOn', () => {
  it('checks individual dates', () => {
    expect(isPakistanHoliday('2025-08-14')).toBe(true);
    expect(isPakistanHoliday(new Date(2025, 2, 31))).toBe(true);
    expect(isPakistanHoliday('2025-08-15')).toBe(false);
    expect(getHolidaysOn('2025-12-25')[0]?.name).toBe(
      'Quaid-e-Azam Day / Christmas',
    );
  });
});
