import { describe, expect, it } from 'vitest';
import {
  createMerchantQr,
  createRaastP2PQr,
  parseRaastQr,
} from '../src/raast.js';

const IBAN = 'PK36SCBL0000001123456702';

/** SBP's sample merchant QR from Annex-A of the QR standard (CRC 5376). */
const SBP_SAMPLE =
  '00020101021202164000123456789012041653451234567890121516634512345678901227420010A0000007360124PK73FAYS35553900000000005204599953035865802PK5916AZIZGeneralStore6007KARACHI62890117234567854321234560211032400000000316AZIZGeneralStore0513123876543212307124567890987656304' +
  '5376';

describe('createRaastP2PQr', () => {
  it('builds a static P2P payload', () => {
    const payload = createRaastP2PQr({ iban: IBAN });
    expect(payload.startsWith('000202' + '010211' + '020230')).toBe(true);
    expect(payload).toContain(`0424${IBAN}`);
    expect(parseRaastQr(payload)).toMatchObject({
      kind: 'p2p',
      dynamic: false,
      crcValid: true,
      iban: IBAN,
      ibanValid: true,
      amount: null,
    });
  });

  it('builds a dynamic P2P payload with amount and details', () => {
    const payload = createRaastP2PQr({
      iban: 'pk36 scbl 0000 0011 2345 6702',
      amount: 1500,
      bankName: 'Standard Chartered',
      particulars: 'Rent October',
    });
    expect(payload).toContain('05071500.00');
    expect(parseRaastQr(payload)).toMatchObject({
      kind: 'p2p',
      dynamic: true,
      crcValid: true,
      iban: IBAN,
      amount: 1500,
      bankName: 'Standard Chartered',
      particulars: 'Rent October',
    });
  });

  it('rejects invalid input', () => {
    expect(() => createRaastP2PQr({ iban: 'PK00XXXX' })).toThrow(RangeError);
    expect(() => createRaastP2PQr({ iban: IBAN, amount: -5 })).toThrow(
      RangeError,
    );
    expect(() =>
      createRaastP2PQr({ iban: IBAN, particulars: 'x'.repeat(31) }),
    ).toThrow(RangeError);
  });
});

describe('createMerchantQr', () => {
  const merchantAccount = {
    fields: { '00': 'A000000736', '01': IBAN },
  };

  it('builds a static merchant payload', () => {
    const payload = createMerchantQr({
      merchantAccount,
      merchantName: 'Aziz General Store',
      city: 'Karachi',
      mcc: '5411',
    });
    expect(payload.startsWith('000201010211')).toBe(true);
    expect(payload).toContain('5303586');
    expect(payload).toContain('5802PK');
    expect(parseRaastQr(payload)).toMatchObject({
      kind: 'merchant',
      dynamic: false,
      crcValid: true,
      iban: IBAN,
      merchantName: 'Aziz General Store',
      city: 'Karachi',
      mcc: '5411',
    });
  });

  it('builds a dynamic bill payload with a due date', () => {
    const payload = createMerchantQr({
      merchantAccount,
      merchantName: 'K-Electric',
      city: 'Karachi',
      amount: 4250.5,
      billNumber: 'INV-1001',
      dueDate: new Date(2026, 10, 25),
      amountAfterDueDate: 4500,
    });
    expect(parseRaastQr(payload)).toMatchObject({
      dynamic: true,
      crcValid: true,
      amount: 4250.5,
      billNumber: 'INV-1001',
      dueDate: '2026-11-25',
      amountAfterDueDate: 4500,
    });
  });

  it('enforces SBP field limits', () => {
    const base = { merchantAccount, city: 'Karachi' };
    expect(() =>
      createMerchantQr({ ...base, merchantName: 'x'.repeat(26) }),
    ).toThrow(RangeError);
    expect(() =>
      createMerchantQr({ ...base, merchantName: 'Shop', city: 'x'.repeat(16) }),
    ).toThrow(RangeError);
    expect(() =>
      createMerchantQr({
        ...base,
        merchantName: 'Shop',
        dueDate: new Date(),
      }),
    ).toThrow(RangeError);
    expect(() =>
      createMerchantQr({
        ...base,
        merchantName: 'Shop',
        merchantAccount: { tag: '02', fields: { '00': 'x' } },
      }),
    ).toThrow(RangeError);
  });
});

describe('parseRaastQr', () => {
  it("parses SBP's sample merchant QR", () => {
    expect(parseRaastQr(SBP_SAMPLE)).toMatchObject({
      kind: 'merchant',
      dynamic: true,
      crcValid: true,
      iban: 'PK73FAYS3555390000000000',
      merchantName: 'AZIZGeneralStore',
      city: 'KARACHI',
      mcc: '5999',
    });
  });

  it('detects a corrupted payload', () => {
    const corrupted = SBP_SAMPLE.replace('KARACHI', 'LAHOREE');
    expect(parseRaastQr(corrupted)?.crcValid).toBe(false);
  });

  it('returns null for non-QR text', () => {
    expect(parseRaastQr('hello world')).toBeNull();
    expect(parseRaastQr('0002990102')).toBeNull();
  });
});
