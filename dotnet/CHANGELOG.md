# Changelog

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
