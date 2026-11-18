/**
 * pakdatakit-pay with Web Crypto (`crypto.subtle`): for Deno, Bun,
 * Cloudflare Workers and other edge runtimes, and Node.js 20+. The functions
 * are async because Web Crypto is.
 *
 * Run these on your server only: the Integrity Salt must never reach a
 * browser or a mobile app.
 */
import {
  assertSalt,
  equalBytes,
  finish,
  jazzCashHashMessage,
  precheck,
  toHex,
  type JazzCashExpected,
  type JazzCashParams,
  type JazzCashVerification,
} from './jazzcash.js';

export {
  jazzCashHashMessage,
  JAZZCASH_SUCCESS_CODE,
  SECURE_HASH_FIELD,
  type JazzCashExpected,
  type JazzCashParams,
  type JazzCashRejection,
  type JazzCashVerification,
} from './jazzcash.js';

const encoder = new TextEncoder();

function subtle(): SubtleCrypto {
  const api = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if (!api) throw new Error('Web Crypto (crypto.subtle) is not available');
  return api;
}

async function hmac(
  message: string,
  integritySalt: string,
): Promise<Uint8Array> {
  const key = await subtle().importKey(
    'raw',
    encoder.encode(integritySalt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await subtle().sign('HMAC', key, encoder.encode(message)),
  );
}

/**
 * Builds `pp_SecureHash` for a JazzCash request with Web Crypto. Same rules
 * and result as the Node.js `buildJazzCashSecureHash`.
 *
 * @returns 64 upper-case hex digits
 * @throws TypeError if `integritySalt` is empty or `params` is not an object
 */
export async function buildJazzCashSecureHash(
  params: JazzCashParams,
  integritySalt: string,
): Promise<string> {
  const message = jazzCashHashMessage(params, integritySalt);
  return toHex(await hmac(message, integritySalt));
}

/**
 * Verifies a JazzCash response with Web Crypto, comparing the hash in
 * constant time. Same rules and result as the Node.js
 * `verifyJazzCashResponse`. Never rejects for any `params`; rejects with a
 * TypeError only for an empty `integritySalt`.
 */
export async function verifyJazzCashResponse(
  params: unknown,
  integritySalt: string,
  expected?: JazzCashExpected,
): Promise<JazzCashVerification> {
  assertSalt(integritySalt);
  const checked = precheck(params);
  if ('result' in checked) return checked.result;
  const fields = params as Record<string, unknown>;
  const actual = await hmac(
    jazzCashHashMessage(fields, integritySalt),
    integritySalt,
  );
  if (!equalBytes(actual, checked.digest)) {
    return {
      valid: false,
      success: false,
      responseCode: checked.responseCode,
      reason: 'hash-mismatch',
    };
  }
  return finish(fields, checked.responseCode, expected);
}
