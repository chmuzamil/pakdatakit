# Changelog

## 2.7.2

Patch release. Every port gives the same results on the shared test
vectors, which now include Jaanch's CNIC redaction cases.

### Changed

- `Cnic.FindAll()` and `Cnic.Mask()` now join digit groups with any run of spaces or tabs, or one
  mark (hyphen or dash, dot, slash, or now underscore) with spaces around it:
  `35202  1234567  1`, `35202 -1234567- 1`, `35202_1234567_1`,
  `35202 - 1234567 - 1`. A line break never joins groups. A match is
  consecutive whole groups adding up to exactly 13 digits and starting with
  1-8; a group is never split. This masks everything Jaanch's redaction
  masks except across line breaks, and also matches more numbers that are
  not CNICs (table columns, price lists, file names).

## 2.7.1

Patch release, from real data. Every port gives the same results on the
shared test vectors.

### Changed

- `Cnic.FindAll()` and `Cnic.Mask()` find CNICs in any grouping: any run of exactly 13 digits starting
  with 1-8, joined by single separators (space, hyphen or dash, dot, or the
  new slash), such as `352 0212 3456 71` or `35202/1234567/1`. Everything
  2.7.0 found is still found, including a 5-7-1 CNIC inside a longer run; a
  longer run is otherwise never cut. This also matches more numbers that are
  not CNICs (any 13 digits starting with 1-8, however grouped).
- Toll-free numbers: `0800` and five or six digits (PTA's National Numbering
  Plan 2008 gives six; Soneri Bank uses `0800005000`). Eight digits stay
  rejected.

### Added

- `Cnic.Mask(text, replacement: "[CNIC removed]")` (a new overload; the 2.7.0 signature is kept, so compiled code still binds) replaces each whole CNIC with a string.

## 2.7.0

Minor release: new features and one accuracy fix behind an option. Every
port gives the same results on the shared test vectors (35,000+, about 1,800
new).

### Added

- **Salary tax surcharge.** `IncomeTax.CalculateSalaryTax()` and `CalculateMonthlySalaryTax()` take `SalaryTaxOptions.IncludeSurcharge` and return `Surcharge` and `Total`; `GetSalaryTaxSlabs()` gives each year's `SalaryTaxSurcharge` (`null` before 2025). The section 4AB surcharge
  is a percentage of the whole tax once taxable income exceeds Rs 10
  million: 10% in tax year 2025, 9% for salaried individuals in 2026, and
  none in 2027 or before 2025. The option is off by default in 2.x, so
  existing results don't change; it will be on by default in 3.0.
- **Service numbers as landlines.** `Numbers.ValidateLandline(phone, services: true)` (a new overload) also accepts UAN,
  toll-free and premium-rate numbers. The same option is in `[PakLandline(Services = true)]` (DataAnnotations) and `IsPakLandline(services: true)` (FluentValidation).
- **CNICs in free text.** `Cnic.FindAll(text)` returns `CnicMatch` records (`Raw`, `Digits`, `Formatted`, `Start`, `End`; offsets in UTF-16 code units); `Cnic.Mask(text, mask)` returns `MaskedText(Text, Count)`. Pattern matches: other 13-digit
  numbers starting with 1-8 also match; CNIC validation stays strict.
- **Phonetic keys for Roman Urdu names**: `Text.RomanUrduKey(text)`, so that `Mubeen` and
  `Mobeen`, or `Rehman` and `Rahman`, match.
- **Raast**: `RaastQrValidation.Kind` and the warning `RaastQrWarning.NoIban`.

### Changed

- `0122` numbers are no longer recognised: they are seen in use, but no PTA
  document lists them. `Numbers.Analyze()` now returns `null` for them;
  `NumberType.Personal` is `[Obsolete]`, never returned, and will be removed
  in 3.0.
- Toll-free numbers follow PTA's numbering plan: `0800` and five digits; the
  8-digit form is no longer accepted.
- A merchant Raast QR without an IBAN is valid with the warning `no-iban`; a
  person-to-person QR without an IBAN is still an error.

### Compatibility

Source that reads results by property name is unaffected, but binary
compatibility changes: the positional records `SalaryTax`, `SalaryTaxYear`
and `RaastQrValidation` have new constructor and deconstruct signatures, the
compiled `IsPakLandline<T>()` signature has a new optional parameter, and
`PakLandlineAttribute` is no longer a primary-constructor class. Rebuild
projects that use them.


## 2.6.0

Minor release: one new feature. Every port gives the same results on the
shared test vectors (812 new ones).

### Added

- `Currency.ParseAmount()` and `Currency.FormatAmountInput()`, with the
  `ParsedAmount` record. `ParseAmount`
  reads a rupee amount as people type it in Pakistan and returns
  `{ value, raw }` in rupees, rounded half-up to the paisa, or `null`. It
  accepts `150,000` and `1,50,000` grouping with decimals, Urdu and
  Arabic-Indic digits, `Rs`/`Rs.`/`PKR`/`₨` and a trailing `/-`, and the
  shorthand `k`, `thousand`, `hazar`, `ہزار`, `lakh`, `lac`, `لاکھ`, `crore`,
  `cr` and `کروڑ` (also `1.5 lakh`, `2.25cr`). It rejects negatives, ranges,
  more than one number, leftover letters, ambiguous grouping and amounts over
  Rs. 50 trillion. The arithmetic is done on the digits, so `1.005` is 1.01
  in every language. `FormatAmountInput` writes the amount back
  (`"Rs. 150,000"`) for showing next to a field. It never throws.
- `[PakAmount]` in `PakDataKit.DataAnnotations` and `IsPakAmount()` in
  `PakDataKit.FluentValidation`.

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

- `Text.Slugify(input, options)`: a URL slug that keeps Urdu letters as they
  are, folds accented Latin-1 letters and converts Urdu digits
  (`SlugifyOptions.Script`: `SlugScript.Any`, `Latin` or `Urdu`).
  `Text.CompareUrdu(a, b)`: Urdu alphabetical order (CLDR `ur`, with the ھ
  digraphs as letters of their own), for `List.Sort`, built in so it does not
  depend on the culture or ICU. `Text.IsRtl(text)`: whether the first letter
  is right to left. `Text.WrapBidi(text, direction)`: wraps text in a Unicode
  directional isolate (`BidiDirection.Auto`, `Rtl` or `Ltr`).
- `IncomeTax.CalculateSalaryTax(annualIncome, options)` and
  `IncomeTax.CalculateMonthlySalaryTax(monthlySalary, options)`: income tax on
  salary from the salaried rate table for tax years 2020 to 2027, as a
  `SalaryTax` (`Tax`, `Monthly`, `EffectiveRate`, `Slab`, `TaxYear`) rounded
  half up to the paisa in exact integer arithmetic (`SalaryTaxOptions` takes
  `TaxYear`, `Date` or `OnDate`). `IncomeTax.GetSalaryTaxSlabs(taxYear)`
  returns the table as a `SalaryTaxYear` with its `SalaryTaxSlab` bands, law
  and official source, `IncomeTax.GetSalaryTaxYears()` the years covered, and
  `IncomeTax.GetTaxYear(date)` the July-to-June tax year of a date. Invalid
  input returns `null`.
- `Quality.ScoreAddress(address)`: scores how complete a delivery address is
  (0 to 100) for cash on delivery, as an `AddressScore` (`Score`, the
  `Missing` `AddressPart` values and the `Parsed` address with extra
  warnings), using `Quality.AddressWeights`. `Quality.PhoneRiskSignals(phone)`
  returns `PhoneRiskFlag` values for a number a courier cannot reach or that
  looks made up (`Invalid`, `Landline`, `NotMobile`, `RepeatedDigits`,
  `SequentialDigits`, `TestNumber`). New `[CodPhone]` attribute in
  `PakDataKit.DataAnnotations` and `IsCodPhone()` rule in
  `PakDataKit.FluentValidation`: a mobile number with no risk flags.
- `SalesTax.GetRate(query)`: the standard sales tax rate on a date, from
  1 July 2019, for `SalesTaxKind.Goods` (federal, FBR) or
  `SalesTaxKind.Services` in a province or Islamabad Capital Territory, as a
  `SalesTaxRate` with its authority, law and official source
  (`SalesTaxRateQuery` takes `Kind`, `Province` and `Date` or `OnDate`).
  `SalesTax.Calculate(amount, options)` adds the tax for a `Rate` or a
  province's rate (`SalesTaxOptions`, `Inclusive` to split it out) and
  `SalesTax.SplitInclusive(gross, rate)` splits a tax-inclusive amount, both
  returning `SalesTaxAmounts` (`Net`, `Tax`, `Gross`, `Rate`) rounded half up
  to the paisa in exact integer arithmetic. Invalid input returns `null`.
- `Bills.ParseElectricityRef(input)`: reads a DISCO (WAPDA) reference number
  (14 digits, optional `U`/`R`), a DISCO customer ID (10 or 11 digits) or a
  K-Electric account number (13 digits starting `04000`), as an
  `ElectricityRef` (`Type` as `ElectricityRefType.Reference`, `CustomerId` or
  `KElectric`, `Digits`, `Formatted`, `UrbanRural`, `Disco`), or `null`.
  `Bills.ValidateElectricityRef(input)` checks the same formats, and
  `Bills.ValidateGasConsumerNumber(input, company)` checks an 11-digit
  `GasCompany.Sngpl` or 10-digit `GasCompany.Ssgc` consumer number. Format
  checks only; separators and Urdu digits are accepted.
- `Courier.MapStatus(courier, raw)`: maps a courier's own status text, or a
  numeric status ID through the `double` overload, to a `CourierStatus`
  (`Pending`, `Booked`, `PickedUp`, `InTransit`, `OutForDelivery`,
  `Attempted`, `UnderReview`, `Delivered`, `Returning`, `Returned`,
  `Cancelled`). Only publicly documented statuses are mapped (PostEx's
  merchant API guide and Leopards' "Returned to Shipper"); anything else
  returns `null`. The status mapping is experimental and may change in a
  minor release as more couriers' lists are added. `Courier.NormalizeCity(input)` maps short forms (`LHR`,
  `Khi`, `Pindi`), the old name Lyallpur, a trailing "city" and Urdu script to
  a city in the city list. Neither throws.
- `FbrInvoice.Build(input)`, `FbrInvoice.Validate(invoice, today)` and
  `FbrInvoice.ExpectedSalesTax(item)`: FBR Digital Invoicing (PRAL's DI API
  specification 1.12, `FbrInvoice.SpecVersion`) on the invoice JSON
  (`JsonNode`; `Validate` also takes a `JsonElement`). `Build` works out each
  line's `salesTaxApplicable` with `SalesTax.Calculate` (or quantity × `Rs.N`),
  fills FBR's defaults and returns an `FbrInvoiceBuild` (`Invoice` as a
  `JsonObject`, `Totals` as `FbrInvoiceTotals`), or `null`. `Validate` returns
  an `FbrInvoiceValidation` whose `Errors` are `FbrInvoiceError` records
  (`Code`, `Field`, `Message`) with FBR's error codes, checking everything
  that needs no call to FBR, including the sales tax to within one paisa.
  `FbrInvoiceType` and `FbrRegistrationType` hold the allowed strings. No
  HTTP client, no tokens.

### Changed

- Package metadata: the description, keywords and homepage now follow the same
  style in every registry, and CI checks that the version, repository URL,
  licence and author agree across ports (`npm run check:metadata`).
- `PackageProjectUrl` points to the .NET README and `Copyright` matches the
  licence file.
- `PakData.Version` is now `2026-11-18` (new dataset: sales tax rates).

## 2.3.0

First release of the .NET packages, matching version 2.3.0 of the
[`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).

- `PakDataKit`: every module of the npm package for .NET 8, with no
  dependencies: `Cnic`, `Phone`, `Networks`, `Numbers`, `Iban`, `Tax`,
  `Passport`, `VehiclePlate`, `Postal`, `Geo`, `WhatsApp`, `Currency`,
  `Words`, `Text`, `Hijri`, `Holidays`, `Address`, `Input` and `RaastQr`.
- Checked against the TypeScript library with over 12,000 shared test cases,
  also used by the Python and Dart ports, so all four give the same results.
- The datasets are embedded from the repository's `data/` folder at build
  time.
- `Postal.GetPostOffice(code)` and `Postal.SearchPostOffices(query)`: every
  delivery post office in Pakistan Post's directory (about 2,560), as a
  `PostOffice` record (`Code`, `Office`, `Town`, `District`, `Province`),
  including offices in towns and villages that `Postal.GetCity` does not
  cover. The directory is parsed on first use only.
- `PakDataKit.DataAnnotations`: `[Cnic]`, `[PakPhone]`, `[PakIban]`, `[Ntn]`,
  `[Strn]`, `[PakLandline]`, `[PakPassport]` and `[VehiclePlate]`.
- `PakDataKit.FluentValidation`: `IsCnic()`, `IsPakPhone()`, `IsPakIban()`,
  `IsNtn()`, `IsStrn()`, `IsPakLandline()`, `IsPakPassport()` and
  `IsVehiclePlate()`.
- No method throws for a string it is given to check: validators return
  `false`, parsers and lookups return `null` or an empty list, including for
  `null`, very long input and invalid Unicode. `Try*` overloads
  (`Hijri.TryFromHijri`, `Holidays.TryGetHolidaysOn`, `WhatsApp.TryCreateLink`,
  `RaastQr.TryCreateP2P`, `RaastQr.TryCreateMerchant`) cover the methods that
  throw for invalid arguments. A fuzz test checks the contract.

Data (November 2026 audit, see AUDIT.md and DATA.md in the repository):
banks `ZTBL` (Zarai Taraqiati Bank Limited) and `SMFB` (Sindh Microfinance
Bank) added; `TMFB`/`TAMW` renamed "Easypaisa Bank Limited" and `JCMA`/`WMBL`
"Mobilink Microfinance Bank (JazzCash)"; eight postal codes corrected from
Pakistan Post's directory (Gilgit, Dera Ismail Khan, Tank, Badin, Thatta,
Sujawal, Matiari, Taxila) and Wah Cantonment `47040` added; holiday `source`
links for 2024 to 2026 now point to official notifications.
Division and tehsil lookups from the 2023 census added (`Geo.GetDivisions`,
`Geo.GetDivisionOfDistrict`, `Geo.GetTehsils`, `Geo.GetTehsilDistrict`): 30
divisions and 591 tehsils, each tehsil recorded under its census district.
`Postal.GetCity` and the other `Postal` lookups now cover every office in
Pakistan Post's directory that belongs to a city on pakdatakit's city list
(457 codes instead of 110) and still return only listed cities; offices in
other towns and villages are answered by `Postal.GetPostOffice`. Compared
with npm 2.2.1, `Postal.GetCity` gives a different answer for eight codes:
`47040` is Wah Cantonment (was Taxila), and `15700`, `29120`, `29430`,
`70100`, `72220`, `73020` and `73220`, which were given as the main code of
a city but belong to a village office nearby, now return `null`. 41 more
landline area codes. New bank type `public-sector`
(`BankType.PublicSector`): National Bank of Pakistan, Sindh Bank, The Bank
of Khyber and The Bank of Punjab now report it instead of `Commercial`, and
a `switch` expression over `BankType` without a discard arm now gets an
exhaustiveness warning (CS8509) until it handles the new value. SME Bank
(`SMES`) is reported as inactive.
`PakData.Version` is now `2026-11-17`.
