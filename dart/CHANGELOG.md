# Changelog

## 2.2.0

Initial Dart release, matching version 2.2.0 of the
[`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit) (datasets
checked 2026-10-14).

- Every function of the npm package, with the same names: CNIC, mobile
  numbers and networks, WhatsApp links, IBAN and banks, postal codes, cities
  and districts, address parsing, text and Roman Urdu, Hijri dates, public
  holidays, PKR formatting, amounts in words, NTN/STRN, landlines and other
  numbers, Raast QR codes, and form-input helpers.
- Pure Dart with no dependencies; the datasets are embedded, so it works on
  every platform, including Flutter web.
- Per-module libraries mirroring the npm entry points
  (`package:pakdatakit/cnic.dart`, …).
- Tested against the 12,080 shared test vectors generated from the
  TypeScript library, on the Dart VM and compiled to JavaScript.
