import { describe, expect, it } from 'vitest';
import { validatePassport } from '../src/passport.js';

describe('validatePassport', () => {
  it('accepts two letters followed by seven digits', () => {
    expect(validatePassport('AB1234567')).toBe(true);
    expect(validatePassport('XY0000001')).toBe(true);
  });

  it('ignores case, surrounding spaces and a separator', () => {
    expect(validatePassport('ab1234567')).toBe(true);
    expect(validatePassport('  AB1234567 ')).toBe(true);
    expect(validatePassport('AB 1234567')).toBe(true);
    expect(validatePassport('AB-1234567')).toBe(true);
  });

  it('converts Urdu digits', () => {
    expect(validatePassport('AB۱۲۳۴۵۶۷')).toBe(true);
  });

  it('rejects other shapes', () => {
    expect(validatePassport('A12345678')).toBe(false);
    expect(validatePassport('ABC123456')).toBe(false);
    expect(validatePassport('AB123456')).toBe(false);
    expect(validatePassport('AB12345678')).toBe(false);
    expect(validatePassport('1234567AB')).toBe(false);
    expect(validatePassport('AB1234567<')).toBe(false);
    expect(validatePassport('')).toBe(false);
  });
});
