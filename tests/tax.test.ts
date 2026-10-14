import { describe, expect, it } from 'vitest';
import { analyzeNTN, validateNTN, validateSTRN } from '../src/tax.js';

describe('analyzeNTN', () => {
  it('reads business NTNs with and without a check digit', () => {
    expect(analyzeNTN('0622438-9')).toEqual({
      type: 'business',
      digits: '06224389',
      formatted: '0622438-9',
    });
    expect(analyzeNTN('0622438')).toEqual({
      type: 'business',
      digits: '0622438',
      formatted: '0622438',
    });
    expect(analyzeNTN('06224389')?.formatted).toBe('0622438-9');
  });

  it('reads CNIC-based NTNs for individuals', () => {
    expect(analyzeNTN('3520212345671')).toEqual({
      type: 'individual',
      digits: '3520212345671',
      formatted: '35202-1234567-1',
    });
  });

  it('rejects other formats', () => {
    expect(analyzeNTN('123456')).toBeNull();
    expect(analyzeNTN('123456789')).toBeNull();
    expect(analyzeNTN('NTN1234')).toBeNull();
    expect(validateNTN('')).toBe(false);
  });
});

describe('validateSTRN', () => {
  it('accepts 13 digits with optional separators', () => {
    expect(validateSTRN('1700376188219')).toBe(true);
    expect(validateSTRN('17-00-3761-882-19')).toBe(true);
    expect(validateSTRN('17 00 3761 882 19')).toBe(true);
  });

  it('rejects other lengths', () => {
    expect(validateSTRN('170037618821')).toBe(false);
    expect(validateSTRN('17000376188219')).toBe(false);
    expect(validateSTRN('abc')).toBe(false);
  });
});
