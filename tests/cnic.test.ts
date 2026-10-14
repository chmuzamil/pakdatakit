import { describe, expect, it } from 'vitest';
import { validateCNIC } from '../src/cnic.js';

describe('validateCNIC', () => {
  it('accepts plain 13-digit CNIC', () => {
    expect(validateCNIC('3520212345671')).toBe(true);
  });

  it('accepts dashed CNIC format', () => {
    expect(validateCNIC('35202-1234567-1')).toBe(true);
  });

  it('accepts spaced CNIC format', () => {
    expect(validateCNIC('35202 1234567 1')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(validateCNIC('35202-123456-1')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(validateCNIC('abc')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(validateCNIC('')).toBe(false);
  });
});

describe('validateCNIC structure', () => {
  it('rejects an invalid province digit', () => {
    expect(validateCNIC('0000000000000')).toBe(false);
    expect(validateCNIC('95202-1234567-1')).toBe(false);
  });

  it('rejects misplaced or mixed separators', () => {
    expect(validateCNIC('3520-21234567-1')).toBe(false);
    expect(validateCNIC('35202-1234567 1')).toBe(false);
  });

  it('accepts en-dashes, dots and Urdu digits', () => {
    expect(validateCNIC('35202–1234567–1')).toBe(true);
    expect(validateCNIC('35202.1234567.1')).toBe(true);
    expect(validateCNIC('۳۵۲۰۲-۱۲۳۴۵۶۷-۱')).toBe(true);
  });
});
