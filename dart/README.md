# PakDataKit for Dart and Flutter

Utilities for Pakistani data: CNIC, mobile numbers and networks, WhatsApp
links, IBAN and banks, postal codes, cities and districts, address parsing,
Roman Urdu, Urdu slugs and alphabetical sorting, Hijri dates, public
holidays, rupee formatting, amounts in words, NTN/STRN, sales tax, income tax
on salary, landlines, electricity and gas bill numbers, Raast QR
codes, and form-field helpers that format as the user types.

This is the Dart port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 32,000+ test
vectors** generated from the TypeScript library (also used by the Python
port), so all three give identical results.

- Pure Dart, **no dependencies**
- Works on **every platform**: Flutter (Android, iOS, web, desktop), the Dart
  VM and server, and Dart compiled to JavaScript. No `dart:io`; the data is
  embedded in the package.
- Null-safe, immutable result classes with value equality and `toJson()`

## Install

```sh
dart pub add pakdatakit
# or, in a Flutter app
flutter pub add pakdatakit
```

## Examples

```dart
import 'package:pakdatakit/pakdatakit.dart';

validateCNIC('35202-1234567-1');             // true
getCNICInfo('35202-1234567-1');
// CNICInfo{digits: 3520212345671, formatted: 35202-1234567-1, province: Punjab, gender: male}
maskCNICs('My CNIC is 35202-1234567-1').text; // 'My CNIC is XXXXX-XXXXXXX-X'

formatPhone('0300 1234567');                 // '+923001234567'
getNetwork('0345-1234567');                  // NetworkName.telenor
createWhatsAppLink('03001234567', 'Salam!'); // 'https://wa.me/923001234567?text=Salam!'
validateLandline('021-111-123-456', services: true); // true (UAN)

validateIBAN('PK36 SCBL 0000 0011 2345 6702'); // true
getBankFromIBAN('PK36SCBL0000001123456702');   // 'Standard Chartered Bank (Pakistan) Limited'
getBankInfo('MEZN')?.type;                     // BankType.islamic

getProvince('Lahore');                       // 'Punjab'
getDivisions('Sindh');                       // ['Hyderabad', 'Karachi', 'Larkana', ...]
getDivisionOfDistrict('Lahore');             // 'Lahore'
getTehsils('Rawalpindi');                    // tehsils of the district, sorted
getTehsilDistrict('Murree');                 // 'Rawalpindi'
parseAddress('House 12, Street 5, Model Town Lahore 54000').postalCode; // '54000'
getPostOffice('48330')?.office;              // 'Dulmial'
searchPostOffices('Dulmial').length;         // offices whose name or town matches
scoreAddress('12 Model Town Lahore').score;  // 60 (no street, postal code or landmark)
phoneRiskSignals('0300 0000000');            // [PhoneRiskFlag.repeatedDigits]

formatPKR(150000);                           // 'Rs. 150,000'
formatLakh(2500000);                         // '25 Lakh'
parseAmount('Rs. 1,50,000/-')?.value;        // 150000.0
formatAmountInput('1.5 lakh');               // 'Rs. 150,000'
amountInWords(125000, cheque: true);         // 'Rupees One Lakh Twenty-Five Thousand Only'
numberToWords(125000, language: WordsLanguage.ur); // 'ایک لاکھ پچیس ہزار'

formatHijri(DateTime(2026, 3, 3));           // '14 Ramadan 1447'
isPakistanHoliday(DateTime(2025, 8, 14));    // true
getPakistanHolidays(2026).first;             // Holiday{id: kashmir-day, ...}

final payload = createRaastP2PQr(
  iban: 'PK36SCBL0000001123456702',
  amount: 1500,
  expiresIn: '1d', // or const Duration(days: 1)
);
validateRaastQr(payload).valid;              // true

getSalesTaxRate(kind: SalesTaxKind.goods)?.rate; // 18 (today)
calculateSalesTax(1000, rate: 18)?.gross;    // 1180
splitInclusive(99.99, 18)?.net;              // 84.74
calculateSalaryTax(1800000, taxYear: 2026)?.tax; // 72000
calculateMonthlySalaryTax(150000, taxYear: 2026)?.monthly; // 6000
calculateSalaryTax(12000000, taxYear: 2026, includeSurcharge: true)?.total; // 3685290

slugify('Lahore Fort, 2024');                // 'lahore-fort-2024'
['ے', 'بھائی', 'آم', 'باغ', 'اب']..sort(compareUrdu); // ['اب', 'آم', 'باغ', 'بھائی', 'ے']
isRTL('123 سلام');                           // true
romanUrduKey('Mubeen') == romanUrduKey('Mobeen'); // true

parseElectricityRef('02-12624-0045901 R')?.formatted; // '02 12624 0045901 R'
parseElectricityRef('0400012345678')?.disco; // 'K-Electric'
validateGasConsumerNumber('12345678901', 'SNGPL'); // true

formatCNICInput('3520212');                  // '35202-12'
checkPhoneInput('0300 12');                  // InputState.incomplete
```

Each module can also be imported on its own, mirroring the npm entry points:

```dart
import 'package:pakdatakit/cnic.dart';
import 'package:pakdatakit/raast.dart';
```

Available: `address`, `bills`, `cnic`, `format`, `geo`, `hijri`, `holidays`, `iban`,
`incometax`, `input`, `networks`, `numbers`, `phone`, `postal`, `quality`, `raast`,
`salestax`, `tax`, `text`, `whatsapp` and `words`.

## API

Every function of the npm package is available under the same name
(`validateCNIC`, `createRaastP2PQr`, …). See the
[API reference](https://pakdatakit.dev/api/typescript/) for what each one does.
In Dart:

- **Options objects are named parameters**: `{ expiresIn: '1d' }` →
  `expiresIn: '1d'`, `{ language: 'ur' }` → `language: WordsLanguage.ur`.
- **Results are immutable classes** with `const` constructors, `==` /
  `hashCode`, `toString()` and `toJson()`, which gives the same JSON (keys and
  values) as the npm package.
- **Closed sets of strings are enums** (`InputState`, `NetworkName`,
  `NumberType`, `BankType`, `NTNType`, `HolidayId`, `RaastQrError`, …), each
  with a `.value` holding the npm string, e.g. `NumberType.tollFree.value ==
  'toll-free'`.
- **`null` where the npm package returns `null`**.
- **Divisions and tehsils** (`getDivisions`, `getDivisionOfDistrict`,
  `getTehsils`, `getTehsilDistrict`) use the 2023 census: each tehsil is
  recorded under the district it was in then, and districts created since the
  census have no division. `getDivisions` and `getTehsilDistrict` take the
  province as an optional positional argument.
- **Postal codes:** `getCityByPostalCode` and the other postal-code lookups
  only know the offices of cities pakdatakit lists (457 codes), so a village
  code returns `null`. `getPostOffice` and `searchPostOffices` cover every
  delivery office in Pakistan Post's directory (about 2,560) and return
  `PostOffice` values (`code`, `office`, `town`, `district`, `province`). The
  directory is only referenced by these two functions, so release builds that
  do not call them leave it out.
- `BankType` has the State Bank's groups, including `BankType.publicSector`
  (`'public-sector'`) for public sector commercial banks such as National Bank
  of Pakistan; `BankInfo.active` is `false` for banks that merged into another
  or have closed.
- **Delivery quality:** `scoreAddress` returns an `AddressScore` (`score`
  0-100, the `missing` `AddressPart`s in the order of `addressWeights`, and
  `parsed`, the `parseAddress` result plus any postal-code/province warning).
  `phoneRiskSignals` returns a list of `PhoneRiskFlag`s (`invalid`,
  `landline`, `notMobile`, `repeatedDigits`, `sequentialDigits`,
  `testNumber`; `.value` holds the npm string, e.g. `'repeated-digits'`), or
  `[]` for an unremarkable mobile number. Both are heuristics and never throw.
  `ADDRESS_WEIGHTS` is `addressWeights`, a `Map<AddressPart, int>`.
- **Landlines:** `validateLandline(phone, services: true)` also accepts UAN
  (`021-111-123-456`, `111-123-456`), toll-free (`0800-12345`) and premium
  rate (`0900-12345`) numbers; `analyzeNumber` tells them apart. Toll-free
  numbers are `0800` and five or six digits (`0800-005000`), as in PTA's
  numbering plans.
- **CNICs in free text:** `findCNICs(text)` returns a `CNICMatch` for each
  CNIC in a message or document (`raw`, `digits`, `formatted`, and `start`
  and `end`, UTF-16 offsets, so `text.substring(start, end) == raw`).
  `maskCNICs(text, mask: 'X')` returns a `MaskedText` (`text`, with each
  CNIC's digits masked and its separators kept, and `count`);
  `maskCNICs(text, replacement: '[CNIC removed]')` replaces each whole CNIC
  instead. A match is a run of exactly 13 digits starting with 1-8, together
  or in any grouping joined by single spaces, hyphens or dashes, dots or
  slashes (`352 0212 3456 71`, `35202/1234567/1`), or a CNIC in 5-7-1 groups
  inside a longer run (`0300-1234567 35202-1234567-1`), with ASCII, Urdu or
  Arabic-Indic digits, not touching another digit. A longer run is never cut
  into a CNIC otherwise. This catches CNICs as people type them, but any
  other 13 digits starting with 1-8 match too, however they are grouped;
  `validateCNIC` stays strict. They never throw.
- **Amount input:** `parseAmount(input)` reads a rupee amount as people type
  it (`'Rs. 1,50,000/-'`, `'2.25cr'`, `'1.5 lakh'`, `'۱۵۰۰۰۰'`, `'5k'`) and
  returns a `ParsedAmount` (`value`, a `double` in rupees rounded half up to
  the paisa; `raw`, the input without surrounding whitespace) or `null` for
  anything that is not exactly one non-negative amount up to Rs. 50 trillion
  (ranges, signs, two numbers, broken grouping, leftover letters).
  `formatAmountInput(input)` writes it back as `'Rs. 150,000'` (paisa only
  when there are any), or `null`. The arithmetic is exact (`BigInt`), and
  neither throws.
- **Sales tax:** `getSalesTaxRate(kind: SalesTaxKind.goods, province: …,
  date: …)` returns a `SalesTaxRate` (`kind`, `authority`, `province`,
  `rate`, `from`, `to`, `law`, `source`) or `null`;
  `calculateSalesTax(amount, rate: …, province: …, kind: …, date: …,
  inclusive: …)` and `splitInclusive(gross, rate)` return `SalesTaxAmounts`
  (`net`, `tax`, `gross`, `rate`, all `double`s) or `null`. The npm
  `SalesTaxRateQuery` and `SalesTaxOptions` objects are these named
  parameters; `date` is a `'YYYY-MM-DD'` string or a `DateTime` and defaults
  to today. Amounts are rounded half up to the paisa from the number as
  written (`1.005` is Rs 1.01), computed exactly with `BigInt` on every
  platform. They never throw.
- **Income tax on salary:** `calculateSalaryTax(annualIncome, taxYear: …,
  date: …, includeSurcharge: …)` and `calculateMonthlySalaryTax(monthlySalary,
  taxYear: …, date: …, includeSurcharge: …)` return a `SalaryTax` (`tax`,
  `surcharge`, `total`, `monthly`, `effectiveRate`, all `double`s; `slab`, a
  `SalaryTaxSlab` with `over`, `upTo`, `fixed` and `rate`; `taxYear`) or
  `null`, from the salaried rate table of the Income
  Tax Ordinance 2001 (First Schedule, Part I, Division I, clause (2)) for tax
  years 2020 to 2027. The npm `SalaryTaxOptions` object is these named
  parameters: `taxYear` (an `int`) takes precedence over `date` (a
  `'YYYY-MM-DD'` string or a `DateTime`), and with neither the current tax
  year is used. `getSalaryTaxSlabs([taxYear])` returns the `SalaryTaxYear`
  (`taxYear`, `from`, `to`, `law`, `source`, `slabs`, an unmodifiable list,
  and `surcharge`, a `SalaryTaxSurcharge` with `rate`, `over`, `law` and
  `source`, or `null` before tax year 2025),
  `getSalaryTaxYears()` the years covered and `getTaxYear([date])` the tax
  year (July to June, named after the June it ends in) of a date. Tax is
  rounded half up to the paisa, exactly with `BigInt` on every platform.
  `includeSurcharge: true` adds the section 4AB surcharge (10% of the tax in
  tax year 2025, 9% in 2026, once taxable income exceeds Rs 10 million);
  `total` is `tax + surcharge`, and `monthly` and `effectiveRate` are based on
  it. It is off by default in 2.x. Tax credits, exemptions, the pension rate,
  super tax and withholding adjustments are not applied. They never throw. Also as
  `package:pakdatakit/incometax.dart`.
- **Urdu text:** `slugify(input, script: SlugScript.any)` makes a URL slug,
  keeping Urdu letters as they are (`SlugScript.latin` keeps only `a-z`,
  `SlugScript.urdu` only Urdu letters; digits become `0-9`).
  `compareUrdu(a, b)` sorts in the CLDR Urdu alphabetical order (بھ, پھ, …
  are letters of their own), the same on every platform without ICU, and
  can be passed straight to `List.sort`. `isRTL(text)` is `true` when the
  first letter is from a right-to-left script, and `wrapBidi(text,
  [direction])` wraps text in Unicode directional isolates
  (`BidiDirection.auto`, the default, `rtl` or `ltr`). They never throw.
- **Roman Urdu names:** `romanUrduKey(text)` gives a phonetic key so that
  spellings of one name match (`Mubeen`/`Mobeen`,
  `Muhammad`/`Mohammad`/`Muhammed`, `Chaudhry`/`Chaudhary`): compare keys,
  not the text. Different names can share a key (`Hamid`, `Hamad`), so a match
  means "probably the same". Accents are removed (with the NFKD
  compatibility forms, such as full-width letters, built in) and anything
  other than Latin letters splits words. `normalizeRomanUrdu` is unchanged.
  It never throws.
- **Utility bills:** `parseElectricityRef(input)` returns an
  `ElectricityRef` (`type`, an `ElectricityRefType`: `reference`,
  `customerId` (`'customer-id'`) or `kElectric` (`'k-electric'`); `digits`;
  `formatted`, e.g. `'02 12624 0045901 R'`; `urbanRural`, `'U'`, `'R'` or
  `null`; `disco`, `'K-Electric'` or `null`) or `null`;
  `validateElectricityRef(input)` is `true` when it parses.
  `validateGasConsumerNumber(input, company)` takes the company as a string,
  `'SNGPL'` (11 digits) or `'SSGC'` (10 digits) in any case, e.g.
  `GasCompany.sngpl.value`; any other company gives `false`. Spaces, dashes,
  dots and Urdu digits are accepted. Only the format is checked. They never
  throw.
- **Couriers (experimental):** `mapCourierStatus` and `CourierStatus` may
  change in a minor release while more couriers' status lists are added (see
  [CONTRIBUTING.md](https://github.com/chmuzamil/pakdatakit/blob/main/CONTRIBUTING.md#courier-status-lists)).
  `mapCourierStatus(courier, raw)` maps a courier's own status
  (name, numeric ID or code) to a `CourierStatus` (`pending`, `booked`,
  `pickedUp`, `inTransit`, `outForDelivery`, `attempted`, `underReview`,
  `delivered`, `returning`, `returned`, `cancelled`; `.value` holds the npm
  string, e.g. `'out-for-delivery'`) or `null`. `courier` is a string such as
  `'PostEx'`, `'LCS'` or `Courier.mAndP.value` (any case); `raw` is a
  `String` or a non-negative whole number (`5` and `5.0` both match `'5'`).
  Only documented statuses are mapped (PostEx's merchant API guide and
  Leopards' "Returned to Shipper"), so TCS, M&P, Trax and BlueEx give `null`.
  `normalizeCityForCourier(input)` maps `'LHR'`, `'Khi'`, `'Pindi'`,
  `'Lyallpur'`, `'Karachi City'` or `'لاہور'` to the city list's name, or
  `null`. No API is called, and they never throw.
- **FBR Digital Invoicing:** the invoice is the JSON posted to FBR, a
  `Map<String, Object?>` with the spec's camelCase keys (`FbrInvoice`,
  `FbrInvoiceItem`, `FbrInvoiceInput` and `FbrInvoiceItemInput` are
  typedefs for it). `buildFbrInvoice(input)` works out each line's
  `salesTaxApplicable` when it is left out (`N%` of the value excluding tax,
  or of the retail price for Third Schedule goods, with `calculateSalesTax`;
  `Rs.N` per unit; 0 otherwise), fills FBR's defaults and returns an
  `FbrInvoiceBuild` (`invoice`, and `totals`, an `FbrInvoiceTotals` of
  `double`s for your records), or `null` if `input` is not a map with an
  `items` list of maps. `validateFbrInvoice(invoice, today: 'YYYY-MM-DD')`
  takes any value (e.g. from `jsonDecode`) and returns an
  `FbrInvoiceValidation` (`valid`, and `errors`, a list of `FbrInvoiceError`
  with FBR's `code` or `null`, the `field`, e.g. `'items[0].rate'`, and a
  `message`), in the order the npm package reports them; `today` (the npm
  `FbrInvoiceValidationOptions`) also rejects future dates (0043).
  `expectedSalesTax(item)` gives the tax FBR expects on a line, or `null`.
  `FbrInvoiceType` and `FbrRegistrationType` hold the allowed strings
  (`FbrInvoiceType.saleInvoice.value == 'Sale Invoice'`), and
  `fbrDiSpecVersion` is `FBR_DI_SPEC_VERSION` (`'1.12'`, PRAL's DI API
  specification). There is no HTTP client and no token handling; values only
  FBR's reference APIs can confirm (provinces, HS codes, units, rates, sale
  types, SROs) are checked for presence only. They never throw. Also as
  `package:pakdatakit/fbr_invoice.dart`.
- **An `ArgumentError` where the npm package throws a `RangeError`**, e.g.
  `formatPKR(double.nan)` or a Raast QR with an amount but no expiry.
- **Dates are local `DateTime`s**; only the calendar date (or, for Raast
  expiry, the local time) is used. `getHolidaysOn` and `isPakistanHoliday`
  take a `DateTime` or a `'YYYY-MM-DD'` string.
- Whole-number options are `int` (Hijri `offset`, `hijriOffset`, years);
  amounts are `num`.
- `validateRaastQr` returns a `RaastQrValidation` with `kind` (a
  `RaastQrKind`, or `null` when the text is not a Raast QR). A merchant QR
  with no IBAN is valid with the `RaastQrWarning.noIban` warning (it pays
  through the merchant's own scheme); a person-to-person QR with no IBAN is
  still the `RaastQrError.noIban` error.
- `ParsedRaastQr.isDynamic` and `createMerchantQr(isDynamic: …)` are called
  `dynamic` in the npm package (`dynamic` is a built-in Dart type); `toJson()` still
  uses `dynamic`.
- `createRaastP2PQr` takes an optional `now` (the time `expiresIn` counts
  from), and `expiresIn` also accepts a `Duration`.

`dataVersion` gives the date the datasets were last checked against their
sources; see [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md)
for where each dataset comes from.

## Same results as the npm package

The datasets in `lib/src/data/` are generated from the repository's shared
`data/*.json`, and the package is tested against the shared
[`test-vectors/`](https://github.com/chmuzamil/pakdatakit/tree/main/test-vectors),
produced by running the TypeScript library over 32,000 inputs. The tests pass
both on the Dart VM and compiled to JavaScript.

JavaScript behaviours that differ in Dart are reproduced exactly: whitespace
and `trim`, full Unicode case mapping (`ß` → `SS`), NFC normalization,
`Math.round`, number-to-string conversion, `toFixed`, `localeCompare`
ordering and stable sorting.

## Development

From `dart/`:

```sh
dart pub get
dart test
```

The files in `lib/src/data/` are generated; don't edit them by hand. From the
repository root:

```sh
node scripts/generate-dart-data.mjs
```

## License

MIT
