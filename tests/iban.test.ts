import { describe, expect, it } from 'vitest';
import { getBankFromIBAN, validateIBAN } from '../src/iban.js';

const VALID_IBAN = 'PK36SCBL0000001123456702';

describe('validateIBAN', () => {
  it('accepts valid Pakistani IBAN', () => {
    expect(validateIBAN(VALID_IBAN)).toBe(true);
  });

  it('accepts spaced IBAN input', () => {
    expect(validateIBAN('PK36 SCBL 0000 0011 2345 6702')).toBe(true);
  });

  it('rejects invalid checksum', () => {
    expect(validateIBAN('PK37SCBL0000001123456702')).toBe(false);
  });

  it('rejects non-Pakistani country code', () => {
    expect(validateIBAN('GB29NWBK60161331926819')).toBe(false);
  });

  it('rejects invalid length', () => {
    expect(validateIBAN('PK36SCBL000000112345670')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(validateIBAN('')).toBe(false);
  });
});

describe('getBankFromIBAN', () => {
  it('returns bank name for known code', () => {
    expect(getBankFromIBAN(VALID_IBAN)).toBe(
      'Standard Chartered Bank (Pakistan) Limited',
    );
  });

  it('returns null for unknown bank code', () => {
    expect(getBankFromIBAN('PK36XXXX0000001123456702')).toBeNull();
  });

  it('returns null for invalid IBAN', () => {
    expect(getBankFromIBAN('invalid')).toBeNull();
  });
});
