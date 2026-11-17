# Changelog

## 0.2.0

- **Seeded output changed once in this release, and is now stable across data
  updates.** Until now the generators picked banks, cities, postal codes, area
  codes and mobile prefixes from pakdatakit's live datasets, so adding a bank
  there changed what a seed produced. The faker now has its own frozen copy of
  those lists (`src/snapshot/`), taken from pakdatakit 2.3.0. Compared with
  0.1.2 that copy has two more banks (Zarai Taraqiati Bank and Sindh
  Microfinance Bank), leaves out SME Bank (closed in 2025), and has two
  updated bank names and eight corrected postal codes, which is why values
  for a given seed differ from 0.1.2. From this release on, the same seed
  gives the same output whatever pakdatakit version is installed.
- `iban({ type })` accepts `public-sector`, the type pakdatakit 2.3.0 gives
  National Bank of Pakistan, Sindh Bank, The Bank of Khyber and The Bank of
  Punjab. They are no longer returned for `type: 'commercial'`.
- Generated values still pass pakdatakit's validators; a test checks every
  entry of the frozen lists against the live data.

## 0.1.2

- Generated addresses use the district name **Bar Swat** (notified January 2026) instead of "Upper Swat", matching `pakdatakit` 2.2.1.

## 0.1.1

Maintenance release with no API changes.

- Published from GitHub Actions with npm provenance, so each release can be
  traced to the commit and workflow that built it.
- Development dependencies updated.

## 0.1.0

First release.

- `createFaker({ seed })`: the same seed gives the same data everywhere; plug
  in another random source (e.g. Faker.js) with `random`.
- Generators for CNICs, mobile, landline and UAN numbers, IBANs, NTNs, STRNs,
  Raast QR codes, names, cities, addresses, companies, emails, amounts and
  dates.
- `person()` and `business()` produce records where everything agrees: the
  CNIC's province and gender digits, city, postal code, area code and bank.
- Every generated value passes the matching `pakdatakit` validator.
- Emails use only reserved test domains (RFC 2606). Generated numbers can
  belong to real people: never contact them or use generated IBANs with real
  payment providers.
