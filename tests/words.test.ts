import { describe, expect, it } from 'vitest';
import { amountInWords, numberToWords } from '../src/words.js';

describe('numberToWords (English)', () => {
  it.each([
    [0, 'zero'],
    [7, 'seven'],
    [15, 'fifteen'],
    [40, 'forty'],
    [99, 'ninety-nine'],
    [100, 'one hundred'],
    [101, 'one hundred one'],
    [1_000, 'one thousand'],
    [12_345, 'twelve thousand three hundred forty-five'],
    [100_000, 'one lakh'],
    [125_000, 'one lakh twenty-five thousand'],
    [2_500_000, 'twenty-five lakh'],
    [10_000_000, 'one crore'],
    [
      12_34_56_789,
      'twelve crore thirty-four lakh fifty-six thousand seven hundred eighty-nine',
    ],
    [1_000_000_000, 'one arab'],
    [250_000_000_000, 'two kharab fifty arab'],
  ])('%d → %s', (n, words) => {
    expect(numberToWords(n)).toBe(words);
  });

  it('handles negatives', () => {
    expect(numberToWords(-5)).toBe('minus five');
  });

  it('throws on non-integers', () => {
    expect(() => numberToWords(1.5)).toThrow(RangeError);
    expect(() => numberToWords(Number.NaN)).toThrow(RangeError);
  });
});

describe('numberToWords (Urdu)', () => {
  it.each([
    [0, 'صفر'],
    [25, 'پچیس'],
    [99, 'ننانوے'],
    [125, 'ایک سو پچیس'],
    [125_000, 'ایک لاکھ پچیس ہزار'],
    [10_000_000, 'ایک کروڑ'],
  ])('%d → %s', (n, words) => {
    expect(numberToWords(n, { language: 'ur' })).toBe(words);
  });
});

describe('amountInWords', () => {
  it('writes rupees and paisa', () => {
    expect(amountInWords(125_000.5)).toBe(
      'one lakh twenty-five thousand rupees and fifty paisa',
    );
    expect(amountInWords(1)).toBe('one rupee');
    expect(amountInWords(0.75)).toBe('zero rupees and seventy-five paisa');
  });

  it('rounds to the nearest paisa', () => {
    expect(amountInWords(10.005)).toBe('ten rupees and one paisa');
    expect(amountInWords(9.999)).toBe('ten rupees');
  });

  it('formats cheque style', () => {
    expect(amountInWords(125_000, { cheque: true })).toBe(
      'Rupees One Lakh Twenty-Five Thousand Only',
    );
    expect(amountInWords(2_500_000.25, { cheque: true })).toBe(
      'Rupees Twenty-Five Lakh and Twenty-Five Paisa Only',
    );
  });

  it('writes Urdu amounts', () => {
    expect(amountInWords(125_000, { language: 'ur' })).toBe(
      'ایک لاکھ پچیس ہزار روپے',
    );
    expect(amountInWords(500.5, { language: 'ur', cheque: true })).toBe(
      'پانچ سو روپے اور پچاس پیسے صرف',
    );
  });

  it('rejects negative and non-finite amounts', () => {
    expect(() => amountInWords(-1)).toThrow(RangeError);
    expect(() => amountInWords(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
