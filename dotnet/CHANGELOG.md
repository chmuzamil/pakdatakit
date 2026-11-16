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
Postal codes now cover the full Pakistan Post directory (about 2,560 post
codes). 41 more landline area codes. New bank type `public-sector`
(`BankType.PublicSector`). SME Bank (`SMES`) is reported as inactive.
`PakData.Version` is now `2026-11-17`.
