<p align="center">
  <img src="./banner.png" alt="PakDataKit Banner" />
</p>

<h1 align="center">🇵🇰 PakDataKit</h1>

<p align="center">
  <strong>The Standard Utility Toolkit for Pakistani Developers</strong>
</p>

<p align="center">
  Production-ready TypeScript utilities for CNIC validation, phone parsing, WhatsApp links, IBAN validation, postal lookup, network detection, geographic lookup, and PKR formatting.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pakdatakit">
    <img src="https://img.shields.io/npm/v/pakdatakit" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/pakdatakit">
    <img src="https://img.shields.io/npm/dm/pakdatakit" alt="npm downloads">
  </a>
  <img src="https://img.shields.io/npm/l/pakdatakit" alt="license">
  <img src="https://img.shields.io/badge/TypeScript-ready-blue" alt="TypeScript">
  <a href="https://pakdatakit-playground.vercel.app/">
    <img src="https://img.shields.io/badge/playground-try%20it%20live-brightgreen" alt="Playground">
  </a>
  <a href="https://chmuzamil.github.io/pakdatakit/">
    <img src="https://img.shields.io/badge/docs-API%20reference-blue" alt="API docs">
  </a>
</p>

---

## 🌐 Playground

Try PakDataKit in your browser, no installation needed:

👉 **[pakdatakit-playground.vercel.app](https://pakdatakit-playground.vercel.app/)**

Validate CNICs, analyze phone numbers, detect networks, build WhatsApp links, check IBANs and banks, look up postal codes, cities and provinces, format PKR amounts, and try the text and Hijri utilities. Use it to preview outputs before you integrate the library.

---

## 📦 Packages

| Package                                                                           | Install                        | For                                                            |
| --------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| [`pakdatakit`](https://www.npmjs.com/package/pakdatakit)                          | `npm install pakdatakit`       | JavaScript and TypeScript (Node, browsers, Bun, Deno)          |
| [`pakdatakit` (Python)](https://github.com/chmuzamil/pakdatakit/tree/main/python) | `pip install pakdatakit`       | Python 3.9+, same functions in snake_case, same data           |
| [`pakdatakit-react`](https://github.com/chmuzamil/pakdatakit/tree/main/react)     | `npm install pakdatakit-react` | React inputs that format as you type, and a Raast QR component |

The Python package is checked against the TypeScript library with over 12,000 shared test cases, so both give the same results.

---

## 📚 Documentation

- **[API reference](https://chmuzamil.github.io/pakdatakit/)**: every function, option and return type
- **[llms.txt](https://chmuzamil.github.io/pakdatakit/llms.txt)** and **[llms-full.txt](https://chmuzamil.github.io/pakdatakit/llms-full.txt)**: the library in a form AI coding assistants can read
- **[DATA.md](./DATA.md)**: where every dataset comes from

---

## Why PakDataKit?

Every Pakistani application eventually needs to solve the same problems:

- Validate CNIC numbers
- Normalize mobile numbers
- Detect mobile networks
- Generate WhatsApp click-to-chat links
- Validate Pakistani IBANs and detect banks
- Look up postal codes and cities
- Map cities to provinces
- Format PKR values in Lakh and Crore conventions

Most teams implement these repeatedly.

PakDataKit provides a single, typed, reusable solution so you can focus on building your product instead of rebuilding common utilities.

---

## Features

- ✅ CNIC Validation
- ✅ CNIC Province & Gender Decoding
- ✅ Phone Number Validation
- ✅ Phone Number Normalization
- ✅ Phone Intelligence (`analyzePhone`)
- ✅ WhatsApp Link Generator
- ✅ IBAN Validation
- ✅ Bank Detection from IBAN
- ✅ Postal Code Lookup
- ✅ Address Parsing
- ✅ Roman Urdu Normalization
- ✅ Hijri Date Utilities
- ✅ CLI Tool
- ✅ Mobile Network Detection
- ✅ City → Province Lookup
- ✅ PKR Formatting
- ✅ Lakh / Crore Formatting
- ✅ Amounts in Words (English & Urdu, cheque style)
- ✅ Zod, Valibot & Yup Form Validation
- ✅ As-You-Type Formatting for CNIC, Phone & IBAN
- ✅ NTN & STRN Validation
- ✅ Landline, UAN (111), Toll-Free (0800) & Premium (0900) Numbers
- ✅ Raast QR Codes (SBP standard)
- ✅ Pakistan Public Holidays (moon-sighting aware)

### Developer Friendly

- Fully Typed (TypeScript)
- Zero Runtime Dependencies (form libraries are optional peers)
- Tree-Shakeable
- Lightweight & Fast
- ESM and CommonJS, with per-module subpath imports
- Production Ready

---

## Installation

```bash
npm install pakdatakit
```

Requirements:

- Node.js 20+
- Works with both `import` and `require()`

Import everything from `pakdatakit`, or a single module to keep bundles small:

```ts
import { validateCNIC } from 'pakdatakit/cnic';
const { analyzePhone } = require('pakdatakit/phone');
```

Subpaths: `address`, `cnic`, `format`, `geo`, `hijri`, `holidays`, `iban`, `input`, `networks`, `numbers`, `phone`, `postal`, `raast`, `tax`, `text`, `whatsapp`, `words`, plus the form adapters `zod`, `valibot` and `yup`.

---

## Quick Start

```ts
import {
  validateCNIC,
  analyzePhone,
  createWhatsAppLink,
  validateIBAN,
  getBankFromIBAN,
  getPostalCode,
  getCityByPostalCode,
  getNetwork,
  formatLakh,
} from 'pakdatakit';

validateCNIC('35202-1234567-1');
// true

analyzePhone('03001234567');
// { valid: true, formatted: "+923001234567", network: "Jazz" }

createWhatsAppLink('03001234567', 'Assalamualaikum');
// "https://wa.me/923001234567?text=Assalamualaikum"

validateIBAN('PK36SCBL0000001123456702');
// true

getBankFromIBAN('PK36SCBL0000001123456702');
// "Standard Chartered Bank (Pakistan) Limited"

getPostalCode('Multan');
// "60000"

getCityByPostalCode('60000');
// "Multan"

getNetwork('03001234567');
// "Jazz"

formatLakh(2500000);
// "25 Lakh"
```

### CLI

```bash
npx pakdatakit validate-cnic 35202-1234567-1
npx pakdatakit analyze-phone 03001234567
npx pakdatakit parse-address "House 12, Gulberg III, Lahore, Punjab 54660"
npx pakdatakit hijri
npx pakdatakit normalize-urdu "ap kia ker rhe ho"
```

The CLI exits with status 0 when the input is valid or found, 1 when it is invalid or not found, and 2 for usage errors, so it can be used in scripts. Run `npx pakdatakit --help` for all commands.

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

Supported bank codes include HABB, MEZN, SCBL, UNIL, BAHL, NBPA, MUCB, JSBL, SADA (SadaPay), NAYA (NayaPay), RQMI (Raqami), MSHQ (Mashreq), and 48 total entries in the dataset, checked against real IBANs (see [DATA.md](./DATA.md)). Merged or renamed banks are labelled with their current name, e.g. `SAUD` → "Silkbank Limited (merged into United Bank Limited)".

---

## Postal Code Utilities

### getCityByPostalCode()

Returns the city for a Pakistani postal code.

```ts
getCityByPostalCode(postalCode: string): string | null
```

Examples:

```ts
getCityByPostalCode('60000');
// "Multan"

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

Identifies any Pakistani number: mobile, landline, UAN (`111`), toll-free (`0800`), premium-rate (`0900`) or personal (`0122`). Uses the same number patterns as Google's libphonenumber, plus PTCL's area-code list.

```ts
analyzeNumber('021-111-825-888');
// { type: 'uan', formatted: '021-111-825-888', e164: '+9221111825888', areaCode: '021', cities: ['Karachi'] }

analyzeNumber('042 35761234');
// { type: 'landline', formatted: '042-35761234', e164: '+924235761234', areaCode: '042', cities: ['Lahore'] }

getNumberType('0800-12345'); // 'toll-free'
validateLandline('051-9260138'); // true
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

## Text Utilities

### normalizeRomanUrdu()

Normalizes informal Roman Urdu spellings (`ap kia ker` → `aap kya kar`).

### toUrduDigits() / toEnglishDigits()

Convert between English, Urdu, and Arabic-Indic digits.

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
    fields: {
      /* sub-fields from your bank */
    },
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
// { valid: false, errors: ['expired'], warnings: [], qr: { iban: 'PK36…', amount: 1500, … } }
```

| Errors                     | Meaning                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `not-a-raast-qr`           | Not a Pakistani payment QR                                   |
| `bad-checksum`             | The QR was damaged or its contents were edited               |
| `no-iban` / `invalid-iban` | No IBAN, or one that fails its checksum                      |
| `expired`                  | A QR with an amount is past its expiry                       |
| `missing-expiry`           | A QR with an amount has no expiry, so banking apps reject it |

Warnings (payment still works): `amount-ignored` when a static QR carries an amount that apps ignore, and `expires-soon` when it expires within an hour (`expiresSoonMs` changes this). Pass `now` to check against another time.

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

Ready-made schemas for [Zod](https://zod.dev), [Valibot](https://valibot.dev) and [Yup](https://github.com/jquense/yup). Install the library you use; PakDataKit does not depend on any of them.

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

Available schemas: `pk.cnic()`, `pk.phone()`, `pk.iban()`, `pk.ntn()`, `pk.strn()` and `pk.landline()`. Every factory accepts `{ message }` to replace the default error. The Yup schemas let empty values pass so `.required()` decides whether a field is mandatory.

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

# Roadmap

### v0.2 ✅

- Phone Intelligence (`analyzePhone`)
- WhatsApp Link Generator
- IBAN Validation
- Bank Detection from IBAN
- Postal Code Lookup
- Expanded datasets (cities, districts, postal codes, banks)

### v0.3 ✅

- Address Parsing (`parseAddress`, `formatAddress`)
- Expanded Postal Data (`getPostalAreas`, `searchPostalCodes`)

### v0.4 ✅

- Roman Urdu Utilities (`normalizeRomanUrdu`)
- Text Normalization (`normalizeText`, `toUrduDigits`, `toEnglishDigits`)

### v0.5 ✅

- Islamic Calendar Utilities (`toHijri`, `fromHijri`, `formatHijri`)
- Hijri Date Helpers (`getHijriMonthName`, `isRamadan`)

### v1.0 ✅

- CLI Tool (`pakdatakit` command)
- Dataset-backed lookup APIs
- Community Contributions (see CONTRIBUTING.md)

### v1.1 ✅

- Interactive Playground ([pakdatakit-playground.vercel.app](https://pakdatakit-playground.vercel.app/))

### v2.0 ✅

- Bug-fix release; see [CHANGELOG.md](./CHANGELOG.md) for breaking changes
- CommonJS build and subpath imports
- Corrected Hijri dates, datasets and validation

### v2.1 ✅

- CNIC province & gender decoding (`getCNICInfo`)
- Amounts in words in English and Urdu (`amountInWords`, `numberToWords`)
- Zod, Valibot and Yup adapters
- NTN and STRN validation
- Landline, UAN, toll-free and premium numbers
- Raast QR codes
- Public holidays with observed moon-sighting dates

### Planned

- CNIC check-digit validation (pending a publicly documented NADRA algorithm)
- Mobile Number Portability lookup API

---

# Contributing

Contributions are welcome.

Ideas, bug reports, improvements, and pull requests help make PakDataKit better for everyone.

Let's build the standard toolkit for Pakistani developers 🇵🇰

See:

- CONTRIBUTING.md
- CODE_OF_CONDUCT.md

---

# License

MIT License

---

<p align="center">
  Built with ❤️ for Pakistani Developers 🇵🇰
</p>
