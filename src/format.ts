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
