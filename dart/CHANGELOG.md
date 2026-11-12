# Changelog

## 2.3.0

- `validatePassport()`: format check for Pakistani passport numbers (two
  letters, seven digits). DGIP does not publish the format, so this checks
  the common shape only. Also as `package:pakdatakit/passport.dart`.
- `validateVehiclePlate()` and `parseVehiclePlate()`: series, number and
  optional year of a vehicle registration number (1–4 letters, 1–4 digits).
  Provinces use different formats, so this checks the shape they share. Also
  as `package:pakdatakit/vehicle.dart`.
- Both are checked against the shared test vectors. See DATA.md in the
  repository for sources and limits.

## 2.2.1

The district split from Swat in January 2026 is now named **Bar Swat**, as in
the Khyber Pakhtunkhwa Board of Revenue notification of 27 January 2026,
instead of "Upper Swat". "Upper Swat" still resolves in `getDistrictProvince` to Khyber Pakhtunkhwa.
`dataVersion` is now `2026-11-07`.

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
