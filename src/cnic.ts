import { toAsciiDigits } from './internal/normalize.js';

/**
 * 13 digits, optionally grouped as `#####-#######-#` with a dash, dash-like
 * character, dot, or space between the groups. The first digit is the province
 * code (1–8), so a leading 0 or 9 is rejected.
 */
const CNIC_PATTERN = /^[1-8]\d{4}([-‐‑‒–—. ]?)\d{7}\1\d$/;

/**
 * Validates the format of a Pakistani CNIC number: 13 digits, in 5-7-1
 * groups or together, starting with a province code from 1 to 8.
 *
 * Accepts `3520212345671`, `35202-1234567-1`, `35202 1234567 1` and Urdu digits.
 * Separators must sit between the 5-7-1 digit groups and be used consistently.
 *
 * NADRA does not publish a check-digit algorithm, so this validates structure only.
 *
 * @param cnic - The CNIC string to validate
 * @returns `true` if the CNIC is valid, otherwise `false`
 */
export function validateCNIC(cnic: string): boolean {
  return CNIC_PATTERN.test(toAsciiDigits(cnic.trim()));
}

/**
 * Province of registration encoded in a CNIC's first digit, per FBR's tax-ID
 * description filed with the OECD (codes 1-7). Code 2 was issued in the former
 * FATA, which merged into Khyber Pakhtunkhwa in 2018. Code 8 for Azad Jammu and
 * Kashmir is widely reported but not in FBR's list.
 */
const CNIC_PROVINCES: Readonly<Record<string, string>> = {
  '1': 'Khyber Pakhtunkhwa',
  '2': 'Khyber Pakhtunkhwa',
  '3': 'Punjab',
  '4': 'Sindh',
  '5': 'Balochistan',
  '6': 'Islamabad Capital Territory',
  '7': 'Gilgit-Baltistan',
  '8': 'Azad Jammu and Kashmir',
};

/** Information encoded in a CNIC number. */
export interface CNICInfo {
  /** The CNIC as 13 digits without separators. */
  digits: string;
  /** The CNIC in `#####-#######-#` form. */
  formatted: string;
  /**
   * Province where the CNIC was first registered (from the first digit).
   * This is not necessarily where the holder lives now.
   */
  province: string;
  /** Gender encoded in the last digit: odd for male, even for female. */
  gender: 'male' | 'female';
}

/**
 * Reads the province of registration and gender encoded in a CNIC.
 *
 * @param cnic - CNIC in any format accepted by {@link validateCNIC}
 * @returns Decoded information, or `null` if the CNIC is invalid
 */
export function getCNICInfo(cnic: string): CNICInfo | null {
  if (!validateCNIC(cnic)) {
    return null;
  }

  const digits = toAsciiDigits(cnic).replace(/\D/g, '');
  const lastDigit = Number(digits[12]);

  return {
    digits,
    formatted: `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`,
    province: CNIC_PROVINCES[digits[0] as string] as string,
    gender: lastDigit % 2 === 1 ? 'male' : 'female',
  };
}

/** One digit: ASCII, Urdu (U+06F0-06F9) or Arabic-Indic (U+0660-0669). */
const ANY_DIGIT = /[0-9\u06F0-\u06F9\u0660-\u0669]/.source;
/** A province digit (1-8) in any of the three scripts. */
const PROVINCE_DIGIT = /[1-8\u06F1-\u06F8\u0661-\u0668]/.source;
/**
 * Horizontal space between digit groups: a space, a tab, a no-break space
 * (U+00A0) or a narrow no-break space (U+202F). Never a line break.
 */
const SPACE = /[ \t\u00A0\u202F]/.source;
/** One separator mark: a hyphen or Unicode dash (U+2010-2014), a dot, a slash or an underscore. */
const MARK = /[-\u2010\u2011\u2012\u2013\u2014./_]/.source;
/**
 * What may join two digit groups: any run of spaces, or one mark with any
 * spaces around it (`35202  1234567  1`, `35202 -1234567- 1`,
 * `35202_1234567_1`, `35202 - 1234567 - 1`). A line break never joins them.
 */
const JOIN = `(?:${SPACE}+|${SPACE}*${MARK}${SPACE}*)`;

/** One digit group: an unbroken run of digits. */
const GROUP = new RegExp(`${ANY_DIGIT}+`, 'g');
/** Digit groups joined as above, as long as the run goes. */
const DIGIT_RUN = new RegExp(`${ANY_DIGIT}+(?:${JOIN}${ANY_DIGIT}+)*`, 'g');
const FIRST_IS_PROVINCE = new RegExp(`^${PROVINCE_DIGIT}`);

/**
 * Where CNICs are in a text: `[start, end]` pairs, in order. In each run of
 * digit groups, consecutive whole groups that add up to exactly 13 digits,
 * starting with a province digit, are a CNIC; the search goes on after it.
 * A group is never split, so 13 digits inside a longer unbroken number are
 * never matched.
 */
function cnicSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  for (const run of text.matchAll(DIGIT_RUN)) {
    const groups = [...run[0].matchAll(GROUP)].map((g) => ({
      start: run.index + g.index,
      end: run.index + g.index + g[0].length,
      digits: g[0].length,
      first: g[0],
    }));
    for (let i = 0; i < groups.length; i += 1) {
      let digits = 0;
      for (let j = i; j < groups.length; j += 1) {
        digits += (groups[j] as { digits: number }).digits;
        if (digits < 13) continue;
        const from = groups[i] as { start: number; first: string };
        if (digits === 13 && FIRST_IS_PROVINCE.test(from.first)) {
          spans.push([from.start, (groups[j] as { end: number }).end]);
          i = j;
        }
        break;
      }
    }
  }
  return spans;
}

const ONE_DIGIT = new RegExp(ANY_DIGIT, 'g');

/**
 * A CNIC that {@link findCNICs} found in free text: as written, its digits,
 * its formatted form and where it is in the text.
 */
export interface CNICMatch {
  /** The text as written, e.g. `35202 1234567-1`, `352 0212 3456 71` or with Urdu digits. */
  raw: string;
  /** The 13 digits, in ASCII. */
  digits: string;
  /** The CNIC in `#####-#######-#` form. */
  formatted: string;
  /** Offset of the first character in the text (UTF-16 code units). */
  start: number;
  /** Offset just after the last character (UTF-16 code units). */
  end: number;
}

/**
 * Finds CNIC numbers in free text, such as a chat message, a note or an
 * uploaded document, for example to mask them before logging.
 *
 * Digits are read in groups (unbroken runs of digits). Groups may be joined
 * by any run of spaces or tabs, or by one mark (a hyphen or Unicode dash, a
 * dot, a slash or an underscore) with any spaces around it: `35202 1234567
 * 1`, `35202  1234567  1`, `35202 -1234567- 1`, `35202_1234567_1`,
 * `35202 - 1234567 - 1`, `352 0212 3456 71`, `35202/1234567/1`. A line
 * break never joins groups. A match is consecutive whole groups that add up
 * to exactly 13 digits, starting with a province code (1-8); the search
 * goes on after each match, so `0300-1234567 35202-1234567-1` finds the
 * CNIC. A group is never split, so 13 digits inside a longer unbroken
 * number (an IBAN, a card number) never match. Digits may be ASCII, Urdu or
 * Arabic-Indic, even mixed. This matches everything Jaanch's own CNIC
 * redaction does, except across line breaks.
 *
 * Accepting any grouping catches CNICs as people really type them, but
 * matches more that is not a CNIC: any 13 digits starting with 1-8 split
 * into groups this way (an account, order or tracking number, table
 * columns, a price list such as `8260 - 8048 - 2804 - 0`, a file name such
 * as `IMG_20261123_12345`, or two shorter numbers written together) are
 * found. {@link validateCNIC} stays strict.
 *
 * @example
 * findCNICs('CNIC: 35202-1234567-1, phone 0300-1234567');
 * // [{ raw: '35202-1234567-1', digits: '3520212345671',
 * //    formatted: '35202-1234567-1', start: 6, end: 21 }]
 * findCNICs('id 352 0212 3456 71')[0]?.digits; // '3520212345671'
 *
 * @param text - Any text
 * @returns The matches in order, or `[]` (also for a value that is not a
 *   string). Never throws.
 */
export function findCNICs(text: string): CNICMatch[] {
  if (typeof text !== 'string') return [];
  return cnicSpans(text).map(([start, end]) => {
    const raw = text.slice(start, end);
    const digits = toAsciiDigits(raw).replace(/\D/g, '');
    return {
      raw,
      digits,
      formatted: `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits[12]}`,
      start,
      end,
    };
  });
}

/** Options for {@link maskCNICs}. */
export interface MaskCNICsOptions {
  /** What each digit is replaced with, keeping the separators. Default `'X'`. */
  mask?: string;
  /**
   * Replace each whole CNIC, separators included, with this text instead,
   * e.g. `'[CNIC removed]'`. Takes precedence over `mask`.
   */
  replacement?: string;
}

/**
 * What {@link maskCNICs} returns: the text with every CNIC's digits masked,
 * and how many CNICs it masked.
 */
export interface MaskedText {
  /** The text with every CNIC masked (or replaced, with `replacement`). */
  text: string;
  /** How many CNICs were masked. */
  count: number;
}

/**
 * Masks every CNIC in free text, as found by {@link findCNICs}: each digit
 * becomes the mask and the separators stay, so `35202-1234567-1` becomes
 * `XXXXX-XXXXXXX-X`. The rest of the text is unchanged.
 *
 * With `replacement`, each whole CNIC is replaced by that text instead.
 *
 * Like {@link findCNICs}, it also masks any other 13 digits that start with
 * 1-8, however they are grouped.
 *
 * @example
 * maskCNICs('My CNIC is 35202-1234567-1');
 * // { text: 'My CNIC is XXXXX-XXXXXXX-X', count: 1 }
 * maskCNICs('35202 1234567 1', { mask: '*' });
 * // { text: '***** ******* *', count: 1 }
 * maskCNICs('CNIC 352 0212 3456 71', { replacement: '[CNIC removed]' });
 * // { text: 'CNIC [CNIC removed]', count: 1 }
 *
 * @param text - Any text
 * @param options - `mask`: the string that replaces each digit;
 *   `replacement`: the string that replaces each whole CNIC
 * @returns The masked text and the number of CNICs masked. A value that is
 *   not a string gives `{ text: '', count: 0 }`. Never throws.
 */
export function maskCNICs(
  text: string,
  options: MaskCNICsOptions = {},
): MaskedText {
  if (typeof text !== 'string') return { text: '', count: 0 };
  const mask = typeof options.mask === 'string' ? options.mask : 'X';
  const replacement =
    typeof options.replacement === 'string' ? options.replacement : null;
  const spans = cnicSpans(text);
  let out = '';
  let at = 0;
  for (const [start, end] of spans) {
    const raw = text.slice(start, end);
    out +=
      text.slice(at, start) +
      (replacement ?? raw.replace(ONE_DIGIT, () => mask));
    at = end;
  }
  return { text: out + text.slice(at), count: spans.length };
}
