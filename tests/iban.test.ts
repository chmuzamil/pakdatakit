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

/** Builds a checksum-valid PK IBAN for a bank code. */
function makeIban(bankCode: string, account = '0000001123456702'): string {
  const bban = `${bankCode}${account}`;
  const numeric = `${bban}PK00`.replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return `PK${String(98 - remainder).padStart(2, '0')}${bban}`;
}

describe('getBankFromIBAN dataset', () => {
  it('maps SAUD to Silkbank', () => {
    expect(getBankFromIBAN(makeIban('SAUD'))).toBe(
      'Silkbank Limited (merged into United Bank Limited)',
    );
  });

  it('maps SUMB to Bank Makramah', () => {
    expect(getBankFromIBAN(makeIban('SUMB'))).toMatch(/Bank Makramah/);
  });

  it('resolves legacy codes', () => {
    expect(getBankFromIBAN(makeIban('NBPB'))).toBe('National Bank of Pakistan');
    expect(getBankFromIBAN(makeIban('MCBL'))).toBe('MCB Bank Limited');
  });

  it('does not map codes with no real bank', () => {
    expect(getBankFromIBAN(makeIban('BIPL'))).toBeNull();
  });
});
