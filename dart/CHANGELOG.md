# Changelog

## 2.8.0

Feature release. Every port gives the same results on the shared test
vectors.

### Added

- `findCNICs()` and `maskCNICs()` take `acrossLines: true` to join digit
  groups across a single line break (`\r\n`, `\r` or `\n`, with spaces
  around it); a blank line never joins them (#88).
- `getDataInfo()` and `listDataInfo()` (`package:pakdatakit/data_info.dart`):
  each bundled dataset's issuer, official source, dates, coverage, record
  count and next expected update. `DataSource` names the record a result
  came from.
- `source` on `SalaryTax` (`calculateSalaryTax()`,
  `calculateMonthlySalaryTax()`) and on `SalesTaxAmounts` from
  `calculateSalesTax()` when the rate was looked up.
- Zakat deduction at source (`package:pakdatakit/zakat.dart`):
  `getZakatNisab()`, `getZakatYears()` and `zakatDeduction()`, Zakat years
  1433-1447 (#93). `zakat` is in whole rupees (First Schedule, Note 2), and
  a year's confirmed date of 1 Ramazan (`valuationDate`, with its
  `valuationDateSource`) is used for lookups by date where known.
- Withholding tax (`package:pakdatakit/withholding.dart`):
  `calculateWithholding()` and `getWithholdingRates()` for sections 231AB,
  236C, 236K, 151, 150, 153, 154B and 149, ATL and non-ATL, tax years
  2025-2027 (#92). `tax` is in whole rupees (section 219).
  `returnOnInvestment` decides the 151 sukuk case (exactly Rs 1 million
  gives `null`), and `resident` gives 154B's `taxNature` (minimum or final).
- 2023 census population (`package:pakdatakit/population.dart`):
  `getDistrictPopulation()` and `getTehsilPopulation()` (#95).
- FBR Digital Invoicing: `getSaleTypes()`, and
  `validateFbrInvoice(invoice, reference: FbrInvoiceReference(...))` checks
  provinces (0073, 0074), sale types (0013), units (0099) and HS code/unit
  pairs against lists synced from FBR's APIs (#91).

## 2.7.2

Patch release. Every port gives the same results on the shared test
vectors, which now include Jaanch's CNIC redaction cases.

### Changed

- `findCNICs()` and `maskCNICs()` now join digit groups with any run of spaces or tabs, or one
  mark (hyphen or dash, dot, slash, or now underscore) with spaces around it:
  `35202  1234567  1`, `35202 -1234567- 1`, `35202_1234567_1`,
  `35202 - 1234567 - 1`. A line break never joins groups. A match is
  consecutive whole groups adding up to exactly 13 digits and starting with
  1-8; a group is never split. This masks everything Jaanch's redaction
  masks except across line breaks, and also matches more numbers that are
  not CNICs (table columns, price lists, file names).

## 2.7.1

Patch release, from real data. Every port gives the same results on the
shared test vectors.

### Changed

- `findCNICs()` and `maskCNICs()` find CNICs in any grouping: any run of exactly 13 digits starting
  with 1-8, joined by single separators (space, hyphen or dash, dot, or the
  new slash), such as `352 0212 3456 71` or `35202/1234567/1`. Everything
  2.7.0 found is still found, including a 5-7-1 CNIC inside a longer run; a
  longer run is otherwise never cut. This also matches more numbers that are
  not CNICs (any 13 digits starting with 1-8, however grouped).
- Toll-free numbers: `0800` and five or six digits (PTA's National Numbering
  Plan 2008 gives six; Soneri Bank uses `0800005000`). Eight digits stay
  rejected.

### Added

- `maskCNICs(text, replacement: '[CNIC removed]')` replaces each whole CNIC with a string.

## 2.7.0

Minor release: new features and one accuracy fix behind an option. Every
port gives the same results on the shared test vectors (35,000+, about 1,800
new).

### Added

- **Salary tax surcharge.** `calculateSalaryTax()` and `calculateMonthlySalaryTax()` take `includeSurcharge` and return `surcharge` and `total`; `getSalaryTaxSlabs()` gives each year's `SalaryTaxSurcharge` (`null` before 2025). The section 4AB surcharge
  is a percentage of the whole tax once taxable income exceeds Rs 10
  million: 10% in tax year 2025, 9% for salaried individuals in 2026, and
  none in 2027 or before 2025. The option is off by default in 2.x, so
  existing results don't change; it will be on by default in 3.0.
- **Service numbers as landlines.** `validateLandline(phone, services: true)` also accepts UAN,
  toll-free and premium-rate numbers.
- **CNICs in free text.** `findCNICs(text)` returns `CNICMatch` objects (`raw`, `digits`, `formatted`, `start`, `end`; offsets in UTF-16 code units); `maskCNICs(text, mask: 'X')` returns `MaskedText`. Pattern matches: other 13-digit
  numbers starting with 1-8 also match; CNIC validation stays strict.
- **Phonetic keys for Roman Urdu names**: `romanUrduKey(text)` (without NFKD in Dart, accents are folded with a table generated from Node.js: `scripts/generate-latin-fold-dart.mjs`), so that `Mubeen` and
  `Mobeen`, or `Rehman` and `Rahman`, match.
- **Raast**: `RaastQrValidation.kind` (`RaastQrKind?`) and the warning `RaastQrWarning.noIban`.

### Changed

- `0122` numbers are no longer recognised: they are seen in use, but no PTA
  document lists them. `analyzeNumber()` now returns `null` for them;
  `NumberType.personal` is deprecated, never returned, and will be removed in
  3.0.
- Toll-free numbers follow PTA's numbering plan: `0800` and five digits; the
  8-digit form is no longer accepted.
- A merchant Raast QR without an IBAN is valid with the warning `no-iban`; a
  person-to-person QR without an IBAN is still an error.


## 2.6.0

Minor release: one new feature. Every port gives the same results on the
shared test vectors (812 new ones).

### Added

- `parseAmount()` and `formatAmountInput()` and the `ParsedAmount` class. `parseAmount`
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

- `calculateSalaryTax()` and `calculateMonthlySalaryTax()`: income tax on a
  salaried individual's taxable income from the salaried rate table of the
  Income Tax Ordinance 2001 for tax years 2020 to 2027, as a `SalaryTax`
  (`tax`, `monthly`, `effectiveRate`, `slab`, `taxYear`), rounded half up to
  the paisa, exactly on every platform. `getSalaryTaxSlabs()` returns a
  year's table (`SalaryTaxYear`, `SalaryTaxSlab`) with its law and FBR
  source, `getSalaryTaxYears()` the years covered and `getTaxYear()` the tax
  year of a date. Also as `package:pakdatakit/incometax.dart`.
- `slugify()`: URL slugs that keep Urdu letters (`SlugScript` limits the
  script); `compareUrdu()`: Urdu alphabetical order from the CLDR collation,
  for `List.sort`, without ICU; `isRTL()` and `wrapBidi()` (`BidiDirection`):
  right-to-left detection and Unicode directional isolates.
- `scoreAddress()`: scores how complete a delivery address is (0-100), with
  the `missing` `AddressPart`s and the `parseAddress` result, and warns when
  a known post office code is in a different province from the city.
  `phoneRiskSignals()`: `PhoneRiskFlag`s for a phone number a courier cannot
  reach or that looks made up (landline, service number, repeated or
  sequential digits, placeholder numbers). Also `addressWeights`, and as
  `package:pakdatakit/quality.dart`.
- `getSalesTaxRate()`: the standard sales tax rate on goods (FBR) or on
  services in a province or Islamabad Capital Territory on a date, from 1 July
  2019, with the authority, law and source (`SalesTaxRate`, `SalesTaxKind`).
  `calculateSalesTax()` adds tax at a rate or a looked-up rate, or splits it
  out with `inclusive: true`; `splitInclusive()` splits a tax-inclusive amount.
  Both return `SalesTaxAmounts`, rounded half up to the paisa, exactly on
  every platform. Also as `package:pakdatakit/salestax.dart`.
- `parseElectricityRef()` and `validateElectricityRef()`: a DISCO (WAPDA)
  14-digit reference number with optional U/R, a DISCO customer ID (10 or 11
  digits) or a 13-digit K-Electric account number, as an `ElectricityRef`
  (`type` as an `ElectricityRefType`, `digits`, `formatted`, `urbanRural`,
  `disco`). `validateGasConsumerNumber()` checks an SNGPL (11-digit) or SSGC
  (10-digit) consumer number (`GasCompany`). Format checks only; no utility
  publishes a check digit. Also as `package:pakdatakit/bills.dart`.
- `mapCourierStatus()`: maps a courier's own status (name, numeric ID or
  code) to one vocabulary, `CourierStatus`, from PostEx's merchant API guide
  and Leopards' "Returned to Shipper" (`Courier` names the couriers).
  `normalizeCityForCourier()` maps short forms (`LHR`, `Khi`, `Pindi`), the
  old name Lyallpur, a trailing "city" and Urdu script to the city list. No
  API is called. Also as `package:pakdatakit/courier.dart`.
- `buildFbrInvoice()` and `validateFbrInvoice()`: FBR Digital Invoicing, for
  the invoice JSON (`Map<String, Object?>`, typedef `FbrInvoice`) posted to
  PRAL's DI API (specification 1.12, `fbrDiSpecVersion`). The builder works
  out each line's sales tax (`expectedSalesTax()`: `N%` or `Rs.N` per unit,
  with `calculateSalesTax`), fills FBR's defaults and adds up the columns
  (`FbrInvoiceBuild`, `FbrInvoiceTotals`); the validator returns every
  problem it can find offline with FBR's error code (`FbrInvoiceValidation`,
  `FbrInvoiceError`), optionally rejecting future dates with `today:`. Also
  `FbrInvoiceType` and `FbrRegistrationType`. No HTTP client and no token
  handling. Also as `package:pakdatakit/fbr_invoice.dart`.

### Changed

- Package metadata: the description, keywords and homepage now follow the same
  style in every registry, and CI checks that the version, repository URL,
  licence and author agree across ports (`npm run check:metadata`).
- `dataVersion` is now `2026-11-18` (new dataset: sales tax rates).

## 2.3.0

### Breaking for exhaustive switches

- `BankType` has a new value, `BankType.publicSector` (`'public-sector'`; see
  Data depth below). Dart 3 checks `switch` statements and expressions over
  an enum for exhaustiveness, so a `switch` over `BankType` without a default
  (`_`) case stops compiling until it handles the new value. Nothing else
  changes at runtime for such code, but National Bank of Pakistan, Sindh Bank,
  The Bank of Khyber and The Bank of Punjab now report `BankType.publicSector`
  instead of `BankType.commercial`.

### Added

- `validatePassport()`: format check for Pakistani passport numbers (two
  letters, seven digits). DGIP does not publish the format, so this checks
  the common shape only. Also as `package:pakdatakit/passport.dart`.
- `validateVehiclePlate()` and `parseVehiclePlate()`: series, number and
  optional year of a vehicle registration number (1–4 letters, 1–4 digits).
  Provinces use different formats, so this checks the shape they share. Also
  as `package:pakdatakit/vehicle.dart`.
- `getPostOffice()` and `searchPostOffices()` (also in
  `package:pakdatakit/postal.dart`): every delivery post office in Pakistan
  Post's directory (about 2,560), as `PostOffice` values (`code`, `office`,
  `town`, `district`, `province`), including offices in towns and villages
  that `getCityByPostalCode` does not cover. The directory is in its own
  source file and only these two functions reference it, so release builds
  that do not call them leave it out.
- All of these are checked against the shared test vectors. See DATA.md in the
  repository for sources and limits.

Data (November 2026 audit, see AUDIT.md and DATA.md in the repository):
banks `ZTBL` (Zarai Taraqiati Bank Limited) and `SMFB` (Sindh Microfinance
Bank) added; `TMFB`/`TAMW` renamed "Easypaisa Bank Limited" and `JCMA`/`WMBL`
"Mobilink Microfinance Bank (JazzCash)"; eight postal codes corrected from
Pakistan Post's directory (Gilgit, Dera Ismail Khan, Tank, Badin, Thatta,
Sujawal, Matiari, Taxila) and Wah Cantonment `47040` added; holiday `source`
links for 2024 to 2026 now point to official notifications.

Data depth:

- `getDivisions()`, `getDivisionOfDistrict()`, `getTehsils()` and
  `getTehsilDistrict()`: division and tehsil lookups from the 2023 census
  (30 divisions, 591 tehsils). Each tehsil is recorded under its census
  district, so districts created since the census may list few or no tehsils
  and have no division.
- Postal codes now hold every office in Pakistan Post's directory that
  belongs to a listed city: 457 codes, up from 110. `getCityByPostalCode`
  still returns a listed city or `null`, so a village office's code returns
  `null` (use `getPostOffice` for those). Compared with 2.2.1 it gives a
  different answer for eight codes: `47040` is Wah Cantonment (was Taxila),
  and `15700`, `29120`, `29430`, `70100`, `72220`, `73020` and `73220`, which
  were given as the main code of a city but belong to a village office
  nearby, now return `null`.
- 41 more landline area codes.
- `BankType.publicSector` (`'public-sector'`) for public sector commercial
  banks; `BankType.commercial` now means private commercial banks.
- SME Bank (`SMES`) is reported as inactive (`active: false`).

`dataVersion` is now `2026-11-17`.

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
