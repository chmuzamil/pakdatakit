import { describe, expect, it } from 'vitest';
import { analyzePhone, formatPhone, validatePhone } from '../src/phone.js';

describe('validatePhone', () => {
  it('accepts local format', () => {
    expect(validatePhone('03001234567')).toBe(true);
  });

  it('accepts international format', () => {
    expect(validatePhone('+923001234567')).toBe(true);
  });

  it('accepts short format without leading zero', () => {
    expect(validatePhone('3001234567')).toBe(true);
  });

  it('accepts messy input with separators', () => {
    expect(validatePhone('+92 300-123-4567')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(validatePhone('0211234567')).toBe(false);
    expect(validatePhone('abc')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });
});

describe('formatPhone', () => {
  it('normalizes local format to +92', () => {
    expect(formatPhone('03001234567')).toBe('+923001234567');
  });

  it('normalizes international format', () => {
    expect(formatPhone('+923001234567')).toBe('+923001234567');
  });

  it('normalizes short format', () => {
    expect(formatPhone('3001234567')).toBe('+923001234567');
  });

  it('normalizes messy input', () => {
    expect(formatPhone('+92 300-123-4567')).toBe('+923001234567');
  });

  it('returns null for invalid input', () => {
    expect(formatPhone('invalid')).toBeNull();
  });
});

describe('analyzePhone', () => {
  it('analyzes valid local number', () => {
    expect(analyzePhone('03001234567')).toEqual({
      valid: true,
      formatted: '+923001234567',
      network: 'Jazz',
    });
  });

  it('analyzes valid international number', () => {
    expect(analyzePhone('+923101234567')).toEqual({
      valid: true,
      formatted: '+923101234567',
      network: 'Zong',
    });
  });

  it('returns unknown for invalid number', () => {
    expect(analyzePhone('invalid')).toEqual({
      valid: false,
      formatted: null,
      network: 'Unknown',
    });
  });
});

describe('validatePhone input formats', () => {
  it('accepts +92 (0) and +920 forms', () => {
    expect(formatPhone('+92 (0) 300 1234567')).toBe('+923001234567');
    expect(formatPhone('+9203001234567')).toBe('+923001234567');
    expect(formatPhone('0092 300 1234567')).toBe('+923001234567');
  });

  it('accepts dotted numbers and Urdu digits', () => {
    expect(formatPhone('0300.123.4567')).toBe('+923001234567');
    expect(formatPhone('۰۳۰۰۱۲۳۴۵۶۷')).toBe('+923001234567');
  });

  it('rejects unallocated mobile prefixes', () => {
    expect(validatePhone('03601234567')).toBe(false);
    expect(validatePhone('03901234567')).toBe(false);
    expect(analyzePhone('03601234567').valid).toBe(false);
  });

  it('rejects wrong lengths', () => {
    expect(validatePhone('0300123456')).toBe(false);
    expect(validatePhone('030012345678')).toBe(false);
  });
});
