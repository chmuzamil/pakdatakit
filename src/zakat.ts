import nisabData from '../data/zakat-nisab.json';
import type { DataSource } from './data-info.js';
import { isoDate } from './internal/date.js';
import { divideHalfUp, fromPaisa, toUnits } from './internal/money.js';

/** A document behind a Zakat year's nisab: its number, date and URL. */
export interface ZakatDocument {
  number: string;
  /** YYYY-MM-DD */
  date: string;
  url: string;
}

/** One Zakat year's nisab for deduction at source, as notified. */
export interface ZakatNisab {
  /** The Hijri year of the valuation date (1 Ramazan), e.g. `1447`. */
  zakatYear: number;
  /** The year as the Ministry's notification writes it, e.g. `1446-47`. */
  label: string;
  /** Nisab in rupees: accounts with a lower balance are not deducted. */
  nisab: number;
  /** The valuation (deduction) date in the Hijri calendar, e.g. `1 Ramazan 1447 AH`. */
  valuationDateHijri: string;
  /**
   * The two Gregorian dates the notification says 1 Ramazan is likely to
   * fall on (YYYY-MM-DD). The day itself depends on the moon sighting.
   */
  expectedValuationDates: [string, string];
  /**
   * The bank holiday for the deduction, when SBP's circular names a
   * Gregorian date (YYYY-MM-DD); otherwise `null`.
   */
  bankHolidayDate: string | null;
  /** The Ministry of Poverty Alleviation & Social Safety notification. */
  notification: ZakatDocument;
  /** The SBP BPRD circular letter that conveys it to banks. */
  sbpCircular: ZakatDocument;
  /** The notification and SBP circular, as a {@link DataSource}. */
  source: DataSource;
}

/** Which Zakat year: by its Hijri year (`1447`, `'1447'` or `'1446-47'`) or by a date. */
export type ZakatYearQuery =
  { zakatYear: number | string } | { date: string | Date };

/** Input of {@link zakatDeduction}. */
export type ZakatDeductionInput = ZakatYearQuery & {
  /** The account balance in rupees at the start of the valuation date. */
  balance: number;
  /** `true` if the holder filed the exemption declaration (Form CZ-50). */
  exempt?: boolean;
};

/** Result of {@link zakatDeduction}. */
export interface ZakatDeduction {
  zakatYear: number;
  nisab: number;
  balance: number;
  /** Whether Zakat is deducted from this balance. */
  deductible: boolean;
  /** Why not, when `deductible` is false. */
  reason: 'exempt' | 'below-nisab' | null;
  /** Percent of the whole balance: 2.5. */
  rate: number;
  /** The amount deducted, rounded half up to the paisa; `0` if not deductible. */
  zakat: number;
  source: DataSource;
}

interface Row {
  zakatYear: number;
  label: string;
  nisab: number;
  valuationDateHijri: string;
  expectedValuationDates: [string, string];
  bankHolidayDate: string | null;
  notification: ZakatDocument;
  sbpCircular: ZakatDocument;
}

const YEARS = nisabData as unknown as Row[];
/** Days after the last notified year's first possible start that it still certainly covers. */
const LUNAR_YEAR_DAYS = 353;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toNisab(row: Row): ZakatNisab {
  const next = YEARS.find((r) => r.zakatYear === row.zakatYear + 1);
  return {
    zakatYear: row.zakatYear,
    label: row.label,
    nisab: row.nisab,
    valuationDateHijri: row.valuationDateHijri,
    expectedValuationDates: [...row.expectedValuationDates],
    bankHolidayDate: row.bankHolidayDate,
    notification: { ...row.notification },
    sbpCircular: { ...row.sbpCircular },
    source: {
      id: 'zakat-nisab',
      // From the earlier of the two likely days of 1 Ramazan, to the day
      // before the next year's; open while it is the latest year.
      effectiveFrom: row.expectedValuationDates[0],
      effectiveTo: next ? addDays(next.expectedValuationDates[0], -1) : null,
      sourceReference: `Notification No. ${row.notification.number} (${row.notification.date}); SBP ${row.sbpCircular.number} (${row.sbpCircular.date})`,
      sourceUrl: row.notification.url,
    },
  };
}

function byYear(value: unknown): Row | undefined {
  let year: number | null = null;
  if (typeof value === 'number' && Number.isInteger(value)) year = value;
  else if (typeof value === 'string') {
    const text = value.trim();
    if (/^\d{4}$/.test(text)) year = Number(text);
    else return YEARS.find((r) => r.label === text);
  }
  return year === null ? undefined : YEARS.find((r) => r.zakatYear === year);
}

/**
 * The Zakat year a date falls in. A year starts on 1 Ramazan, which the
 * notification gives only as one of two likely days; a date on the earlier
 * of the two is ambiguous and gives `undefined`, as does a date past the
 * last notified year.
 */
function byDate(value: unknown): Row | undefined {
  const date = isoDate(value as string | Date);
  if (date === null) return undefined;
  for (let i = YEARS.length - 1; i >= 0; i -= 1) {
    const row = YEARS[i] as Row;
    const [first, second] = row.expectedValuationDates;
    if (date >= second) {
      if (i === YEARS.length - 1 && date >= addDays(first, LUNAR_YEAR_DAYS))
        return undefined;
      return row;
    }
    if (date >= first) return undefined;
  }
  return undefined;
}

function find(query: unknown): Row | undefined {
  if (query === null || typeof query !== 'object') return undefined;
  const q = query as { zakatYear?: unknown; date?: unknown };
  if (q.zakatYear !== undefined) return byYear(q.zakatYear);
  if (q.date !== undefined) return byDate(q.date);
  return undefined;
}

/**
 * The nisab for compulsory Zakat deduction at source in Pakistan for a Zakat
 * year, as notified by the Administrator-General Zakat (Ministry of Poverty
 * Alleviation & Social Safety) and conveyed to banks by SBP, Zakat years
 * 1433 to 1447 AH (2012-2026).
 *
 * Give the year (`1447`, or the notification's `'1446-47'`) or a date. A
 * Zakat year starts on 1 Ramazan; for a date on the first of the two days
 * the notification gives for it, the year is unknown and the result is
 * `null`.
 *
 * This is the nisab for deduction from savings and similar bank accounts
 * under the Zakat and Ushr Ordinance 1980, not a religious ruling on
 * personal Zakat.
 *
 * @returns The year's nisab, dates and sources, or `null` for a year that
 *   is not covered, an invalid query, or an ambiguous date. Never throws.
 *
 * @example
 * getZakatNisab({ zakatYear: 1447 })?.nisab; // 503529
 * getZakatNisab({ zakatYear: '1445-46' })?.zakatYear; // 1446
 * getZakatNisab({ date: '2025-06-01' })?.nisab; // 179689
 */
export function getZakatNisab(query: ZakatYearQuery): ZakatNisab | null {
  const row = find(query);
  return row ? toNisab(row) : null;
}

/** Every notified Zakat year, oldest first. */
export function getZakatYears(): number[] {
  return YEARS.map((r) => r.zakatYear);
}

/**
 * Zakat deducted at source from one account on the valuation date (1
 * Ramazan): 2.5% of the whole balance when it is at or above that year's
 * nisab, and nothing when it is below or the holder filed the exemption
 * declaration (Form CZ-50).
 *
 * It applies to the accounts the Ordinance subjects to deduction at source:
 * savings, profit-and-loss sharing and similar accounts (asset code 101).
 * Current accounts and foreign currency accounts are not deducted. It is
 * not a religious ruling on how much Zakat a person owes.
 *
 * @returns The deduction and its source, or `null` for an invalid balance,
 *   a year that is not covered, or an ambiguous date. Never throws.
 *
 * @example
 * zakatDeduction({ balance: 600000, zakatYear: 1447 });
 * // { zakatYear: 1447, nisab: 503529, balance: 600000, deductible: true,
 * //   reason: null, rate: 2.5, zakat: 15000, source: { … } }
 * zakatDeduction({ balance: 600000, zakatYear: 1447, exempt: true }).zakat; // 0
 */
export function zakatDeduction(
  input: ZakatDeductionInput,
): ZakatDeduction | null {
  if (input === null || typeof input !== 'object') return null;
  const paisa = toUnits(input.balance, 2);
  if (paisa === null) return null;
  const row = find(input);
  if (!row) return null;
  const { source } = toNisab(row);
  const exempt = input.exempt === true;
  const below = paisa < row.nisab * 100;
  const deductible = !exempt && !below;
  return {
    zakatYear: row.zakatYear,
    nisab: row.nisab,
    balance: fromPaisa(paisa),
    deductible,
    reason: exempt ? 'exempt' : below ? 'below-nisab' : null,
    rate: 2.5,
    zakat: deductible ? fromPaisa(divideHalfUp(BigInt(paisa) * 25n, 1000n)) : 0,
    source,
  };
}
