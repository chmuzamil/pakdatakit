# Changelog

## 2.4.0 (unreleased)

### Added

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
  returns `null`. `Courier.NormalizeCity(input)` maps short forms (`LHR`,
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
