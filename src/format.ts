const LAKH = 100_000;
const CRORE = 10_000_000;

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
});

/**
 * Formats a numeric amount as Pakistani Rupees with comma separators.
 *
 * Non-finite values and negative amounts are treated as zero.
 *
 * @param amount - The amount in PKR
 * @returns Formatted string (e.g. `"Rs. 150,000"`)
 */
export function formatPKR(amount: number): string {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return `Rs. ${pkrFormatter.format(safeAmount)}`;
}

function formatScaled(value: number, unit: 'Lakh' | 'Crore'): string {
  const rounded = Math.round(value * 100) / 100;
  const formatted =
    Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${formatted} ${unit}`;
}

/**
 * Formats a numeric amount using Pakistani lakh/crore conventions.
 *
 * - Amounts >= 1 crore render as `"N Crore"` (e.g. `10000000` → `"1 Crore"`)
 * - Amounts >= 1 lakh render as `"N Lakh"` (e.g. `2500000` → `"25 Lakh"`)
 * - Smaller amounts fall back to {@link formatPKR}
 *
 * Non-finite values and negative amounts are treated as zero.
 *
 * @param amount - The amount in PKR
 * @returns Human-readable lakh/crore string
 */
export function formatLakh(amount: number): string {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

  if (safeAmount >= CRORE) {
    return formatScaled(safeAmount / CRORE, 'Crore');
  }

  if (safeAmount >= LAKH) {
    return formatScaled(safeAmount / LAKH, 'Lakh');
  }

  return formatPKR(safeAmount);
}
