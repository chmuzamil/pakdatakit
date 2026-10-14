import { describe, expect, it } from 'vitest';
import { getBankInfo, getBanks } from '../src/iban.js';

describe('getBankInfo', () => {
  it('describes the bank behind an IBAN', () => {
    expect(getBankInfo('PK36 SCBL 0000 0011 2345 6702')).toEqual({
      code: 'SCBL',
      name: 'Standard Chartered Bank (Pakistan) Limited',
      type: 'commercial',
      active: true,
      mergedInto: null,
      aliasOf: null,
    });
  });

  it('accepts a bank code on its own', () => {
    expect(getBankInfo('mezn')?.type).toBe('islamic');
    expect(getBankInfo('SADA')?.type).toBe('emi');
    expect(getBankInfo('TMFB')?.type).toBe('digital');
    expect(getBankInfo('KHBL')?.type).toBe('microfinance');
    expect(getBankInfo('CITI')?.type).toBe('foreign');
  });

  it('reports merged banks and older codes', () => {
    expect(getBankInfo('SAUD')).toMatchObject({
      active: false,
      mergedInto: 'UNIL',
    });
    expect(getBankInfo('WMBL')).toMatchObject({
      active: true,
      aliasOf: 'JCMA',
    });
  });

  it('returns null for invalid IBANs and unknown codes', () => {
    expect(getBankInfo('PK37SCBL0000001123456702')).toBeNull();
    expect(getBankInfo('ZZZZ')).toBeNull();
    expect(getBankInfo('')).toBeNull();
  });
});

describe('getBanks', () => {
  it('lists every code with consistent references', () => {
    const banks = getBanks();
    const codes = new Set(banks.map((bank) => bank.code));
    expect(banks.length).toBeGreaterThan(40);
    for (const bank of banks) {
      if (bank.mergedInto) expect(codes).toContain(bank.mergedInto);
      if (bank.aliasOf) expect(codes).toContain(bank.aliasOf);
    }
  });

  it('returns copies callers cannot use to change the dataset', () => {
    const first = getBanks()[0] as { name: string };
    first.name = 'changed';
    expect(getBanks()[0]?.name).not.toBe('changed');
  });
});
