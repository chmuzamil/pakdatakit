/** Islamic (Hijri) date components. */
export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

/** Options for Hijri conversions. */
export interface HijriOptions {
  /**
   * Whole days to shift the tabular calendar by, to match local moon sighting.
   * For example, `-1` when Pakistan's Ruet-e-Hilal calendar runs a day behind
   * the tabular date. Defaults to `0`.
   */
  offset?: number;
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
 * Uses the tabular (arithmetic, "islamic-civil") calendar. Actual dates in
 * Pakistan follow moon sighting and can differ by a day or two; pass
 * `options.offset` to adjust.
 *
 * @param date - Gregorian date (local date components are used)
 * @param options - Optional day offset for moon-sighting adjustment
 * @returns Hijri date components
 * @throws {RangeError} If `date` is invalid or `offset` is not an integer
 */
export function toHijri(date: Date, options: HijriOptions = {}): HijriDate {
  assertValidDate(date);
  const jdn = gregorianToJulianDayNumber(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return julianDayNumberToHijri(jdn + resolveOffset(options));
}

/**
 * Converts a Hijri date to a Gregorian `Date` (local midnight).
 *
 * @param hijri - Hijri date components
 * @param options - Optional day offset, matching the one used with {@link toHijri}
 * @returns Gregorian date
 * @throws {RangeError} If the Hijri components are out of range
 */
export function fromHijri(hijri: HijriDate, options: HijriOptions = {}): Date {
  assertValidHijri(hijri);
  const jdn =
    hijriToJulianDayNumber(hijri.year, hijri.month, hijri.day) -
    resolveOffset(options);
  const { year, month, day } = julianDayNumberToGregorian(jdn);
  const result = new Date(year, month - 1, day);
  // `new Date()` maps years 0-99 to 1900-1999; set the full year explicitly.
  result.setFullYear(year);
  return result;
}

/**
 * Formats a Gregorian date as a Hijri date string.
 *
 * @param date - Gregorian date
 * @param options - Optional day offset for moon-sighting adjustment
 * @returns Formatted Hijri string (e.g. `"14 Ramadan 1447"`)
 */
export function formatHijri(date: Date, options: HijriOptions = {}): string {
  const hijri = toHijri(date, options);
  return `${hijri.day} ${HIJRI_MONTHS[hijri.month - 1]} ${hijri.year}`;
}

/**
 * Returns the English name of a Hijri month (1–12).
 *
 * @param month - Hijri month number
 * @returns Month name, or `null` if `month` is not an integer from 1 to 12
 */
export function getHijriMonthName(month: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return HIJRI_MONTHS[month - 1] ?? null;
}

/**
 * Returns whether a Gregorian date falls in the month of Ramadan.
 *
 * @param date - Gregorian date
 * @param options - Optional day offset for moon-sighting adjustment
 * @returns `true` during Ramadan
 */
export function isRamadan(date: Date, options: HijriOptions = {}): boolean {
  return toHijri(date, options).month === 9;
}

function assertValidDate(date: Date): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid Date');
  }
}

function assertValidHijri(hijri: HijriDate): void {
  const { year, month, day } = hijri;
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 30
  ) {
    throw new RangeError(
      `Invalid Hijri date: ${String(year)}-${String(month)}-${String(day)}`,
    );
  }
}

function resolveOffset(options: HijriOptions): number {
  const offset = options.offset ?? 0;
  if (!Number.isInteger(offset)) {
    throw new RangeError(
      `Hijri offset must be an integer, received ${String(offset)}`,
    );
  }
  return offset;
}

/** Gregorian calendar date → Julian Day Number (integer). */
function gregorianToJulianDayNumber(
  year: number,
  month: number,
  day: number,
): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Julian Day Number → Gregorian calendar date. */
function julianDayNumberToGregorian(jdn: number): {
  year: number;
  month: number;
  day: number;
} {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

/** Julian Day Number → tabular Hijri date. */
function julianDayNumberToHijri(jdn: number): HijriDate {
  const l = jdn - 1948440 + 10632;
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

/** Tabular Hijri date → Julian Day Number. */
function hijriToJulianDayNumber(
  year: number,
  month: number,
  day: number,
): number {
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
