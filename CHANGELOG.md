# Changelog

## 2.5.0 (unreleased)

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

## 2.4.0 (unreleased)

### Added

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
