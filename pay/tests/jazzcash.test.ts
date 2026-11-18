/**
 * JazzCash secure hash tests.
 *
 * JazzCash's integration guide (v4.2, section 14.2) gives an example of the
 * text to hash but no resulting hash, and no official sample payload with a
 * hash has been published. So:
 *
 * - The message builder is checked against the guide's own example text.
 * - Every expected hash below is SYNTHETIC: computed independently with
 *   `openssl dgst -sha256 -hmac <salt>` over the message shown, with made-up
 *   fields and a made-up salt. They check this package against OpenSSL, not
 *   against JazzCash. They still need confirming against JazzCash's sandbox
 *   (a real sandbox request and response with your own test salt).
 */
import { describe, expect, it } from 'vitest';
import * as node from '../src/index.js';
import * as web from '../src/web.js';

const SALT = 'SYNTHETIC-SALT-NOT-REAL';

// Synthetic request fields (not from JazzCash).
const request = {
  pp_Version: '1.1',
  pp_Amount: '25000',
  pp_TxnDateTime: '20261118120000',
  pp_MerchantID: 'MC0001',
  pp_TxnRefNo: 'T20261118000001',
  ppmpf_1: 'ppmpf value 1',
  pp_BankID: '',
  pp_SecureHash: 'ignored',
  other_field: 'not hashed',
};
// openssl dgst -sha256 -hmac SYNTHETIC-SALT-NOT-REAL over the message below.
const REQUEST_MESSAGE =
  'SYNTHETIC-SALT-NOT-REAL&25000&MC0001&20261118120000&T20261118000001&1.1&ppmpf value 1';
const REQUEST_HASH =
  '02C9EDAF7CCD8142538D3F0112AC39E58313DBB3B304B6340C2744B529C26ECA';

// Synthetic response fields; hashes from OpenSSL as above.
const response = (code: string, hash: string): Record<string, string> => ({
  pp_Amount: '25000',
  pp_ResponseCode: code,
  pp_ResponseMessage: 'Synthetic response',
  pp_TxnRefNo: 'T20261118000001',
  pp_SecureHash: hash,
});
const SUCCESS_HASH =
  'AE871E546EAD9093BA53EFDCA383AD995BF1B3667E5986321734E370F58C8A4C';
const PENDING_HASH =
  'D8D20D86E17C76B2B88BC406D42C9A0425A3267B13CBA5997CA3D6088A12C9DA';

describe('jazzCashHashMessage', () => {
  it("matches the integration guide's example text (section 14.2)", () => {
    // The guide's example: salt 0F5DD14AE2, pp_MerchantID MER123,
    // pp_OrderInfo A48cvE28, pp_Amount 2995 → "0F5DD14AE2&2995&MER123&A48cvE28".
    expect(
      node.jazzCashHashMessage(
        {
          pp_MerchantID: 'MER123',
          pp_OrderInfo: 'A48cvE28',
          pp_Amount: '2995',
        },
        '0F5DD14AE2',
      ),
    ).toBe('0F5DD14AE2&2995&MER123&A48cvE28');
  });

  it('sorts by name, skips empty, non-pp and pp_SecureHash fields', () => {
    expect(node.jazzCashHashMessage(request, SALT)).toBe(REQUEST_MESSAGE);
  });

  it('sorts a shorter name before a longer one that starts with it', () => {
    expect(
      node.jazzCashHashMessage({ pp_CardNum: 'b', pp_Card: 'a' }, 's'),
    ).toBe('s&a&b');
  });

  it('turns numbers into text and skips null and objects', () => {
    expect(
      node.jazzCashHashMessage(
        { pp_Amount: 2995, pp_A: null, pp_B: { x: 1 }, pp_C: Number.NaN },
        's',
      ),
    ).toBe('s&2995');
  });

  it('rejects an empty salt or non-object params', () => {
    expect(() => node.jazzCashHashMessage({}, '')).toThrow(TypeError);
    expect(() =>
      node.jazzCashHashMessage(null as unknown as Record<string, unknown>, 's'),
    ).toThrow(TypeError);
  });
});

describe.each([
  ['node:crypto', node.buildJazzCashSecureHash, node.verifyJazzCashResponse],
  ['Web Crypto', web.buildJazzCashSecureHash, web.verifyJazzCashResponse],
] as const)('%s', (_name, build, verify) => {
  it('builds the secure hash (synthetic, checked with OpenSSL)', async () => {
    expect(await build(request, SALT)).toBe(REQUEST_HASH);
    expect(
      await build(
        {
          pp_MerchantID: 'MER123',
          pp_OrderInfo: 'A48cvE28',
          pp_Amount: '2995',
        },
        '0F5DD14AE2',
      ),
    ).toBe('C7689CDA7474EB1ADCD343FD0C0B676BAD0BA66361CC46DB589BDB0DA4C1C867');
  });

  it('verifies a valid, successful response', async () => {
    expect(await verify(response('000', SUCCESS_HASH), SALT)).toEqual({
      valid: true,
      success: true,
      responseCode: '000',
      reason: null,
    });
  });

  it('accepts a lower-case hash', async () => {
    const result = await verify(
      response('000', SUCCESS_HASH.toLowerCase()),
      SALT,
    );
    expect(result.valid).toBe(true);
  });

  it('is valid but not a success for another response code', async () => {
    expect(await verify(response('124', PENDING_HASH), SALT)).toEqual({
      valid: true,
      success: false,
      responseCode: '124',
      reason: null,
    });
  });

  it('rejects a tampered field', async () => {
    const tampered = { ...response('000', SUCCESS_HASH), pp_Amount: '1' };
    expect(await verify(tampered, SALT)).toMatchObject({
      valid: false,
      success: false,
      reason: 'hash-mismatch',
    });
  });

  it('rejects a response signed with another salt', async () => {
    expect((await verify(response('000', SUCCESS_HASH), 'other')).reason).toBe(
      'hash-mismatch',
    );
  });

  it('rejects a response code changed to 000', async () => {
    expect((await verify(response('000', PENDING_HASH), SALT)).reason).toBe(
      'hash-mismatch',
    );
  });

  it('checks the order reference and amount against your records', async () => {
    const ok = response('000', SUCCESS_HASH);
    expect(
      (await verify(ok, SALT, { txnRefNo: 'T20261118000001', amount: 25000 }))
        .valid,
    ).toBe(true);
    expect((await verify(ok, SALT, { txnRefNo: 'T999' })).reason).toBe(
      'txn-ref-mismatch',
    );
    expect((await verify(ok, SALT, { amount: '2500' })).reason).toBe(
      'amount-mismatch',
    );
  });

  it('rejects missing or malformed hashes and never throws for any params', async () => {
    const fields = response('000', SUCCESS_HASH);
    const { pp_SecureHash: _omit, ...unsigned } = fields;
    void _omit;
    expect((await verify(unsigned, SALT)).reason).toBe('missing-hash');
    expect(
      (await verify({ ...fields, pp_SecureHash: 'abc' }, SALT)).reason,
    ).toBe('malformed-hash');
    expect(
      (await verify({ ...fields, pp_SecureHash: SUCCESS_HASH + '00' }, SALT))
        .reason,
    ).toBe('malformed-hash');
    for (const value of [null, undefined, 1, 'x', [], [1, 2]]) {
      expect((await verify(value, SALT)).reason).toBe('not-an-object');
    }
    expect((await verify({ pp_SecureHash: 5 }, SALT)).reason).toBe(
      'missing-hash',
    );
  });

  it('rejects an empty salt', async () => {
    await expect(async () =>
      verify(response('000', SUCCESS_HASH), ''),
    ).rejects.toThrow(TypeError);
  });
});
