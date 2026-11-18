# Changelog

## 0.1.0

First release.

- `buildJazzCashSecureHash(params, integritySalt)` and
  `verifyJazzCashResponse(params, integritySalt, expected?)`: the JazzCash
  `pp_SecureHash` (HMAC-SHA256 over the salt and the non-empty `pp…` fields
  sorted by name, joined with `&`), following JazzCash's integration guide
  v4.2, section 14.2. Verification compares the hash in constant time, can
  check `pp_TxnRefNo` and `pp_Amount` against your records, and reports
  `success` only for response code `000`. It never throws for any response
  body.
- `jazzCashHashMessage()`: the exact text that is hashed, for debugging in
  the sandbox.
- Two entry points: `pakdatakit-pay` (`node:crypto`) and
  `pakdatakit-pay/web` (Web Crypto, async), with the same results.
- Tests use the guide's example text and synthetic payloads checked with
  OpenSSL; no official sample hash is public, so the rules still need
  confirming against JazzCash's sandbox.
- Easypaisa is not included: its integration guides are not published.
