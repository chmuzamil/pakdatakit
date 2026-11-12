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
