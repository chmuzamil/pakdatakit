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
</p>

---

## Why PakDataKit?

Every Pakistani application eventually needs to solve the same problems:

* Validate CNIC numbers
* Normalize mobile numbers
* Detect mobile networks
* Generate WhatsApp click-to-chat links
* Validate Pakistani IBANs and detect banks
* Look up postal codes and cities
* Map cities to provinces
* Format PKR values in Lakh and Crore conventions

Most teams implement these repeatedly.

PakDataKit provides a single, typed, reusable solution so you can focus on building your product instead of rebuilding common utilities.

---

## Features

✅ CNIC Validation
✅ Phone Number Validation
✅ Phone Number Normalization
✅ Phone Intelligence (`analyzePhone`)
✅ WhatsApp Link Generator
✅ IBAN Validation
✅ Bank Detection from IBAN
✅ Postal Code Lookup
✅ Address Parsing
✅ Roman Urdu Normalization
✅ Hijri Date Utilities
✅ CLI Tool
✅ Mobile Network Detection
✅ City → Province Lookup
✅ PKR Formatting
✅ Lakh / Crore Formatting

### Developer Friendly

* Fully Typed (TypeScript)
* Zero Runtime Dependencies
* Tree-Shakeable
* Lightweight & Fast
* ESM Ready
* Production Ready

---

## Installation

```bash
npm install pakdatakit
```

Requirements:

* Node.js 18+
* ESM support

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
  formatLakh
} from "pakdatakit";

validateCNIC("35202-1234567-1");
// true

analyzePhone("03001234567");
// { valid: true, formatted: "+923001234567", network: "Jazz" }

createWhatsAppLink("03001234567", "Assalamualaikum");
// "https://wa.me/923001234567?text=Assalamualaikum"

validateIBAN("PK36SCBL0000001123456702");
// true

getBankFromIBAN("PK36SCBL0000001123456702");
// "Standard Chartered Bank (Pakistan) Limited"

getPostalCode("Multan");
// "60000"

getCityByPostalCode("60000");
// "Multan"

getNetwork("03001234567");
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
validateCNIC("3520212345671");
// true

validateCNIC("35202-1234567-1");
// true

validateCNIC("35202-123456-1");
// false
```

Supports:

* Plain format
* Dashed format
* Space-separated format

---

## Phone Utilities

### validatePhone()

Validates Pakistani mobile numbers.

```ts
validatePhone(phone: string): boolean
```

Examples:

```ts
validatePhone("03001234567");
// true

validatePhone("+923001234567");
// true

validatePhone("3001234567");
// true
```

---

### formatPhone()

Converts valid Pakistani mobile numbers to E.164 format.

```ts
formatPhone(phone: string): string
```

Examples:

```ts
formatPhone("03001234567");
// "+923001234567"

formatPhone("+92 300-123-4567");
// "+923001234567"
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
  network: "Jazz" | "Zong" | "Telenor" | "Ufone" | "Unknown";
}
```

Examples:

```ts
analyzePhone("03001234567");
// { valid: true, formatted: "+923001234567", network: "Jazz" }

analyzePhone("invalid");
// { valid: false, formatted: null, network: "Unknown" }
```

---

## WhatsApp Utilities

### createWhatsAppLink()

Generates a WhatsApp click-to-chat link for Pakistani mobile numbers.

```ts
createWhatsAppLink(phone: string, message?: string): string
```

Examples:

```ts
createWhatsAppLink("03001234567");
// "https://wa.me/923001234567"

createWhatsAppLink("03001234567", "Assalamualaikum");
// "https://wa.me/923001234567?text=Assalamualaikum"
```

Returns an empty string for invalid phone numbers.

---

## IBAN Utilities

### validateIBAN()

Validates Pakistani IBANs using format and ISO 13616 mod-97 checksum.

```ts
validateIBAN(iban: string): boolean
```

Examples:

```ts
validateIBAN("PK36SCBL0000001123456702");
// true

validateIBAN("PK37SCBL0000001123456702");
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
getBankFromIBAN("PK36SCBL0000001123456702");
// "Standard Chartered Bank (Pakistan) Limited"

getBankFromIBAN("invalid");
// null
```

Supported bank codes include HABB, MEZN, SCBL, UNIL, BAHL, NBPA, MUCB, JSBL, and 46 total entries in the dataset.

---

## Postal Code Utilities

### getCityByPostalCode()

Returns the city for a Pakistani postal code.

```ts
getCityByPostalCode(postalCode: string): string | null
```

Examples:

```ts
getCityByPostalCode("60000");
// "Multan"

getCityByPostalCode("99999");
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
getPostalCode("Multan");
// "60000"

getPostalCode("karachi");
// "74200"
```

---

## Mobile Networks

### getNetwork()

Detects network using the original mobile prefix.

```ts
getNetwork(phone: string): string
```

Returns:

* Jazz
* Zong
* Ufone
* Telenor
* Unknown

Examples:

```ts
getNetwork("03001234567");
// Jazz

getNetwork("03151234567");
// Zong

getNetwork("03331234567");
// Ufone

getNetwork("03451234567");
// Telenor
```

> Note: Pakistan supports Mobile Number Portability (MNP). The current carrier may differ from the original prefix.

---

## Geography

### getProvince()

Returns province for a city.

```ts
getProvince(city: string): string | null
```

Examples:

```ts
getProvince("Multan");
// Punjab

getProvince("Karachi");
// Sindh

getProvince("Unknown");
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
searchCities("mul");
// ["Multan"]

searchCities("kar");
// ["Karachi"]
```

---

### getDistrictProvince() / searchDistricts()

District-level geography lookup across 171 districts.

```ts
getDistrictProvince("Lahore"); // "Punjab"
searchDistricts("karachi"); // ["Karachi Central", "Karachi East", ...]
```

---

## Address Utilities

### parseAddress()

Parses free-form Pakistani addresses into structured components.

```ts
parseAddress("House 12, Gulberg III, Lahore, Punjab 54660");
// { street: "House 12", area: "Gulberg III", city: "Lahore", province: "Punjab", postalCode: "54660", ... }
```

### formatAddress()

Formats structured components back into a mailing address string.

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
formatHijri(new Date()); // "14 Ramadan 1447"
isRamadan(new Date());   // true | false
```

---

## Currency Formatting

### formatPKR()

Formats PKR amounts with separators.

```ts
formatPKR(amount: number): string
```

Examples:

```ts
formatPKR(150000);
// "Rs. 150,000"

formatPKR(0);
// "Rs. 0"
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
  formatLakh
} from "pakdatakit";

// CNIC validation
const cnicValid = validateCNIC("35202-1234567-1");

// Phone intelligence
const phoneInfo = analyzePhone("03001234567");

// WhatsApp link for ecommerce support
const waLink = createWhatsAppLink("0300 123 4567", "Assalamualaikum");

// IBAN validation for fintech checkout
const ibanValid = validateIBAN("PK36SCBL0000001123456702");
const bank = getBankFromIBAN("PK36SCBL0000001123456702");

// Postal lookup for shipping forms
const postal = getPostalCode("Multan");
const city = getCityByPostalCode("60000");

// Province lookup
const province = getProvince("Lahore");

// Formatting
const amount = formatPKR(150000);
const budget = formatLakh(2500000);
```

---

# Playground

🚧 Interactive Playground Coming Soon

The PakDataKit Playground will provide:

* Live CNIC validation
* Phone number analysis
* Network detection
* City lookups
* PKR formatting tools

---

# Roadmap

### v0.2 ✅

* Phone Intelligence (`analyzePhone`)
* WhatsApp Link Generator
* IBAN Validation
* Bank Detection from IBAN
* Postal Code Lookup
* Expanded datasets (150 cities, 171 districts, 109 postal codes, 46 banks)

### v0.3 ✅

* Address Parsing (`parseAddress`, `formatAddress`)
* Expanded Postal Data (`getPostalAreas`, `searchPostalCodes`)

### v0.4 ✅

* Roman Urdu Utilities (`normalizeRomanUrdu`)
* Text Normalization (`normalizeText`, `toUrduDigits`, `toEnglishDigits`)

### v0.5 ✅

* Islamic Calendar Utilities (`toHijri`, `fromHijri`, `formatHijri`)
* Hijri Date Helpers (`getHijriMonthName`, `isRamadan`)

### v1.0 ✅

* CLI Tool (`pakdatakit` command)
* Dataset-backed lookup APIs
* Community Contributions (see CONTRIBUTING.md)

### v1.1+

* Interactive Playground
* CNIC checksum validation
* Mobile Number Portability lookup API

---

# Contributing

Contributions are welcome.

Ideas, bug reports, improvements, and pull requests help make PakDataKit better for everyone.

Let's build the standard toolkit for Pakistani developers 🇵🇰

See:

* CONTRIBUTING.md
* CODE_OF_CONDUCT.md

---

# License

MIT License

---

<p align="center">
  Built with ❤️ for Pakistani Developers 🇵🇰
</p>
