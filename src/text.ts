import {
  lazy,
  normalizeWhitespace,
  toAsciiDigits,
} from './internal/normalize.js';

const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Common Roman Urdu spelling normalizations (informal → preferred).
 *
 * Only unambiguous variants are listed: words like "men"/"mein" ("in") and
 * "main" ("I") are left alone because rewriting them changes the meaning.
 */
const ROMAN_URDU_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bkia\b/gi, 'kya'],
  [/\bker\b/gi, 'kar'],
  [/\bkr\b/gi, 'kar'],
  [/\bhy\b/gi, 'hai'],
  [/\bmujhay\b/gi, 'mujhe'],
  [/\bap\b/gi, 'aap'],
  [/\bshukria\b/gi, 'shukriya'],
  [/\bnhi\b/gi, 'nahi'],
  [/\bassalamu alaikum\b/gi, 'assalamualaikum'],
  [/\bassalam o alaikum\b/gi, 'assalamualaikum'],
];

/**
 * Normalizes general text: trims, collapses whitespace, and applies Unicode NFC.
 *
 * @param text - Input text
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return normalizeWhitespace(text.normalize('NFC'));
}

/**
 * Normalizes informal Roman Urdu spellings to common canonical forms.
 *
 * Also applies {@link normalizeText} and converts Urdu/Arabic digits to English.
 * A capitalized word keeps its capital; all-caps words (acronyms such as "AP")
 * are left unchanged.
 *
 * @param text - Roman Urdu input
 * @returns Normalized Roman Urdu string
 */
export function normalizeRomanUrdu(text: string): string {
  let result = normalizeText(toEnglishDigits(text));

  for (const [pattern, replacement] of ROMAN_URDU_REPLACEMENTS) {
    result = result.replace(pattern, (match) => matchCase(match, replacement));
  }

  return result;
}

/**
 * Converts English/Arabic-Indic digits in a string to Urdu digits (۰–۹).
 *
 * @param text - Input text
 * @returns Text with Urdu digits
 */
export function toUrduDigits(text: string): string {
  return toAsciiDigits(text).replace(
    /\d/g,
    (digit) => URDU_DIGITS[Number(digit)] as string,
  );
}

/**
 * Converts Urdu/Arabic-Indic digits in a string to English digits (0–9).
 *
 * @param text - Input text
 * @returns Text with English digits
 */
export function toEnglishDigits(text: string): string {
  return toAsciiDigits(text);
}

function matchCase(original: string, replacement: string): string {
  if (original.length > 1 && original === original.toUpperCase()) {
    return original;
  }
  const first = original[0] as string;
  if (first !== first.toLowerCase()) {
    return replacement[0]?.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// ---------------------------------------------------------------------------
// Slugs, Urdu sorting and bidirectional text
// ---------------------------------------------------------------------------

/**
 * Which letters {@link slugify} keeps in a URL slug: `any` (Latin and Urdu),
 * `latin` (a-z only) or `urdu` (Urdu letters only).
 */
export type SlugScript = 'any' | 'latin' | 'urdu';

/**
 * Options for {@link slugify}: which script's letters to keep in the slug.
 * Digits are always kept, converted to 0-9.
 */
export interface SlugifyOptions {
  /**
   * `any` (default) keeps Latin and Urdu letters, `latin` keeps only `a-z`,
   * `urdu` keeps only Urdu letters. Digits are always kept, as `0-9`.
   */
  script?: SlugScript;
}

/** Marks and invisible characters that slugs and sorting skip. */
const SKIPPED =
  /[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u061c\u0640\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u;

/** Arabic-script letters (Urdu letters and their Arabic look-alikes). */
function isArabicLetter(cp: number): boolean {
  return (
    (cp >= 0x0621 && cp <= 0x064a && cp !== 0x0640) ||
    (cp >= 0x066e && cp <= 0x06d3) ||
    cp === 0x06d5 ||
    (cp >= 0x06fa && cp <= 0x06ff)
  );
}

/** Arabic look-alikes written for Urdu letters: ك ي ى → ک ی ی. */
const URDU_FOR_ARABIC: Readonly<Record<string, string>> = {
  ك: 'ک',
  ي: 'ی',
  ى: 'ی',
};

/** Latin-1 letters with accents (lower case), folded to ASCII for slugs. */
const LATIN1_FOLD: Readonly<Record<string, string>> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', æ: 'ae', ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i',
  ð: 'd', ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y', þ: 'th', ß: 'ss',
}; // prettier-ignore

/**
 * Turns text into a URL slug: lower-case words joined by `-`.
 *
 * Urdu letters are kept as they are (no transliteration: Urdu does not write
 * short vowels, so there is no single Roman spelling). Diacritics, tatweel
 * and zero-width characters are dropped, the Arabic look-alikes ك ي ى become
 * the Urdu ک ی ی, Urdu and Arabic-Indic digits become `0-9`, and accented
 * Latin-1 letters lose their accents (`é` → `e`, `ß` → `ss`). Anything else
 * separates words.
 *
 * @example
 * slugify('Lahore Fort, 2024'); // "lahore-fort-2024"
 * slugify('لاہور قلعہ'); // "لاہور-قلعہ"
 * slugify('لاہور Fort', { script: 'latin' }); // "fort"
 * slugify('کراچی ۲۰۲۴', { script: 'urdu' }); // "کراچی-2024"
 *
 * @returns The slug, or `''` when nothing is left (or the input is not a
 *   string). Never throws.
 */
export function slugify(input: string, options: SlugifyOptions = {}): string {
  if (typeof input !== 'string') return '';
  const script = slugScript(options);
  const keepLatin = script !== 'urdu';
  const keepUrdu = script !== 'latin';
  let out = '';
  let pending = false;
  const push = (text: string): void => {
    if (pending && out.length > 0) out += '-';
    pending = false;
    out += text;
  };
  for (const char of toAsciiDigits(input)) {
    if (SKIPPED.test(char)) continue;
    const cp = char.codePointAt(0) as number;
    if (cp >= 0x30 && cp <= 0x39) {
      push(char);
      continue;
    }
    if (keepLatin) {
      if (cp >= 0x61 && cp <= 0x7a) {
        push(char);
        continue;
      }
      if (cp >= 0x41 && cp <= 0x5a) {
        push(String.fromCharCode(cp + 0x20));
        continue;
      }
      // À-Þ (except ×) are the capitals of à-þ.
      const lower =
        cp >= 0xc0 && cp <= 0xde && cp !== 0xd7
          ? String.fromCharCode(cp + 0x20)
          : char;
      const folded = LATIN1_FOLD[lower];
      if (folded !== undefined) {
        push(folded);
        continue;
      }
    }
    if (keepUrdu && isArabicLetter(cp)) {
      push(URDU_FOR_ARABIC[char] ?? char);
      continue;
    }
    pending = true;
  }
  return out;
}

function slugScript(options: unknown): SlugScript {
  if (typeof options !== 'object' || options === null) return 'any';
  const script = (options as { script?: unknown }).script;
  return script === 'latin' || script === 'urdu' ? script : 'any';
}

/**
 * Urdu letters in alphabetical order, from the CLDR `ur` collation
 * (common/collation/ur.xml, CLDR 49). Each letter followed by ھ (بھ, پھ, …)
 * is a letter of its own, right after it.
 */
const URDU_ORDER: readonly string[] = [
  'ا', 'آ', 'ب', 'بھ', 'پ', 'پھ', 'ت', 'تھ', 'ٹ', 'ٹھ', 'ث', 'ج', 'جھ', 'چ',
  'چھ', 'ح', 'خ', 'د', 'دھ', 'ڈ', 'ڈھ', 'ذ', 'ر', 'رھ', 'ڑ', 'ڑھ', 'ز', 'ژ',
  'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'کھ', 'گ', 'گھ',
  'ل', 'لھ', 'م', 'مھ', 'ن', 'نھ', 'ں', 'ںھ', 'و', 'وھ', 'ہ', 'ھ', 'ۃ', 'ء',
  'ی', 'یھ', 'ے',
]; // prettier-ignore

/** Letters with a hamza that sort as their base letter, secondarily after it. */
const HAMZA_VARIANTS: Readonly<Record<string, string>> = {
  'أ': 'ا', 'ؤ': 'و', 'ۂ': 'ہ', 'ئ': 'ی', 'ۓ': 'ے',
}; // prettier-ignore

/** Diacritics in CLDR's secondary order (ْ < َ < ِ < … < ٓ). */
const DIACRITICS =
  '\u0652\u064e\u0650\u064f\u0670\u0656\u0657\u064b\u064d\u064c\u0654\u0651\u0658\u0653';
const HAMZA_ABOVE_WEIGHT = 1 + DIACRITICS.indexOf('\u0654');

const urduRank = /* @__PURE__ */ lazy(
  () => new Map(URDU_ORDER.map((letter, index) => [letter, index])),
);

// Primary groups, in sorting order.
const PUNCTUATION = 1;
const DIGIT = 2;
const URDU = 3;
const OTHER_ARABIC = 4;
const OTHER = 5;

interface CollationKey {
  primary: number[];
  secondary: number[];
}

function isPunctuation(cp: number): boolean {
  return (
    cp <= 0x2f ||
    (cp >= 0x3a && cp <= 0x40) ||
    (cp >= 0x5b && cp <= 0x60) ||
    (cp >= 0x7b && cp <= 0xbf) ||
    (cp >= 0x2000 && cp <= 0x206f) ||
    (cp >= 0x0600 && cp <= 0x060f) ||
    cp === 0x061b ||
    (cp >= 0x061d && cp <= 0x061f) ||
    (cp >= 0x066a && cp <= 0x066d) ||
    cp === 0x06d4
  );
}

function digitValue(cp: number): number {
  if (cp >= 0x30 && cp <= 0x39) return cp - 0x30;
  if (cp >= 0x0660 && cp <= 0x0669) return cp - 0x0660;
  if (cp >= 0x06f0 && cp <= 0x06f9) return cp - 0x06f0;
  return -1;
}

function isArabicScript(cp: number): boolean {
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  );
}

/** A primary weight: the group times 2^21, plus the rank within the group. */
const weight = (group: number, rank: number): number => group * 0x200000 + rank;

function collationKey(text: string): CollationKey {
  const chars = Array.from(text);
  const ranks = urduRank();
  const primary: number[] = [];
  const secondary: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i] as string;
    const diacritic = DIACRITICS.indexOf(char);
    if (diacritic >= 0) {
      secondary.push(1 + diacritic);
      continue;
    }
    if (SKIPPED.test(char)) continue;
    const base = HAMZA_VARIANTS[char];
    let letter = base ?? char;
    if (letter === 'ا' && chars[i + 1] === '\u0653') {
      letter = 'آ';
      i++;
    }
    const rank = ranks.get(letter);
    if (rank !== undefined) {
      const joined = ranks.get(letter + (chars[i + 1] ?? ''));
      if (chars[i + 1] === 'ھ' && joined !== undefined) {
        primary.push(weight(URDU, joined));
        i++;
      } else {
        primary.push(weight(URDU, rank));
      }
      secondary.push(0);
      if (base !== undefined) secondary.push(HAMZA_ABOVE_WEIGHT);
      continue;
    }
    const cp = char.codePointAt(0) as number;
    const digit = digitValue(cp);
    if (digit >= 0) {
      primary.push(weight(DIGIT, digit));
    } else if (isPunctuation(cp)) {
      primary.push(weight(PUNCTUATION, cp));
    } else if (isArabicScript(cp)) {
      primary.push(weight(OTHER_ARABIC, cp));
    } else {
      primary.push(weight(OTHER, cp >= 0x41 && cp <= 0x5a ? cp + 0x20 : cp));
    }
    secondary.push(0);
  }
  return { primary, secondary };
}

function compareArrays(a: readonly number[], b: readonly number[]): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const x = a[i] as number;
    const y = b[i] as number;
    if (x !== y) return x < y ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function codePoints(text: string): number[] {
  return Array.from(text, (char) => char.codePointAt(0) as number);
}

/**
 * Compares two strings in Urdu alphabetical order, for `Array.sort`.
 *
 * Letters follow the Unicode CLDR collation for Urdu (`ur`, CLDR 49):
 * ا آ ب بھ پ پھ ت تھ ٹ ٹھ ث ج جھ چ چھ ح خ د دھ ڈ ڈھ ذ ر رھ ڑ ڑھ ز ژ س ش ص ض
 * ط ظ ع غ ف ق ک کھ گ گھ ل لھ م مھ ن نھ ں ںھ و وھ ہ ھ ۃ ء ی یھ ے. A letter
 * joined with ھ is a letter of its own (so بھ comes after every other ب
 * word). أ ؤ ۂ ئ ۓ sort as ا و ہ ی ے and come just after them when words are
 * otherwise equal, and diacritics only break ties, in CLDR's order.
 *
 * Outside the Urdu letters: spaces and punctuation come first, then digits
 * digit by digit (Urdu, Arabic-Indic and ASCII digits are equal; `10` comes
 * before `2`), then Urdu letters, then other Arabic-script characters (the
 * look-alikes ك ي ى ه ة, which CLDR does not treat as Urdu letters), then
 * everything else by code point, ignoring ASCII case. Strings that are
 * still equal are ordered by code point, so the result is 0 only for
 * identical strings.
 *
 * @example
 * ['ے', 'بھائی', 'آم', 'باغ', 'اب'].sort(compareUrdu);
 * // ["اب", "آم", "باغ", "بھائی", "ے"]
 *
 * @returns `-1`, `0` or `1`. A value that is not a string is treated as
 *   `''`. Never throws.
 */
export function compareUrdu(a: string, b: string): -1 | 0 | 1 {
  const x = typeof a === 'string' ? a : '';
  const y = typeof b === 'string' ? b : '';
  if (x === y) return 0;
  const kx = collationKey(x);
  const ky = collationKey(y);
  const result =
    compareArrays(kx.primary, ky.primary) ||
    compareArrays(kx.secondary, ky.secondary) ||
    compareArrays(codePoints(x), codePoints(y));
  return result < 0 ? -1 : result > 0 ? 1 : 0;
}

/** Letters of right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, …). */
function isRtlCodePoint(cp: number): boolean {
  return (
    (cp >= 0x0590 && cp <= 0x08ff) ||
    (cp >= 0xfb1d && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff) ||
    (cp >= 0x10800 && cp <= 0x10fff) ||
    (cp >= 0x1e800 && cp <= 0x1efff)
  );
}

const LETTER = /\p{L}/u;

/**
 * Whether text reads right to left: its first letter is from a right-to-left
 * script such as Urdu or Arabic. Digits, punctuation and spaces are skipped,
 * as in the Unicode bidirectional algorithm's paragraph rule.
 *
 * @example
 * isRTL('سلام'); // true
 * isRTL('123 سلام'); // true
 * isRTL('Order نمبر'); // false
 *
 * @returns `false` when there is no letter, or the input is not a string.
 *   Never throws.
 */
export function isRTL(text: string): boolean {
  if (typeof text !== 'string') return false;
  for (const char of text) {
    if (LETTER.test(char)) return isRtlCodePoint(char.codePointAt(0) as number);
  }
  return false;
}

/**
 * Direction for {@link wrapBidi}: `auto` follows the first strong letter,
 * `rtl` and `ltr` force right-to-left or left-to-right.
 */
export type BidiDirection = 'auto' | 'rtl' | 'ltr';

/**
 * Wraps text in Unicode directional isolates, so a name or number in one
 * direction does not reorder the sentence around it (for example an English
 * order number inside an Urdu message).
 *
 * Uses FIRST STRONG ISOLATE (U+2068) by default, RIGHT-TO-LEFT ISOLATE
 * (U+2067) for `rtl` and LEFT-TO-RIGHT ISOLATE (U+2066) for `ltr`, closed
 * with POP DIRECTIONAL ISOLATE (U+2069). Any other direction is `auto`.
 *
 * @example
 * `آرڈر ${wrapBidi('PDK-1042')} بھیج دیا گیا`;
 *
 * @returns The wrapped text, or `''` when the input is not a string. Never
 *   throws.
 */
export function wrapBidi(
  text: string,
  direction: BidiDirection = 'auto',
): string {
  if (typeof text !== 'string') return '';
  const open =
    direction === 'rtl' ? '\u2067' : direction === 'ltr' ? '\u2066' : '\u2068';
  return `${open}${text}\u2069`;
}

/** Two-letter spellings of one sound, and what each becomes in a key. */
const KEY_DIGRAPHS: Readonly<Record<string, string>> = {
  kh: 'kh',
  gh: 'g',
  sh: 'sh',
  ch: 'ch',
  ph: 'f',
  th: 't',
  dh: 'd',
  bh: 'b',
  jh: 'j',
  zh: 'z',
  ck: 'k',
};

/** Letters written for the same sound as another letter. */
const KEY_LETTERS: Readonly<Record<string, string>> = {
  c: 'k',
  q: 'k',
  v: 'w',
  x: 'ks',
};

const PLAIN_VOWELS = 'aeiou';

/** The sound class of a vowel letter: a (a, e), i (i, y) or u (o, u, w). */
function vowelClass(letter: string): string {
  if (letter === 'a' || letter === 'e') return 'a';
  if (letter === 'i' || letter === 'y') return 'i';
  return 'u';
}

/**
 * The sound class of a word's first vowel sound: ee is i (Zeeshan, Heera);
 * a word-initial e is i (Ebrahim, Esmail); au, aw, ou and ow are u
 * (Chaudhry, Choudhry, Chowdhury); ai, ay, ae, ei and ey are e (Saeed,
 * Faisal, Sheikh); otherwise the class of the first letter.
 */
function firstVowelClass(run: string, wordStart: boolean): string {
  if (run.startsWith('ee')) return 'i';
  if (wordStart && run.startsWith('e')) return 'i';
  if (/^[ao][uw]/.test(run)) return 'u';
  if (/^(a[iye]|e[iy])/.test(run)) return 'e';
  return vowelClass(run[0] as string);
}

/** The phonetic key of one word of lowercase ASCII letters. */
function wordKey(word: string): string {
  // 1. One letter per sound.
  let letters = '';
  for (let i = 0; i < word.length;) {
    const pair = KEY_DIGRAPHS[word.slice(i, i + 2)];
    if (pair !== undefined) {
      letters += pair;
      i += 2;
    } else {
      const letter = word[i] as string;
      letters += KEY_LETTERS[letter] ?? letter;
      i += 1;
    }
  }
  // 2. Doubled letters count once (Muhammad, Rehmaan), except ee, which
  //    is written for a long i (Zeeshan, Heera, Saeed).
  letters = letters.replace(/([^e])\1+/g, '$1');
  // 3. Which letters are vowels: a, e, i, o, u; y except at the start; w
  //    after a vowel and before a consonant, not at the end (Chowdhury).
  const vowel: boolean[] = [];
  for (let i = 0; i < letters.length; i += 1) {
    const letter = letters[i] as string;
    vowel.push(
      PLAIN_VOWELS.includes(letter) ||
        (letter === 'y' && i > 0) ||
        (letter === 'w' &&
          i > 0 &&
          vowel[i - 1] === true &&
          !PLAIN_VOWELS.includes(letters[i + 1] ?? '')),
    );
  }
  // 4. A final h after a vowel is silent (Fatimah, Sarah).
  const last = letters.length - 1;
  if (last > 0 && letters[last] === 'h' && vowel[last - 1] === true) {
    letters = letters.slice(0, last);
    vowel.pop();
  }
  // 5. Consonants, the first vowel sound and a final vowel sound.
  let key = '';
  let firstVowelDone = false;
  for (let i = 0; i < letters.length;) {
    if (!vowel[i]) {
      key += letters[i];
      i += 1;
      continue;
    }
    let end = i;
    while (end < letters.length && vowel[end]) end += 1;
    const run = letters.slice(i, end);
    if (!firstVowelDone) {
      key += firstVowelClass(run, i === 0);
      firstVowelDone = true;
    } else if (end === letters.length) {
      key += run.endsWith('ee')
        ? 'i'
        : vowelClass(run[run.length - 1] as string);
    }
    i = end;
  }
  return key;
}

/**
 * A phonetic key for Roman Urdu, so that different spellings of the same
 * name or word match: `Mubeen` and `Mobeen`, `Muhammad`, `Mohammad` and
 * `Muhammed`, `Rehman` and `Rahman`, `Chaudhry`, `Chaudhary` and `Chaudhery`.
 * Compare keys, not the text.
 *
 * Each word keeps its consonants, its first vowel sound and a vowel sound at
 * its end. Letters for one sound are merged (`kh`, `sh`, `ch`; `ph` and `f`;
 * `q`, `c` and `k`; `v` and `w`; `th` and `t`, `dh` and `d`), doubled letters
 * count once, `e` counts as `a`, `o` as `u`, and a final `h` after a vowel is
 * dropped. Accents are removed and anything other than Latin letters splits
 * words. The key is not meant to be shown: it is an opaque string.
 *
 * Different names can share a key (`Hamid` and `Hamad`), so treat a match as
 * "probably the same", not proof. {@link normalizeRomanUrdu} is a different
 * tool: it rewrites informal spellings into readable text.
 *
 * @example
 * romanUrduKey('Mubeen') === romanUrduKey('Mobeen'); // true
 * romanUrduKey('Muhammad Rehman'); // 'muhmd rahmn'
 * romanUrduKey('Hussain') === romanUrduKey('Hassan'); // false
 *
 * @param text - A name or other Roman Urdu text
 * @returns The key, one part per word separated by spaces; `''` for text
 *   with no Latin letters or a value that is not a string. Never throws.
 */
export function romanUrduKey(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z]+/)
    .filter((word) => word !== '')
    .map(wordKey)
    .join(' ');
}
