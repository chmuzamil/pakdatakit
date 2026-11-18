# Changelog

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
