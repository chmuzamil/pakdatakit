/** Language for number words. */
export type WordsLanguage = 'en' | 'ur';

/** Options for {@link numberToWords}. */
export interface NumberToWordsOptions {
  /** `'en'` (default) or `'ur'`. */
  language?: WordsLanguage;
}

/** Options for {@link amountInWords}. */
export interface AmountInWordsOptions extends NumberToWordsOptions {
  /**
   * Cheque style: `"Rupees One Lakh Twenty-Five Thousand Only"` in English,
   * or the words followed by `"روپے صرف"` in Urdu.
   */
  cheque?: boolean;
}

/** Pakistani scale words, largest first. */
const SCALES = [
  { value: 100_000_000_000, en: 'kharab', ur: 'کھرب' },
  { value: 1_000_000_000, en: 'arab', ur: 'ارب' },
  { value: 10_000_000, en: 'crore', ur: 'کروڑ' },
  { value: 100_000, en: 'lakh', ur: 'لاکھ' },
  { value: 1_000, en: 'thousand', ur: 'ہزار' },
  { value: 100, en: 'hundred', ur: 'سو' },
] as const;

const EN_ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const EN_TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

/** Urdu has a distinct word for every number from 0 to 99. */
const UR_0_TO_99 = [
  'صفر',
  'ایک',
  'دو',
  'تین',
  'چار',
  'پانچ',
  'چھ',
  'سات',
  'آٹھ',
  'نو',
  'دس',
  'گیارہ',
  'بارہ',
  'تیرہ',
  'چودہ',
  'پندرہ',
  'سولہ',
  'سترہ',
  'اٹھارہ',
  'انیس',
  'بیس',
  'اکیس',
  'بائیس',
  'تئیس',
  'چوبیس',
  'پچیس',
  'چھبیس',
  'ستائیس',
  'اٹھائیس',
  'انتیس',
  'تیس',
  'اکتیس',
  'بتیس',
  'تینتیس',
  'چونتیس',
  'پینتیس',
  'چھتیس',
  'سینتیس',
  'اڑتیس',
  'انتالیس',
  'چالیس',
  'اکتالیس',
  'بیالیس',
  'تینتالیس',
  'چوالیس',
  'پینتالیس',
  'چھیالیس',
  'سینتالیس',
  'اڑتالیس',
  'انچاس',
  'پچاس',
  'اکاون',
  'باون',
  'ترپن',
  'چون',
  'پچپن',
  'چھپن',
  'ستاون',
  'اٹھاون',
  'انسٹھ',
  'ساٹھ',
  'اکسٹھ',
  'باسٹھ',
  'ترسٹھ',
  'چونسٹھ',
  'پینسٹھ',
  'چھیاسٹھ',
  'سڑسٹھ',
  'اڑسٹھ',
  'انہتر',
  'ستر',
  'اکہتر',
  'بہتر',
  'تہتر',
  'چوہتر',
  'پچھتر',
  'چھہتر',
  'ستتر',
  'اٹھہتر',
  'اناسی',
  'اسی',
  'اکیاسی',
  'بیاسی',
  'تراسی',
  'چوراسی',
  'پچاسی',
  'چھیاسی',
  'ستاسی',
  'اٹھاسی',
  'نواسی',
  'نوے',
  'اکانوے',
  'بانوے',
  'ترانوے',
  'چورانوے',
  'پچانوے',
  'چھیانوے',
  'ستانوے',
  'اٹھانوے',
  'ننانوے',
];

function underHundred(n: number, language: WordsLanguage): string {
  if (language === 'ur') {
    return UR_0_TO_99[n] as string;
  }
  if (n < 20) {
    return EN_ONES[n] as string;
  }
  const tens = EN_TENS[Math.floor(n / 10)] as string;
  return n % 10 === 0 ? tens : `${tens}-${EN_ONES[n % 10]}`;
}

/** Converts a positive integer using the lakh/crore/arab/kharab scale. */
function convert(n: number, language: WordsLanguage): string[] {
  for (const scale of SCALES) {
    if (n >= scale.value) {
      const count = Math.floor(n / scale.value);
      const rest = n % scale.value;
      return [
        ...convert(count, language),
        scale[language],
        ...(rest > 0 ? convert(rest, language) : []),
      ];
    }
  }
  return [underHundred(n, language)];
}

/**
 * Converts a whole number to words using the Pakistani numbering system
 * (hundred, thousand, lakh, crore, arab, kharab).
 *
 * @example
 * numberToWords(125000); // "one lakh twenty-five thousand"
 * numberToWords(125000, { language: 'ur' }); // "ایک لاکھ پچیس ہزار"
 *
 * @param n - A safe integer
 * @param options - Output language
 * @returns The number in words
 * @throws {RangeError} If `n` is not a safe integer
 */
export function numberToWords(
  n: number,
  options: NumberToWordsOptions = {},
): string {
  const language = options.language ?? 'en';
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Expected a safe integer, received ${String(n)}`);
  }
  if (n === 0) {
    return underHundred(0, language);
  }
  const words = convert(Math.abs(n), language).join(' ');
  if (n > 0) {
    return words;
  }
  return language === 'ur' ? `منفی ${words}` : `minus ${words}`;
}

function titleCase(text: string): string {
  return text.replace(
    /(^|[\s-])([a-z])/g,
    (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`,
  );
}

/**
 * Writes a rupee amount in words, with paisa, as used on Pakistani cheques
 * and invoices. Amounts are rounded to the nearest paisa.
 *
 * @example
 * amountInWords(125000.5);
 * // "one lakh twenty-five thousand rupees and fifty paisa"
 * amountInWords(125000, { cheque: true });
 * // "Rupees One Lakh Twenty-Five Thousand Only"
 * amountInWords(125000, { language: 'ur' });
 * // "ایک لاکھ پچیس ہزار روپے"
 *
 * @param amount - Amount in PKR (must be zero or more)
 * @param options - Output language and cheque style
 * @returns The amount in words
 * @throws {RangeError} If `amount` is negative, not finite, or too large
 */
export function amountInWords(
  amount: number,
  options: AmountInWordsOptions = {},
): string {
  const language = options.language ?? 'en';
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(
      `Amount must be a finite number of zero or more, received ${String(amount)}`,
    );
  }

  const totalPaisa = Math.round(amount * 100);
  const rupees = Math.floor(totalPaisa / 100);
  const paisa = totalPaisa % 100;
  const rupeeWords = numberToWords(rupees, { language });
  const paisaWords = paisa > 0 ? numberToWords(paisa, { language }) : null;

  if (language === 'ur') {
    let text = `${rupeeWords} روپے`;
    if (paisaWords !== null) {
      text += ` اور ${paisaWords} پیسے`;
    }
    return options.cheque ? `${text} صرف` : text;
  }

  if (options.cheque) {
    const paisaPart = paisaWords !== null ? ` and ${paisaWords} paisa` : '';
    return titleCase(`rupees ${rupeeWords}${paisaPart} only`).replace(
      ' And ',
      ' and ',
    );
  }

  let text = `${rupeeWords} ${rupees === 1 ? 'rupee' : 'rupees'}`;
  if (paisaWords !== null) {
    text += ` and ${paisaWords} paisa`;
  }
  return text;
}
