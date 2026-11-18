/** Calendar dates shared by the sales tax and income tax modules. */

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** `YYYY-MM-DD` for a valid calendar date, otherwise `null`. */
export function isoDate(input: unknown): string | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    const year = input.getFullYear();
    if (year < 0 || year > 9999) return null;
    return `${pad(input.getFullYear(), 4)}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`;
  }
  if (typeof input !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > (days[m - 1] as number)) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}
