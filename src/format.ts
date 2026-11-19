const LAKH = 100_000;
const CRORE = 10_000_000;

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
});

function assertFinite(amount: number): void {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new RangeError(
      `Amount must be a finite number, received ${String(amount)}`,
    );
  }
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a numeric amount as Pakistani Rupees with comma separators,
 * rounded to whole rupees. Negative amounts are prefixed with `-`.
 *
 * @param amount - The amount in PKR
 * @returns Formatted string (e.g. `"Rs. 150,000"`, `"-Rs. 500"`)
 * @throws {RangeError} If `amount` is `NaN` or infinite
 */
export function formatPKR(amount: number): string {
  assertFinite(amount);
  const rounded = Math.round(Math.abs(amount));
  const sign = amount < 0 && rounded !== 0 ? '-' : '';
  return `${sign}Rs. ${pkrFormatter.format(rounded)}`;
}

/**
 * Formats a numeric amount using Pakistani lakh/crore conventions.
 *
 * - Amounts of 1 crore or more render as `"N Crore"` (e.g. `10000000` → `"1 Crore"`)
 * - Amounts of 1 lakh or more render as `"N Lakh"` (e.g. `2500000` → `"25 Lakh"`)
 * - Smaller amounts fall back to {@link formatPKR}
 *
 * Values are rounded to two decimals before the unit is chosen, so
 * `9999999` renders as `"1 Crore"` rather than `"100 Lakh"`.
 * Negative amounts are prefixed with `-`.
 *
 * @param amount - The amount in PKR
 * @returns Human-readable lakh/crore string
 * @throws {RangeError} If `amount` is `NaN` or infinite
 */
export function formatLakh(amount: number): string {
  assertFinite(amount);
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);

  const crores = roundTo2(absolute / CRORE);
  if (crores >= 1) {
    return `${sign}${crores} Crore`;
  }

  const lakhs = roundTo2(absolute / LAKH);
  if (lakhs >= 1) {
    return `${sign}${lakhs} Lakh`;
  }

  return formatPKR(amount);
}

/** The result of {@link parseAmount}. */
export interface ParsedAmount {
  /** The amount in rupees, rounded half-up to the paisa (2 decimals). */
  value: number;
  /** The input with surrounding whitespace removed. */
  raw: string;
}

/** Whitespace around and inside an amount: space, tab, line breaks, no-break spaces. */
const SPACE = /[ \t\n\r\u00A0\u202F]/.source;
const TRIM = new RegExp(`^${SPACE}+|${SPACE}+$`, 'g');
/** Rs, Rs., PKR or ₨ (after ASCII letters are lower-cased). */
const CURRENCY = /(rs\.?|pkr|\u20A8)/.source;
/**
 * 1,234,567 (international) | 12,34,567 (Pakistani) | 1234567, then an
 * optional decimal part.
 */
const NUMBER = /(\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3}|\d+)?(?:\.(\d*))?/
  .source;
/** × 1,000: k, thousand(s), hazar, ہزار. */
const THOUSAND = /k|thousands?|hazar|\u06C1\u0632\u0627\u0631/.source;
/** × 100,000: lakh(s), lac(s), لاکھ. */
const LAKH_UNIT = /lakhs?|lacs?|\u0644\u0627\u06A9\u06BE/.source;
/** × 10,000,000: crore(s), cr, کروڑ. */
const CRORE_UNIT = /crores?|cr|\u06A9\u0631\u0648\u0691/.source;
const AMOUNT = new RegExp(
  `^(?:${CURRENCY}${SPACE}*)?${NUMBER}` +
    `(?:${SPACE}*(${THOUSAND}|${LAKH_UNIT}|${CRORE_UNIT}))?` +
    `(?:${SPACE}*${CURRENCY})?(?:${SPACE}*(\\/-))?$`,
);

/** The power of ten a shorthand unit multiplies by. */
function unitExponent(unit: string | undefined): number {
  if (unit === undefined) return 0;
  if (new RegExp(`^(?:${THOUSAND})$`).test(unit)) return 3;
  if (new RegExp(`^(?:${LAKH_UNIT})$`).test(unit)) return 5;
  return 7;
}

/**
 * The largest amount, in paisa: Rs. 50 trillion (50 lakh crore). Below 2^46
 * rupees (about 70 trillion) a JavaScript number holds every paisa exactly.
 */
const MAX_PAISA = 5_000_000_000_000_000n;

/**
 * Reads a rupee amount the way people type it in Pakistan, and returns it in
 * rupees, rounded half-up to the paisa. Returns `null` for anything that is
 * not exactly one non-negative amount; it never throws.
 *
 * Accepted:
 * - digits, with or without grouping: `150000`, `150,000` (international) or
 *   `1,50,000` (Pakistani: groups of two, then three), and decimals
 *   (`1,234.50`, `.5`, `5.`); a grouping must be complete and consistent;
 * - Urdu (`۱۵۰۰۰۰`) and Arabic-Indic (`١٥٠٠٠٠`) digits, also mixed with
 *   0-9, and the Arabic decimal and thousands separators (`٫`, `٬`);
 * - one currency mark before or after the number: `Rs`, `Rs.`, `PKR` or `₨`
 *   (any case), and a trailing `/-` (`Rs. 5,000/-`);
 * - one shorthand unit after the number, with or without a space, in any
 *   case: `k`, `thousand(s)`, `hazar`, `ہزار` (× 1,000); `lakh(s)`, `lac(s)`,
 *   `لاکھ` (× 100,000); `crore(s)`, `cr`, `کروڑ` (× 10,000,000). Decimals
 *   work with units: `1.5 lakh` is 150,000 and `2.25cr` is 22,500,000;
 * - whitespace around and between the parts (spaces, tabs, line breaks and
 *   no-break spaces).
 *
 * Rejected (`null`): empty input, negative or signed amounts (`-500`,
 * `+500`), ranges (`5-10k`), more than one number (`500 600`), two currency
 * marks or two units, leftover letters (`500 rupees`, `5kk`), grouping that
 * could be read two ways or is broken (`1,50`, `1.500,00`, `1,5000`), and
 * amounts over Rs. 50 trillion (50 lakh crore), beyond which a number can no
 * longer hold every paisa exactly.
 *
 * The arithmetic is done on the digits, so the result is exact: `1.005`
 * rounds to 1.01 and `1.5 lakh` is exactly 150000.
 *
 * @param input - The amount as typed
 * @returns `{ value, raw }`, or `null` if the input is not one amount
 * @example
 * parseAmount('Rs. 1,50,000/-'); // { value: 150000, raw: 'Rs. 1,50,000/-' }
 * parseAmount('2.25cr'); // { value: 22500000, raw: '2.25cr' }
 * parseAmount('5-10k'); // null
 */
export function parseAmount(input: string): ParsedAmount | null {
  if (typeof input !== 'string') return null;
  const raw = input.replace(TRIM, '');
  const text = raw
    // Urdu (Extended Arabic-Indic) and Arabic-Indic digits, and the Arabic
    // decimal and thousands separators.
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
    .replace(/[A-Z]/g, (c) => c.toLowerCase());
  const match = AMOUNT.exec(text);
  if (!match) return null;
  const [, before, whole = '', fraction, unit, after] = match;
  if (before !== undefined && after !== undefined) return null;
  if (whole === '' && (fraction === undefined || fraction === '')) return null;

  // Move the decimal point by the unit's power of ten, on the digit string.
  const digits = whole.replace(/,/g, '') + (fraction ?? '');
  const point = whole.replace(/,/g, '').length + unitExponent(unit);
  const padded = digits.padEnd(point + 3, '0');
  const rupees = padded.slice(0, point) || '0';
  const paisa = padded.slice(point, point + 2);
  let cents = BigInt(rupees + paisa);
  if (padded.charCodeAt(point + 2) >= 0x35) cents += 1n; // half-up
  if (cents > MAX_PAISA) return null;
  return { value: Number(cents) / 100, raw };
}

/**
 * Writes back an amount typed in any form {@link parseAmount} accepts, for
 * showing next to the field ("= Rs. 150,000"): `Rs.`, international
 * grouping, and paisa only when there are any (`Rs. 1,234.50`). Returns
 * `null` when `parseAmount` does; it never throws.
 *
 * @param input - The amount as typed
 * @returns E.g. `"Rs. 150,000"` for `"1.5 lakh"`, or `null`
 */
export function formatAmountInput(input: string): string | null {
  const parsed = parseAmount(input);
  if (parsed === null) return null;
  const cents = Math.round(parsed.value * 100);
  const rupees = String(Math.floor(cents / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );
  const paisa = cents % 100;
  return `Rs. ${rupees}${paisa ? `.${String(paisa).padStart(2, '0')}` : ''}`;
}
