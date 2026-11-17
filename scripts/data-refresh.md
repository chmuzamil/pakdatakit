# Quarterly data refresh

Re-check each dataset against its official source, fix what changed, and
regenerate every port. `.github/workflows/data-check.yml` opens an issue
with this checklist on 1 January, April, July and October, and a holidays-only
issue on 1 December. Close the issue when done, even if nothing changed.

Use only official sources (sbp.org.pk, pta.gov.pk, pakpost.gov.pk,
pbs.gov.pk, cabinet.gov.pk, provincial government and gazette sites). News
reports and Wikipedia can point to a change, but cite the official document.
Record each change, with its URL and retrieval date, in [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md).

## Banks (SBP)

Sources:

- Commercial, Islamic, public sector, foreign and specialized banks:
  https://www.sbp.org.pk/sbp-regulated-institutions/commercial-banks
- Microfinance banks:
  https://www.sbp.org.pk/sbp-regulated-institutions/microfinance-banks
- Electronic money institutions: https://www.sbp.org.pk/assets/document/List-of-EMIs.pdf
- Mergers, de-scheduling and new licences: SBP press releases and BPRD
  circulars, https://www.sbp.org.pk/circulars/

Checklist:

- [ ] New banks, digital banks or EMIs issuing IBANs: add to `BANKS` in
      `scripts/generate-data.mjs`, with the code confirmed from a real
      published IBAN.
- [ ] Renames: update the name (keep the bank's own styling; note SBP's
      spelling in DATA.md).
- [ ] Mergers and closures: `MERGED_INTO` or `CLOSED`.
- [ ] Type changes: `BANK_TYPES`.

## Mobile prefixes (PTA)

Sources:

- PTA National Numbering Plan: https://www.pta.gov.pk/assets/media/nnp_08_final.pdf
- The numbering plan PTA sent to the ITU:
  https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000A10002PDFE.pdf
  (check the ITU's list for a newer filing from Pakistan)
- PTA determinations (operator mergers, new licences):
  https://www.pta.gov.pk/category/authoritys-determinations-1069818154-2023-05-30

Checklist:

- [ ] New `03XX` allocations or operator changes: edit `data/networks.json`.
- [ ] Mergers that change an operator's name or label (for example Telenor
      and PTML).

## Public holidays (Cabinet Division)

Sources:

- Yearly circular, published in December or January:
  `https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/<year>/Public-Holidays-<year>.pdf`
  (the file name has varied; find it on https://cabinet.gov.pk)
- Eid ul Fitr, Eid ul Adha, Ashura and Eid Milad un Nabi: the Cabinet
  Division notification issued after the Central Ruet-e-Hilal Committee
  announces the moon sighting, usually a few days before the holiday. SBP
  repeats it in a BPRD circular (https://www.sbp.org.pk/circulars/).

Checklist:

- [ ] Next year's circular out? Check the fixed-date holidays against it.
- [ ] For each Islamic holiday since the last refresh: add the notified dates
      to `data/holidays.json` under the year (`dates` and `source`, the
      Cabinet Division or SBP document). Years and holidays missing there are
      estimated from the tabular Hijri calendar and reported as
      `estimated: true`.
- [ ] Fixed-date holidays changed (added, moved or dropped): edit
      `src/holidays.ts`.
- [ ] Any one-off holiday the government declared.

## Postal directory (Pakistan Post)

Sources:

- Post Code Directory of Delivery Post Offices (Part I):
  https://www.pakpost.gov.pk/images/national%20post%20code%20directory.pdf
- Pakistan Post's search table, for spot-checks only:
  https://www.pakpost.gov.pk/postcodes.php

Checklist:

- [ ] Is there a newer directory than February 2021? If so, extract its office
      name, code, account office and province columns to
      `data/sources/pakpost-delivery-post-offices.csv` (same header:
      `office,postCode,accountOffice,province`) and review the diff.
- [ ] Check five random codes from the new file against the search table.

## Landline area codes

Sources:

- The numbering plan PTA sent to the ITU (above).
- PTCL's national dialling codes: https://ptcl.com.pk/Info/National-Dialing-Codes

Checklist:

- [ ] New or changed codes: edit `data/area-codes.json`, using our district
      names so `getAreaCode` finds them.
- [ ] A new district (below) may need its name added to an existing code.

## Districts, divisions and tehsils

Sources:

- 2023 census, Table 1 (tehsils by district, districts by division):
  https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_1_punjab_districts.pdf
  and the same file name for `sindh`, `kp`, `balochistan` and `islamabad`;
  `table_1_<province>_province.pdf` for divisions
- New districts and tehsils: the province's notification (Board of Revenue or
  gazette), for example https://www.punjab.gov.pk/districts

Checklist:

- [ ] New, split or renamed districts: edit `DISTRICTS_RAW` in
      `scripts/generate-data.mjs`, with the notification as the source.
- [ ] Tehsils moved to a new district: set `currentDistrict` (in
      `CONFIRMED_CURRENT_DISTRICT`) only with an official confirmation.
- [ ] A new census: replace `data/sources/census-2023-admin-units.csv`.
- [ ] Districts still marked unverified in DATA.md: has a notification
      appeared?

## Sales tax rates

Rates change mostly in the budget, with effect from 1 July, so check the July
issue most carefully. Standard rates only.

Sources:

- Federal (goods): the Finance Act on https://www.fbr.gov.pk (Budget page),
  FBR's sales tax circulars, and the consolidated Sales Tax Act 1990 on
  https://download1.fbr.gov.pk/Docs/ (section 3(1))
- Punjab: https://pra.punjab.gov.pk (Punjab Sales Tax on Services Act 2012,
  section 2(41A) and Second Schedule)
- Sindh: https://www.srb.gos.pk and the Provincial Assembly's Acts on
  https://www.pas.gov.pk (Sindh Sales Tax on Services Act 2011, section 8(1))
- Khyber Pakhtunkhwa: https://kpra.gov.pk (KP Sales Tax on Services Act 2022,
  section 9(1))
- Balochistan: https://bra.gob.pk and https://pabalochistan.gov.pk (Balochistan
  Sales Tax on Services Act 2015, section 10(1) and Second Schedule)
- Islamabad Capital Territory: the Finance Act and FBR's consolidated ICT (Tax
  on Services) Ordinance 2001

Checklist:

- [ ] Did a Finance Act or SRO change a standard rate? Close the old entry in
      `data/sales-tax-rates.json` (`to` = the day before) and add the new one
      with `from`, `law` and the official `source`.
- [ ] Rates still marked uncertain in DATA.md (Balochistan 2025-26 onwards,
      ICT after June 2025): is the official document out now?

## Also

- [ ] Raast QR: any change in the QR format that banking apps generate
      (SBP Raast pages, https://www.sbp.org.pk/our-subsidiaries/raast/raast-person-to-person).
- [ ] Open issues labelled `data` reviewed.

## Regenerate and release

If anything changed:

1. Set `dataVersion` to today's date (`YYYY-MM-DD`) in `src/data-version.ts`,
   `python/src/pakdatakit/data_version.py`, `dart/lib/src/data_version.dart`
   and `dart/test/api_test.dart`, and the date in `DATA.md`.
2. Regenerate the data, the vectors and every port, and run every suite:

   ```bash
   node scripts/generate-data.mjs
   npm run test:ports -- --strict
   ```

   `test:ports` builds the library, writes `test-vectors/`, the Python copy
   of `data/`, `dart/lib/src/data/` and `php/data/`, and runs the
   TypeScript, Python, Dart, .NET and PHP suites. .NET embeds `data/*.json`
   at build time and needs no step of its own.

3. `npm run format && npm run size`.
4. Add the changes to the `## Unreleased` section of each CHANGELOG
   (`CHANGELOG.md`, `python/`, `dart/`, `dotnet/`, `php/`).
5. Do **not** copy new data into `faker/src/snapshot/` (see RELEASING.md).
6. Open a pull request. Release a patch version as described in
   [RELEASING.md](https://github.com/chmuzamil/pakdatakit/blob/main/RELEASING.md).
