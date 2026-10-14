import { describe, expect, it } from 'vitest';
import { getDistrictProvince } from '../src/geo.js';
import { crc16 } from '../src/internal/emv.js';
import {
  createMerchantQr,
  createRaastP2PQr,
  parseRaastQr,
  validateRaastQr,
} from '../src/raast.js';
import { numberToWords } from '../src/words.js';

const IBAN = 'PK36SCBL0000001123456702';

function p2p(fields: string): string {
  const body = `0002020102${fields}1004`;
  return body + crc16(body);
}

describe('fixes found by the Python test vectors', () => {
  it('rejects amounts too large to write normally', () => {
    for (const amount of [1e21, 1e10]) {
      expect(() =>
        createRaastP2PQr({ iban: IBAN, amount, expiresIn: '1d' }),
      ).toThrow(RangeError);
    }
  });

  it('only reads plain numeric amounts', () => {
    for (const amount of [' 1e3', '0x1', '1e3', '']) {
      const value = `120202000424${IBAN}05${String(amount.length).padStart(2, '0')}${amount}0712311220262359`;
      expect(parseRaastQr(p2p(value))?.amount, amount).toBeNull();
    }
  });

  it('rejects impossible expiry dates', () => {
    for (const expiry of ['311320262359', '310220262359', '311220262560']) {
      const qr = p2p(`120202000424${IBAN}0503100071${'2'}${expiry}`);
      expect(parseRaastQr(qr)?.expiresAt, expiry).toBeNull();
      expect(validateRaastQr(qr).errors, expiry).toContain('missing-expiry');
    }
  });

  it('writes merchant account sub-fields in ID order', () => {
    const qr = createMerchantQr({
      merchantAccount: {
        fields: { '10': 'x', '00': 'A000000736', '01': IBAN },
      },
      merchantName: 'Shop',
      city: 'Karachi',
    });
    expect(qr).toContain(`0010A0000007360124${IBAN}1001x`);
  });

  it('rejects unknown languages', () => {
    expect(() => numberToWords(100, { language: 'fr' as 'en' })).toThrow(
      RangeError,
    );
  });

  it('does not return built-in object properties for district names', () => {
    expect(getDistrictProvince('constructor')).toBeNull();
    expect(getDistrictProvince('toString')).toBeNull();
  });
});
