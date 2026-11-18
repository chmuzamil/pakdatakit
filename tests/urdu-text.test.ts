import { describe, expect, it } from 'vitest';
import {
  compareUrdu,
  isRTL,
  slugify,
  wrapBidi,
  type SlugifyOptions,
} from '../src/text.js';

describe('slugify', () => {
  it('makes Latin slugs', () => {
    expect(slugify('Lahore Fort, 2024')).toBe('lahore-fort-2024');
    expect(slugify('  Ünited   Kingdom ')).toBe('united-kingdom');
    expect(slugify('Straße ÆON')).toBe('strasse-aeon');
    expect(slugify('---a---')).toBe('a');
  });
  it('keeps Urdu letters and drops diacritics', () => {
    expect(slugify('لاہور قلعہ')).toBe('لاہور-قلعہ');
    expect(slugify('م\u064fح\u064eم\u064e\u0651د')).toBe('محمد');
    expect(slugify('كتاب')).toBe('کتاب');
  });
  it('filters by script', () => {
    expect(slugify('لاہور Fort', { script: 'latin' })).toBe('fort');
    expect(slugify('لاہور Fort', { script: 'urdu' })).toBe('لاہور');
    expect(slugify('کراچی ۲۰۲۴', { script: 'urdu' })).toBe('کراچی-2024');
  });
  it('never throws', () => {
    expect(slugify(null as unknown as string)).toBe('');
    expect(slugify('a b', null as unknown as SlugifyOptions)).toBe('a-b');
  });
});

describe('compareUrdu', () => {
  it('sorts in CLDR Urdu order', () => {
    expect(['ے', 'بھائی', 'آم', 'باغ', 'اب'].sort(compareUrdu)).toEqual([
      'اب',
      'آم',
      'باغ',
      'بھائی',
      'ے',
    ]);
    expect(compareUrdu('بہن', 'بھائی')).toBe(-1);
    expect(compareUrdu('ہم', 'ھ')).toBe(-1);
  });
  it('treats hamza forms and diacritics as secondary', () => {
    expect(compareUrdu('اب', 'أب')).toBe(-1);
    expect(compareUrdu('أب', 'اج')).toBe(-1);
    expect(compareUrdu('بت', 'ب\u064eت')).toBe(-1);
  });
  it('orders digits by value and punctuation first', () => {
    expect(compareUrdu('۲', '3')).toBe(-1);
    expect(compareUrdu('10', '۲')).toBe(-1);
    expect(compareUrdu(' ', '1')).toBe(-1);
    expect(compareUrdu('ے', 'ك')).toBe(-1);
    expect(compareUrdu('ے', 'a')).toBe(-1);
  });
  it('is 0 only for identical strings', () => {
    expect(compareUrdu('ا', 'ا')).toBe(0);
    expect(compareUrdu('a', 'A')).toBe(1);
  });
  it("matches ICU's Urdu collator at the primary level", () => {
    const letters = [...'اآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھۃءیےأؤۂئۓ'];
    const icu = new Intl.Collator('ur');
    let seed = 11;
    const random = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const word = (): string =>
      Array.from(
        { length: 1 + Math.floor(random() * 4) },
        () => letters[Math.floor(random() * letters.length)],
      ).join('');
    const mismatches: string[][] = [];
    for (let i = 0; i < 20000; i++) {
      const a = word();
      const b = word();
      const expected = Math.sign(icu.compare(a, b));
      if (expected !== 0 && compareUrdu(a, b) !== expected)
        mismatches.push([a, b]);
    }
    expect(mismatches).toEqual([]);
  });
  it('never throws', () => {
    expect(compareUrdu(null as unknown as string, '')).toBe(0);
  });
});

describe('isRTL and wrapBidi', () => {
  it('uses the first letter', () => {
    expect(isRTL('سلام')).toBe(true);
    expect(isRTL('123 سلام')).toBe(true);
    expect(isRTL('Order نمبر')).toBe(false);
    expect(isRTL('שלום')).toBe(true);
    expect(isRTL('123')).toBe(false);
    expect(isRTL(undefined as unknown as string)).toBe(false);
  });
  it('wraps in isolates', () => {
    expect(wrapBidi('PDK-1042')).toBe('\u2068PDK-1042\u2069');
    expect(wrapBidi('abc', 'rtl')).toBe('\u2067abc\u2069');
    expect(wrapBidi('abc', 'ltr')).toBe('\u2066abc\u2069');
    expect(wrapBidi(5 as unknown as string)).toBe('');
  });
});
