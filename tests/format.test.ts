import { describe, expect, it } from 'vitest';
import { formatLakh, formatPKR } from '../src/format.js';

describe('formatPKR', () => {
  it('formats amount with Rs. prefix and commas', () => {
    expect(formatPKR(150000)).toBe('Rs. 150,000');
  });

  it('handles zero', () => {
    expect(formatPKR(0)).toBe('Rs. 0');
  });

  it('throws on non-finite amounts', () => {
    expect(() => formatPKR(Number.NaN)).toThrow(RangeError);
    expect(() => formatPKR(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('formats negative amounts', () => {
    expect(formatPKR(-1500)).toBe('-Rs. 1,500');
    expect(formatPKR(-0.2)).toBe('Rs. 0');
  });
});

describe('formatLakh', () => {
  it('formats lakh amounts', () => {
    expect(formatLakh(2500000)).toBe('25 Lakh');
  });

  it('formats crore amounts', () => {
    expect(formatLakh(10000000)).toBe('1 Crore');
  });

  it('formats fractional crore', () => {
    expect(formatLakh(12500000)).toBe('1.25 Crore');
  });

  it('formats fractional lakh', () => {
    expect(formatLakh(150000)).toBe('1.5 Lakh');
  });

  it('falls back to PKR for amounts below one lakh', () => {
    expect(formatLakh(50000)).toBe('Rs. 50,000');
  });
});

describe('formatLakh boundaries', () => {
  it('rounds before choosing the unit', () => {
    expect(formatLakh(9_999_999)).toBe('1 Crore');
    expect(formatLakh(99_999.5)).toBe('1 Lakh');
    expect(formatLakh(999_999.999)).toBe('10 Lakh');
  });

  it('formats negative amounts', () => {
    expect(formatLakh(-2_500_000)).toBe('-25 Lakh');
    expect(formatLakh(-50_000)).toBe('-Rs. 50,000');
  });

  it('throws on non-finite amounts', () => {
    expect(() => formatLakh(Number.NaN)).toThrow(RangeError);
  });
});
