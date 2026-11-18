/**
 * pakdatakit-pay for Node.js (`node:crypto`). For browsers, Deno, Bun and
 * edge runtimes, import `pakdatakit-pay/web` (Web Crypto) instead.
 *
 * Run these on your server only: the Integrity Salt must never reach a
 * browser or a mobile app.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  assertSalt,
  finish,
  jazzCashHashMessage,
  precheck,
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

function hmac(message: string, integritySalt: string): Buffer {
  return createHmac('sha256', Buffer.from(integritySalt, 'utf8'))
    .update(message, 'utf8')
    .digest();
}

/**
 * Builds `pp_SecureHash` for a JazzCash request: HMAC-SHA256 over the
 * Integrity Salt and the non-empty `pp…` fields sorted by name, joined with
 * `&` (JazzCash integration guide v4.2, section 14.2). Any `pp_SecureHash`
 * already in `params` is ignored.
 *
 * @returns 64 upper-case hex digits
 * @throws TypeError if `integritySalt` is empty or `params` is not an object
 *
 * @example
 * const pp_SecureHash = buildJazzCashSecureHash(fields, process.env.JAZZCASH_SALT!);
 */
export function buildJazzCashSecureHash(
  params: JazzCashParams,
  integritySalt: string,
): string {
  const message = jazzCashHashMessage(params, integritySalt);
  return hmac(message, integritySalt).toString('hex').toUpperCase();
}

/**
 * Verifies a JazzCash response (the fields posted back to your return URL
 * or IPN endpoint): recomputes the secure hash over its `pp…` fields and
 * compares it with `pp_SecureHash` in constant time. Pass `expected` to also
 * check the order reference and amount against your own records.
 *
 * `success` is `true` only when the response is `valid` and
 * `pp_ResponseCode` is `000`. Never throws for any `params`; throws a
 * TypeError only for an empty `integritySalt` (a configuration error).
 */
export function verifyJazzCashResponse(
  params: unknown,
  integritySalt: string,
  expected?: JazzCashExpected,
): JazzCashVerification {
  assertSalt(integritySalt);
  const checked = precheck(params);
  if ('result' in checked) return checked.result;
  const fields = params as Record<string, unknown>;
  const actual = hmac(
    jazzCashHashMessage(fields, integritySalt),
    integritySalt,
  );
  const matches = timingSafeEqual(actual, Buffer.from(checked.digest));
  if (!matches) {
    return {
      valid: false,
      success: false,
      responseCode: checked.responseCode,
      reason: 'hash-mismatch',
    };
  }
  return finish(fields, checked.responseCode, expected);
}
