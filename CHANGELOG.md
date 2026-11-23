# Changelog

## 2.8.0

Feature release: dated sources for every dataset, withholding tax for filers
and non-filers, Zakat deduction at source, Census 2023 population, FBR
Digital Invoicing reference lists, and CNICs written across lines. Every port
gives the same results on the shared test vectors.

### Added

- **Dated sources (#90).** `data/manifest.json` records each dataset's
  issuer, official source and reference, issue and retrieval dates, the
  period it applies to, record count and next expected update.
  `getDataInfo(id)` and `listDataInfo()` return it, and results calculated
  from dated data carry a `source` (`calculateSalaryTax`,
  `calculateSalesTax` when the rate is looked up, and the new functions
  below). CI checks the manifest against the data, including that dated
  series have no gaps or overlaps, and a weekly job opens an issue when a
  dataset passes its expected update. DATA.md and the site's /data page
  are generated from the manifest.
- **Withholding tax, ATL and non-ATL (#92).** `calculateWithholding()` and
  `getWithholdingRates()` for sections 149, 150, 151, 153, 154B, 231AB, 236C
  and 236K, tax years 2025 to 2027, from FBR's rate cards checked against the
  Income Tax Ordinance. Each case keeps its own non-ATL rule (double, a
  fixed rate, its own value bands, or none), late-filer bands where they
  existed, and the 231AB threshold of Rs 50,000 a day.
- **Zakat (#93).** `getZakatNisab()`, `getZakatYears()` and
  `zakatDeduction()`: the nisab for deduction at source, Zakat years 1433 to
  1447 AH, each from its Ministry notification and SBP circular.
- **Population (#95).** `getDistrictPopulation()` and
  `getTehsilPopulation()` from the 2023 census (PBS). Districts created
  after the census have `null` figures; nothing is estimated.
- **FBR Digital Invoicing reference lists (#91).**
  `validateFbrInvoice(invoice, { reference })` checks provinces, sale types,
  units and HS code/unit pairs against the lists an app syncs from FBR's
  reference APIs, which are authoritative. `getSaleTypes()` lists the sale
  types named in PRAL's specification v1.12.
- **Bank websites and SWIFT/BIC codes (#94).** `getBankInfo()` adds
  `status` (`active`, `merged` or `liquidated`), the official `website`
  (and `websiteSbpListed` where SBP lists an older domain), and `swift` with
  `swiftSource` or `swiftReason`. `swiftSource.bicSource` says where a code
  comes from: `sbp` or `bank-site` (printed by SBP or the bank's own
  website, 16 codes) or `directory` (listed in a SWIFT code directory but
  not printed by SBP or the bank, 17 codes; confirm these with the bank
  before sending money). 1LINK IMD codes are not included.
- **CNICs across lines (#88).** `findCNICs()` and `maskCNICs()` take
  `{ acrossLines: true }`: a single line break joins digit groups like a
  space; a blank line never does.

## 2.7.2

Patch release: `findCNICs()` and `maskCNICs()` now mask everything Jaanch's
own CNIC redaction masks, except across line breaks. Every port gives the
same results on the shared test vectors, which now include all of Jaanch's
redaction test cases.

### Changed

- **More separators between digit groups.** Groups may be joined by any run
  of spaces or tabs, or by one mark (a hyphen or Unicode dash, a dot, a
  slash, or now an underscore) with any spaces around it: `35202  1234567  1`,
  `35202 -1234567- 1`, `35202_1234567_1`, `35202 - 1234567 - 1`. A line
  break never joins groups.
- **A match is consecutive whole groups adding up to exactly 13 digits**,
  starting with 1-8, anywhere in a run of groups; this replaces 2.7.1's
  "whole run of 13, or 5-7-1 inside a longer run". A group is never split,
  so 13 digits inside a longer unbroken number never match.
- **More false positives.** On a sample of everyday text, 2.7.2 matches
  nothing new in phone numbers, amounts, order and tracking numbers, dates
  and bank details, but does match more in text where numbers are spaced
  out: table columns, price lists separated by `-`, file names with
  underscores, and a number followed by `/` and a short one. Jaanch's own
  redaction already matched the tables and file names; the spaced dashes
  and slashes are new. `validateCNIC()` stays strict.

## 2.7.1

Patch release, from real data: CNICs in more of the ways people write them,
and six-digit toll-free numbers. Every port gives the same results on the
shared test vectors.

### Changed

- **`findCNICs()` and `maskCNICs()` find CNICs in any grouping.** A match is
  now any run of exactly 13 digits starting with 1-8, together or grouped
  any way with single separators: a space, a hyphen or dash, a dot, or (new)
  a slash (`352 0212 3456 71`, `35202/1234567/1`). Everything 2.7.0 found is
  still found, including a 5-7-1 CNIC inside a longer run of groups
  (`0300-1234567 35202-1234567-1`), and a longer run is otherwise never cut
  into a CNIC. This catches more real CNICs and also matches more numbers
  that are not CNICs (any 13 digits starting with 1-8, however grouped);
  `validateCNIC()` stays strict.
- **Toll-free numbers: `0800` and five or six digits.** PTA's 2021 plan
  gives five; PTA's National Numbering Plan 2008 gives six (sections 8.1 and
  8.1.4), and six-digit numbers are in use (Soneri Bank publishes
  `0800005000`). The 8-digit form stays rejected: no PTA document lists it.
  DATA.md corrects 2.7.0's note, which called the six-digit form a proposal.

### Added

- **`maskCNICs(text, { replacement })`** replaces each whole CNIC,
  separators included, with a string such as `'[CNIC removed]'`.

## 2.7.0

Minor release: new features and one accuracy fix behind an option. Every
port gives the same results on the shared test vectors (35,000+, about 1,800
new).

### Added

- **Salary tax surcharge.** `calculateSalaryTax()` and
  `calculateMonthlySalaryTax()` take `includeSurcharge` and return
  `surcharge` and `total`. The section 4AB surcharge is a percentage of the
  whole tax once taxable income exceeds Rs 10 million: 10% in tax year 2025
  (Finance Act 2024), 9% for salaried individuals in 2026 (Finance Act
  2025), and none in 2027 (Finance Act 2026) or before 2025. With the
  option, `monthly` and `effectiveRate` include the surcharge.
  `includeSurcharge` is off by default in 2.x, so existing results don't
  change; it will be on by default in 3.0. `getSalaryTaxSlabs()` gives each
  year's `surcharge` with its law and FBR source (DATA.md has the details).
- **Service numbers as landlines.** `validateLandline(phone, { services: true })`
  also accepts UAN (`021-111-123-456`, `111-123-456`), toll-free
  (`0800-12345`) and premium-rate (`0900-12345`) numbers; `analyzeNumber()`
  tells them apart with `type`. The same option is in `pk.landline()`,
  `IsPakLandline()`, the .NET `[PakLandline(Services = true)]` and
  `IsPakLandline(services: true)`, and Laravel's `pk_landline:services`.
- **CNICs in free text.** `findCNICs(text)` returns each CNIC with its
  digits, formatted form and position; `maskCNICs(text, { mask })` replaces
  their digits (`XXXXX-XXXXXXX-X`) and counts them. They accept any or mixed
  separators and ASCII, Urdu or Arabic-Indic digits, and never cut a CNIC
  out of a longer number. They are pattern matches, so other 13-digit
  numbers starting with 1-8 also match; `validateCNIC()` stays strict.
- **`romanUrduKey(text)`**: a phonetic key so that spellings of a name match
  (`Mubeen`/`Mobeen`, `Muhammad`/`Mohammad`/`Muhammed`, `Rehman`/`Rahman`,
  `Chaudhry`/`Chaudhary`/`Chaudhery`). On 277 spellings of 118 common
  Pakistani names, 96.8% of same-name pairs match and 0.021% of
  different-name pairs do. `normalizeRomanUrdu()` is unchanged.
- **`validateRaastQr()` returns `kind`** (`'p2p'`, `'merchant'` or `null`).

### Changed

- **`0122` numbers are no longer recognised.** They are seen in use, but no
  PTA document lists them (they came from libphonenumber), so
  `analyzeNumber()` now returns `null` for them. The `personal` number type
  stays so existing code compiles, is never returned, and will be removed in
  3.0.
- **Toll-free numbers follow PTA's numbering plan**: `0800` and five digits.
  The 8-digit form after `0800`, taken from libphonenumber, is no longer
  accepted, because PTA's plan does not list it. UAN and premium-rate
  formats are now documented against PTA's plan too (DATA.md).
- **A merchant Raast QR without an IBAN is valid**, with the warning
  `no-iban`: merchant QRs may pay through the merchant's own scheme. A
  person-to-person QR without an IBAN is still an error.
- Fuller doc comments for `validateCNIC`, `NTNInfo`, `NTNType`,
  `SlugScript`, `SlugifyOptions`, `BidiDirection` and `WordsLanguage`, so
  every API reference page has a full description; the site's CI now fails
  on an API page description under 70 characters.
- DATA.md corrects the description of the surcharge: it is a percentage of
  the whole tax, not of the tax on income above Rs 10 million.

## 2.6.0

Minor release: one new feature. Every port gives the same results on the
shared test vectors (812 new ones).

### Added

- `parseAmount()` and `formatAmountInput()` (`pakdatakit/format`). `parseAmount`
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
- `pk.amount()` in the Zod, Valibot, Yup, Joi and Superstruct adapters, and
  `IsPakAmount` for class-validator: passes when `parseAmount()` reads the
  value.

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

- `slugify()`, `compareUrdu()`, `isRTL()` and `wrapBidi()` (`pakdatakit/text`).
  `slugify` makes URL slugs that keep Urdu letters (no transliteration), with
  `script: 'any' | 'latin' | 'urdu'`. `compareUrdu` sorts in Urdu alphabetical
  order following the Unicode CLDR collation for Urdu (CLDR 49), with letters
  joined to ھ as letters of their own, the same in every port without ICU.
  `isRTL` checks the first letter's direction; `wrapBidi` wraps text in
  Unicode directional isolates.
- `calculateSalaryTax()`, `calculateMonthlySalaryTax()`, `getSalaryTaxSlabs()`,
  `getSalaryTaxYears()` and `getTaxYear()` (`pakdatakit/incometax`), with the
  new dataset `data/income-tax-slabs.json`: the salaried income tax rate table
  for tax years 2020 to 2027 from FBR's consolidated Income Tax Ordinance.
  Returns the tax, the monthly amount, the effective rate and the slab, rounded
  half up to the paisa. Surcharge, credits and exemptions are not applied.
  The `source` for tax year 2027 is the Finance Act, 2026 as gazetted; FBR
  Circular No. 02 of 2026-27 and the consolidated Ordinance are cited in
  DATA.md.
- `scoreAddress()` and `phoneRiskSignals()` (`pakdatakit/quality`): heuristics
  for cash on delivery. `scoreAddress` scores an address 0 to 100 from its city,
  house number, street, area, postal code (a known post office scores more)
  and landmark words in English, Roman Urdu and Urdu, and lists what is
  missing. `phoneRiskSignals` flags invalid, landline, service, repeated-digit,
  sequential and placeholder numbers. The form adapters gain `pk.codPhone()`
  (`IsCodPhone` for class-validator).
- `getSalesTaxRate()`, `calculateSalesTax()` and `splitInclusive()`
  (`pakdatakit/salestax`): standard sales tax rates with the dates they
  applied, from 1 July 2019, for goods (federal) and for services in Punjab,
  Sindh, Khyber Pakhtunkhwa, Balochistan and Islamabad Capital Territory, each
  with its law and official source (new dataset `sales-tax-rates.json`).
  Amounts are rounded half up to the paisa.
- `parseElectricityRef()`, `validateElectricityRef()` and
  `validateGasConsumerNumber()` (`pakdatakit/bills`): DISCO 14-digit reference
  numbers (with U/R), DISCO customer IDs, K-Electric account numbers, and SNGPL
  and SSGC consumer numbers, in the formats the utilities' bill pages ask for.
  `disco` is `null` for DISCO bills, as no official source maps the digits to a
  company.
- `mapCourierStatus()` and `normalizeCityForCourier()` (`pakdatakit/courier`):
  one status vocabulary for courier statuses, mapping only publicly documented
  statuses (PostEx's API guide v4.1.9 and Leopards' "Returned to Shipper"; TCS,
  M&P, Trax and BlueEx publish none), and city short forms (`LHR`, `Khi`,
  `Pindi`, `Isb`, Lyallpur, Urdu names) mapped to the city list. No API clients
  and no tracking-number detection, as no courier documents its format. The
  status mapping is experimental: its values may change in a minor release
  as more couriers' lists are added (see CONTRIBUTING.md).
- `buildFbrInvoice()` and `validateFbrInvoice()` (`pakdatakit/fbr-invoice`):
  types for FBR's Digital Invoicing JSON, a builder that works out each line's
  sales tax, and an offline validator that reports FBR's error codes, following
  PRAL's "Technical Specification for DI API" v1.12. No HTTP client and no
  tokens.

### Changed

- Package metadata: the description, keywords and homepage now follow the same
  style in every registry, and CI checks that the version, repository URL,
  licence and author agree across ports (`npm run check:metadata`).
- `bin` and `repository.url` in `package.json` are written in the form npm
  publishes, so `npm publish` no longer warns that it corrected them.
- New `NOTICE` file (included in the npm package) and an "Origin and
  attribution" section in the README.
- `test-vectors/README.md` documents the shared test vectors;
  `npm run test:ports` regenerates them and runs every port against them.
- `dataVersion` is now `2026-11-18` (new dataset: sales tax rates).

## 2.3.0

### Breaking for TypeScript exhaustive switches

- `BankType` has a new member, `'public-sector'` (see Data below). Code that
  switches over every `BankType` and checks exhaustiveness (for example with
  a `never` default, or `@typescript-eslint/switch-exhaustiveness-check`)
  stops compiling until it handles the new value. Nothing else changes at
  runtime for such code, but National Bank of Pakistan, Sindh Bank, The Bank
  of Khyber and The Bank of Punjab now report `'public-sector'` instead of
  `'commercial'`.

### Added

- Form adapters for [Joi](https://joi.dev) (`pakdatakit/joi`),
  [Superstruct](https://docs.superstructjs.org) (`pakdatakit/superstruct`) and
  [class-validator](https://github.com/typestack/class-validator)
  (`pakdatakit/class-validator`). The class-validator decorators (`IsCNIC`,
  `IsPakPhone`, `IsPakIBAN`, `IsNTN`, `IsSTRN`, `IsPakLandline`,
  `IsPakPassport`, `IsVehiclePlate`) work in NestJS DTOs without a NestJS
  dependency. All three libraries are optional peer dependencies.
- `validatePassport()` (`pakdatakit/passport`): format check for Pakistani
  passport numbers (two letters, seven digits). DGIP does not publish the
  format, so this checks the common shape only; see DATA.md.
- `validateVehiclePlate()` and `parseVehiclePlate()` (`pakdatakit/vehicle`):
  series, number and optional year of a vehicle registration number. Each
  province sets its own format, so this accepts the shape they share (1–4
  letters, 1–4 digits); see DATA.md.
- `pk.passport()` and `pk.vehiclePlate()` in every form adapter.
- `getPostOffice(code)` and `searchPostOffices(query)` (`pakdatakit/postal`):
  every delivery post office in Pakistan Post's directory (about 2,560), as
  `{ code, office, town, district, province }`, including offices in towns
  and villages that `getCityByPostalCode` does not cover. The directory is in
  its own data file, so it only lands in bundles that call these two
  functions.
- Divisions and tehsils from the 2023 census (`pakdatakit/geo`):
  `getDivisions(province?)`, `getDivisionOfDistrict(district)`,
  `getTehsils(district)` and `getTehsilDistrict(tehsil, province?)`. The data
  is the census's 30 divisions and 591 tehsils, talukas and sub-divisions.
  Each tehsil is recorded under its 2023 census district; for districts
  created since, see the census-district note in the README and DATA.md.

### Data

November 2026 audit against official sources (see AUDIT.md and DATA.md).
`dataVersion` is now `2026-11-17`.

- **Banks:** added `ZTBL` (Zarai Taraqiati Bank Limited) and `SMFB` (Sindh
  Microfinance Bank), both from IBANs printed by the State Bank. `TMFB` and
  `TAMW` are now named "Easypaisa Bank Limited" and `JCMA` and `WMBL`
  "Mobilink Microfinance Bank (JazzCash)", the names on the State Bank's
  lists.
- **Postal codes:** eight codes were a nearby office's, not the city's own,
  and are corrected from Pakistan Post's directory: Gilgit `15100`, Dera
  Ismail Khan `29050`, Tank `29400`, Badin `72200`, Thatta `73130`, Sujawal
  `73050`, Matiari `70150` and Taxila `47080`. `47040`, which was listed for
  Taxila, is Wah Cantt GPO and now returns Wah Cantonment. Three office names
  are corrected (Saidu Sharif GPO, Qila Sheikhupura GPO, University New
  Campus Jamshoro).
- **Holidays:** seven `source` links for 2024 to 2026 now point to the
  Cabinet Division notification or State Bank circular instead of a news
  report. No dates changed.
- **Postal codes from Pakistan Post's directory:** `postal-codes.json` now
  holds every office in the directory that belongs to a city on
  pakdatakit's city list: 457 codes instead of 110. `getCityByPostalCode`
  keeps its meaning (a city, or `null`) and now knows 355 more codes;
  `getPostalCode` has a code for 63 more cities; `getPostalCodes`,
  `getPostalAreas` and `searchPostalCodes` return more for cities with
  several offices (Lahore 5 → 50, Karachi 11 → 58, Islamabad 1 → 46); and
  `parseAddress` can fill in the city from these codes. Entries also carry
  `province` and, for district headquarters, `district`. Offices in other
  towns and villages are in the new `post-offices.json` (`getPostOffice`).
  Compared with 2.2.1, `getCityByPostalCode` gives a different answer for
  eight codes, all corrected in this release: `47040` is Wah Cantonment (was
  Taxila), and `15700`, `29120`, `29430`, `70100`, `72220`, `73020` and
  `73220`, which were given as the main code of a city but belong to a
  village office nearby, now return `null`.
- **Area codes:** 41 more landline area codes from the numbering plan PTA
  filed with the ITU: 18 in Balochistan, 8 in Khyber Pakhtunkhwa and the 15
  four-digit codes of Azad Jammu and Kashmir and Gilgit-Baltistan (`05822`
  Muzaffarabad, `05811` Gilgit). Numbers in these codes already validated;
  `analyzeNumber` now also returns their area code and district, and
  `getAreaCode` finds them.
- **Bank types:** new type `public-sector` for the State Bank's "public
  sector commercial banks": National Bank of Pakistan (`NBPA`, `NBPB`), Sindh
  Bank, The Bank of Khyber and The Bank of Punjab. They were `commercial`
  before; filter on both if you list commercial banks.
- **SME Bank** (`SMES`) is now "SME Bank Limited (in liquidation)" with
  `active: false`: the State Bank cancelled its licence and de-scheduled it in
  March 2025.

### Fixed

- Subpath imports such as `pakdatakit/zod` or `pakdatakit/class-validator`
  now get their types under TypeScript's older `moduleResolution: "node"`,
  the default for `"module": "commonjs"` projects (including many NestJS
  apps). They only resolved with `node16`, `nodenext` or `bundler` before.

### Docs

- The README's "Why PakDataKit?" section compares PakDataKit with a typical
  hand-written regex, and the npm description and keywords cover all modules.

The Python and Dart packages get the same passport and vehicle plate
functions in 2.3.0, checked against the shared test vectors.

## 2.2.1

### Fixed

- The district split from Swat in January 2026 is now named **Bar Swat**, as in
  the Board of Revenue notification, instead of "Upper Swat". `Upper Swat`
  still resolves in `getDistrictProvince`.
- `dataVersion` is now `2026-11-07` (November data check: no other changes).

### Docs

- The README no longer lists planned features: NADRA publishes no CNIC
  check-digit algorithm, and Pakistan has no public number-portability lookup.
- The docs site has a share image and favicon.

## 2.2.0

### Added

- `getBankInfo(ibanOrCode)` and `getBanks()`: bank name, type (commercial,
  Islamic, microfinance, digital, EMI, foreign, specialized, central), whether
  it still exists, and its current code.
- API reference and `llms.txt` / `llms-full.txt` at
  https://chmuzamil.github.io/pakdatakit/.
- New packages from this repository: `pakdatakit` for Python (PyPI) and
  `pakdatakit-react` (React inputs and a Raast QR component).
- `pakdatakit/input`: as-you-type formatters (`formatCNICInput`,
  `formatPhoneInput`, `formatIBANInput`) and checkers (`checkCNICInput`,
  `checkPhoneInput`, `checkIBANInput`) that return `empty`, `incomplete`,
  `valid` or `invalid`.
- `createRaastP2PQr` accepts `expiresIn` (`30m`, `12h`, `7d` or
  milliseconds) instead of `expiresAt`.
- `validateRaastQr()`: checks a scanned QR for a bad checksum, missing or
  invalid IBAN, expiry and other problems before payment.
- `dataVersion` export and `DATA.md` documenting each dataset's sources.
- Banks: `NAYA` (NayaPay), `BKCH` (Bank of China), `SMES` (SME Bank),
  `WMBL` (Mobilink Bank's older code), and the digital banks `RQMI` (Raqami)
  and `MSHQ` (Mashreq Bank Pakistan).
- Districts: Allai, Central Dir, Paharpur and Upper Swat (Khyber
  Pakhtunkhwa); Quetta East, Quetta West, North and South Dera Bugti,
  Barshore, Tump and Wadh (Balochistan, July 2026). 177 districts in total.

### Fixed

- `createRaastP2PQr` / `createMerchantQr` reject amounts that would be
  written in exponent form (e.g. `1e21`).
- `parseRaastQr` reads only plain numeric amounts and rejects impossible
  expiry dates; `createMerchantQr` writes account sub-fields in ID order.
- `numberToWords` / `amountInWords` reject unknown languages.
- `getDistrictProvince` no longer returns built-in object properties.
- Khushhali Microfinance Bank's IBAN code is `KHBL`, not `KMBL`.
- Removed `PAKB` (Pak Oman), which no real IBAN supports.
- `getDistrictProvince` still resolves districts that were split or renamed
  (Quetta, Dera Bugti, Upper Dera Bugti, South Waziristan).

## 2.1.2

### Fixed

- `createRaastP2PQr()` with an `amount` made QR codes that banking apps
  reject. Amount QRs now include an expiry (tag 07, `DDMMYYYYhhmm`) and write
  whole amounts without decimals (`1500`, not `1500.00`), matching dynamic QR
  codes from JazzCash and Mashreq. Pass the new `expiresAt` option; it is
  required whenever `amount` is set.
- `parseRaastQr()` returns the expiry of person-to-person QR codes as
  `expiresAt` (`YYYY-MM-DDTHH:mm`).

## 2.1.1

### Fixed

- `createRaastP2PQr()` now writes scheme identifier `00`, matching QR codes
  generated by banking apps (Faysal Bank, easypaisa). The `30` listed in
  SBP's standard was rejected by the Easypaisa and JazzCash apps. Pass
  `scheme: '30'` to get the old behaviour.

### Added

- SadaPay (`SADA`) in the IBAN bank list.

## 2.1.0

### Added

- `getCNICInfo()`: province of registration and gender from a CNIC.
- `amountInWords()` and `numberToWords()`: lakh/crore/arab/kharab in English
  and Urdu, with paisa and cheque style ("Rupees ... Only").
- `pakdatakit/zod`, `pakdatakit/valibot` and `pakdatakit/yup`: form schemas
  for CNIC, phone, IBAN, NTN, STRN and landline. The libraries are optional
  peer dependencies.
- `analyzeNTN()`, `validateNTN()` and `validateSTRN()` (format checks).
- `analyzeNumber()`, `getNumberType()`, `validateLandline()` and
  `getAreaCode()`: landline, UAN, toll-free, premium and personal numbers,
  with area codes and cities.
- `createRaastP2PQr()`, `createMerchantQr()` and `parseRaastQr()`: SBP
  Pakistan QR standard, with CRC checks.
- `getPakistanHolidays()`, `getHolidaysOn()` and `isPakistanHoliday()`:
  federal public holidays with observed moon-sighting dates for 2020-2026 and
  flagged estimates for later years.
- New subpaths: `holidays`, `numbers`, `raast`, `tax`, `words`.

## 2.0.0

A bug-fix release. Several fixes change return values, so this is a major
version.

### Breaking changes

- **Node.js 20+** is required (Node 18 is end-of-life).
- `formatPhone()` and `createWhatsAppLink()` return `null` instead of `""` for
  invalid numbers.
- `getHijriMonthName()` returns `null` instead of `""` for invalid months.
- `toHijri()`, `formatHijri()` and `isRamadan()` throw a `RangeError` for
  invalid dates instead of returning `NaN` fields. `fromHijri()` throws for
  out-of-range Hijri components.
- `formatPKR()` and `formatLakh()` throw a `RangeError` for `NaN` and
  `Infinity`, and keep the sign of negative amounts (they previously returned
  `"Rs. 0"` for all of these).
- `validatePhone()` rejects numbers on `03XX` prefixes that are not allocated
  to a mobile operator (e.g. `036x`, `038x`, `039x`).
- `validateCNIC()` rejects a leading `0` or `9`, misplaced separators and
  mixed separators.
- `NetworkName` adds `'SCO'`.
- `ParsedAddress` adds a `warnings: string[]` field.
- `formatAddress()` no longer adds a GPO postal code that was not supplied.
- `normalizeRomanUrdu()` keeps capitalisation (`Assalam o Alaikum` →
  `Assalamualaikum`) and no longer rewrites `mein`/`men`.
- Dataset changes: `South Waziristan` is now `Lower South Waziristan` and
  `Upper South Waziristan`; neighbourhoods such as `Gulberg` and `Saddar` are
  no longer returned as cities; bank codes `SILK`, `BIPL` and `BARC` are
  removed.

### Fixed

- **Hijri dates were one day behind** the tabular calendar for every date, and
  `fromHijri(toHijri(d))` returned the previous day. Conversions now match
  `islamic-civil` exactly and round-trip. Added an `offset` option for
  moon-sighting adjustment.
- **Cities**: the list was cut at 150 entries, so `getProvince()` returned
  `null` for Bahawalpur, Sargodha, Larkana, Mardan, Abbottabad and 72 other
  cities with postal codes. All 226 cities are now included.
- **Districts**: 7 Gilgit-Baltistan districts were listed twice. Added Taunsa,
  Hub and Usta Muhammad, and split South Waziristan (168 districts).
- **Banks**: `SAUD` is Silkbank's IBAN code (merged into UBL), not Saudi Pak;
  Summit Bank (now Bank Makramah) uses `SUMB`; renamed microfinance banks
  (easypaisa, HBL Microfinance, ABHI) now show current names. Removed an alias
  table that never took effect.
- **Phone**: added `0329` (Jazz) and `0355` (SCO); accepts `+92 (0) 3…`,
  `+9203…`, dotted numbers and Urdu digits.
- **CNIC**: accepts en-dashes, dots and Urdu digits.
- **formatLakh** rounds before choosing the unit: `9,999,999` is `"1 Crore"`,
  not `"100 Lakh"`.
- **parseAddress** ignores house, plot, street and PO box numbers when finding
  the postal code, works without commas, and reports city/province conflicts.
- **normalizeRomanUrdu**: removed 6 rules that did nothing and the rules that
  changed `mein` ("in") to `main` ("I"); acronyms such as `AP` are left alone.
- **CLI** exits with 1 for invalid/not found and 2 for usage errors, rejects
  non-numeric amounts and invalid dates, and supports `--version`.

### Added

- CommonJS build alongside ESM.
- Subpath imports (`pakdatakit/cnic`, `pakdatakit/phone`, …). Importing a
  single function no longer pulls in every dataset: `validateCNIC` alone
  bundles to about 0.4 KB instead of 25 KB.
- Dataset integrity tests and CI on Node 20, 22 and 24 with a format check.

## 1.1.0

- Interactive playground.
