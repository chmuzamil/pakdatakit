# Changelog

## 2.7.0

Minor release: new features and one accuracy fix behind an option. Every
port gives the same results on the shared test vectors (35,000+, about 1,800
new).

### Added

- **Salary tax surcharge.** `calculate_salary_tax()` and `calculate_monthly_salary_tax()` take `include_surcharge` and return `surcharge` and `total`; `get_salary_tax_slabs()` gives each year's `SalaryTaxSurcharge` (`None` before 2025). The section 4AB surcharge
  is a percentage of the whole tax once taxable income exceeds Rs 10
  million: 10% in tax year 2025, 9% for salaried individuals in 2026, and
  none in 2027 or before 2025. The option is off by default in 2.x, so
  existing results don't change; it will be on by default in 3.0.
- **Service numbers as landlines.** `validate_landline(phone, services=True)` also accepts UAN,
  toll-free and premium-rate numbers.
- **CNICs in free text.** `find_cnics(text)` returns `CNICMatch` objects (`raw`, `digits`, `formatted`, `start`, `end`; offsets in code points); `mask_cnics(text, mask='X')` returns `MaskedText(text, count)`. Pattern matches: other 13-digit
  numbers starting with 1-8 also match; CNIC validation stays strict.
- **Phonetic keys for Roman Urdu names**: `roman_urdu_key(text)`, so that `Mubeen` and
  `Mobeen`, or `Rehman` and `Rahman`, match.
- **Raast**: `validate_raast_qr()` returns `kind`.

### Changed

- Toll-free numbers follow PTA's numbering plan: `0800` and five digits; the
  8-digit form is no longer accepted.
- A merchant Raast QR without an IBAN is valid with the warning `no-iban`; a
  person-to-person QR without an IBAN is still an error.

## 2.6.0

Minor release: one new feature. Every port gives the same results on the
shared test vectors (812 new ones).

### Added

- `parse_amount()` and `format_amount_input()`, with the `ParsedAmount`
  dataclass. `parse_amount`
  reads a rupee amount as people type it in Pakistan and returns
  `{ value, raw }` in rupees, rounded half-up to the paisa, or `null`. It
  accepts `150,000` and `1,50,000` grouping with decimals, Urdu and
  Arabic-Indic digits, `Rs`/`Rs.`/`PKR`/`₨` and a trailing `/-`, and the
  shorthand `k`, `thousand`, `hazar`, `ہزار`, `lakh`, `lac`, `لاکھ`, `crore`,
  `cr` and `کروڑ` (also `1.5 lakh`, `2.25cr`). It rejects negatives, ranges,
  more than one number, leftover letters, ambiguous grouping and amounts over
  Rs. 50 trillion. The arithmetic is done on the digits, so `1.005` is 1.01
  in every language. `format_amount_input` writes the amount back
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

- Urdu text helpers in `pakdatakit.text`: `slugify` (URL slugs that keep Urdu letters, with `script="any" | "latin" | "urdu"`), `compare_urdu` (Urdu alphabetical order from CLDR 49, for `functools.cmp_to_key`), `is_rtl` and `wrap_bidi` (Unicode directional isolates), with the `SlugScript` and `BidiDirection` types.
- Income tax on salary (`pakdatakit.incometax`): `calculate_salary_tax`, `calculate_monthly_salary_tax`, `get_salary_tax_slabs`, `get_salary_tax_years` and `get_tax_year`, with the `SalaryTax`, `SalaryTaxSlab` and `SalaryTaxYear` dataclasses, from the salaried rate table of the Income Tax Ordinance 2001 for tax years 2020 to 2027 (new dataset `income-tax-slabs.json`).
- `score_address()`: scores how complete a delivery address is (0 to 100),
  returning `AddressScore(score, missing, parsed)` with the parts not found,
  weighted by `ADDRESS_WEIGHTS`. `phone_risk_signals()`: flags a delivery
  phone number that is invalid, a landline or service number, or looks made
  up (repeated, sequential or placeholder digits).
- `get_sales_tax_rate()`: standard sales tax rate, with its law and source,
  for goods (FBR) or for services in a province or Islamabad Capital
  Territory on a date, from 1 July 2019. `calculate_sales_tax()` adds the tax
  to an amount (or splits it out with `inclusive=True`) and
  `split_inclusive()` splits a tax-inclusive amount, rounding half up to the
  paisa exactly, as `SalesTaxAmounts(net, tax, gross, rate)`.
- `parse_electricity_ref()` / `validate_electricity_ref()`: reads an
  electricity bill identifier, a DISCO 14-digit reference number (with an
  optional `U`/`R`), a DISCO customer ID (10 digits, 11 for LESCO) or a
  K-Electric 13-digit account number, as `ElectricityRef(type, digits,
formatted, urban_rural, disco)`. `validate_gas_consumer_number()` checks an
  SNGPL (11 digits) or SSGC (10 digits) consumer number. Formats only; no
  check digit is published.
- `map_courier_status()`: maps a courier's own status name, code or numeric
  ID to one `CourierStatus` vocabulary (`pending` ... `cancelled`), for the
  statuses couriers document publicly (PostEx's merchant API guide and
  Leopards' "Returned to Shipper"). `normalize_city_for_courier()`: maps short
  forms (`LHR`, `Khi`, `Pindi`), the old name Lyallpur, a trailing "city" and
  Urdu-script names to the city list. The status mapping is experimental and
  may change in a minor release as more couriers' lists are added.
- `build_fbr_invoice()` / `validate_fbr_invoice()` / `expected_sales_tax()`:
  FBR Digital Invoicing, following PRAL's DI API specification v1.12
  (`FBR_DI_SPEC_VERSION`). The builder works out each line's sales tax
  (`N%` and `Rs.N` rates), fills FBR's defaults and adds up the columns, as
  `FbrInvoiceBuild(invoice, totals)`; the validator returns every problem it
  can find offline with FBR's error code, as `FbrInvoiceValidation(valid,
errors)`. The invoice is a plain `dict` with FBR's camelCase keys
  (`FbrInvoice` / `FbrInvoiceItem` `TypedDict`s). No HTTP client, no tokens.

### Changed

- Package metadata: the description, keywords and homepage now follow the same
  style in every registry, and CI checks that the version, repository URL,
  licence and author agree across ports (`npm run check:metadata`).
- `DATA_VERSION` is now `2026-11-18` (new dataset: sales tax rates).

## 2.3.0

- `validate_passport()`: format check for Pakistani passport numbers (two
  letters, seven digits). DGIP does not publish the format, so this checks
  the common shape only.
- `validate_vehicle_plate()` and `parse_vehicle_plate()`: series, number and
  optional year of a vehicle registration number (1–4 letters, 1–4 digits).
  Provinces use different formats, so this checks the shape they share.
- Both are checked against the shared test vectors, like the rest of the
  package. See DATA.md in the repository for sources and limits.

Data (November 2026 audit, see AUDIT.md and DATA.md in the repository):
banks `ZTBL` (Zarai Taraqiati Bank Limited) and `SMFB` (Sindh Microfinance
Bank) added; `TMFB`/`TAMW` renamed "Easypaisa Bank Limited" and `JCMA`/`WMBL`
"Mobilink Microfinance Bank (JazzCash)"; eight postal codes corrected from
Pakistan Post's directory (Gilgit, Dera Ismail Khan, Tank, Badin, Thatta,
Sujawal, Matiari, Taxila) and Wah Cantonment `47040` added; holiday `source`
links for 2024 to 2026 now point to official notifications.

Data depth:

- `get_divisions()`, `get_division_of_district()`, `get_tehsils()` and
  `get_tehsil_district()`: division and tehsil lookups from the 2023 census
  (30 divisions, 591 tehsils). Each tehsil is recorded under its census
  district.
- `get_post_office()` and `search_post_offices()`: every delivery post office
  in Pakistan Post's directory (about 2,560), as `PostOffice(code, office,
town, district, province)`, including offices in towns and villages.
- `get_city_by_postal_code()` still returns a city or `None`, and only for
  post offices in a city on pakdatakit's city list: 457 codes instead of 110.
  The code of an office in another town or village returns `None`; use
  `get_post_office()` for those. `get_postal_code()`, `get_postal_codes()`,
  `get_postal_areas()` and `search_postal_codes()` return more for cities
  with several offices.
- Compared with 2.2.1, `get_city_by_postal_code()` gives a different answer
  for eight codes: `47040` is Wah Cantonment (was Taxila), and `15700`,
  `29120`, `29430`, `70100`, `72220`, `73020` and `73220`, which were given
  as the main code of a city but belong to a village office nearby, now
  return `None`.
- 41 more landline area codes.
- New bank type `public-sector`. SME Bank (`SMES`) is reported as inactive.

`DATA_VERSION` is now `2026-11-17`.

## 2.2.1

The district split from Swat in January 2026 is now named **Bar Swat**, as in
the Khyber Pakhtunkhwa Board of Revenue notification of 27 January 2026,
instead of "Upper Swat". "Upper Swat" still resolves in `get_district_province` to Khyber Pakhtunkhwa.
`DATA_VERSION` is now `2026-11-07`.

## 2.2.0

First release of the Python package.

- Pure Python 3.9+, no dependencies: the same functions as the npm package in
  snake_case, with the same datasets.
- Checked against the TypeScript library with over 12,000 shared test cases,
  so both give the same results.
- See the main [CHANGELOG](https://github.com/chmuzamil/pakdatakit/blob/main/CHANGELOG.md)
  for what 2.2.0 includes.
