/** Islamic (Hijri) date components. */
export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaaban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qadah',
  'Dhu al-Hijjah',
] as const;

/**
 * Converts a Gregorian `Date` to a Hijri (Islamic) date.
 *
 * Uses the Kuwaiti algorithm (approximate, suitable for general applications).
 *
 * @param date - Gregorian date (local date components are used)
 * @returns Hijri date components
 */
export function toHijri(date: Date): HijriDate {
  const jd = gregorianToJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return julianDayToHijri(jd);
}

/**
 * Converts a Hijri date to a Gregorian `Date` (local midnight).
 *
 * @param hijri - Hijri date components
 * @returns Gregorian date
 */
export function fromHijri(hijri: HijriDate): Date {
  const jd = hijriToJulianDay(hijri.year, hijri.month, hijri.day);
  const { year, month, day } = julianDayToGregorian(jd);
  return new Date(year, month - 1, day);
}

/**
 * Formats a Gregorian date as a Hijri date string.
 *
 * @param date - Gregorian date
 * @returns Formatted Hijri string (e.g. `"14 Ramadan 1447"`)
 */
export function formatHijri(date: Date): string {
  const hijri = toHijri(date);
  const monthName = getHijriMonthName(hijri.month);
  return `${hijri.day} ${monthName} ${hijri.year}`;
}

/**
 * Returns the English name of a Hijri month (1–12).
 *
 * @param month - Hijri month number
 * @returns Month name or empty string if invalid
 */
export function getHijriMonthName(month: number): string {
  if (month < 1 || month > 12) {
    return '';
  }
  return HIJRI_MONTHS[month - 1] ?? '';
}

/**
 * Returns whether a Gregorian date falls in the month of Ramadan.
 *
 * @param date - Gregorian date
 * @returns `true` during Ramadan
 */
export function isRamadan(date: Date): boolean {
  return toHijri(date).month === 9;
}

function gregorianToJulianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  );
}

function julianDayToGregorian(jd: number): {
  year: number;
  month: number;
  day: number;
} {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A = Z;

  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  return {
    year: Math.floor(year),
    month,
    day: Math.floor(day),
  };
}

function julianDayToHijri(jd: number): HijriDate {
  const l = Math.floor(jd - 1948440 + 10632);
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { year, month, day };
}

function hijriToJulianDay(year: number, month: number, day: number): number {
  return (
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385
  );
}
