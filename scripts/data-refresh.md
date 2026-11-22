# Quarterly data refresh

Re-check each dataset against its official source, fix what changed, and
regenerate every port. `.github/workflows/data-check.yml` opens an issue
with this checklist on 1 January, April, July and October, and a holidays-only
issue on 1 December. Close the issue when done, even if nothing changed.

Use only official sources (sbp.org.pk, pta.gov.pk, pakpost.gov.pk,
pbs.gov.pk, cabinet.gov.pk, provincial government and gazette sites). News
reports and Wikipedia can point to a change, but cite the official document.
Record each change, with its URL and retrieval date, in [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md).

## Banks (SBP) <!-- dataset: banks -->

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

## Mobile prefixes (PTA) <!-- dataset: networks -->

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

## Public holidays (Cabinet Division) <!-- dataset: holidays -->

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

## Postal directory (Pakistan Post) <!-- dataset: postal-codes --><!-- dataset: post-offices --><!-- dataset: cities -->

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

## Landline area codes <!-- dataset: area-codes -->

Sources:

- The numbering plan PTA sent to the ITU (above).
- PTCL's national dialling codes: https://ptcl.com.pk/Info/National-Dialing-Codes

Checklist:

- [ ] New or changed codes: edit `data/area-codes.json`, using our district
      names so `getAreaCode` finds them.
- [ ] A new district (below) may need its name added to an existing code.

## Districts, divisions and tehsils <!-- dataset: districts --><!-- dataset: divisions --><!-- dataset: tehsils -->

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

## Sales tax rates <!-- dataset: sales-tax-rates -->

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

## Income tax slabs (after each budget) <!-- dataset: income-tax-slabs -->

The Finance Act changes the salaried table from 1 July. After the budget is
passed (June), and again when FBR publishes the consolidated Ordinance
(usually July or August):

- [ ] Get the Finance Act from https://www.fbr.gov.pk (Budget page) and FBR's
      consolidated Income Tax Ordinance 2001 from
      https://www.fbr.gov.pk/Categ/Income-Tax-Ordinance/326 (First Schedule,
      Part I, Division I, clause (2)).
- [ ] Add the new tax year to `data/income-tax-slabs.json` with its `law` and
      `source`, and check each band's fixed amount (the tests do this).
- [ ] If an earlier year's table was changed retrospectively, update it and
      say so in the CHANGELOG.
- [ ] Update the table and notes (surcharge, pension rate) in DATA.md.

## Zakat nisab (each February) <!-- dataset: zakat-nisab -->

Sources: the SBP BPRD circular letters index for the year,
https://www.sbp.org.pk/bprd/<YYYY>/index.htm (if it blocks downloads, the
same path on https://archive.sbp.org.pk/), and the Ministry notification
attached to the "Deduction of Zakat at Source ... (Asset Code No. 101)"
circular letter.

1. A week or two before 1 Ramazan, find that circular letter and its annex
   (the Ministry notification). Read the nisab in figures and in words and
   check that they agree.
2. Add a new record to `data/zakat-nisab.json` for the new Zakat year (the
   Hijri year of 1 Ramazan): `label` as the notification writes it, the
   two likely Gregorian dates, the notification and circular numbers, dates
   and URLs. Add `bankHolidayDate` if SBP's bank holiday circular names a
   Gregorian date. Never change a past year.
3. Update the `zakat-nisab` entry in `data/manifest.json` (`recordCount`,
   `coverage`, `sourceUrl`, `sourceReference`, `sourceDate`,
   `retrievedAt`, `nextExpectedUpdate`) and the table in
   `data/notes/200-zakat-nisab.md`.
4. Run `npm run build && node scripts/generate-test-vectors.mjs`, then
   `npm test`, `npm run check:manifest` and every port's vector tests.

## Census population (yearly) <!-- dataset: district-population --><!-- dataset: tehsil-population -->

Sources: PBS's detailed census results in Excel,
https://www.pbs.gov.pk/result-excel/ (Table 1 and Table 20 for each
province, Islamabad and the national totals).

1. Check whether PBS has republished or corrected the tables (compare the
   files' Last-Modified dates and provincial totals with
   `data/notes/210-population.md`).
2. When a district is created, add it to `data/districts.json` and to
   `data/district-population.json` with `null` figures, `censusDistrict`
   set to the census district its area came from, and a note; set
   `boundaryChanged: true` on the district that lost area. Do not estimate.
3. Update both `*-population` entries in `data/manifest.json`
   (`recordCount`, `retrievedAt`, `nextExpectedUpdate`).
4. Run `npm run build && node scripts/generate-test-vectors.mjs`, then
   `npm test`, `npm run check:manifest` and every port's vector tests.

## Withholding tax rates (after each budget) <!-- dataset: withholding-rates -->

Sources: FBR's rate card page,
https://fbr.gov.pk/withholding-taxes-rate-card/174298/174301 (the new tax
year's card, PDF and xlsx), and FBR's consolidated Income Tax Ordinance and
Finance Act for that year.

1. When the new card is out (usually August), add a record for every case
   in `data/withholding-rates.json` for the new tax year: rates for ATL,
   non-ATL (with the Tenth Schedule rule: double, fixed, value bands or
   none) and late filers if any, the card's references and URL. Never
   change a past year.
2. Check each row against the Ordinance as amended by that year's Finance
   Act. Where they differ, use the statute and say why in
   `statuteOverride`; note new or removed cases in
   `data/notes/220-withholding.md`.
3. Have the tax adviser review the new year's table before release.
4. Update the `withholding-rates` entry in `data/manifest.json`, then run
   `npm run build && node scripts/generate-test-vectors.mjs`, `npm test`,
   `npm run check:manifest` and every port's vector tests.

## Urdu alphabetical order

- [ ] Has CLDR changed `common/collation/ur.xml` in a new release
      (https://github.com/unicode-org/cldr/commits/main/common/collation/ur.xml)?
      If so, update `compareUrdu` in `src/text.ts` and every port.

## Bill, courier and FBR invoice formats <!-- dataset: fbr-sale-types -->

No datasets, but each follows an official document that can change.

- [ ] Electricity and gas bill numbers: do PITC's bill pages
      (https://bill.pitc.com.pk), K-Electric (https://ke.com.pk/bills-e-payments/),
      SNGPL (https://www.sngpl.com.pk) and SSGC (https://viewbill.ssgc.com.pk/web/)
      still ask for the same lengths? Has any of them published which digits
      belong to which DISCO, or a check digit? Update `src/bills.ts` and DATA.md.

- [ ] Couriers: has PostEx published a newer merchant API guide than v4.1.9, or
      have TCS, Leopards, M&P, Trax or BlueEx published their statuses or
      tracking number formats? Update `src/courier.ts` and DATA.md.

- [ ] FBR Digital Invoicing: is PRAL's "Technical Specification for DI API"
      still version 1.12 (https://dicrm.pral.com.pk/assets/docs/documents.json,
      https://www.fbr.gov.pk/di-technical-assistance/173967/173970)? If not,
      compare the fields and error codes, update `src/fbr-invoice.ts`,
      `FBR_DI_SPEC_VERSION` and DATA.md.


FBR sale types (`data/fbr-sale-types.json`): check
https://www.fbr.gov.pk/di-technical-assistance/173967/173970 for a newer
"Technical Specification for DI API". If there is one, update the sale
types from its scenarios table, `FBR_DI_SPEC_VERSION` in
`src/fbr-invoice.ts`, and the `fbr-sale-types` manifest entry.
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
