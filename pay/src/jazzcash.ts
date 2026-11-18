/**
 * JazzCash secure hash rules shared by the Node.js and Web Crypto entry
 * points.
 *
 * Source: JazzCash "Payment Gateway Integration Guide for Merchants",
 * version 4.2 (9 May 2019), section 14.2 "How is SHA256-HMAC Calculated":
 * take the fields whose names begin with "pp", sort them by field name in
 * ascending ASCII order, join their values with `&`, put the Integrity Salt
 * (the shared secret) in front, and compute HMAC-SHA256 with the salt as the
 * key. The guide's own example message starts `<salt>&` and has no trailing
 * `&`.
 *
 * The guide does not say whether empty fields are included: they are left
 * out here (its example has none), which needs confirming in JazzCash's
 * sandbox. It also does not fix the case of the hex digest: it is built in
 * upper case and compared case-insensitively.
 */

/** Request or response fields, as posted to or by JazzCash. */
export type JazzCashParams = Readonly<Record<string, unknown>>;

/** The field that carries the hash; it is never part of its own input. */
export const SECURE_HASH_FIELD = 'pp_SecureHash';

/** Response code for a successful transaction (guide, Appendix I). */
export const JAZZCASH_SUCCESS_CODE = '000';

/** Why {@link verifyJazzCashResponse} rejected a response. */
export type JazzCashRejection =
  | 'not-an-object'
  | 'missing-hash'
  | 'malformed-hash'
  | 'hash-mismatch'
  | 'txn-ref-mismatch'
  | 'amount-mismatch';

/** What your own records say the response must match. */
export interface JazzCashExpected {
  /** Your order's `pp_TxnRefNo`. */
  txnRefNo?: string;
  /**
   * The amount you charged, as JazzCash sends it in `pp_Amount`: in paisa
   * (the last two digits are the decimals), e.g. `'250000'` for Rs 2,500.
   */
  amount?: string | number;
}

/** Result of verifying a JazzCash response. */
export interface JazzCashVerification {
  /** The hash matches, and the reference and amount match when given. */
  valid: boolean;
  /** `valid`, and `pp_ResponseCode` is `000`. */
  success: boolean;
  /** `pp_ResponseCode` as received, or `null`. */
  responseCode: string | null;
  /** Why it is not valid, or `null` when it is. */
  reason: JazzCashRejection | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A field's value as text, or `null` for an empty or unusable value. */
function fieldValue(value: unknown): string | null {
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'bigint' || typeof value === 'boolean')
    return String(value);
  return null;
}

/**
 * The text that is hashed: the salt, then the non-empty `pp…` fields'
 * values in ascending order of field name, joined with `&`.
 *
 * Exposed for debugging a mismatch against JazzCash's sandbox. Never log it
 * in production: it starts with your Integrity Salt.
 */
export function jazzCashHashMessage(
  params: JazzCashParams,
  integritySalt: string,
): string {
  assertSalt(integritySalt);
  if (!isRecord(params)) throw new TypeError('params must be an object');
  const keys = Object.keys(params)
    .filter(
      (key) =>
        key.slice(0, 2).toLowerCase() === 'pp' &&
        key.toLowerCase() !== SECURE_HASH_FIELD.toLowerCase(),
    )
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const values: string[] = [];
  for (const key of keys) {
    const value = fieldValue(params[key]);
    if (value !== null) values.push(value);
  }
  return [integritySalt, ...values].join('&');
}

export function assertSalt(
  integritySalt: unknown,
): asserts integritySalt is string {
  if (typeof integritySalt !== 'string' || integritySalt.length === 0) {
    throw new TypeError('integritySalt must be a non-empty string');
  }
}

const HEX_64 = /^[0-9a-fA-F]{64}$/;

/** Bytes as upper-case hex. */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out.toUpperCase();
}

/** Hex digest to bytes, or `null` unless it is exactly 64 hex digits. */
export function fromHex(hex: string): Uint8Array | null {
  if (!HEX_64.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++)
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/**
 * Checks everything except the hash comparison itself, which each entry
 * point does with its own crypto. Returns the received digest bytes, or a
 * finished (failed) verification.
 */
export function precheck(
  params: unknown,
):
  | { digest: Uint8Array; responseCode: string | null }
  | { result: JazzCashVerification } {
  if (!isRecord(params)) return { result: fail('not-an-object', null) };
  const code = params['pp_ResponseCode'];
  const responseCode = typeof code === 'string' ? code : null;
  const received = params[SECURE_HASH_FIELD];
  if (typeof received !== 'string' || received === '') {
    return { result: fail('missing-hash', responseCode) };
  }
  const digest = fromHex(received.trim());
  if (digest === null) return { result: fail('malformed-hash', responseCode) };
  return { digest, responseCode };
}

/** After the hash matched: compares the reference and amount with your records. */
export function finish(
  params: Record<string, unknown>,
  responseCode: string | null,
  expected: JazzCashExpected | undefined,
): JazzCashVerification {
  if (isRecord(expected)) {
    if (
      expected.txnRefNo !== undefined &&
      fieldValue(params['pp_TxnRefNo']) !== String(expected.txnRefNo)
    ) {
      return fail('txn-ref-mismatch', responseCode);
    }
    if (
      expected.amount !== undefined &&
      fieldValue(params['pp_Amount']) !== String(expected.amount)
    ) {
      return fail('amount-mismatch', responseCode);
    }
  }
  return {
    valid: true,
    success: responseCode === JAZZCASH_SUCCESS_CODE,
    responseCode,
    reason: null,
  };
}

export function fail(
  reason: JazzCashRejection,
  responseCode: string | null,
): JazzCashVerification {
  return { valid: false, success: false, responseCode, reason };
}

/** Constant-time comparison of two equal-length byte arrays. */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= (a[i] as number) ^ (b[i] as number);
  return diff === 0;
}
