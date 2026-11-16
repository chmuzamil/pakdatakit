# Changelog

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
- Postal codes now cover the full Pakistan Post directory (about 2,560 post
  codes).
- 41 more landline area codes.
- New bank type `public-sector`. SME Bank (`SMES`) is reported as inactive.

`DATA_VERSION` is now `2026-11-16`.

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
