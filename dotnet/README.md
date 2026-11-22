# PakDataKit for .NET

Utilities for Pakistani data: CNIC, mobile numbers and networks, landlines,
IBAN and banks, NTN/STRN, passport and vehicle numbers, postal codes, cities
and districts, WhatsApp links, rupee formatting, amounts in words, Roman Urdu,
Hijri dates, public holidays, address parsing, delivery-quality checks for
addresses and phone numbers, as-you-type form helpers and Raast QR codes.

This is the .NET port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 32,000+ test
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
Cnic.FindAll("CNIC: 35202-1234567-1, phone 0300-1234567");
// [CnicMatch { Raw = 35202-1234567-1, Digits = 3520212345671, Formatted = 35202-1234567-1, Start = 6, End = 21 }]
Cnic.Mask("My CNIC is 35202-1234567-1");     // Text = "My CNIC is XXXXX-XXXXXXX-X", Count = 1
Cnic.Mask("CNIC 352 0212 3456 71", replacement: "[CNIC removed]"); // Text = "CNIC [CNIC removed]", Count = 1

Phone.Format("0300 1234567");                // "+923001234567"
Networks.GetNetwork("0300 1234567");         // "Jazz"
Numbers.ValidateLandline("042-35761234");    // true
Numbers.ValidateLandline("021-111-123-456", services: true); // true (UAN, toll-free, premium too)

Iban.Validate("PK36SCBL0000001123456702");   // true
Iban.GetBank("PK36SCBL0000001123456702");    // "Standard Chartered Bank (Pakistan) Limited"

Tax.ValidateNtn("0622438-9");                // true
Passport.Validate("AB1234567");              // true
VehiclePlate.Parse("lea 1234");              // Series = LEA, Number = 1234, Formatted = LEA-1234

Postal.GetCity("54000");                     // "Lahore"
Postal.GetPostOffice("48330");               // Office = Dulmial, Town = Dulmial, Province = Punjab
Geo.GetProvince("Multan");                   // "Punjab"

Currency.FormatPkr(150000);                  // "Rs. 150,000"
Currency.FormatLakh(2500000);                // "25 Lakh"
Currency.ParseAmount("Rs. 1,50,000/-");      // Value = 150000, Raw = "Rs. 1,50,000/-"
Currency.ParseAmount("2.25cr");              // Value = 22500000 (null for "5-10k", "-500", "500 rupees")
Currency.FormatAmountInput("1.5 lakh");      // "Rs. 150,000"
Words.AmountInWords(125000, cheque: true);   // "Rupees One Lakh Twenty-Five Thousand Only"

SalesTax.GetRate(new SalesTaxRateQuery { Kind = SalesTaxKind.Services, Province = "Sindh", Date = "2024-06-30" })?.Rate; // 13
SalesTax.Calculate(1000, new SalesTaxOptions { Rate = 18 });          // Net = 1000, Tax = 180, Gross = 1180, Rate = 18
SalesTax.Calculate(1150, new SalesTaxOptions { Province = "Sindh", Date = "2026-11-18", Inclusive = true });
// Net = 1000, Tax = 150, Gross = 1150, Rate = 15
SalesTax.SplitInclusive(99.99, 18);          // Net = 84.74, Tax = 15.25, Gross = 99.99, Rate = 18

IncomeTax.CalculateSalaryTax(1_800_000, new SalaryTaxOptions { TaxYear = 2026 });
// Tax = 72000, Surcharge = 0, Total = 72000, Monthly = 6000, EffectiveRate = 4,
// Slab = { Over = 1200000, UpTo = 2200000, Fixed = 6000, Rate = 11 }, TaxYear = 2026
IncomeTax.CalculateSalaryTax(12_000_000, new SalaryTaxOptions { TaxYear = 2026, IncludeSurcharge = true });
// Tax = 3381000, Surcharge = 304290, Total = 3685290, Monthly = 307107.5, …
IncomeTax.CalculateMonthlySalaryTax(150_000, new SalaryTaxOptions { TaxYear = 2026 })?.Monthly; // 6000
IncomeTax.GetTaxYear("2025-07-01");          // 2026

Text.RomanUrduKey("Mubeen") == Text.RomanUrduKey("Mobeen"); // true
Text.RomanUrduKey("Muhammad Rehman");        // "muhmd rahmn"
Text.Slugify("Lahore Fort, 2024");           // "lahore-fort-2024"
Text.Slugify("لاہور قلعہ");                  // "لاہور-قلعہ"
Text.Slugify("کراچی ۲۰۲۴", new SlugifyOptions { Script = SlugScript.Urdu }); // "کراچی-2024"
var names = new List<string> { "ے", "بھائی", "آم", "باغ", "اب" };
names.Sort(Text.CompareUrdu);                // اب, آم, باغ, بھائی, ے
Text.IsRtl("123 سلام");                      // true
$"آرڈر {Text.WrapBidi("PDK-1042")} بھیج دیا گیا"; // the order number keeps its direction

var build = FbrInvoice.Build(JsonNode.Parse(invoiceJson)); // System.Text.Json.Nodes
build!.Totals.SalesTaxApplicable;            // 222.12 (salesTaxApplicable worked out on each line)
FbrInvoice.Validate(build.Invoice, today: "2026-11-18");
// Valid = true, Errors = []; otherwise FbrInvoiceError { Code = "0005", Field = "invoiceDate", Message = … }

Bills.ParseElectricityRef("02-12624-0045901 R");
// Type = Reference, Digits = 02126240045901, Formatted = 02 12624 0045901 R, UrbanRural = R, Disco = null
Bills.ValidateElectricityRef("0400012345678");                  // true (K-Electric)
Bills.ValidateGasConsumerNumber("12345678901", GasCompany.Sngpl); // true (11 digits)

Hijri.Format(new DateOnly(2026, 3, 4));      // "15 Ramadan 1447"
Holidays.IsHoliday(new DateOnly(2026, 8, 14)); // true

Quality.ScoreAddress("House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660").Score; // 100
Quality.ScoreAddress("Lahore").Missing;      // [HouseNumber, Street, Area, PostalCode, Landmark]
Quality.PhoneRiskSignals("0301-2945716");    // [] (a courier can call it)
Quality.PhoneRiskSignals("03001234567");     // [SequentialDigits, TestNumber]

Courier.MapStatus("PostEx", "Out For Delivery");  // CourierStatus.OutForDelivery
Courier.MapStatus("PostEx", 5);                   // CourierStatus.Delivered
Courier.MapStatus("PostEx", "Attempt Made: Customer not available"); // CourierStatus.Attempted
Courier.MapStatus("Leopards", "Returned to Shipper"); // CourierStatus.Returned
Courier.MapStatus("TCS", "Delivered");            // null (TCS publishes no status list)
Courier.NormalizeCity("LHR");                // "Lahore"
Courier.NormalizeCity("Karachi City");       // "Karachi"
Courier.NormalizeCity("لاہور");              // "Lahore"

var payload = RaastQr.CreateP2P(new RaastP2POptions
{
    Iban = "PK36SCBL0000001123456702",
    Amount = 1500,
    ExpiresIn = "1d",
});
RaastQr.Validate(payload).Valid;             // true
RaastQr.Validate(payload).Kind;              // RaastQrKind.P2p
```

### What throws and what doesn't

**No method throws for a string it is given to check.** That includes
`null`, empty or whitespace-only text, garbage, very long input and invalid
Unicode (unpaired surrogates, noncharacters).

| Methods | For input that isn't valid |
| --- | --- |
| `Validate*`, `Is*` (e.g. `Cnic.Validate`, `Holidays.IsHoliday(string)`) | `false` |
| `Parse`, `Get*`, `Analyze*` returning one value (e.g. `VehiclePlate.Parse`, `Iban.GetBank`, `Tax.AnalyzeNtn`) | `null` |
| `Search*`, `Get*` returning a list (e.g. `Geo.SearchCities`, `Holidays.GetHolidaysOn(string)`), `Cnic.FindAll` | an empty list |
| `Cnic.Mask` | the text with no CNICs masked (`Text = ""`, `Count = 0` for `null`) |
| `Phone.Analyze`, `RaastQr.Validate`, `Address.Parse`, `Networks.GetNetwork`, `Quality.*` | a result that says so (`Valid = false`, an error list, empty parts, `"Unknown"`, score 0, `PhoneRiskFlag.Invalid`), as in the npm package |
| `Bills.ParseElectricityRef`, `Bills.ValidateElectricityRef`, `Bills.ValidateGasConsumerNumber` | `null` / `false` (also for an undefined `GasCompany` value) |
| `SalesTax.GetRate`, `SalesTax.Calculate`, `SalesTax.SplitInclusive` | `null` (also for NaN, infinite, negative or too large amounts and rates, and `null` options) |
| `IncomeTax.CalculateSalaryTax`, `IncomeTax.CalculateMonthlySalaryTax`, `IncomeTax.GetSalaryTaxSlabs`, `IncomeTax.GetTaxYear(string)` | `null` (also for NaN, infinite, negative or too large amounts, an invalid date and a tax year that is not covered) |
| `FbrInvoice.Validate`, `FbrInvoice.Build`, `FbrInvoice.ExpectedSalesTax` | `Valid = false` with the errors (any JSON, including `null`, arrays, strings where numbers belong and NaN); `null` |
| `Courier.MapStatus`, `Courier.NormalizeCity` | `null` (also for an unknown courier, and a numeric status that is negative, fractional, NaN or infinite) |
| `Input.Format*`, `Input.Check*`, `Text.*` | the best formatting of what was typed; `InputState.Invalid` (`Text.Slugify` and `Text.WrapBidi` return `""` for `null`, `Text.IsRtl` returns `false`, `Text.RomanUrduKey` returns `""`, and `Text.CompareUrdu` reads `null` as `""`) |

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
| `findCNICs`, `maskCNICs`                               | `Cnic.FindAll`, `Cnic.Mask`                                             |
| `validatePhone`, `formatPhone`, `analyzePhone`         | `Phone.Validate`, `Phone.Format`, `Phone.Analyze`                       |
| `getNetwork`                                           | `Networks.GetNetwork`                                                   |
| `analyzeNumber`, `validateLandline`, `getAreaCode`     | `Numbers.Analyze`, `Numbers.ValidateLandline`, `Numbers.GetAreaCode`    |
| `validateIBAN`, `getBankFromIBAN`, `getBankInfo`       | `Iban.Validate`, `Iban.GetBank`, `Iban.GetBankInfo`, `Iban.GetBanks`    |
| `analyzeNTN`, `validateNTN`, `validateSTRN`            | `Tax.AnalyzeNtn`, `Tax.ValidateNtn`, `Tax.ValidateStrn`                 |
| `validatePassport`                                     | `Passport.Validate`                                                     |
| `parseVehiclePlate`, `validateVehiclePlate`            | `VehiclePlate.Parse`, `VehiclePlate.Validate`                           |
| `getCityByPostalCode`, `getPostalCode`, …              | `Postal.GetCity`, `Postal.GetCode`, `Postal.GetCodes`, `Postal.Search`  |
| `getPostOffice`, `searchPostOffices`                   | `Postal.GetPostOffice`, `Postal.SearchPostOffices`                      |
| `getProvince`, `searchCities`, `searchDistricts`, …    | `Geo.GetProvince`, `Geo.SearchCities`, `Geo.SearchDistricts`, …         |
| `getDivisions`, `getDivisionOfDistrict`                | `Geo.GetDivisions`, `Geo.GetDivisionOfDistrict`                         |
| `getTehsils`, `getTehsilDistrict`                      | `Geo.GetTehsils`, `Geo.GetTehsilDistrict`                               |
| `createWhatsAppLink`                                   | `WhatsApp.CreateLink`                                                   |
| `formatPKR`, `formatLakh`                              | `Currency.FormatPkr`, `Currency.FormatLakh`                             |
| `parseAmount`, `formatAmountInput`                     | `Currency.ParseAmount`, `Currency.FormatAmountInput`                    |
| `numberToWords`, `amountInWords`                       | `Words.NumberToWords`, `Words.AmountInWords`                            |
| `getSalesTaxRate`, `calculateSalesTax`, `splitInclusive` | `SalesTax.GetRate`, `SalesTax.Calculate`, `SalesTax.SplitInclusive`   |
| `parseElectricityRef`, `validateElectricityRef`        | `Bills.ParseElectricityRef`, `Bills.ValidateElectricityRef`            |
| `validateGasConsumerNumber`                            | `Bills.ValidateGasConsumerNumber`                                       |
| `normalizeText`, `normalizeRomanUrdu`, `toUrduDigits`  | `Text.Normalize`, `Text.NormalizeRomanUrdu`, `Text.ToUrduDigits`        |
| `romanUrduKey`                                         | `Text.RomanUrduKey`                                                     |
| `slugify`, `compareUrdu`, `isRTL`, `wrapBidi`          | `Text.Slugify`, `Text.CompareUrdu`, `Text.IsRtl`, `Text.WrapBidi`       |
| `getSalaryTaxSlabs`, `getSalaryTaxYears`, `getTaxYear` | `IncomeTax.GetSalaryTaxSlabs`, `IncomeTax.GetSalaryTaxYears`, `IncomeTax.GetTaxYear` |
| `calculateSalaryTax`, `calculateMonthlySalaryTax`      | `IncomeTax.CalculateSalaryTax`, `IncomeTax.CalculateMonthlySalaryTax`   |
| `toHijri`, `fromHijri`, `formatHijri`, `isRamadan`     | `Hijri.ToHijri`, `Hijri.FromHijri`, `Hijri.Format`, `Hijri.IsRamadan`   |
| `getPakistanHolidays`, `getHolidaysOn`, …              | `Holidays.GetHolidays`, `Holidays.GetHolidaysOn`, `Holidays.IsHoliday`  |
| `parseAddress`, `formatAddress`                        | `Address.Parse`, `Address.Format`                                       |
| `scoreAddress`, `phoneRiskSignals`, `ADDRESS_WEIGHTS`  | `Quality.ScoreAddress`, `Quality.PhoneRiskSignals`, `Quality.AddressWeights` |
| `buildFbrInvoice`, `validateFbrInvoice`, `expectedSalesTax`, `FBR_DI_SPEC_VERSION` | `FbrInvoice.Build`, `FbrInvoice.Validate`, `FbrInvoice.ExpectedSalesTax`, `FbrInvoice.SpecVersion` |
| `mapCourierStatus`, `normalizeCityForCourier`          | `Courier.MapStatus`, `Courier.NormalizeCity`                            |
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
`[PakLandline]`, `[PakPassport]`, `[VehiclePlate]`, `[CodPhone]` (a mobile
number a courier can call: `Quality.PhoneRiskSignals` returns no flags) and
`[PakAmount]` (a rupee amount `Currency.ParseAmount` reads, like `150,000` or
`1.5 lakh`). `[PakLandline(Services = true)]` also accepts UAN, toll-free and
premium-rate numbers. Like the built-in
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
`IsPakLandline()`, `IsPakPassport()`, `IsVehiclePlate()`, `IsCodPhone()` (a
mobile number a courier can call: `Quality.PhoneRiskSignals` returns no flags) and
`IsPakAmount()` (a rupee amount `Currency.ParseAmount` reads, like `150,000` or
`1.5 lakh`). `IsPakLandline(services: true)` also accepts UAN, toll-free and
premium-rate numbers. They pass `null`
and empty strings; add `NotEmpty()` for mandatory fields. Works with
FluentValidation 11 and 12.

## Notes

- **Landlines and service numbers.** `Numbers.ValidateLandline` accepts
  fixed-line numbers only; with `services: true` it also accepts UAN
  (`021-111-123-456`, `111-123-456`), toll-free (`0800` and five or six digits,
  as in PTA's numbering plans) and premium-rate (`0900`) numbers, but not
  mobile numbers, and `0122` numbers are not recognised (no PTA document
  lists them). `Numbers.Analyze` tells them apart.
- **CNICs in free text.** `Cnic.FindAll(text)` returns a `CnicMatch` (`Raw`,
  `Digits`, `Formatted`, `Start`, `End`) for each CNIC. Digits are read in
  groups (unbroken runs of digits), and groups may be joined by any run of
  spaces or tabs, or by one mark (a hyphen or dash, dot, slash or
  underscore) with any spaces around it: `35202-1234567-1`,
  `352 0212 3456 71`, `35202/1234567/1`, `35202_1234567_1`,
  `35202 - 1234567 - 1`. A line break never joins groups. A match is
  consecutive whole groups that add up to exactly 13 digits, starting with
  a province digit (1-8), and the search goes on after each match, so
  `0300-1234567 35202-1234567-1` finds the CNIC. A group is never split, so
  13 digits inside a longer unbroken number never match. Digits may be
  ASCII, Urdu or Arabic-Indic. `Start` and
  `End` are `string` indexes (UTF-16 code units), so
  `text[match.Start..match.End]` is `Raw`. `Cnic.Mask(text, mask)` replaces
  each digit with `mask` (default `"X"`) and keeps the separators;
  `Cnic.Mask(text, replacement: "[CNIC removed]")` replaces each whole
  match instead. Both return a `MaskedText` (`Text`, `Count`). Both are
  looser than `Cnic.Validate`: any 13 digits that start with 1-8, split
  into groups this way (an account, order or tracking number, table
  columns, a price list such as `8260 - 8048 - 2804 - 0`, a file name such
  as `IMG_20261123_12345`, or two shorter numbers written together), match.
- **Raast QR kind.** `RaastQr.Validate` returns the `Kind` (`P2p`,
  `Merchant`, or `null` when the text is not a Raast QR). A merchant QR with
  no IBAN is valid with the warning `RaastQrWarning.NoIban`, since it may pay
  through the merchant's own scheme; a person-to-person QR with no IBAN is
  still an error.
- **Format-only checks.** NADRA, FBR and DGIP publish no check-digit
  algorithms, so CNIC, NTN, STRN and passport numbers are checked for format
  only. Vehicle plates are checked against the shape the provinces share. See
  [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md).
- **Hijri dates** use the same tabular ("islamic-civil") algorithm as the npm
  package, not `System.Globalization.HijriCalendar`. Real dates in Pakistan
  follow moon sighting and can differ by a day or two; pass an `offset`.
- **Mobile networks** are the network a prefix was first allocated to. With
  number portability the current carrier can differ.
- **Bank types.** `BankInfo.Type` is a `BankType`: `Commercial` (a private
  commercial bank), `PublicSector` (`public-sector` in the npm package: a
  public sector commercial bank, such as National Bank of Pakistan),
  `Islamic`, `Microfinance`, `Digital`, `Emi`, `Foreign`, `Specialized` and
  `Central`. `BankInfo.Active` is `false` for a bank that merged into another
  or has closed (SME Bank, `SMES`).
- **Divisions and tehsils** come from the 2023 census: 30 divisions and 591
  tehsils. Each tehsil is recorded under the district it was in at the
  census, so `Geo.GetTehsils("Rawalpindi")` still lists Murree, and
  `Geo.GetDivisionOfDistrict` returns `null` for districts created since.
- **Delivery quality.** `Quality.ScoreAddress` returns an `AddressScore`
  (`Score` from 0 to 100, the `Missing` parts as `AddressPart` values in the
  order of `Quality.AddressWeights`, and the `Parsed` address with any extra
  warnings, e.g. a post office in another province). An unknown postal code
  scores 5 of its 15 points. `Quality.PhoneRiskSignals` returns
  `PhoneRiskFlag` values (`Invalid`, `Landline`, `NotMobile`,
  `RepeatedDigits`, `SequentialDigits`, `TestNumber`; `not-mobile` and so on
  in the npm package). Both are heuristics on the text alone: they say how
  much an address or number tells a courier, not whether it exists.
- **Sales tax.** `SalesTax.GetRate` returns the standard rate (a
  `SalesTaxRate` with its `Authority`, `Law` and `Source`) for
  `SalesTaxKind.Goods` (federal, FBR) or `SalesTaxKind.Services` in Punjab,
  Sindh, Khyber Pakhtunkhwa (`KP`, `KPK`), Balochistan or Islamabad Capital
  Territory (`ICT`, `Islamabad`), from 1 July 2019. Reduced, higher and sector
  rates are not included. Give the date as `Date` (`YYYY-MM-DD`) or `OnDate`
  (a `DateOnly`); it defaults to today's local date. It returns `null` for a
  date before 1 July 2019, an invalid date, an unknown province, services
  without a province, or goods in Azad Jammu and Kashmir or Gilgit-Baltistan.
  `SalesTax.Calculate` takes a `SalesTaxOptions` with a `Rate`, or a
  `Province` (and `Kind`, default services) to look one up; `Inclusive = true`
  splits the tax out. Amounts are rounded half up to the paisa in exact
  integer arithmetic, reading the number as written (`1.005` is Rs 1.01); for
  an inclusive amount the value is rounded and the tax is the rest, so
  `Net + Tax` always equals `Gross`. Amounts from 0 to one trillion rupees and
  rates from 0 to 100 with at most two decimals are accepted.
- **Income tax on salary.** `IncomeTax.GetSalaryTaxSlabs(taxYear)` returns
  the salaried rate table (Division I of Part I of the First Schedule to the
  Income Tax Ordinance 2001, clause (2)) for tax years 2020 to 2027 as a
  `SalaryTaxYear` (`TaxYear`, `From`, `To`, `Law`, `Source` and the
  `SalaryTaxSlab` bands: `Over`, `UpTo`, `Fixed`, `Rate`, and the section 4AB
  `Surcharge`: `Rate`, `Over`, `Law`, `Source`, or `null` before 2025), or `null`; it
  defaults to the current tax year, and `IncomeTax.GetSalaryTaxYears()` lists
  the years covered. A tax year runs from 1 July to 30 June and is named after
  the June it ends in: `IncomeTax.GetTaxYear("2025-07-01")` is 2026 (also for
  a `DateOnly`, or today with no argument). `IncomeTax.CalculateSalaryTax(annualIncome, options)`
  returns a `SalaryTax` (`Tax`, `Surcharge`, `Total` = tax + surcharge,
  `Monthly` = total / 12, `EffectiveRate` of the total in percent to 2
  decimals, the `Slab` and the `TaxYear`); income must exceed a band's `Over`
  to fall in it. `SalaryTaxOptions` takes `TaxYear`, which wins over `Date`
  (`YYYY-MM-DD`) or `OnDate` (a `DateOnly`); without either it uses today's
  local date. `IncludeSurcharge = true` adds the section 4AB surcharge on the
  whole tax once taxable income exceeds Rs 10 million (10% in tax year 2025,
  9% for salaried individuals in 2026, none in 2027 or before 2025); it is
  off by default in 2.x, so `Surcharge` is 0 and `Total` equals `Tax`. `IncomeTax.CalculateMonthlySalaryTax(monthlySalary, options)`
  works on `monthlySalary × 12`, so `Monthly` is the tax to withhold each
  month. Amounts are rounded half up to the paisa in exact integer
  arithmetic, reading the number as written; amounts from 0 to one trillion
  rupees are accepted. Tax credits, exemptions, the pension rate, super tax
  and withholding adjustments are not applied: this is an estimate, not tax
  advice.
- **Urdu text.** `Text.Slugify(input, options)` makes a URL slug: lower-case
  words joined by `-`. Urdu letters are kept as they are (no
  transliteration), diacritics, tatweel and zero-width characters are
  dropped, the Arabic look-alikes ك ي ى become ک ی ی, Urdu and Arabic-Indic
  digits become `0-9`, and accented Latin-1 letters lose their accents (`é`
  to `e`, `ß` to `ss`); anything else separates words. `SlugifyOptions.Script`
  is `SlugScript.Any` (default), `Latin` (only `a-z`) or `Urdu` (only Urdu
  letters); digits are always kept. `Text.CompareUrdu(a, b)` returns -1, 0 or
  1 in Urdu alphabetical order (CLDR `ur`, CLDR 49), for `List.Sort` or
  `OrderBy(x => x, Comparer<string>.Create(Text.CompareUrdu))`: a letter
  joined with ھ (بھ, پھ, …) is a letter of its own, أ ؤ ۂ ئ ۓ sort as ا و ہ ی ے
  just after them, diacritics only break ties, punctuation comes first, then
  digits digit by digit (Urdu, Arabic-Indic and ASCII digits are equal), then
  Urdu letters, other Arabic-script characters, and everything else by code
  point ignoring ASCII case; 0 means identical strings. The order is built
  in, so it does not depend on the culture or the ICU version.
  `Text.IsRtl(text)` is `true` when the first letter is from a right-to-left
  script. `Text.WrapBidi(text, direction)` wraps text in a directional isolate
  (`BidiDirection.Auto`, U+2068, by default; `Rtl`, U+2067; `Ltr`, U+2066)
  closed with U+2069, so an English order number does not reorder an Urdu
  sentence. `Text.RomanUrduKey(text)` is a phonetic key for Roman Urdu, so
  spellings of one name match (`Mubeen` and `Mobeen`, `Muhammad` and
  `Mohammad`, `Chaudhry` and `Chaudhary`): compare keys, not text. Different
  names can share a key (`Hamid` and `Hamad`), so a match means "probably the
  same". `Text.NormalizeRomanUrdu` is unchanged.
- **Utility bills.** `Bills.ParseElectricityRef` reads a DISCO (WAPDA)
  reference number (14 digits, optional `U` or `R`), a DISCO customer ID (10
  digits, 11 for LESCO) or a K-Electric account number (13 digits starting
  `04000`), as an `ElectricityRef` (`Type` is an `ElectricityRefType`:
  `Reference`, `CustomerId` or `KElectric`; `customer-id` and `k-electric` in
  the npm package). A reference is formatted 2 + 5 + 7 digits, plus the
  letter. `Disco` is `"K-Electric"` for a K-Electric account and `null`
  otherwise: no official source maps the digits to a distribution company.
  `Bills.ValidateGasConsumerNumber` takes a `GasCompany` (`Sngpl`, 11 digits;
  `Ssgc`, 10 digits). Spaces, dashes and dots are ignored and Urdu digits are
  accepted. No utility publishes a check digit, so only the format is checked.
- **Couriers (experimental).** `Courier.MapStatus` and `CourierStatus` may
  change in a minor release while more couriers' status lists are added (see
  [CONTRIBUTING.md](https://github.com/chmuzamil/pakdatakit/blob/main/CONTRIBUTING.md#courier-status-lists)).
  `Courier.MapStatus(courier, raw)` maps a courier's own
  status to a `CourierStatus`: `Pending`, `Booked`, `PickedUp`, `InTransit`,
  `OutForDelivery`, `Attempted`, `UnderReview`, `Delivered`, `Returning`,
  `Returned` or `Cancelled` (`picked-up`, `out-for-delivery` and so on in the
  npm package). The courier is a string (`TCS`, `Leopards`, `PostEx`, `M&P`,
  `Trax`, `BlueEx`, case-insensitive; `LCS`, `MnP` and `Blue Ex` work too);
  `raw` is the status text or, through the `double` overload, a numeric ID,
  which must be a non-negative whole number and is matched as its decimal
  text (`5` matches `"5"`, not `"0005"`). Only statuses a courier documents
  publicly are mapped: PostEx's merchant API guide (v4.1.9) and Leopards'
  "Returned to Shipper". TCS, M&P, Trax and BlueEx publish no list, so they
  return `null`, as does any other status. `Courier.NormalizeCity` maps how a
  city is written (`LHR`, `Khi`, `Pindi`, `lyallpur`, `Karachi City`, Urdu
  script) to its name in the city list, or `null`. No API is called.
- **FBR Digital Invoicing.** `FbrInvoice` follows PRAL's "Technical
  Specification for DI API" version 1.12 (`FbrInvoice.SpecVersion`) and
  PRAL's Error Message Guide. The invoice is JSON (`JsonNode`, or a
  `JsonElement` for `Validate`) with the specification's camelCase keys, since
  that is what is posted to FBR. `FbrInvoice.Build(input)` works out each
  line's `salesTaxApplicable` when it is left out (`N%` rates on the value
  excluding sales tax, or the retail price for Third Schedule goods; `Rs.N`
  rates on the quantity; other rates get 0), fills FBR's defaults (0 for
  `totalValues`, `fixedNotifiedValueOrRetailPrice` and
  `salesTaxWithheldAtSource`, `""` for `buyerNTNCNIC` and `invoiceRefNo`),
  keeps every other key, and returns a new `JsonObject` with
  `FbrInvoiceTotals` (column totals, not sent to FBR), or `null` if the input
  is not an object with an `items` array of objects.
  `FbrInvoice.Validate(invoice, today)` returns an `FbrInvoiceValidation`
  with every problem it can find offline as an `FbrInvoiceError` (FBR's
  `Code` or `null`, the `Field` such as `items[0].rate`, and a `Message`):
  required fields, formats (date, NTN/CNIC, FBR invoice number, sandbox
  scenario), amounts (a JSON number, not negative, at most 2 decimals, 4 for
  quantity; `5.0` is a number, `"5"` is not), SRO rules and the sales tax
  arithmetic to within one paisa; `today` (`YYYY-MM-DD`) also rejects future
  dates. It cannot check what needs FBR's reference APIs (registration
  status, and whether a province, HS code, unit, rate, sale type or SRO is in
  FBR's lists). `FbrInvoiceType` and `FbrRegistrationType` hold the allowed
  strings. There is no HTTP client and no token handling.
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
