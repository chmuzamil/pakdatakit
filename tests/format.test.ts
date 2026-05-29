import { describe, expect, it } from 'vitest';
import { formatLakh, formatPKR } from '../src/format.js';

describe('formatPKR', () => {
  it('formats amount with Rs. prefix and commas', () => {
    expect(formatPKR(150000)).toBe('Rs. 150,000');
  });

  it('handles zero', () => {
    expect(formatPKR(0)).toBe('Rs. 0');
  });

  it('treats invalid amounts as zero', () => {
    expect(formatPKR(Number.NaN)).toBe('Rs. 0');
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
