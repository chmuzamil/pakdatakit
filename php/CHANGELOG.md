# Changelog

## 2.3.0

First release of the PHP package, matching version 2.3.0 of the
[`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).

- Every module of the npm package for PHP 8.2+, with no dependencies beyond
  the `mbstring` extension: `Cnic`, `Phone`, `Networks`, `Numbers`, `Iban`,
  `Tax`, `Passport`, `VehiclePlate`, `Postal`, `Geo`, `WhatsApp`, `Currency`,
  `Words`, `Text`, `Hijri`, `Holidays`, `Address`, `Input` and `RaastQr`.
- Checked against the TypeScript library with over 12,000 shared test cases,
  also used by the Python, Dart and .NET ports, so all give the same results.
- Does not need the `intl` extension and does not depend on the locale:
  upper- and lower-casing, Unicode normalization, sort order and number
  formatting are built in.
- No method throws for a string it is given to check: validators return
  `false`, parsers and lookups return `null` or an empty array, including for
  `null`, very long input and text that is not valid UTF-8. `try*` methods
  cover the ones that throw for invalid arguments.
- Laravel 11 and 12 bridge, discovered automatically: `pk_cnic`, `pk_phone`,
  `pk_iban`, `pk_ntn`, `pk_strn`, `pk_landline`, `pk_passport` and
  `pk_vehicle_plate` rules, matching rule objects, `CnicCast`, `PhoneCast` and
  `IbanCast` Eloquent casts, and English and Urdu messages.

Data (November 2026 audit, see AUDIT.md and DATA.md in the repository):
banks `ZTBL` (Zarai Taraqiati Bank Limited) and `SMFB` (Sindh Microfinance
Bank) added; `TMFB`/`TAMW` renamed "Easypaisa Bank Limited" and `JCMA`/`WMBL`
"Mobilink Microfinance Bank (JazzCash)"; eight postal codes corrected from
Pakistan Post's directory (Gilgit, Dera Ismail Khan, Tank, Badin, Thatta,
Sujawal, Matiari, Taxila) and Wah Cantonment `47040` added; holiday `source`
links for 2024 to 2026 now point to official notifications.
Also added: division and tehsil lookups from the 2023 census (30 divisions,
591 tehsils; each tehsil is recorded under its census district), the full
Pakistan Post directory (about 2,560 post codes), 41 more landline area
codes, the bank type `public-sector`, and SME Bank is reported as inactive.
`PakData::version()` is now `2026-11-16`.
