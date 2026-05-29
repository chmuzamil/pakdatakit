import { describe, expect, it } from 'vitest';
import { formatPhone, validatePhone } from '../src/phone.js';

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

  it('returns empty string for invalid input', () => {
    expect(formatPhone('invalid')).toBe('');
  });
});
