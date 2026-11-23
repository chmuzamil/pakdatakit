<p align="center">
  <a href="https://pakdatakit.dev/"><img src="./banner.png" alt="PakDataKit: Pakistani data for developers, the same answer in five languages. pakdatakit.dev" /></a>
</p>

<h1 align="center">🇵🇰 PakDataKit</h1>

<p align="center">
  <strong>Pakistani data utilities for TypeScript, Python, Dart/Flutter, .NET and PHP/Laravel, with React, Vue and Angular helpers</strong>
</p>

<p align="center">
  <a href="https://github.com/chmuzamil/pakdatakit/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/chmuzamil/pakdatakit/ci.yml?branch=main&label=CI" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/pakdatakit"><img src="https://img.shields.io/npm/v/pakdatakit?label=npm" alt="npm"></a>
  <a href="https://pypi.org/project/pakdatakit/"><img src="https://img.shields.io/pypi/v/pakdatakit?label=PyPI" alt="PyPI"></a>
  <a href="https://pub.dev/packages/pakdatakit"><img src="https://img.shields.io/pub/v/pakdatakit?label=pub.dev" alt="pub.dev pakdatakit"></a>
  <a href="https://pub.dev/packages/pakdatakit_flutter"><img src="https://img.shields.io/pub/v/pakdatakit_flutter?label=pakdatakit_flutter" alt="pub.dev pakdatakit_flutter"></a>
  <a href="https://www.nuget.org/packages/PakDataKit"><img src="https://img.shields.io/nuget/v/PakDataKit?label=NuGet" alt="NuGet"></a>
  <a href="https://packagist.org/packages/chmuzamil/pakdatakit"><img src="https://img.shields.io/packagist/v/chmuzamil/pakdatakit?label=Packagist" alt="Packagist"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/chmuzamil/pakdatakit" alt="license"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pakdatakit-react"><img src="https://img.shields.io/npm/v/pakdatakit-react?label=pakdatakit-react" alt="pakdatakit-react"></a>
  <a href="https://www.npmjs.com/package/pakdatakit-vue"><img src="https://img.shields.io/npm/v/pakdatakit-vue?label=pakdatakit-vue" alt="pakdatakit-vue"></a>
  <a href="https://www.npmjs.com/package/pakdatakit-angular"><img src="https://img.shields.io/npm/v/pakdatakit-angular?label=pakdatakit-angular" alt="pakdatakit-angular"></a>
  <a href="https://www.npmjs.com/package/pakdatakit-faker"><img src="https://img.shields.io/npm/v/pakdatakit-faker?label=pakdatakit-faker" alt="pakdatakit-faker"></a>
  <a href="https://www.npmjs.com/package/pakdatakit-pay"><img src="https://img.shields.io/npm/v/pakdatakit-pay?label=pakdatakit-pay" alt="pakdatakit-pay"></a>
  <a href="https://www.npmjs.com/package/pakdatakit"><img src="https://img.shields.io/npm/dm/pakdatakit?label=downloads" alt="npm downloads"></a>
  <a href="https://www.npmjs.com/package/pakdatakit#provenance"><img src="https://img.shields.io/badge/npm-provenance-2ea44f?logo=npm" alt="npm provenance"></a>
  <a href="https://pakdatakit.dev/api/typescript/"><img src="https://img.shields.io/badge/docs-API%20reference-blue" alt="API docs"></a>
</p>

PakDataKit validates, formats and looks up Pakistani data: CNICs, mobile and landline numbers, IBANs and banks, NTN/STRN, passports and vehicle plates, Raast QR codes, sales tax and salary income tax, FBR digital invoices, electricity and gas bill references, cities, districts, tehsils, postal codes and post offices, Urdu text, Hijri dates and public holidays.

- **Five languages, one behaviour.** The TypeScript library has ports for Python, Dart/Flutter, .NET and PHP/Laravel. All five run the same 32,388 shared test vectors, so they give the same answer for the same input.
- **UI helpers.** React, Vue and Angular inputs that format as you type, plus Flutter formatters and form fields.
- **Offline and dependency-free.** All data is bundled and no function makes a network call. The npm package has no runtime dependencies and ships ESM, CommonJS and types.
- **Sourced data.** Every dataset lists its official sources in [DATA.md](./DATA.md).

**[pakdatakit.dev](https://pakdatakit.dev/)** · **[Try it in the playground](https://pakdatakit.dev/playground/)** · **[API reference](https://pakdatakit.dev/api/typescript/)** · **[llms.txt](https://pakdatakit.dev/llms.txt)** / **[llms-full.txt](https://pakdatakit.dev/llms-full.txt)** for AI coding assistants

---

## 📦 Packages

| Package                                                                                                                                              | Registry  | Install                                          | Version                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`pakdatakit`](https://www.npmjs.com/package/pakdatakit)                                                                                             | npm       | `npm install pakdatakit`                         | [![npm](https://img.shields.io/npm/v/pakdatakit?label=)](https://www.npmjs.com/package/pakdatakit)                                        |
| [`pakdatakit`](https://pypi.org/project/pakdatakit/) ([Python](https://github.com/chmuzamil/pakdatakit/tree/main/python))                            | PyPI      | `pip install pakdatakit`                         | [![PyPI](https://img.shields.io/pypi/v/pakdatakit?label=)](https://pypi.org/project/pakdatakit/)                                          |
| [`pakdatakit`](https://pub.dev/packages/pakdatakit) ([Dart](https://github.com/chmuzamil/pakdatakit/tree/main/dart))                                 | pub.dev   | `dart pub add pakdatakit`                        | [![pub.dev](https://img.shields.io/pub/v/pakdatakit?label=)](https://pub.dev/packages/pakdatakit)                                         |
| [`pakdatakit_flutter`](https://pub.dev/packages/pakdatakit_flutter) ([Flutter](https://github.com/chmuzamil/pakdatakit/tree/main/flutter))           | pub.dev   | `flutter pub add pakdatakit_flutter`             | [![pub.dev](https://img.shields.io/pub/v/pakdatakit_flutter?label=)](https://pub.dev/packages/pakdatakit_flutter)                         |
| [`PakDataKit`](https://www.nuget.org/packages/PakDataKit) ([.NET](https://github.com/chmuzamil/pakdatakit/tree/main/dotnet))                         | NuGet     | `dotnet add package PakDataKit`                  | [![NuGet](https://img.shields.io/nuget/v/PakDataKit?label=)](https://www.nuget.org/packages/PakDataKit)                                   |
| [`PakDataKit.DataAnnotations`](https://www.nuget.org/packages/PakDataKit.DataAnnotations)                                                            | NuGet     | `dotnet add package PakDataKit.DataAnnotations`  | [![NuGet](https://img.shields.io/nuget/v/PakDataKit.DataAnnotations?label=)](https://www.nuget.org/packages/PakDataKit.DataAnnotations)   |
| [`PakDataKit.FluentValidation`](https://www.nuget.org/packages/PakDataKit.FluentValidation)                                                          | NuGet     | `dotnet add package PakDataKit.FluentValidation` | [![NuGet](https://img.shields.io/nuget/v/PakDataKit.FluentValidation?label=)](https://www.nuget.org/packages/PakDataKit.FluentValidation) |
| [`chmuzamil/pakdatakit`](https://packagist.org/packages/chmuzamil/pakdatakit) ([PHP/Laravel](https://github.com/chmuzamil/pakdatakit/tree/main/php)) | Packagist | `composer require chmuzamil/pakdatakit`          | [![Packagist](https://img.shields.io/packagist/v/chmuzamil/pakdatakit?label=)](https://packagist.org/packages/chmuzamil/pakdatakit)       |
| [`pakdatakit-react`](https://www.npmjs.com/package/pakdatakit-react) ([React](https://github.com/chmuzamil/pakdatakit/tree/main/react))              | npm       | `npm install pakdatakit-react`                   | [![npm](https://img.shields.io/npm/v/pakdatakit-react?label=)](https://www.npmjs.com/package/pakdatakit-react)                            |
| [`pakdatakit-vue`](https://www.npmjs.com/package/pakdatakit-vue) ([Vue](https://github.com/chmuzamil/pakdatakit/tree/main/vue))                      | npm       | `npm install pakdatakit-vue`                     | [![npm](https://img.shields.io/npm/v/pakdatakit-vue?label=)](https://www.npmjs.com/package/pakdatakit-vue)                                |
| [`pakdatakit-angular`](https://www.npmjs.com/package/pakdatakit-angular) ([Angular](https://github.com/chmuzamil/pakdatakit/tree/main/angular))      | npm       | `npm install pakdatakit-angular`                 | [![npm](https://img.shields.io/npm/v/pakdatakit-angular?label=)](https://www.npmjs.com/package/pakdatakit-angular)                        |
| [`pakdatakit-faker`](https://www.npmjs.com/package/pakdatakit-faker) ([mock data](https://github.com/chmuzamil/pakdatakit/tree/main/faker))          | npm       | `npm install -D pakdatakit-faker`                | [![npm](https://img.shields.io/npm/v/pakdatakit-faker?label=)](https://www.npmjs.com/package/pakdatakit-faker)                            |
| [`pakdatakit-pay`](https://www.npmjs.com/package/pakdatakit-pay) ([JazzCash hash](https://github.com/chmuzamil/pakdatakit/tree/main/pay))            | npm       | `npm install pakdatakit-pay`                     | [![npm](https://img.shields.io/npm/v/pakdatakit-pay?label=)](https://www.npmjs.com/package/pakdatakit-pay)                                |

---

## 🧩 Modules

Every module is in every port unless noted. In npm, each is also a subpath import (`pakdatakit/cnic`, `pakdatakit/salestax` and so on) to keep bundles small.

| Area                     | What it covers                                                                                                                                                                                                                           | npm modules                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Identity**             | CNIC validation with province and gender, passports, vehicle registration plates                                                                                                                                                         | `cnic`, `passport`, `vehicle`                                             |
| **Phone**                | Mobile numbers and their original network, landline, UAN, toll-free and premium numbers, WhatsApp links, phone risk signals for cash on delivery                                                                                         | `phone`, `networks`, `numbers`, `whatsapp`, `quality`                     |
| **Banking and payments** | IBAN checksum and bank lookup, Raast QR codes (create, parse, validate), electricity and gas bill references, PKR and lakh/crore formatting, amounts in words; JazzCash secure hash in `pakdatakit-pay`                                  | `iban`, `raast`, `bills`, `format`, `words`                               |
| **Tax and FBR**          | NTN and STRN, federal and provincial sales tax rates, salary income tax (tax years 2020 to 2027), FBR Digital Invoicing build and offline validation                                                                                     | `tax`, `salestax`, `incometax`, `fbr-invoice`                             |
| **Geography and postal** | Provinces, cities, districts, divisions and tehsils (2023 census), postal codes and about 2,560 post offices, address parsing and delivery-address scoring, courier status and city matching (experimental)                              | `geo`, `postal`, `address`, `quality`, `courier`                          |
| **Text and Urdu**        | Roman Urdu normalization, Urdu and English digits, Urdu-aware slugs, Urdu alphabetical order, right-to-left detection and bidi isolation                                                                                                 | `text`                                                                    |
| **Dates**                | Hijri dates, Ramadan, public holidays with observed moon-sighting dates                                                                                                                                                                  | `hijri`, `holidays`                                                       |
| **Forms**                | As-you-type formatting and checking; schemas for Zod, Valibot, Yup, Joi and Superstruct; class-validator decorators for NestJS; Laravel rules, DataAnnotations and FluentValidation in the ports; React, Vue, Angular and Flutter inputs | `input`, `zod`, `valibot`, `yup`, `joi`, `superstruct`, `class-validator` |

---

## 🚀 Quick start

**TypeScript / JavaScript** (Node 20+, browsers, Bun, Deno; `import` or `require`)

```ts
import { validateCNIC, getBankFromIBAN, calculateSalaryTax } from 'pakdatakit';

validateCNIC('35202-1234567-1'); // true
getBankFromIBAN('PK36SCBL0000001123456702'); // "Standard Chartered Bank (Pakistan) Limited"
calculateSalaryTax(5_000_000, { taxYear: 2027 })?.tax; // 802000
```

**Python** (3.9+)

```python
from pakdatakit import validate_cnic, get_bank_from_iban, calculate_salary_tax

validate_cnic("35202-1234567-1")  # True
get_bank_from_iban("PK36SCBL0000001123456702")  # "Standard Chartered Bank (Pakistan) Limited"
calculate_salary_tax(5_000_000, tax_year=2027).tax  # 802000
```

**Dart / Flutter**

```dart
import 'package:pakdatakit/pakdatakit.dart';

validateCNIC('35202-1234567-1'); // true
getBankFromIBAN('PK36SCBL0000001123456702'); // Standard Chartered Bank (Pakistan) Limited
calculateSalaryTax(5000000, taxYear: 2027)?.tax; // 802000

// pakdatakit_flutter
TextFormField(inputFormatters: [CnicInputFormatter()], validator: PakValidators.cnic());
```

**.NET** (8+)

```csharp
using PakDataKit;

Cnic.Validate("35202-1234567-1"); // true
Iban.GetBank("PK36SCBL0000001123456702"); // "Standard Chartered Bank (Pakistan) Limited"
IncomeTax.CalculateSalaryTax(5_000_000, new SalaryTaxOptions { TaxYear = 2027 })?.Tax; // 802000

// PakDataKit.DataAnnotations: [Cnic] public string Cnic { get; set; }
// PakDataKit.FluentValidation: RuleFor(x => x.Cnic).IsCnic();
```

**PHP / Laravel** (8.2+)

```php
use PakDataKit\Cnic;
use PakDataKit\Iban;
use PakDataKit\IncomeTax;

Cnic::validate('35202-1234567-1'); // true
Iban::getBank('PK36SCBL0000001123456702'); // "Standard Chartered Bank (Pakistan) Limited"
IncomeTax::calculateSalary(5000000, ['taxYear' => 2027])?->tax; // 802000

// Laravel: $request->validate(['cnic' => ['required', 'pk_cnic'], 'phone' => 'pk_phone']);
```

**React, Vue and Angular**

```tsx
// React
import { CNICInput } from 'pakdatakit-react';
<CNICInput onValueChange={(value, state, info) => {}} />;
```

```vue
<!-- Vue -->
<input v-model="cnic" v-pak-input:cnic />
```

```html
<!-- Angular: import PakCnicInputDirective; validate with PakValidators.cnic -->
<input pakCnicInput [formControl]="cnic" />
```

**CLI**

```bash
npx pakdatakit validate-cnic 35202-1234567-1
npx pakdatakit analyze-phone 03001234567
npx pakdatakit parse-address "House 12, Gulberg III, Lahore, Punjab 54660"
```

The CLI exits with 0 when the input is valid or found, 1 when it is not, and 2 for usage errors. Run `npx pakdatakit --help` for every command.

---

## Why PakDataKit?

Most Pakistani apps validate CNICs, mobile numbers and IBANs with a regex copied from somewhere. A regex checks the shape. PakDataKit checks what the shape can't show:

| Task                  | Typical regex                | PakDataKit                                                                                                          |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| CNIC                  | 13 digits, maybe with dashes | Province code, province and gender decoding, Urdu digits                                                            |
| Mobile number         | `03` + 9 digits              | Allocated `03XX` prefixes only, `+92` / `0092` / `0` forms, original network                                        |
| IBAN                  | `PK` + 22 characters         | Mod-97 checksum, bank name and type from the bank code                                                              |
| NTN / STRN            | Digit count                  | CNIC-based and business NTNs, display formats                                                                       |
| Sales tax, income tax | Hard-coded rates             | Rates by authority and date with their legal source; exact amounts in whole paisa                                   |
| FBR invoices          | Found out at submission      | Offline validation with FBR's own error codes                                                                       |
| Raast QR              | Not possible                 | Create, parse and check payment QR codes (CRC, IBAN, amount, expiry)                                                |
| Holidays, Hijri       | Not possible                 | Observed Eid/Ashura/Milad dates from official notifications, Hijri conversion                                       |
| Forms                 | Write each rule per library  | Ready rules for Zod, Valibot, Yup, Joi, Superstruct, class-validator, Laravel, DataAnnotations and FluentValidation |

---

# API Reference

## CNIC

### validateCNIC()

Validates Pakistani CNIC numbers.

```ts
validateCNIC(cnic: string): boolean
```

Examples:

```ts
validateCNIC('3520212345671');
// true

validateCNIC('35202-1234567-1');
// true

validateCNIC('35202-123456-1');
// false
```

Supports:

- Plain format
- Dashed format (hyphens or en-dashes)
- Space- or dot-separated format
- Urdu digits

Separators must sit between the 5-7-1 digit groups, and the first digit must be a province code (1–8). NADRA does not publish a check-digit algorithm, so this checks structure only.

### getCNICInfo()

Reads the province of registration and gender encoded in a CNIC.

```ts
getCNICInfo(cnic: string): CNICInfo | null
```

```ts
getCNICInfo('35202-1234567-1');
// { digits: "3520212345671", formatted: "35202-1234567-1", province: "Punjab", gender: "male" }

getCNICInfo('invalid');
// null
```

The first digit is the province where the CNIC was first registered, which is not necessarily where the holder lives now. The last digit is odd for male and even for female.

### findCNICs() / maskCNICs()

Finds or masks CNICs in free text, such as a chat message or a note, for example before logging it.

```ts
findCNICs('CNIC: 35202-1234567-1, phone 0300-1234567');
// [{ raw: '35202-1234567-1', digits: '3520212345671',
//    formatted: '35202-1234567-1', start: 6, end: 21 }]

maskCNICs('My CNIC is 35202 1234567-1');
// { text: 'My CNIC is XXXXX XXXXXXX-X', count: 1 }
maskCNICs(text, { mask: '*' });
maskCNICs('CNIC 352 0212 3456 71', { replacement: '[CNIC removed]' });
// { text: 'CNIC [CNIC removed]', count: 1 }
```

Digits are read in groups; groups may be joined by any run of spaces or tabs, or by one mark (hyphen or dash, dot, slash, underscore) with spaces around it, but never by a line break. A match is consecutive whole groups adding up to exactly 13 digits and starting with a province code (1-8): `35202  1234567  1`, `35202 -1234567- 1`, `35202_1234567_1`, `35202 - 1234567 - 1`, `352 0212 3456 71`, and the CNIC in `0300-1234567 35202-1234567-1`. A group is never split. It is a pattern match, and a loose one: any 13 digits starting with 1-8 grouped this way also match (order numbers, table columns, price lists, file names). `validateCNIC` stays strict. Offsets are UTF-16 code units in TypeScript, Dart and C#, and code points in Python and PHP.

---

## Phone Utilities

### validatePhone()

Validates Pakistani mobile numbers. Accepts `03…`, `+92…`, `0092…`, `+92 (0) 3…` and short `3…` forms with spaces, dashes, dots or Urdu digits. The `03XX` prefix must belong to a mobile operator.

```ts
validatePhone(phone: string): boolean
```

Examples:

```ts
validatePhone('03001234567');
// true

validatePhone('+923001234567');
// true

validatePhone('3001234567');
// true
```

---

### formatPhone()

Converts valid Pakistani mobile numbers to E.164 format.

```ts
formatPhone(phone: string): string | null
```

Examples:

```ts
formatPhone('03001234567');
// "+923001234567"

formatPhone('+92 300-123-4567');
// "+923001234567"

formatPhone('03601234567');
// null (unallocated prefix)
```

---

### analyzePhone()

Runs validation, formatting, and network detection in one call.

```ts
analyzePhone(phone: string): PhoneAnalysis
```

Returns:

```ts
{
  valid: boolean;
  formatted: string | null;
  network: 'Jazz' | 'Zong' | 'Telenor' | 'Ufone' | 'SCO' | 'Unknown';
}
```

Examples:

```ts
analyzePhone('03001234567');
// { valid: true, formatted: "+923001234567", network: "Jazz" }

analyzePhone('invalid');
// { valid: false, formatted: null, network: "Unknown" }
```

---

## WhatsApp Utilities

### createWhatsAppLink()

Generates a WhatsApp click-to-chat link for Pakistani mobile numbers.

```ts
createWhatsAppLink(phone: string, message?: string): string | null
```

Examples:

```ts
createWhatsAppLink('03001234567');
// "https://wa.me/923001234567"

createWhatsAppLink('03001234567', 'Assalamualaikum');
// "https://wa.me/923001234567?text=Assalamualaikum"
```

Returns `null` for invalid phone numbers.

---

## IBAN Utilities

### validateIBAN()

Validates Pakistani IBANs using format and ISO 13616 mod-97 checksum.

```ts
validateIBAN(iban: string): boolean
```

Examples:

```ts
validateIBAN('PK36SCBL0000001123456702');
// true

validateIBAN('PK37SCBL0000001123456702');
// false
```

---

### getBankFromIBAN()

Returns the bank name from a valid Pakistani IBAN's 4-letter bank code.

```ts
getBankFromIBAN(iban: string): string | null
```

Examples:

```ts
getBankFromIBAN('PK36SCBL0000001123456702');
// "Standard Chartered Bank (Pakistan) Limited"

getBankFromIBAN('invalid');
// null
```

Supported bank codes include HABB, MEZN, SCBL, UNIL, BAHL, NBPA, MUCB, JSBL, SADA (SadaPay), NAYA (NayaPay), RQMI (Raqami), MSHQ (Mashreq), and 50 total entries in the dataset, checked against real IBANs (see [DATA.md](./DATA.md)). Merged or renamed banks are labelled with their current name, e.g. `SAUD` → "Silkbank Limited (merged into United Bank Limited)".

---

## Postal Code Utilities

### getCityByPostalCode()

Returns the city for a Pakistani postal code. Only codes of post offices in a city on pakdatakit's city list return a city; codes of offices in other towns and villages return `null` (use `getPostOffice()` for those).

```ts
getCityByPostalCode(postalCode: string): string | null
```

Examples:

```ts
getCityByPostalCode('60000');
// "Multan"

getCityByPostalCode('54660');
// "Lahore"

getCityByPostalCode('48330');
// null (a village post office; see getPostOffice)

getCityByPostalCode('99999');
// null
```

---

### getPostalCode()

Returns the primary postal code for a Pakistani city (case-insensitive).

```ts
getPostalCode(city: string): string | null
```

Examples:

```ts
getPostalCode('Multan');
// "60000"

getPostalCode('karachi');
// "74200"
```

---

### getPostOffice() / searchPostOffices()

Every delivery post office in Pakistan Post's directory (about 2,560), including those in towns and villages.

```ts
getPostOffice(code: string): PostOffice | null
searchPostOffices(query: string): PostOffice[] // by office name, town or code prefix
```

```ts
getPostOffice('48330');
// { code: "48330", office: "Dulmial", town: "Dulmial", district: null, province: "Punjab" }

getPostOffice('54660');
// { code: "54660", office: "Lahore Gulberg Colony", town: "Lahore", district: "Lahore", province: "Punjab" }

searchPostOffices('dulmial');
// [{ code: "48330", office: "Dulmial", ... }]
```

`town` is the city the office belongs to when that is known, and otherwise the office's own name, which is usually its town or village. `district` is only given for offices in a district's headquarters town; the directory has no district column. The directory is a separate data file (about 32 kB gzipped), so it is only bundled when you call these functions.

---

## Mobile Networks

### getNetwork()

Detects network using the original mobile prefix.

```ts
getNetwork(phone: string): NetworkName
```

Returns:

- Jazz
- Zong
- Ufone
- Telenor
- SCO (0355, AJK and Gilgit-Baltistan)
- Unknown

Examples:

```ts
getNetwork('03001234567');
// Jazz

getNetwork('03151234567');
// Zong

getNetwork('03331234567');
// Ufone

getNetwork('03451234567');
// Telenor
```

> Note: This is the operator the prefix was originally allocated to. With Mobile Number Portability (MNP), and Telenor Pakistan's 2026 merger into PTML (Ufone), the current carrier may differ.

---

## Landline, UAN & Service Numbers

### analyzeNumber() / getNumberType() / validateLandline() / getAreaCode()

Identifies any Pakistani number: mobile, landline, UAN (`111`), toll-free (`0800`) or premium-rate (`0900`). `0122` numbers are not recognised: they are seen in use but no PTA document lists them. Service numbers follow PTA's numbering plan: a UAN is an area code, `111` and six digits (`111-123-456` without the area code also works); toll-free is `0800` and five or six digits (PTA's 2021 plan and its 2008 numbering plan); premium is `0900` and five digits. Landline patterns come from Google's libphonenumber, with area codes from PTA's plan.

```ts
analyzeNumber('021-111-825-888');
// { type: 'uan', formatted: '021-111-825-888', e164: '+9221111825888', areaCode: '021', cities: ['Karachi'] }

analyzeNumber('042 35761234');
// { type: 'landline', formatted: '042-35761234', e164: '+924235761234', areaCode: '042', cities: ['Lahore'] }

getNumberType('0800-12345'); // 'toll-free'
validateLandline('051-9260138'); // true
validateLandline('021-111-123-456'); // false: a UAN
validateLandline('021-111-123-456', { services: true }); // true: UAN, toll-free or premium
getAreaCode('Mardan'); // '0937'
```

---

## Geography

### getProvince()

Returns province for a city.

```ts
getProvince(city: string): string | null
```

Examples:

```ts
getProvince('Multan');
// Punjab

getProvince('Karachi');
// Sindh

getProvince('Unknown');
// null
```

---

### searchCities()

Case-insensitive city search.

```ts
searchCities(query: string): string[]
```

Examples:

```ts
searchCities('mul');
// ["Multan"]

searchCities('kar');
// ["Karachi"]
```

---

### getDistrictProvince() / searchDistricts()

District-level geography lookup across 177 districts, including the 2026 Balochistan and Khyber Pakhtunkhwa changes. Former names such as Quetta and South Waziristan still resolve.

```ts
getDistrictProvince('Lahore'); // "Punjab"
searchDistricts('karachi'); // ["Karachi Central", "Karachi East", ...]
```

---

### getDivisions() / getDivisionOfDistrict()

The 30 administrative divisions of the 2023 census (Punjab 9, Sindh 6, Khyber Pakhtunkhwa 7, Balochistan 8).

```ts
getDivisions('Sindh');
// ["Hyderabad", "Karachi", "Larkana", "Mirpur Khas", "Shaheed Benazirabad", "Sukkur"]

getDivisionOfDistrict('Attock'); // "Rawalpindi"
getDivisionOfDistrict('Quetta East'); // null (created after the census)
```

---

### getTehsils() / getTehsilDistrict()

The 591 tehsils, talukas and sub-divisions of the 2023 census.

```ts
getTehsils('Toba Tek Singh');
// ["Gojra", "Kamalia", "Pirmahal", "Toba Tek Singh"]

getTehsilDistrict('Gojra'); // "Toba Tek Singh"
getTehsilDistrict('Khanpur'); // null (three districts have a Khanpur)
getTehsilDistrict('Khanpur', 'Sindh'); // "Shikarpur"
```

**Census districts.** Every tehsil is recorded under the district it was in at the 2023 census, which had 136 districts. Districts created or split since then (Murree, Talagang, Quetta East and West, and others) are handled like this:

- `getTehsils('Rawalpindi')` still lists Murree, as the census did.
- `getTehsils('Murree')` lists only the tehsils an official source places in the new district (Kotli Sattian and Murree). Where no official list could be found, as for `Quetta East`, it is empty.
- `getTehsilDistrict()` and `getDivisionOfDistrict()` answer with census names: `Quetta`, not Quetta East or Quetta West.

Azad Jammu and Kashmir and Gilgit-Baltistan are not in the census tables, so they have no divisions or tehsils here. See [DATA.md](./DATA.md).

---

## Address Utilities

### parseAddress()

Parses free-form Pakistani addresses into structured components.

```ts
parseAddress('House 12, Gulberg III, Lahore, Punjab 54660');
// { street: "House 12", area: "Gulberg III", city: "Lahore", province: "Punjab", postalCode: "54660", warnings: [], ... }

parseAddress('12 Model Town Lahore');
// { street: "12 Model Town", city: "Lahore", province: "Punjab", ... }

parseAddress('House 1, Lahore, Sindh').warnings;
// ["Lahore is in Punjab, but the address says Sindh"]
```

House, plot, street and PO box numbers are not mistaken for postal codes.

### formatAddress()

Formats structured components back into a mailing address string. Only the components you pass are included.

---

## Cash on Delivery Checks

`import { scoreAddress, phoneRiskSignals } from 'pakdatakit/quality'`

Heuristics for spotting an order a rider will struggle to deliver. They look only at the text you pass: no lists of real people or numbers, no network calls, and they never throw.

### scoreAddress()

Scores a delivery address from 0 to 100 and lists what is missing. Built on `parseAddress` and the Pakistan Post directory: a postal code that is a known post office scores higher than an unknown one, and one in a different province from the city lowers the score.

```ts
scoreAddress(
  'House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660',
);
// { score: 100, missing: [], parsed: { city: "Lahore", postalCode: "54660", ... } }

scoreAddress('Lahore').missing;
// ["houseNumber", "street", "area", "postalCode", "landmark"]
```

| Part          | Points | Found when                                                                                        |
| ------------- | -----: | ------------------------------------------------------------------------------------------------- |
| `city`        |     30 | `parseAddress` finds a city                                                                       |
| `houseNumber` |     20 | a number other than the postal code ("House 12", "12b", "Flat 2")                                 |
| `street`      |     15 | street, road, lane, gali, chowk, bazaar, mohalla, گلی, محلہ …                                     |
| `area`        |     10 | an area segment, or block, sector, phase, town, colony, society, بلاک, سیکٹر …                    |
| `postalCode`  |     15 | a known post office code (an unknown 5-digit code scores 5)                                       |
| `landmark`    |     10 | near, opp, behind, next to; nazd, nazdeek, qareeb, samne, peechay, bilmuqabil; نزد، قریب، سامنے … |

The weights are exported as `ADDRESS_WEIGHTS`. Importing `scoreAddress` adds about 44 kB gzipped (the post office directory); `phoneRiskSignals` alone is about 3 kB.

### phoneRiskSignals()

Returns the reasons to double-check a phone number given for a delivery, or `[]`.

```ts
phoneRiskSignals('0301-2945716'); // []
phoneRiskSignals('03001234567'); // ["sequential-digits", "test-number"]
phoneRiskSignals('03000000000'); // ["repeated-digits"]
phoneRiskSignals('042 35761234'); // ["landline"]
phoneRiskSignals('12345'); // ["invalid"]
```

Flags: `invalid`, `landline`, `not-mobile` (UAN, toll-free and other service numbers), `repeated-digits` (the 7-digit subscriber part uses at most two digits), `sequential-digits` (`1234567`, `7654321` …) and `test-number` (`03XX-1234567`, `03XX-7654321`, `0312-3456789`). The form adapters have a matching `pk.codPhone()` rule that passes only when there are no flags.

---

## Text Utilities

### normalizeRomanUrdu()

Normalizes informal Roman Urdu spellings (`ap kia ker` → `aap kya kar`).

### romanUrduKey()

A phonetic key so that different Roman Urdu spellings of a name match. Compare keys, not text.

```ts
romanUrduKey('Mubeen') === romanUrduKey('Mobeen'); // true
romanUrduKey('Muhammad Rehman'); // 'muhmd rahmn', the same as 'Mohammad Rahman'
romanUrduKey('Hussain') === romanUrduKey('Hassan'); // false
```

On 277 spellings of 118 common Pakistani names, 96.8% of same-name pairs share a key and 0.021% of different-name pairs do. Treat a match as "probably the same", not proof.

### toUrduDigits() / toEnglishDigits()

Convert between English, Urdu, and Arabic-Indic digits.

### slugify()

Turns text into a URL slug. Urdu letters are kept as they are: Urdu does not write short vowels, so there is no single Roman spelling to transliterate to. Diacritics and zero-width characters are dropped, Urdu digits become `0-9`, and `script` limits which letters are kept (`any`, the default; `latin`; `urdu`).

```ts
slugify('Lahore Fort, 2024'); // "lahore-fort-2024"
slugify('لاہور قلعہ'); // "لاہور-قلعہ"
slugify('لاہور Fort', { script: 'latin' }); // "fort"
slugify('کراچی ۲۰۲۴', { script: 'urdu' }); // "کراچی-2024"
```

### compareUrdu()

Sorts Urdu in alphabetical order, following the Unicode CLDR collation for Urdu (CLDR 49): ا آ ب بھ پ پھ ت تھ ٹ … ی یھ ے. A letter joined with ھ (بھ, پھ, کھ …) is a letter of its own, so بھائی comes after every other ب word. The same order is used in every port, without depending on the platform's ICU.

```ts
['ے', 'بھائی', 'آم', 'باغ', 'اب'].sort(compareUrdu);
// ["اب", "آم", "باغ", "بھائی", "ے"]
```

Digits come before letters (one digit at a time, so `10` before `2`), and other scripts after. The Arabic look-alikes ك ي ه are not Urdu letters in CLDR and sort after ے; write ک ی ہ to sort them as Urdu.

### isRTL() / wrapBidi()

`isRTL` is `true` when the first letter is from a right-to-left script. `wrapBidi` wraps text in Unicode directional isolates (FSI … PDI, or RLI/LRI with `'rtl'`/`'ltr'`), so an English order number or name does not jumble an Urdu sentence.

```ts
isRTL('123 سلام'); // true
isRTL('Order نمبر'); // false
`آرڈر ${wrapBidi('PDK-1042')} بھیج دیا گیا`;
```

---

## Income Tax on Salary

`import { calculateSalaryTax } from 'pakdatakit/incometax'`

Income tax on a salaried individual's taxable income, from the salaried rate table in the Income Tax Ordinance 2001 (First Schedule, Part I, Division I, clause (2), which applies when salary is more than 75% of taxable income). Tax years 2020 to 2027 are covered; a tax year runs from 1 July to 30 June and is named after the June it ends in.

```ts
calculateSalaryTax(1_800_000, { taxYear: 2026 });
// { tax: 72000, surcharge: 0, total: 72000, monthly: 6000, effectiveRate: 4,
//   slab: { over: 1200000, upTo: 2200000, fixed: 6000, rate: 11 }, taxYear: 2026 }

// With the section 4AB surcharge (above Rs 10 million):
calculateSalaryTax(12_000_000, { taxYear: 2026, includeSurcharge: true });
// { tax: 3381000, surcharge: 304290, total: 3685290, monthly: 307107.5, … }

calculateMonthlySalaryTax(150_000, { taxYear: 2026 })?.monthly; // 6000
getSalaryTaxSlabs(2027); // the table, its law and FBR source
getTaxYear('2025-07-01'); // 2026
```

Without `taxYear` or `date`, the current tax year is used, and a year that is not covered returns `null`. Tax is rounded half up to the paisa. With `includeSurcharge: true` the section 4AB surcharge is added: a percentage of the whole tax once taxable income exceeds Rs 10 million (10% in tax year 2025, 9% for salaried individuals in 2026, none in 2027 or before 2025). It is off by default in 2.x so that existing results don't change, and will be on by default in 3.0. Tax credits, exemptions, the separate rate for pensions, super tax and withholding adjustments are not applied. Sources and the full table are in [DATA.md](DATA.md#income-tax-on-salary-income-tax-slabsjson).

---

## Hijri Calendar

### toHijri() / formatHijri() / isRamadan()

```ts
formatHijri(new Date(2025, 5, 7)); // "10 Dhu al-Hijjah 1446"
isRamadan(new Date()); // true | false

// Shift by whole days to match local moon sighting
formatHijri(new Date(2025, 5, 7), { offset: -1 }); // "9 Dhu al-Hijjah 1446"
```

Uses the tabular ("islamic-civil") calendar. Dates announced in Pakistan follow moon sighting and can differ by a day; use `offset` to adjust. Invalid dates throw a `RangeError`.

---

## Currency Formatting

### formatPKR()

Formats PKR amounts with separators, rounded to whole rupees. Negative amounts keep their sign; `NaN` and `Infinity` throw a `RangeError`.

```ts
formatPKR(amount: number): string
```

Examples:

```ts
formatPKR(150000);
// "Rs. 150,000"

formatPKR(0);
// "Rs. 0"

formatPKR(-1500);
// "-Rs. 1,500"
```

---

### formatLakh()

Formats values using Pakistan's Lakh / Crore numbering system.

```ts
formatLakh(amount: number): string
```

Examples:

```ts
formatLakh(2500000);
// "25 Lakh"

formatLakh(10000000);
// "1 Crore"

formatLakh(50000);
// "Rs. 50,000"
```

### parseAmount() / formatAmountInput()

Reads a rupee amount the way people type it in Pakistan, rounded half-up to
the paisa. Returns `null` for anything that is not exactly one non-negative
amount; it never throws.

```ts
parseAmount(input: string): { value: number; raw: string } | null
formatAmountInput(input: string): string | null
```

```ts
parseAmount('Rs. 1,50,000/-'); // { value: 150000, raw: 'Rs. 1,50,000/-' }
parseAmount('2.25cr'); // { value: 22500000, raw: '2.25cr' }
parseAmount('۱٫۵ لاکھ'); // { value: 150000, ... }
parseAmount('1.005'); // { value: 1.01, ... }: exact, on the digits
parseAmount('5-10k'); // null: a range
formatAmountInput('1.5 lakh'); // "Rs. 150,000"
```

Accepted: `150,000` and `1,50,000` grouping with decimals; Urdu and
Arabic-Indic digits; `Rs`, `Rs.`, `PKR` or `₨` before or after the number and
a trailing `/-`; `k`, `thousand(s)`, `hazar`, `ہزار`, `lakh(s)`, `lac(s)`,
`لاکھ`, `crore(s)`, `cr` and `کروڑ`, also with decimals (`1.5 lakh`);
whitespace around and between the parts. Rejected: negatives, ranges, more
than one number, leftover letters, broken or ambiguous grouping (`1,50`,
`1.500,00`) and amounts over Rs. 50 trillion. Every form is listed on
[pakdatakit.dev/docs/amount](https://pakdatakit.dev/docs/amount/).

---

## Amounts in Words

### amountInWords() / numberToWords()

Writes numbers and rupee amounts in words using the Pakistani scale (hundred, thousand, lakh, crore, arab, kharab), in English or Urdu. Useful for cheques, invoices and receipts.

```ts
amountInWords(amount: number, options?: { language?: "en" | "ur"; cheque?: boolean }): string
numberToWords(n: number, options?: { language?: "en" | "ur" }): string
```

```ts
amountInWords(125000.5);
// "one lakh twenty-five thousand rupees and fifty paisa"

amountInWords(125000, { cheque: true });
// "Rupees One Lakh Twenty-Five Thousand Only"

amountInWords(125000, { language: 'ur' });
// "ایک لاکھ پچیس ہزار روپے"

amountInWords(500.5, { language: 'ur', cheque: true });
// "پانچ سو روپے اور پچاس پیسے صرف"

numberToWords(12_34_56_789);
// "twelve crore thirty-four lakh fifty-six thousand seven hundred eighty-nine"
```

Amounts are rounded to the nearest paisa. Negative or non-finite amounts throw a `RangeError`.

---

## Tax Numbers

### analyzeNTN() / validateNTN() / validateSTRN()

Validates FBR tax numbers. Individuals use their CNIC as their NTN; companies and AOPs have a 7-digit NTN, often written with a check digit as `1234567-8`. STRNs are 13 digits.

```ts
analyzeNTN('0622438-9');
// { type: 'business', digits: '06224389', formatted: '0622438-9' }

analyzeNTN('3520212345671');
// { type: 'individual', digits: '3520212345671', formatted: '35202-1234567-1' }

validateSTRN('17-00-3761-882-19'); // true
```

FBR does not publish its check-digit algorithms, so these check the format only.

---

## Sales Tax

`import { getSalesTaxRate, calculateSalesTax, splitInclusive } from 'pakdatakit/salestax'`

Standard sales tax rates with the dates they applied, from 1 July 2019: federal sales tax on goods (FBR), and sales tax on services in Punjab (PRA), Sindh (SRB), Khyber Pakhtunkhwa (KPRA), Balochistan (BRA) and Islamabad Capital Territory (FBR). Each rate carries the law and the official document it comes from ([DATA.md](DATA.md#sales-tax-rates-sales-tax-ratesjson)). Reduced, higher and sector rates are not included.

### getSalesTaxRate()

```ts
getSalesTaxRate({ kind: 'goods', date: '2026-11-18' });
// { kind: "goods", authority: "FBR", province: null, rate: 18, from: "2023-02-23", to: null, law: "Sales Tax Act 1990, s. 3(1), …", source: "https://download1.fbr.gov.pk/…" }

getSalesTaxRate({ kind: 'services', province: 'Sindh', date: '2024-06-30' })
  ?.rate; // 13
getSalesTaxRate({ kind: 'services', province: 'ICT' })?.rate; // 15 (today)
```

`province` accepts the province names and `KP`, `KPK`, `ICT` and `Islamabad`. It returns `null` for a date before 1 July 2019, an invalid date, an unknown province, services without a province, or goods in Azad Jammu and Kashmir or Gilgit-Baltistan.

### calculateSalesTax() / splitInclusive()

```ts
calculateSalesTax(1000, { rate: 18 });
// { net: 1000, tax: 180, gross: 1180, rate: 18 }

calculateSalesTax(1000, { province: 'Punjab' });
// { net: 1000, tax: 160, gross: 1160, rate: 16 }

calculateSalesTax(1150, { province: 'Sindh', inclusive: true });
// { net: 1000, tax: 150, gross: 1150, rate: 15 }

splitInclusive(99.99, 18);
// { net: 84.74, tax: 15.25, gross: 99.99, rate: 18 }
```

Amounts are rounded half up to the paisa, reading the number as written (`1.005` is Rs 1.01). For an inclusive amount the value is rounded and the tax is the rest, so `net + tax` always equals `gross`. Amounts from 0 to one trillion rupees and rates from 0 to 100 with at most two decimals are accepted; anything else returns `null`, never an exception.

---

## Utility Bills

`import { parseElectricityRef, validateElectricityRef, validateGasConsumerNumber } from 'pakdatakit/bills'`

### parseElectricityRef() / validateElectricityRef()

Reads the identifiers printed on electricity bills, in the formats the utilities' own bill pages ask for:

| `type`        | Format                                                     | Example              |
| ------------- | ---------------------------------------------------------- | -------------------- |
| `reference`   | DISCO (WAPDA) reference number: 14 digits, optional U or R | `02 12624 0045901 R` |
| `customer-id` | DISCO customer ID: 10 digits (11 for LESCO)                | `1234567890`         |
| `k-electric`  | K-Electric account number: 13 digits starting `04000`      | `0400012345678`      |

```ts
parseElectricityRef('02-12624-0045901 R');
// { type: "reference", digits: "02126240045901", formatted: "02 12624 0045901 R", urbanRural: "R", disco: null }

parseElectricityRef('0400012345678');
// { type: "k-electric", digits: "0400012345678", formatted: "0400012345678", urbanRural: null, disco: "K-Electric" }

validateElectricityRef('12345'); // false
```

Spaces, dashes and dots are ignored, and Urdu digits are accepted. `disco` is `null` for DISCO bills: no official source maps reference or customer ID digits to a distribution company, so the library does not guess. No utility publishes a check digit, so only the format is checked; a well-formed number may still not exist.

### validateGasConsumerNumber()

```ts
validateGasConsumerNumber('12345678901', 'SNGPL'); // true (11 digits)
validateGasConsumerNumber('1234567890', 'SSGC'); // true (10 digits)
```

Sources are in [DATA.md](DATA.md#electricity-and-gas-bill-numbers).

---

## Couriers

`import { mapCourierStatus, normalizeCityForCourier } from 'pakdatakit/courier'`

Helpers for orders shipped with Pakistani couriers. There are no API clients: nothing is sent anywhere.

### mapCourierStatus()

> **Experimental.** `mapCourierStatus` and the `CourierStatus` values may change in a minor release while more couriers' status lists are added. Pin a minor version if you store these values. To add a courier, see [CONTRIBUTING.md](CONTRIBUTING.md#courier-status-lists).

Maps a courier's own status (name, numeric ID or code) to one vocabulary: `pending`, `booked`, `picked-up`, `in-transit`, `out-for-delivery`, `attempted`, `under-review`, `delivered`, `returning`, `returned` or `cancelled`.

```ts
mapCourierStatus('PostEx', 'Out For Delivery'); // "out-for-delivery"
mapCourierStatus('PostEx', 5); // "delivered"
mapCourierStatus('PostEx', 'Attempt Made: Customer not available'); // "attempted"
mapCourierStatus('Leopards', 'Returned to Shipper'); // "returned"
mapCourierStatus('TCS', 'Delivered'); // null
```

Only statuses a courier documents publicly are mapped: every order status and tracking code in PostEx's merchant API guide (v4.1.9), and Leopards' "Returned to Shipper". TCS, M&P, Trax and BlueEx publish no status list outside their merchant portals, so they return `null` for now, as does any status not in the list. No courier documents its tracking number format, so there is no tracking-number detection. Details are in [DATA.md](DATA.md#couriers).

### normalizeCityForCourier()

Maps how a customer or a courier writes a city to its name in the city list, so orders can be matched against a courier's service list.

```ts
normalizeCityForCourier('LHR'); // "Lahore"
normalizeCityForCourier('Khi'); // "Karachi"
normalizeCityForCourier('Pindi'); // "Rawalpindi"
normalizeCityForCourier('lyallpur'); // "Faisalabad"
normalizeCityForCourier('Karachi City'); // "Karachi"
normalizeCityForCourier('لاہور'); // "Lahore"
normalizeCityForCourier('Atlantis'); // null
```

---

## FBR Digital Invoicing

`import { buildFbrInvoice, validateFbrInvoice } from 'pakdatakit/fbr-invoice'`

Types, a builder and an offline validator for the invoice JSON that FBR's Digital Invoicing API accepts (`postinvoicedata` and `validateinvoicedata`), following PRAL's "Technical Specification for DI API" version 1.12 (`FBR_DI_SPEC_VERSION`) and PRAL's Error Message Guide. There is no HTTP client and no token handling: send the invoice with your own code.

### buildFbrInvoice()

Works out each line's `salesTaxApplicable` when you leave it out (with `calculateSalesTax`), fills FBR's defaults and adds up the columns.

```ts
const { invoice, totals } = buildFbrInvoice({
  invoiceType: 'Sale Invoice',
  invoiceDate: '2025-04-21',
  sellerNTNCNIC: '1234567',
  sellerBusinessName: 'Example Traders',
  sellerProvince: 'Sindh',
  sellerAddress: 'Karachi',
  buyerNTNCNIC: '7654321',
  buyerBusinessName: 'Example Buyer',
  buyerProvince: 'Punjab',
  buyerAddress: 'Lahore',
  buyerRegistrationType: 'Registered',
  items: [
    {
      hsCode: '0101.2100',
      productDescription: 'Horses',
      rate: '18%',
      uoM: 'Numbers, pieces, units',
      quantity: 2,
      valueSalesExcludingST: 1234,
      saleType: 'Goods at standard rate (default)',
    },
  ],
})!;
invoice.items[0].salesTaxApplicable; // 222.12
totals.salesTaxApplicable; // 222.12
```

Rates of the form `N%` use the value excluding sales tax (or the retail price for Third Schedule goods); `Rs.N` rates use the quantity. Other rates (`Exempt`, combined rates) get 0 unless you give the tax.

### validateFbrInvoice()

Returns every problem it can find without calling FBR, with FBR's error code:

```ts
validateFbrInvoice(invoice);
// { valid: true, errors: [] }

validateFbrInvoice({
  ...invoice,
  invoiceDate: '21-04-2025',
  buyerNTNCNIC: invoice.sellerNTNCNIC,
});
// { valid: false, errors: [
//   { code: "0005", field: "invoiceDate", message: "Invoice date must be in YYYY-MM-DD format" },
//   { code: "0058", field: "buyerNTNCNIC", message: "Buyer and seller must be different (self-invoicing is not allowed)" } ] }
```

It checks required fields, formats (date, NTN/CNIC, FBR invoice number, sandbox scenario), amounts (not negative, at most 2 decimals, 4 for quantity), SRO rules and the sales tax arithmetic (to within one paisa). Pass `{ today: 'YYYY-MM-DD' }` to also reject future dates. It cannot check what needs FBR's reference APIs: registration status, and whether a province, HS code, unit, rate, sale type or SRO is in FBR's lists. A `valid` result means FBR's own validation is likely to pass, not that it will.

---

## Passports & Vehicle Plates

### validatePassport()

Checks the format of a Pakistani passport number: two letters and seven digits.

```ts
validatePassport('AB1234567'); // true
validatePassport('ab 1234567'); // true
validatePassport('A12345678'); // false
```

DGIP does not publish the format, so this checks the common shape only. Other passport types may differ; see [DATA.md](./DATA.md#passport-numbers).

### parseVehiclePlate() / validateVehiclePlate()

Splits a vehicle registration number into its series letters, number and the optional year that older Punjab plates carry.

```ts
parseVehiclePlate('lea 1234');
// { series: 'LEA', number: '1234', year: null, formatted: 'LEA-1234' }

parseVehiclePlate('LEA-1234-19');
// { series: 'LEA', number: '1234', year: '19', formatted: 'LEA-1234' }

validateVehiclePlate('ABC-123'); // true
```

Each province sets its own format and several changed in 2024–2026, so this accepts the shape they share (1–4 letters, then 1–4 digits) and does not check series letters against districts. See [DATA.md](./DATA.md#vehicle-registration-plates).

---

## Raast QR Codes

### createRaastP2PQr() / createMerchantQr() / parseRaastQr()

Builds and reads payment QR codes following the State Bank of Pakistan's QR standard (Circular Letter No. 1 of 2022). Turn the returned string into an image with any QR library.

```ts
// Person-to-person: anyone can pay this IBAN through Raast; the payer enters the amount
createRaastP2PQr({ iban: 'PK36SCBL0000001123456702' });

// With a fixed amount: banking apps require an expiry
const payload = createRaastP2PQr({
  iban: 'PK36SCBL0000001123456702',
  amount: 1500,
  expiresAt: new Date(2026, 10, 13, 23, 59),
});

// …or give how long it works: '30m', '12h', '7d' or milliseconds
createRaastP2PQr({
  iban: 'PK36SCBL0000001123456702',
  amount: 1500,
  expiresIn: '1d',
});

parseRaastQr(payload);
// { kind: 'p2p', dynamic: true, crcValid: true, iban: 'PK36SCBL0000001123456702',
//   amount: 1500, expiresAt: '2026-11-13T23:59', ... }

// Merchant QR (EMVCo), with Pakistan-specific bill due dates
createMerchantQr({
  merchantAccount: {
    tag: '28',
    fields: {/* sub-fields from your bank */},
  },
  merchantName: 'Aziz General Store',
  city: 'Karachi',
  amount: 4250,
  billNumber: 'INV-1001',
  dueDate: new Date(2026, 10, 25),
  amountAfterDueDate: 4500,
});
```

Person-to-person QR codes use the same layout as QR codes from banking apps (Faysal Bank and easypaisa without an amount; JazzCash and Mashreq with one), and scan in the Easypaisa and JazzCash apps. This is handy for accounts whose app cannot generate a receiving QR, such as SadaPay. A QR with an amount must have `expiresAt`: apps reject amount QRs without an expiry, and ignore an amount in a QR that has none.

SBP reserves merchant-account tags 28–30 for Raast but has shared the layout of the fields inside them only with banks, so `createMerchantQr` takes those sub-fields from you. `parseRaastQr` checks the CRC and finds the IBAN in either kind of QR.

### validateRaastQr()

Checks a scanned QR before anyone pays, for example to warn about a QR sticker that was replaced or edited.

```ts
validateRaastQr(scannedText);
// { valid: false, kind: 'p2p', errors: ['expired'], warnings: [], qr: { iban: 'PK36…', amount: 1500, … } }
```

| Errors                     | Meaning                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `not-a-raast-qr`           | Not a Pakistani payment QR                                             |
| `bad-checksum`             | The QR was damaged or its contents were edited                         |
| `no-iban` / `invalid-iban` | A person-to-person QR with no IBAN, or an IBAN that fails its checksum |
| `expired`                  | A QR with an amount is past its expiry                                 |
| `missing-expiry`           | A QR with an amount has no expiry, so banking apps reject it           |

Warnings (payment still works): `amount-ignored` when a static QR carries an amount that apps ignore, `expires-soon` when it expires within an hour (`expiresSoonMs` changes this), and `no-iban` for a merchant QR without an IBAN, which pays through the merchant's own scheme. `kind` is `'p2p'`, `'merchant'` or `null`. Pass `now` to check against another time.

---

## Public Holidays

### getPakistanHolidays() / isPakistanHoliday() / getHolidaysOn()

Lists Pakistan's federal public holidays. Eid, Ashura and Milad use the dates actually observed after moon sighting (2020 onwards, from Cabinet Division and SBP notices), not a calculation.

```ts
getPakistanHolidays(2025).filter((h) => h.id === 'eid-ul-fitr');
// [{ name: 'Eid ul Fitr', date: '2025-03-31', estimated: false, source: 'https://…' }, … '2025-04-01', '2025-04-02']

isPakistanHoliday('2026-08-14'); // true (Independence Day)

// Future years are estimated and flagged; apply the official announcement when it comes
getPakistanHolidays(2027, {
  announced: { 'eid-ul-fitr': ['2027-03-10', '2027-03-11', '2027-03-12'] },
});
```

Fixed holidays follow the year they applied in: Iqbal Day was restored in 2022 and Youm-e-Takbeer added in 2024. Pass `includeChristianHolidays: true` for 26 December. Optional holidays such as Shab-e-Barat and Easter are not included.

---

## Form Validation

Ready-made schemas for [Zod](https://zod.dev), [Valibot](https://valibot.dev), [Yup](https://github.com/jquense/yup), [Joi](https://joi.dev) and [Superstruct](https://docs.superstructjs.org), and decorators for [class-validator](https://github.com/typestack/class-validator) (and so NestJS). Install the library you use; PakDataKit does not depend on any of them.

```ts
import { z } from 'zod';
import { pk } from 'pakdatakit/zod';

const CheckoutForm = z.object({
  cnic: pk.cnic(),
  phone: pk.phone(),
  iban: pk.iban({ message: 'Please enter a valid IBAN' }),
});
```

```ts
import * as v from 'valibot';
import { pk } from 'pakdatakit/valibot';

const CheckoutForm = v.object({ cnic: pk.cnic(), phone: pk.phone() });
```

```ts
import { object } from 'yup';
import { pk } from 'pakdatakit/yup';

const CheckoutForm = object({ cnic: pk.cnic().required(), phone: pk.phone() });
```

```ts
import Joi from 'joi';
import { pk } from 'pakdatakit/joi';

const CheckoutForm = Joi.object({
  cnic: pk.cnic().required(),
  phone: pk.phone(),
});
```

```ts
import { object, optional } from 'superstruct';
import { pk } from 'pakdatakit/superstruct';

const CheckoutForm = object({ cnic: pk.cnic(), phone: optional(pk.phone()) });
```

Available schemas: `pk.cnic()`, `pk.phone()`, `pk.iban()`, `pk.ntn()`, `pk.strn()`, `pk.landline()`, `pk.passport()`, `pk.vehiclePlate()`, `pk.codPhone()` (a mobile number with no `phoneRiskSignals` flags), `pk.landline({ services: true })` (also UAN, toll-free and premium numbers) and `pk.amount()` (an amount `parseAmount()` reads, such as `1.5 lakh`; convert it with `parseAmount` on submit). Every factory accepts `{ message }` to replace the default error. The Yup schemas let empty values pass so `.required()` decides whether a field is mandatory.

### class-validator and NestJS

Decorators for DTOs, checked by NestJS's `ValidationPipe` like any other class-validator rule. No NestJS package is needed.

```ts
import { IsOptional } from 'class-validator';
import { IsCNIC, IsPakIBAN, IsPakPhone } from 'pakdatakit/class-validator';

export class CreateCustomerDto {
  @IsCNIC()
  cnic!: string;

  @IsOptional()
  @IsPakPhone({ message: 'Enter a Pakistani mobile number' })
  phone?: string;

  @IsPakIBAN()
  iban!: string;
}
```

Decorators: `IsCNIC`, `IsPakPhone`, `IsPakIBAN` (named so it doesn't clash with class-validator's own `IsIBAN`), `IsNTN`, `IsSTRN`, `IsPakLandline` (with `{ services: true }` for UAN, toll-free and premium numbers), `IsPakPassport`, `IsVehiclePlate`, `IsCodPhone` and `IsPakAmount`, also available as `pk.cnic()` and so on. They accept class-validator's options (`message`, `groups`, `each`, `always`); use `@IsOptional()` for optional fields. Values that are not strings fail.

### As-you-type helpers

Format a field while the user types, and tell a half-typed value apart from a wrong one, so you don't show an error before they've finished.

```ts
import { formatCNICInput, checkCNICInput } from 'pakdatakit/input';

formatCNICInput('352021234'); // "35202-1234"
checkCNICInput('35202-1234'); // "incomplete" — keep typing
checkCNICInput('05202'); // "invalid" — no CNIC starts with 0
checkCNICInput('35202-1234567-1'); // "valid"
```

| Field  | Formatter                                                | Checker                                                                      |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| CNIC   | `formatCNICInput` → `35202-1234567-1`                    | `checkCNICInput`                                                             |
| Mobile | `formatPhoneInput` → `0300-1234567` or `+92 300 1234567` | `checkPhoneInput` (flags an unallocated `03XX` prefix as soon as it's typed) |
| IBAN   | `formatIBANInput` → `PK36 SCBL 0000 0011 2345 6702`      | `checkIBANInput`                                                             |

Checkers return `'empty'`, `'incomplete'`, `'valid'` or `'invalid'`. In React, for example:

```tsx
const [cnic, setCnic] = useState('');
const state = checkCNICInput(cnic);

<input
  value={cnic}
  onChange={(e) => setCnic(formatCNICInput(e.target.value))}
  aria-invalid={state === 'invalid'}
/>;
```

---

# Real-World Example

```ts
import {
  validateCNIC,
  validatePhone,
  formatPhone,
  analyzePhone,
  createWhatsAppLink,
  validateIBAN,
  getBankFromIBAN,
  getPostalCode,
  getCityByPostalCode,
  getNetwork,
  getProvince,
  searchCities,
  formatPKR,
  formatLakh,
} from 'pakdatakit';

// CNIC validation
const cnicValid = validateCNIC('35202-1234567-1');

// Phone intelligence
const phoneInfo = analyzePhone('03001234567');

// WhatsApp link for ecommerce support
const waLink = createWhatsAppLink('0300 123 4567', 'Assalamualaikum');

// IBAN validation for fintech checkout
const ibanValid = validateIBAN('PK36SCBL0000001123456702');
const bank = getBankFromIBAN('PK36SCBL0000001123456702');

// Postal lookup for shipping forms
const postal = getPostalCode('Multan');
const city = getCityByPostalCode('60000');

// Province lookup
const province = getProvince('Lahore');

// Formatting
const amount = formatPKR(150000);
const budget = formatLakh(2500000);
```

---

# Contributing

Contributions are welcome.

Ideas, bug reports, improvements, and pull requests help make PakDataKit better for everyone.

Let's build the standard toolkit for Pakistani developers 🇵🇰

See:

- CONTRIBUTING.md
- CODE_OF_CONDUCT.md

---

# Origin and attribution

- First commit: 29 May 2026,
  [`bdc426a`](https://github.com/chmuzamil/pakdatakit/commit/bdc426a84a1b4359dee218c33196810d6631559d)
  (git history).
- First npm release:
  [`pakdatakit` 1.0.0](https://www.npmjs.com/package/pakdatakit/v/1.0.0), 29 May
  2026 (npm registry).

PakDataKit is released under the MIT licence. This covers the code of every
port, the datasets in `data/` and the shared test vectors in `test-vectors/`.
Anyone who copies or adapts any substantial part of it, in any language, must
keep the copyright notice and the licence text:

```text
Copyright (c) 2026 Muzamil Chaudhery and PakDataKit Contributors
```

The same text is in [NOTICE](NOTICE).

---

# License

MIT License. See [LICENSE](LICENSE).

---

<p align="center">
  Built with ❤️ for Pakistani Developers 🇵🇰
</p>
