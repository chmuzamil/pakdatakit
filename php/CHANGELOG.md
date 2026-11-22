# Changelog

## 2.7.1

Patch release, from real data. Every port gives the same results on the
shared test vectors.

### Changed

- `Cnic::findAll()` and `Cnic::mask()` find CNICs in any grouping: any run of exactly 13 digits starting
  with 1-8, joined by single separators (space, hyphen or dash, dot, or the
  new slash), such as `352 0212 3456 71` or `35202/1234567/1`. Everything
  2.7.0 found is still found, including a 5-7-1 CNIC inside a longer run; a
  longer run is otherwise never cut. This also matches more numbers that are
  not CNICs (any 13 digits starting with 1-8, however grouped).
- Toll-free numbers: `0800` and five or six digits (PTA's National Numbering
  Plan 2008 gives six; Soneri Bank uses `0800005000`). Eight digits stay
  rejected.

### Added

- `Cnic::mask($text, replacement: '[CNIC removed]')` replaces each whole CNIC with a string.

## 2.7.0

Minor release: new features and one accuracy fix behind an option. Every
port gives the same results on the shared test vectors (35,000+, about 1,800
new).

### Added

- **Salary tax surcharge.** `IncomeTax::calculateSalary()` and `calculateMonthlySalary()` take `['includeSurcharge' => true]` and return `surcharge` and `total`; `getSalarySlabs()` gives each year's `SalaryTaxSurcharge` (`null` before 2025). The section 4AB surcharge
  is a percentage of the whole tax once taxable income exceeds Rs 10
  million: 10% in tax year 2025, 9% for salaried individuals in 2026, and
  none in 2027 or before 2025. The option is off by default in 2.x, so
  existing results don't change; it will be on by default in 3.0.
- **Service numbers as landlines.** `Numbers::validateLandline($phone, services: true)` also accepts UAN,
  toll-free and premium-rate numbers. Laravel: the rule `pk_landline:services` and `new Rules\Landline(services: true)`.
- **CNICs in free text.** `Cnic::findAll($text)` returns `CnicMatch` objects (`raw`, `digits`, `formatted`, `start`, `end`; offsets in code points, for `mb_substr`); `Cnic::mask($text, 'X')` returns `MaskedText`. Pattern matches: other 13-digit
  numbers starting with 1-8 also match; CNIC validation stays strict.
- **Phonetic keys for Roman Urdu names**: `Text::romanUrduKey($text)` (accents are folded with a table generated from Node.js, so the intl extension is not needed: `scripts/generate-latin-fold-php.mjs`), so that `Mubeen` and
  `Mobeen`, or `Rehman` and `Rahman`, match.
- **Raast**: `RaastQrValidation` has `kind` (after `valid`, also in `toArray()`).

### Changed

- `0122` numbers are no longer recognised: they are seen in use, but no PTA
  document lists them. `Numbers::analyze()` now returns `null` for them; the
  `personal` type is never returned.
- Toll-free numbers follow PTA's numbering plan: `0800` and five digits; the
  8-digit form is no longer accepted.
- A merchant Raast QR without an IBAN is valid with the warning `no-iban`; a
  person-to-person QR without an IBAN is still an error.

### Compatibility

`RaastQrValidation`'s constructor takes `kind` second, and `SalaryTax` and
`SalaryTaxYear` have new properties; code that builds them positionally
(normally only the library does) must be updated.

## 2.6.0

Minor release: one new feature. Every port gives the same results on the
shared test vectors (812 new ones).

### Added

- `Currency::parseAmount()` and `Currency::formatAmountInput()`, with the
  `ParsedAmount` class. `parseAmount`
  reads a rupee amount as people type it in Pakistan and returns
  `{ value, raw }` in rupees, rounded half-up to the paisa, or `null`. It
  accepts `150,000` and `1,50,000` grouping with decimals, Urdu and
  Arabic-Indic digits, `Rs`/`Rs.`/`PKR`/`₨` and a trailing `/-`, and the
  shorthand `k`, `thousand`, `hazar`, `ہزار`, `lakh`, `lac`, `لاکھ`, `crore`,
  `cr` and `کروڑ` (also `1.5 lakh`, `2.25cr`). It rejects negatives, ranges,
  more than one number, leftover letters, ambiguous grouping and amounts over
  Rs. 50 trillion. The arithmetic is done on the digits, so `1.005` is 1.01
  in every language. `formatAmountInput` writes the amount back
  (`"Rs. 150,000"`) for showing next to a field. It never throws.
- Laravel rule `pk_amount` (and `Rules\Amount`), with English and Urdu
  messages.

## 2.5.1

Patch release: documentation, packaging and dependency updates. No API,
behaviour or data changes; every port still gives the same results on the
shared test vectors.

### Changed

- The README is rewritten for what PakDataKit is now: one library in
  TypeScript, Python, Dart/Flutter, .NET and PHP/Laravel with React, Vue and
  Angular helpers, with a table of every published package, an overview of
  the modules by area and a quick start for each language. The old roadmap
  is removed. The Dart, .NET and PHP READMEs now say 32,000+ shared test
  vectors.
- The Python source distribution (sdist) no longer includes `tests/`: the
  tests need `data/` and `test-vectors/` from the repository, so they could
  not run from the sdist.
- Release workflows only start on their own tags (`v1.2.3` no longer also
  matches `vue-v1.2.3`), and a version that is already on its registry is
  skipped with a notice instead of failing.
- The .NET release keeps the attested `.nupkg` files and attaches them to
  the GitHub release, since nuget.org re-signs packages and its copies
  cannot be checked against the build attestation.
- Development dependencies updated (tsup 9, jsdom 31, Vitest 5.1, ESLint
  10.15, Prettier 3.10, xunit 2.9.3, Microsoft.NET.Test.Sdk 18, and
  actions/attest-build-provenance 4).

## 2.5.0

Includes everything prepared for 2.4.0, which was never published on its own: the 2.4.0 changes are listed here with the 2.5.0 ones.

### Added

- `Text::slugify()`, `Text::compareUrdu()`, `Text::isRtl()` and `Text::wrapBidi()`: URL slugs that keep Urdu letters (`script`: `Text::SCRIPT_ANY`, `SCRIPT_LATIN`, `SCRIPT_URDU`), Urdu alphabetical order for `usort()` from the CLDR `ur` collation (no intl or ICU needed), right-to-left detection, and Unicode directional isolates (`Text::BIDI_AUTO`, `BIDI_RTL`, `BIDI_LTR`). They accept any value and never throw.
- `IncomeTax::calculateSalary()`, `IncomeTax::calculateMonthlySalary()`, `IncomeTax::getSalarySlabs()`, `IncomeTax::getSalaryYears()` and `IncomeTax::getTaxYear()`: income tax on salary from the salaried rate table of the Income Tax Ordinance 2001 for tax years 2020 to 2027, computed exactly in whole paisa (`SalaryTax`, `SalaryTaxSlab`, `SalaryTaxYear`). They return `null` for any invalid input and never throw.
- `Quality::scoreAddress()`: scores how complete a delivery address is (0 to 100) for cash on delivery, with the `missing` parts (`city`, `houseNumber`,
  `street`, `area`, `postalCode`, `landmark`) and the parsed address as an
  `AddressScore`; `Quality::ADDRESS_WEIGHTS` holds the points per part.
  `Quality::phoneRiskSignals()` flags phone numbers a courier cannot use:
  invalid, landline and service numbers, and repeated, sequential and
  placeholder numbers. New Laravel rule `pk_cod_phone` (and `Rules\CodPhone`)
  passes only when there are no flags, with English and Urdu messages.
- `SalesTax::getRate()`, `SalesTax::calculate()` and `SalesTax::splitInclusive()`: standard sales tax rates for goods (FBR) and services (PRA, SRB, KPRA, BRA, ICT) from 1 July 2019, with the law and source of each, and exact sales tax amounts in whole paisa (`SalesTaxRate`, `SalesTaxAmounts`). They return `null` for any invalid input and never throw.
- `Bills::parseElectricityRef()`, `Bills::validateElectricityRef()` and `Bills::validateGasConsumerNumber()`: electricity bill identifiers (14-digit DISCO reference numbers with optional U/R, DISCO customer IDs and K-Electric account numbers) as an `ElectricityRef`, and SNGPL (11 digits) and SSGC (10 digits) gas consumer numbers. New Laravel rule `pk_electricity_ref` (and `Rules\ElectricityRef`), with English and Urdu messages.
- `Courier::mapStatus()` and `Courier::normalizeCity()`: maps a courier's own status (PostEx's documented order statuses and tracking codes, and Leopards' "Returned to Shipper") to one vocabulary (`Courier::PENDING` … `Courier::CANCELLED`), and maps short forms, old names and Urdu spellings of cities (`LHR`, `Pindi`, `Lyallpur`, `Karachi City`, `لاہور`) to the city list. No API is called; both return `null` for anything unknown and never throw. The status mapping is experimental and may change in a minor release as more couriers' lists are added.
- `FbrInvoice::build()`, `FbrInvoice::validate()` and `FbrInvoice::expectedSalesTax()`: FBR Digital Invoicing (PRAL's DI API specification v1.12, `FbrInvoice::SPEC_VERSION`). `build()` works out each line's sales tax (`N%` and `Rs.N` rates), fills FBR's defaults and adds up the columns; `validate()` checks an invoice (array or decoded JSON object) offline and returns every problem with FBR's error code as an `FbrInvoiceValidation` of `FbrInvoiceError`s. No HTTP client or tokens; they never throw.

### Changed

- `composer.json` now also requires `ext-ctype` and `ext-json` (with `ext-mbstring`), the extensions the code calls, so Composer refuses to install without them. Both are enabled in standard PHP builds.
- `PakData::version()` is now `2026-11-18` (new dataset: sales tax rates).

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
- `Postal::getPostOffice()` and `Postal::searchPostOffices()`: every delivery
  post office in Pakistan Post's directory (about 2,560) as a `PostOffice`
  (`code`, `office`, `town`, `district`, `province`), including offices in
  towns and villages. The directory is in its own data file, loaded only when
  these two methods are called.
- `Postal::getCity()` and the other `Postal` methods cover only the post
  offices of the cities the package lists; a village code returns `null`
  from `getCity()` (use `getPostOffice()`). Compared with npm 2.2.1,
  `getCity()` gives a different answer for eight codes: `47040` is Wah
  Cantonment (was Taxila), and `15700`, `29120`, `29430`, `70100`, `72220`,
  `73020` and `73220`, which were given as the main code of a city but belong
  to a village office nearby, now return `null`.

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
`PakData::version()` is now `2026-11-17`.
