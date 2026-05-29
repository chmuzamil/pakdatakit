<p align="center">
  <img src="./assets/banner.png" alt="PakDataKit Banner" />
</p>

<h1 align="center">🇵🇰 PakDataKit</h1>

<p align="center">
  <strong>The Standard Utility Toolkit for Pakistani Developers</strong>
</p>

<p align="center">
  Production-ready TypeScript utilities for CNIC validation, phone parsing, network detection, geographic lookup, and PKR formatting.
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
* Map cities to provinces
* Format PKR values in Lakh and Crore conventions

Most teams implement these repeatedly.

PakDataKit provides a single, typed, reusable solution so you can focus on building your product instead of rebuilding common utilities.

---

## Features

✅ CNIC Validation
✅ Phone Number Validation
✅ Phone Number Normalization
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
  getNetwork,
  formatLakh
} from "pakdatakit";

validateCNIC("35202-1234567-1");
// true

getNetwork("03001234567");
// "Jazz"

formatLakh(2500000);
// "25 Lakh"
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
  getNetwork,
  getProvince,
  searchCities,
  formatPKR,
  formatLakh
} from "pakdatakit";

// CNIC validation
const cnicValid = validateCNIC("35202-1234567-1");

// Phone normalization
const phone = formatPhone("0300 123 4567");

// Network lookup
const network = getNetwork(phone);

// Province lookup
const province = getProvince("Lahore");

// City search
const cities = searchCities("fais");

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

### v0.2

* Bank Utilities
* IBAN Validation
* Account Helpers

### v0.3

* Address Parsing
* Postal Data

### v0.4

* Roman Urdu Utilities
* Text Normalization

### v0.5

* Islamic Calendar Utilities
* Hijri Date Helpers

### v1.0

* CLI Tool
* Dataset API
* Community Contributions

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
