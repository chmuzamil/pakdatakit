# pakdatakit-pay

Server-side helpers for Pakistani payment gateways. Version 0.1 covers the JazzCash secure hash (`pp_SecureHash`): building it for a request, and verifying it on a response, with a constant-time comparison. Zero dependencies, offline, for Node.js (`node:crypto`) and Web Crypto runtimes (Deno, Bun, Cloudflare Workers, Node.js 20+).

There is no API client: this package never sends anything anywhere. Post the fields to JazzCash with your own code.

```bash
npm install pakdatakit-pay
```

> **Status: 0.1, needs sandbox confirmation.** The hashing rules follow JazzCash's own "Payment Gateway Integration Guide for Merchants" (version 4.2, 9 May 2019, section 14.2). The guide shows the text to hash but not a resulting hash, and no official sample payload with a hash is public, so the tests use OpenSSL-checked synthetic values. Before going live, confirm a request and a response against JazzCash's sandbox with your own test credentials.

## JazzCash

```ts
import {
  buildJazzCashSecureHash,
  verifyJazzCashResponse,
} from 'pakdatakit-pay';
// Deno, Bun, Workers: import from 'pakdatakit-pay/web' (the same functions, async)

const salt = process.env.JAZZCASH_INTEGRITY_SALT!; // server only

// 1. Request: add the hash to the fields you post to JazzCash.
const fields = {
  pp_Version: '1.1',
  pp_TxnType: 'MWALLET',
  pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID!,
  pp_Password: process.env.JAZZCASH_PASSWORD!,
  pp_TxnRefNo: order.reference,
  pp_Amount: String(order.amountInPaisa), // last two digits are the decimals
  pp_TxnCurrency: 'PKR',
  pp_TxnDateTime: '20261118120000',
  // …the other pp_ fields your integration uses
};
const pp_SecureHash = buildJazzCashSecureHash(fields, salt);

// 2. Response: verify what JazzCash posts back to your return URL or IPN endpoint.
const result = verifyJazzCashResponse(req.body, salt, {
  txnRefNo: order.reference,
  amount: String(order.amountInPaisa),
});
// { valid: true, success: true, responseCode: '000', reason: null }
```

How the hash is built (guide v4.2, section 14.2):

1. Take every field whose name starts with `pp` (`pp_…`, and the merchant fields `ppmpf_…` and `ppmbf_…`), except `pp_SecureHash` itself.
2. Leave out empty fields (the guide does not say; its example has none).
3. Sort them by field name in ascending ASCII order, so `pp_Amount` comes before `pp_MerchantID`, and `pp_Card` before `pp_CardNum`.
4. Join the Integrity Salt and the values with `&`: `salt&value1&value2…`.
5. HMAC-SHA256 with the Integrity Salt as the key, as 64 upper-case hex digits. The guide does not say which case; verification accepts either.

`verifyJazzCashResponse(params, salt, expected?)` returns `{ valid, success, responseCode, reason }`:

| Field          | Meaning                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valid`        | The hash matches (constant-time comparison), and `pp_TxnRefNo` and `pp_Amount` match `expected` when you give it                                        |
| `success`      | `valid`, and `pp_ResponseCode` is `000`, which the guide gives as success. Anything else (such as `124`, waiting for payment, or `157`, pending) is not |
| `responseCode` | `pp_ResponseCode` as received                                                                                                                           |
| `reason`       | `null`, or `not-an-object`, `missing-hash`, `malformed-hash`, `hash-mismatch`, `txn-ref-mismatch`, `amount-mismatch`                                    |

It never throws for any response body. Both functions throw a `TypeError` for an empty salt, which is a configuration error.

`jazzCashHashMessage(params, salt)` returns the exact text that is hashed, to debug a mismatch in the sandbox. It starts with your salt: never log it in production.

### Handle callbacks idempotently

JazzCash can post the same result more than once (the browser return and the IPN, retries, a customer refreshing the page). Make the handler safe to run twice:

- Look the order up by `pp_TxnRefNo` and act only on a state change: if the order is already paid, return the same response without fulfilling it again.
- Record the transition in one database transaction, guarded by the current state (`UPDATE … SET status = 'paid' WHERE id = ? AND status = 'pending'`), so two simultaneous callbacks cannot both win.
- Store `pp_RetreivalReferenceNo` or the gateway's own transaction ID with the payment, and reject a second, different payment for an order that is already paid.
- Treat pending codes (`124`, `157`) as "not yet": keep the order pending and confirm later with JazzCash's status inquiry, instead of failing it.

### Never expose the salt client-side

The Integrity Salt is the key that proves a request or response is genuine. Anyone who has it can forge a "paid" response.

- Build the hash on your server and send the finished fields (with `pp_SecureHash`) to the page that posts them to JazzCash. Never put the salt, or the code that uses it, in browser JavaScript, a mobile app, or a public repository.
- Keep it in an environment variable or a secret manager, separate for sandbox and production, and rotate it in JazzCash's merchant portal if it leaks.
- Don't log full request or response bodies alongside the hash message.

### Check the amount and order against your own records

A valid hash proves JazzCash sent the response. It does not prove the response is for the order and amount you expect: a customer could replay a genuine response from a cheaper order. Before you mark an order paid:

- Look the order up by `pp_TxnRefNo` in your database, not from any other field in the request.
- Compare `pp_Amount` with the amount you stored when you created the payment (pass both as `expected`), and check the currency.
- Only then trust `success`, and fulfil the order once (see above).

## Easypaisa

Not included. Easypaisa's merchant integration guides (Easypay hosted checkout and the Open API signing rules) are given to merchants during onboarding and are not published on Easypaisa's own sites, so there is no official public source to implement them from. Contributions are welcome once an official public document exists.

## Licence

MIT. Copyright (c) 2026 Muzamil Chaudhery and PakDataKit Contributors.
