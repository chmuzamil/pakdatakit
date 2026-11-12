# PakDataKit for .NET

Utilities for Pakistani data: CNIC, mobile numbers and networks, landlines,
IBAN and banks, NTN/STRN, passport and vehicle numbers, postal codes, cities
and districts, WhatsApp links, rupee formatting, amounts in words, Roman Urdu,
Hijri dates, public holidays, address parsing, as-you-type form helpers and
Raast QR codes.

This is the .NET port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 12,000+ test
vectors** generated from the TypeScript library (also used by the Python and
Dart ports), so all four give identical results.

- .NET 8, nullable enabled, **no dependencies**
- Immutable records with XML docs on every public member
- Works offline: the data is embedded in the assembly
- Results do not depend on the machine's culture or ICU version

| Package                       | What it adds                                                      |
| ----------------------------- | ----------------------------------------------------------------- |
| `PakDataKit`                  | All validators, lookups and formatters                            |
| `PakDataKit.DataAnnotations`  | `[Cnic]`, `[PakPhone]`, `[PakIban]` and other attributes          |
| `PakDataKit.FluentValidation` | `IsCnic()`, `IsPakPhone()`, `IsPakIban()` and other rules         |

## Install

```sh
dotnet add package PakDataKit
dotnet add package PakDataKit.DataAnnotations   # optional
dotnet add package PakDataKit.FluentValidation  # optional
```

## Examples

```csharp
using PakDataKit;

Cnic.Validate("35202-1234567-1");            // true
Cnic.GetInfo("35202-1234567-1");
// CnicInfo { Digits = 3520212345671, Formatted = 35202-1234567-1, Province = Punjab, Gender = Male }

Phone.Format("0300 1234567");                // "+923001234567"
Networks.GetNetwork("0300 1234567");         // "Jazz"
Numbers.ValidateLandline("042-35761234");    // true

Iban.Validate("PK36SCBL0000001123456702");   // true
Iban.GetBank("PK36SCBL0000001123456702");    // "Standard Chartered Bank (Pakistan) Limited"

Tax.ValidateNtn("0622438-9");                // true
Passport.Validate("AB1234567");              // true
VehiclePlate.Parse("lea 1234");              // Series = LEA, Number = 1234, Formatted = LEA-1234

Postal.GetCity("54000");                     // "Lahore"
Geo.GetProvince("Multan");                   // "Punjab"

Currency.FormatPkr(150000);                  // "Rs. 150,000"
Currency.FormatLakh(2500000);                // "25 Lakh"
Words.AmountInWords(125000, cheque: true);   // "Rupees One Lakh Twenty-Five Thousand Only"

Hijri.Format(new DateOnly(2026, 3, 4));      // "15 Ramadan 1447"
Holidays.IsHoliday(new DateOnly(2026, 8, 14)); // true

var payload = RaastQr.CreateP2P(new RaastP2POptions
{
    Iban = "PK36SCBL0000001123456702",
    Amount = 1500,
    ExpiresIn = "1d",
});
RaastQr.Validate(payload).Valid;             // true
```

### What throws and what doesn't

**No method throws for a string it is given to check.** That includes
`null`, empty or whitespace-only text, garbage, very long input and invalid
Unicode (unpaired surrogates, noncharacters).

| Methods | For input that isn't valid |
| --- | --- |
| `Validate*`, `Is*` (e.g. `Cnic.Validate`, `Holidays.IsHoliday(string)`) | `false` |
| `Parse`, `Get*`, `Analyze*` returning one value (e.g. `VehiclePlate.Parse`, `Iban.GetBank`, `Tax.AnalyzeNtn`) | `null` |
| `Search*`, `Get*` returning a list (e.g. `Geo.SearchCities`, `Holidays.GetHolidaysOn(string)`) | an empty list |
| `Phone.Analyze`, `RaastQr.Validate`, `Address.Parse`, `Networks.GetNetwork` | a result that says so (`Valid = false`, an error list, empty parts, `"Unknown"`), as in the npm package |
| `Input.Format*`, `Input.Check*`, `Text.*` | the best formatting of what was typed; `InputState.Invalid` |

Every regular expression has a one-second timeout; if one is ever hit, the
input is treated as not matching, so the method still returns `false` or
`null`.

**`ArgumentException` is thrown only for arguments and options the npm
package rejects too:**

| Method | Throws when |
| --- | --- |
| `Currency.FormatPkr`, `Currency.FormatLakh` | the amount is NaN or infinite |
| `Words.NumberToWords`, `Words.AmountInWords` | the number is not a safe integer; the amount is negative, not finite or too large |
| `Hijri.FromHijri` | the Hijri date is out of range |
| `Holidays.GetHolidays` | the year is outside 1948 to 9999, or an announced date in the options is not `YYYY-MM-DD` |
| `WhatsApp.CreateLink` | the message contains an unpaired surrogate |
| `RaastQr.CreateP2P`, `RaastQr.CreateMerchant` | the IBAN is invalid, a field is missing or too long, or an amount has no expiry |
| `Address.Format`, `Hijri.FromHijri`, `RaastQr.Create*` | a required object argument is `null` (`ArgumentNullException`) |

Where that input comes from a user, use the overload that returns `false`
instead: `Hijri.TryFromHijri`, `Holidays.TryGetHolidaysOn`,
`WhatsApp.TryCreateLink`, `RaastQr.TryCreateP2P` and
`RaastQr.TryCreateMerchant`.

One difference from the npm package: `getHolidaysOn` and `isPakistanHoliday`
throw for text that is not a `YYYY-MM-DD` date; `Holidays.GetHolidaysOn(string)`
returns an empty list and `Holidays.IsHoliday(string)` returns `false`.

A fuzz test (`tests/PakDataKit.Tests/FuzzTests.cs`) feeds random and hostile
strings to every public method that takes a string and checks this contract.

### API map

| npm                                                    | .NET                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `validateCNIC`, `getCNICInfo`                          | `Cnic.Validate`, `Cnic.GetInfo`                                         |
| `validatePhone`, `formatPhone`, `analyzePhone`         | `Phone.Validate`, `Phone.Format`, `Phone.Analyze`                       |
| `getNetwork`                                           | `Networks.GetNetwork`                                                   |
| `analyzeNumber`, `validateLandline`, `getAreaCode`     | `Numbers.Analyze`, `Numbers.ValidateLandline`, `Numbers.GetAreaCode`    |
| `validateIBAN`, `getBankFromIBAN`, `getBankInfo`       | `Iban.Validate`, `Iban.GetBank`, `Iban.GetBankInfo`, `Iban.GetBanks`    |
| `analyzeNTN`, `validateNTN`, `validateSTRN`            | `Tax.AnalyzeNtn`, `Tax.ValidateNtn`, `Tax.ValidateStrn`                 |
| `validatePassport`                                     | `Passport.Validate`                                                     |
| `parseVehiclePlate`, `validateVehiclePlate`            | `VehiclePlate.Parse`, `VehiclePlate.Validate`                           |
| `getCityByPostalCode`, `getPostalCode`, …              | `Postal.GetCity`, `Postal.GetCode`, `Postal.GetCodes`, `Postal.Search`  |
| `getProvince`, `searchCities`, `searchDistricts`, …    | `Geo.GetProvince`, `Geo.SearchCities`, `Geo.SearchDistricts`, …         |
| `createWhatsAppLink`                                   | `WhatsApp.CreateLink`                                                   |
| `formatPKR`, `formatLakh`                              | `Currency.FormatPkr`, `Currency.FormatLakh`                             |
| `numberToWords`, `amountInWords`                       | `Words.NumberToWords`, `Words.AmountInWords`                            |
| `normalizeText`, `normalizeRomanUrdu`, `toUrduDigits`  | `Text.Normalize`, `Text.NormalizeRomanUrdu`, `Text.ToUrduDigits`        |
| `toHijri`, `fromHijri`, `formatHijri`, `isRamadan`     | `Hijri.ToHijri`, `Hijri.FromHijri`, `Hijri.Format`, `Hijri.IsRamadan`   |
| `getPakistanHolidays`, `getHolidaysOn`, …              | `Holidays.GetHolidays`, `Holidays.GetHolidaysOn`, `Holidays.IsHoliday`  |
| `parseAddress`, `formatAddress`                        | `Address.Parse`, `Address.Format`                                       |
| `formatCNICInput`, `checkCNICInput`, …                 | `Input.FormatCnic`, `Input.CheckCnic`, `Input.FormatPhone`, …           |
| `createRaastP2PQr`, `createMerchantQr`, `parseRaastQr` | `RaastQr.CreateP2P`, `RaastQr.CreateMerchant`, `RaastQr.Parse`          |
| `validateRaastQr`                                      | `RaastQr.Validate`                                                      |
| `dataVersion`                                          | `PakData.Version`                                                       |

## DataAnnotations

For ASP.NET Core model validation, Blazor forms and anything else that uses
`System.ComponentModel.DataAnnotations`:

```csharp
using System.ComponentModel.DataAnnotations;
using PakDataKit.DataAnnotations;

public class CreateCustomerRequest
{
    [Required, Cnic]
    public string Cnic { get; set; } = "";

    [PakPhone(ErrorMessage = "Enter a Pakistani mobile number")]
    public string? Phone { get; set; }

    [PakIban]
    public string? Iban { get; set; }
}
```

Attributes: `[Cnic]`, `[PakPhone]`, `[PakIban]`, `[Ntn]`, `[Strn]`,
`[PakLandline]`, `[PakPassport]` and `[VehiclePlate]`. Like the built-in
attributes, they accept `null` and empty strings; add `[Required]` for
mandatory fields.

## FluentValidation

```csharp
using FluentValidation;
using PakDataKit.FluentValidation;

public class CustomerValidator : AbstractValidator<Customer>
{
    public CustomerValidator()
    {
        RuleFor(c => c.Cnic).NotEmpty().IsCnic();
        RuleFor(c => c.Phone).IsPakPhone().WithMessage("Enter a Pakistani mobile number");
        RuleFor(c => c.Iban).IsPakIban();
    }
}
```

Rules: `IsCnic()`, `IsPakPhone()`, `IsPakIban()`, `IsNtn()`, `IsStrn()`,
`IsPakLandline()`, `IsPakPassport()` and `IsVehiclePlate()`. They pass `null`
and empty strings; add `NotEmpty()` for mandatory fields. Works with
FluentValidation 11 and 12.

## Notes

- **Format-only checks.** NADRA, FBR and DGIP publish no check-digit
  algorithms, so CNIC, NTN, STRN and passport numbers are checked for format
  only. Vehicle plates are checked against the shape the provinces share. See
  [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md).
- **Hijri dates** use the same tabular ("islamic-civil") algorithm as the npm
  package, not `System.Globalization.HijriCalendar`. Real dates in Pakistan
  follow moon sighting and can differ by a day or two; pass an `offset`.
- **Mobile networks** are the network a prefix was first allocated to. With
  number portability the current carrier can differ.
- **Sorting** of search results follows the same order as the npm package for
  the names in the datasets.

## Development

```sh
dotnet test dotnet            # runs the shared vectors in test-vectors/
dotnet pack dotnet -c Release
```

The datasets are embedded from the repository's `data/` folder when the
project is built. After changing `data/*.json`, rebuild; there is nothing to
regenerate. The case-mapping table in `src/PakDataKit/Generated/` comes from
`node scripts/generate-dotnet-data.mjs`.

## License

MIT
