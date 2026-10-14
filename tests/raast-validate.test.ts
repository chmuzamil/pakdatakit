import { describe, expect, it } from 'vitest';
import { crc16 } from '../src/internal/emv.js';
import {
  createRaastP2PQr,
  parseRaastQr,
  validateRaastQr,
} from '../src/raast.js';

const IBAN = 'PK36SCBL0000001123456702';

/** Builds a P2P payload by hand, for layouts the library will not create. */
function p2p(fields: string): string {
  const body = `0002020102${fields}1004`;
  return body + crc16(body);
}

describe('createRaastP2PQr expiresIn', () => {
  it('accepts a duration instead of a date', () => {
    const before = Date.now();
    const qr = parseRaastQr(
      createRaastP2PQr({ iban: IBAN, amount: 100, expiresIn: '2h' }),
    );
    const [date, time] = (qr?.expiresAt as string).split('T') as [
      string,
      string,
    ];
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    const [hh, mm] = time.split(':').map(Number) as [number, number];
    const diff = new Date(y, m - 1, d, hh, mm).getTime() - before;
    // The expiry is written to the minute.
    expect(diff).toBeGreaterThan(2 * 3_600_000 - 60_000);
    expect(diff).toBeLessThanOrEqual(2 * 3_600_000);
  });

  it('accepts milliseconds, minutes and days', () => {
    for (const expiresIn of [90_000, '30m', '7d'] as const) {
      expect(() =>
        createRaastP2PQr({ iban: IBAN, amount: 100, expiresIn }),
      ).not.toThrow();
    }
  });

  it('rejects bad or conflicting durations', () => {
    expect(() =>
      createRaastP2PQr({ iban: IBAN, amount: 100, expiresIn: '1w' as '1d' }),
    ).toThrow(RangeError);
    expect(() =>
      createRaastP2PQr({ iban: IBAN, amount: 100, expiresIn: -5 }),
    ).toThrow(RangeError);
    expect(() =>
      createRaastP2PQr({
        iban: IBAN,
        amount: 100,
        expiresIn: '1d',
        expiresAt: new Date(),
      }),
    ).toThrow(/either/);
  });
});

describe('validateRaastQr', () => {
  const now = new Date(2026, 9, 14, 12, 0);

  it('accepts a working static QR', () => {
    expect(
      validateRaastQr(createRaastP2PQr({ iban: IBAN }), { now }),
    ).toMatchObject({ valid: true, errors: [], warnings: [] });
  });

  it('accepts an unexpired amount QR', () => {
    const qr = createRaastP2PQr({
      iban: IBAN,
      amount: 500,
      expiresAt: new Date(2026, 9, 20, 23, 59),
    });
    expect(validateRaastQr(qr, { now })).toMatchObject({
      valid: true,
      errors: [],
      warnings: [],
      qr: { amount: 500 },
    });
  });

  it('flags expired QR codes', () => {
    const qr = createRaastP2PQr({
      iban: IBAN,
      amount: 500,
      expiresAt: new Date(2026, 9, 14, 11, 0),
    });
    expect(validateRaastQr(qr, { now })).toMatchObject({
      valid: false,
      errors: ['expired'],
    });
  });

  it('warns when a QR expires soon', () => {
    const qr = createRaastP2PQr({
      iban: IBAN,
      amount: 500,
      expiresAt: new Date(2026, 9, 14, 12, 30),
    });
    expect(validateRaastQr(qr, { now })).toMatchObject({
      valid: true,
      warnings: ['expires-soon'],
    });
  });

  it('flags a QR whose IBAN was swapped without fixing the checksum', () => {
    const qr = createRaastP2PQr({ iban: IBAN });
    const tampered = qr.replace(IBAN, 'PK16SADA0000003336004141');
    expect(validateRaastQr(tampered, { now }).errors).toEqual(['bad-checksum']);
  });

  it('flags an invalid IBAN', () => {
    const qr = p2p(`110202000424PK37SCBL0000001123456702`);
    expect(validateRaastQr(qr, { now }).errors).toEqual(['invalid-iban']);
  });

  it('flags amount QR codes without an expiry', () => {
    const qr = p2p(`120202000424${IBAN}0503100`);
    expect(validateRaastQr(qr, { now }).errors).toEqual(['missing-expiry']);
  });

  it('warns when a static QR carries an amount', () => {
    const qr = p2p(`110202000424${IBAN}0503100`);
    expect(validateRaastQr(qr, { now })).toMatchObject({
      valid: true,
      warnings: ['amount-ignored'],
    });
  });

  it('rejects text that is not a Raast QR', () => {
    expect(validateRaastQr('https://example.com')).toEqual({
      valid: false,
      errors: ['not-a-raast-qr'],
      warnings: [],
      qr: null,
    });
  });
});
