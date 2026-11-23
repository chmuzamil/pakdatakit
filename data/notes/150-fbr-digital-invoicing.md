<!-- datasets: fbr-sale-types -->

## FBR Digital Invoicing

No dataset: `buildFbrInvoice` and `validateFbrInvoice` follow these
documents, retrieved on 2026-11-18:

- **PRAL, "Technical Specification for DI API", version 1.12** (issued
  7 April 2025, last updated 24 July 2025):
  https://download1.fbr.gov.pk/Docs/20257301172130815TechnicalDocumentationforDIAPIV1.12.pdf,
  linked from https://www.fbr.gov.pk/di-technical-assistance/173967/173970.
  PRAL's download index (https://dicrm.pral.com.pk/assets/docs/documents.json)
  lists it as the current version. It gives the fields, the sale types and
  the error codes.
- **PRAL, "Error Message Guide (Sales)"**:
  https://dicrm.pral.com.pk/assets/docs/Manuals/Error%20Message%20Guide%20-%20(Sales).pdf.
  This is the source of the rules on numbers (0300: not negative or empty;
  0302: at most 2 decimals, 4 for quantity), on SROs (0077, 0078) and on
  reduced-rate goods (0091).
- **PRAL, "DI Scenarios Description for Sandbox Testing"** (v1.11): the sample
  invoices, used for the arithmetic examples (1000 × 18% = 180; Rs.3 × 12 =
  36; retail price 100 × 18% = 18 for Third Schedule goods).
- **Legal basis**: S.R.O. 69(I)/2025, Sales Tax Rules chapter XIV
  (https://download1.fbr.gov.pk/SROs/2025129141598258SRO69(I)2025.pdf).

Where the documents disagree or are silent, the code does this:

- **Key names** are those of the specification's sample JSON
  (`invoiceType`, `buyerRegistrationType`), not the misspellings in its field
  table, and `invoiceType` is `Sale Invoice` (the table says "Sales
  Invoice", but the samples and the document type API say "Sale Invoice").
- **NTN length** is 7 (error 0002's text also mentions 9, but 0401, 0402 and
  the guide say 7 or 13).
- **Rounding**: none is documented. Sales tax is rounded half up to the
  paisa, and a declared tax within one paisa of it is accepted. This is the
  library's choice.
- **Sale types** are compared ignoring case and spaces, because the
  specification's table and its samples differ in capitals.
- **Not checked**: anything that needs FBR's reference APIs or records
  (registration, provinces, HS codes, units, rates, sale types, SRO lists,
  the original invoice of a debit note). There are no string length limits
  in the specification, so none are checked.

**Reference data (2.8.0).** `fbr-sale-types.json` lists the 24 sale types
named in the specification's sandbox scenarios (section 9), with the
scenarios that use each (`getSaleTypes()`). The specification shows only
sample rows of FBR's other reference lists (2 provinces, 2 units, 3
transaction types), and the full lists come from PRAL's reference APIs
(`/pdi/v1/provinces`, `/pdi/v1/uom`, `/pdi/v2/HS_UOM`,
`/pdi/v2/SaleTypeToRate` …), which need the taxpayer's token. FBR publishes
no other HS code-to-unit list for sales tax: the only official PCT-to-unit
list found is a customs order (Customs General Order 5 of 2022, Annex-I,
7,575 codes, no descriptions), which is not shipped as Digital Invoicing
reference data. So `validateFbrInvoice(invoice, { reference })` checks
provinces, sale types, units and HS code/unit pairs against the lists an
app syncs from FBR's APIs, which are authoritative; without them those
values are checked for presence only.
