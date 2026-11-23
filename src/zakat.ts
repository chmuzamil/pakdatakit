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

/** Who announced 1 Ramazan, and where the announcement was reported. */
export interface ZakatRamazan1Source {
  /** `Central Ruet-e-Hilal Committee`. */
  authority: string;
  /** The outlet that reported the announcement, e.g. `Dawn`. */
  reportedBy: string;
  /** The report's date (YYYY-MM-DD), or `null` if not recorded. */
  reportedOn: string | null;
  /** The report's URL, where recorded. */
  url?: string;
}

/** One Zakat year's nisab for deduction at source, as notified. */
export interface ZakatNisab {
  /** The Hijri year of the valuation date (1 Ramazan), e.g. `1447`. */
  zakatYear: number;
  /** The year as the Ministry's notification writes it, e.g. `1446-47`. */
  label: string;
  /** Nisab in rupees: accounts with a lower balance are not deducted. */
  nisab: number;
  /** The valuation date in the Hijri calendar, e.g. `1 Ramazan 1447 AH`. */
  valuationDateHijri: string;
  /**
   * The valuation date: 1 Ramazan in the Gregorian calendar (YYYY-MM-DD), as
   * announced by the Central Ruet-e-Hilal Committee. Zakat years are
   * assigned to dates by it.
   */
  ramazan1: string;
  ramazan1Source: ZakatRamazan1Source;
  /**
   * The deduction day: the bank holiday SBP declares for it (YYYY-MM-DD).
   * It is `ramazan1`, or the next working day when 1 Ramazan falls on a
   * weekend or public holiday (for example 24 March 2023, after Pakistan
   * Day). `null` where no SBP holiday circular was found.
   */
  bankHolidayDate: string | null;
  /** The Ministry of Poverty Alleviation & Social Safety notification. */
  notification: ZakatDocument;
  /** The SBP BPRD circular letter that conveys it to banks. */
  sbpCircular: ZakatDocument;
  /** Notes on the documents, including the notification's "likely to fall on" text. */
  note: string | null;
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
  /**
   * `true` if the holder has a valid exemption declaration (Form CZ-50) with
   * the bank: filed at least 30 days before the valuation date, sworn before
   * a magistrate, oath commissioner, notary public or other person
   * authorised to administer oaths, in the presence of two witnesses (Zakat
   * and Ushr Ordinance 1980, s. 1(3), proviso (a)). The library does not
   * check the declaration.
   */
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
  /**
   * The amount deducted, in whole rupees (First Schedule, Note 2: less than
   * a rupee is not charged, 50 paisa or more counts as a rupee); `0` if not
   * deductible.
   */
  zakat: number;
  source: DataSource;
}

interface Row {
  zakatYear: number;
  label: string;
  nisab: number;
  valuationDateHijri: string;
  ramazan1: string;
  ramazan1Source: ZakatRamazan1Source;
  bankHolidayDate: string | null;
  notification: ZakatDocument;
  sbpCircular: ZakatDocument;
  note?: string;
}

const YEARS = nisabData as unknown as Row[];
/** Days after the last notified year's 1 Ramazan that it still certainly covers. */
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
    ramazan1: row.ramazan1,
    ramazan1Source: { ...row.ramazan1Source },
    bankHolidayDate: row.bankHolidayDate,
    notification: { ...row.notification },
    sbpCircular: { ...row.sbpCircular },
    note: row.note ?? null,
    source: {
      id: 'zakat-nisab',
      // From 1 Ramazan to the day before the next year's; open while it is
      // the latest year.
      effectiveFrom: row.ramazan1,
      effectiveTo: next ? addDays(next.ramazan1, -1) : null,
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
 * The Zakat year a date falls in: the last year whose 1 Ramazan is on or
 * before it. A date before the first covered year, or 353 days or more
 * after the last year's 1 Ramazan (next year not yet notified), gives
 * `undefined`.
 */
function byDate(value: unknown): Row | undefined {
  const date = isoDate(value as string | Date);
  if (date === null) return undefined;
  for (let i = YEARS.length - 1; i >= 0; i -= 1) {
    const row = YEARS[i] as Row;
    if (date < row.ramazan1) continue;
    if (
      i === YEARS.length - 1 &&
      date >= addDays(row.ramazan1, LUNAR_YEAR_DAYS)
    )
      return undefined;
    return row;
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
 * Zakat year starts on 1 Ramazan (`ramazan1`, as the Central Ruet-e-Hilal
 * Committee announced it), and a date belongs to the last year whose 1
 * Ramazan is on or before it.
 *
 * This is the nisab for deduction from savings and similar bank accounts
 * under the Zakat and Ushr Ordinance 1980, not a religious ruling on
 * personal Zakat.
 *
 * @returns The year's nisab, dates and sources, or `null` for a year that
 *   is not covered or an invalid query. Never throws.
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
 * Ramazan): 2.5% of the whole balance, rounded to the nearest rupee
 * (First Schedule, Note 2), when it is at or above that year's nisab, and
 * nothing when it is below or the holder has a valid exemption declaration
 * (Form CZ-50).
 *
 * A balance exactly equal to the nisab is deducted: every notification
 * says no deduction where the balance is "less than" the nisab, and the
 * Ordinance (s. 2(xxiii)) defines a sahib-e-nisab as owning "not less than
 * nisab". The First Schedule's own wording ("does not exceed") would not
 * deduct it. In Punjab the Punjab Zakat and Ushr Act 2018 replaced the
 * Ordinance, with the same First Schedule wording.
 *
 * It applies to the accounts the Ordinance subjects to deduction at source:
 * savings, profit-and-loss sharing and similar accounts (asset code 101).
 * Current accounts and foreign currency accounts are not deducted. It is
 * not a religious ruling on how much Zakat a person owes.
 *
 * @returns The deduction and its source, or `null` for an invalid balance,
 *   a year that is not covered. Never throws.
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
    zakat: deductible ? zakatRupees(paisa) : 0,
    source,
  };
}

/**
 * 2.5% of a balance in paisa, as the First Schedule's Note 2 rounds it:
 * less than a rupee is not charged; otherwise 50 paisa or more counts as a
 * rupee and less than 50 paisa is dropped.
 */
function zakatRupees(balancePaisa: number): number {
  const exact = BigInt(balancePaisa) * 25n; // thousandths of a paisa
  if (exact < 100000n) return 0;
  return divideHalfUp(exact, 100000n);
}
