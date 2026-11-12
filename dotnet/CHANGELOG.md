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
