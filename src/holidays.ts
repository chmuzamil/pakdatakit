import holidaysData from '../data/holidays.json';
import { fromHijri, toHijri } from './hijri.js';

/** Islamic public holidays, whose dates depend on moon sighting. */
export type IslamicHolidayId =
  'eid-ul-fitr' | 'eid-ul-adha' | 'ashura' | 'eid-milad-un-nabi';

/** Identifier of a Pakistani federal public holiday. */
export type HolidayId =
  | IslamicHolidayId
  | 'kashmir-day'
  | 'pakistan-day'
  | 'labour-day'
  | 'youm-e-takbeer'
  | 'independence-day'
  | 'iqbal-day'
  | 'quaid-e-azam-day'
  | 'day-after-christmas';

/** A public holiday on a specific date. */
export interface Holiday {
  id: HolidayId;
  name: string;
  /** Date as `YYYY-MM-DD`. */
  date: string;
  type: 'national' | 'religious';
  /**
   * `true` when an Islamic holiday's date is calculated from the tabular Hijri
   * calendar because the observed dates are not in the dataset yet. The real
   * date depends on the moon-sighting announcement.
   */
  estimated: boolean;
  /** `true` for holidays that apply to Christian employees only. */
  christiansOnly?: boolean;
  /** Source of an observed Islamic holiday date. */
  source?: string;
}

/** Options for {@link getPakistanHolidays}. */
export interface HolidayOptions {
  /** Include 26 December, a holiday for Christian employees only. Defaults to `false`. */
  includeChristianHolidays?: boolean;
  /**
   * Observed or announced dates (`YYYY-MM-DD`) for Islamic holidays, used
   * instead of the dataset or estimate. Use this to apply a new moon-sighting
   * announcement before the library is updated. An empty list removes that
   * holiday for the year.
   */
  announced?: Partial<Record<IslamicHolidayId, string[]>>;
  /** Day offset applied to estimated Islamic dates. Defaults to `0`. */
  hijriOffset?: number;
}

interface FixedHoliday {
  id: HolidayId;
  name: string;
  month: number;
  day: number;
  type: 'national' | 'religious';
  appliesIn?: (year: number) => boolean;
  christiansOnly?: boolean;
}

const FIXED_HOLIDAYS: FixedHoliday[] = [
  {
    id: 'kashmir-day',
    name: 'Kashmir Solidarity Day',
    month: 2,
    day: 5,
    type: 'national',
  },
  {
    id: 'pakistan-day',
    name: 'Pakistan Day',
    month: 3,
    day: 23,
    type: 'national',
  },
  { id: 'labour-day', name: 'Labour Day', month: 5, day: 1, type: 'national' },
  {
    id: 'youm-e-takbeer',
    name: 'Youm-e-Takbeer',
    month: 5,
    day: 28,
    type: 'national',
    // A one-off holiday in 2024, on the annual list since 2025.
    appliesIn: (year) => year >= 2024,
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    month: 8,
    day: 14,
    type: 'national',
  },
  {
    id: 'iqbal-day',
    name: 'Iqbal Day',
    month: 11,
    day: 9,
    type: 'national',
    // Dropped from 2015 to 2021, restored in 2022.
    appliesIn: (year) => year <= 2014 || year >= 2022,
  },
  {
    id: 'quaid-e-azam-day',
    name: 'Quaid-e-Azam Day / Christmas',
    month: 12,
    day: 25,
    type: 'national',
  },
  {
    id: 'day-after-christmas',
    name: 'Day after Christmas',
    month: 12,
    day: 26,
    type: 'religious',
    christiansOnly: true,
  },
];

interface IslamicHoliday {
  id: IslamicHolidayId;
  key: keyof (typeof holidaysData)['2020'];
  name: string;
  hijriMonth: number;
  hijriDay: number;
  /** Usual number of public holidays, used for estimates. */
  days: number;
}

const ISLAMIC_HOLIDAYS: IslamicHoliday[] = [
  {
    id: 'eid-ul-fitr',
    key: 'eidUlFitr',
    name: 'Eid ul Fitr',
    hijriMonth: 10,
    hijriDay: 1,
    days: 3,
  },
  {
    id: 'eid-ul-adha',
    key: 'eidUlAdha',
    name: 'Eid ul Adha',
    hijriMonth: 12,
    hijriDay: 10,
    days: 3,
  },
  {
    id: 'ashura',
    key: 'ashura',
    name: 'Ashura',
    hijriMonth: 1,
    hijriDay: 9,
    days: 2,
  },
  {
    id: 'eid-milad-un-nabi',
    key: 'eidMiladUnNabi',
    name: 'Eid Milad un Nabi',
    hijriMonth: 3,
    hijriDay: 12,
    days: 1,
  },
];

type ObservedYear = Record<
  IslamicHoliday['key'],
  { dates: string[]; source: string }
>;

const OBSERVED = holidaysData as Record<string, ObservedYear>;

function isoDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function assertIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`Expected a YYYY-MM-DD date, received ${value}`);
  }
}

/** Estimates the dates of an Islamic holiday in a Gregorian year. */
function estimateIslamicDates(
  holiday: IslamicHoliday,
  year: number,
  offset: number,
): string[] {
  const firstHijriYear = toHijri(new Date(year, 0, 1)).year;
  const dates: string[] = [];
  for (
    let hijriYear = firstHijriYear;
    hijriYear <= firstHijriYear + 1;
    hijriYear += 1
  ) {
    const start = fromHijri(
      { year: hijriYear, month: holiday.hijriMonth, day: holiday.hijriDay },
      { offset },
    );
    for (let i = 0; i < holiday.days; i += 1) {
      const day = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i,
      );
      if (day.getFullYear() === year) {
        dates.push(isoDate(day));
      }
    }
  }
  return dates;
}

/**
 * Lists Pakistan's federal public holidays for a year, sorted by date.
 *
 * Islamic holidays use the dates actually observed after moon sighting
 * (2020 onwards, from Cabinet Division and SBP notifications). For years not
 * yet in the dataset they are estimated from the tabular Hijri calendar and
 * marked `estimated: true`; pass `announced` to use official dates instead.
 *
 * Optional holidays (e.g. Shab-e-Barat, Easter, Youm-e-Ali) are not included.
 *
 * @example
 * getPakistanHolidays(2025).find((h) => h.id === 'eid-ul-fitr');
 * // { id: 'eid-ul-fitr', name: 'Eid ul Fitr', date: '2025-03-31', type: 'religious', estimated: false, ... }
 *
 * @param year - Gregorian year
 * @param options - Christian holidays, announced dates and estimate offset
 * @returns Holidays in date order
 */
export function getPakistanHolidays(
  year: number,
  options: HolidayOptions = {},
): Holiday[] {
  if (!Number.isInteger(year) || year < 1948 || year > 9999) {
    throw new RangeError(`Expected a year from 1948, received ${String(year)}`);
  }

  const holidays: Holiday[] = [];

  for (const fixed of FIXED_HOLIDAYS) {
    if (fixed.appliesIn && !fixed.appliesIn(year)) continue;
    if (fixed.christiansOnly && !options.includeChristianHolidays) continue;
    holidays.push({
      id: fixed.id,
      name: fixed.name,
      date: isoDate(new Date(year, fixed.month - 1, fixed.day)),
      type: fixed.type,
      estimated: false,
      ...(fixed.christiansOnly ? { christiansOnly: true } : {}),
    });
  }

  const observed = OBSERVED[String(year)];
  for (const islamic of ISLAMIC_HOLIDAYS) {
    const announced = options.announced?.[islamic.id];
    const recorded = observed?.[islamic.key];
    let dates: string[];
    let estimated = false;
    let source: string | undefined;

    if (announced) {
      announced.forEach(assertIsoDate);
      dates = announced;
    } else if (recorded) {
      dates = recorded.dates;
      source = recorded.source;
    } else {
      dates = estimateIslamicDates(islamic, year, options.hijriOffset ?? 0);
      estimated = true;
    }

    for (const date of dates) {
      holidays.push({
        id: islamic.id,
        name: islamic.name,
        date,
        type: 'religious',
        estimated,
        ...(source ? { source } : {}),
      });
    }
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns the public holidays that fall on a date.
 *
 * @param date - A `Date` (local calendar date) or `YYYY-MM-DD` string
 * @param options - Same options as {@link getPakistanHolidays}
 * @returns Holidays on that date; empty if it is not a public holiday
 */
export function getHolidaysOn(
  date: Date | string,
  options: HolidayOptions = {},
): Holiday[] {
  let iso: string;
  if (typeof date === 'string') {
    assertIsoDate(date);
    iso = date;
  } else {
    if (Number.isNaN(date.getTime())) {
      throw new RangeError('Invalid Date');
    }
    iso = isoDate(date);
  }
  return getPakistanHolidays(Number(iso.slice(0, 4)), options).filter(
    (holiday) => holiday.date === iso,
  );
}

/**
 * Returns whether a date is a Pakistani federal public holiday.
 *
 * @param date - A `Date` (local calendar date) or `YYYY-MM-DD` string
 * @param options - Same options as {@link getPakistanHolidays}
 * @returns `true` on a public holiday
 */
export function isPakistanHoliday(
  date: Date | string,
  options: HolidayOptions = {},
): boolean {
  return getHolidaysOn(date, options).length > 0;
}
