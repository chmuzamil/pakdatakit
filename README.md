# PakDataKit

**PakDataKit** is a production-ready, open-source TypeScript utility library built for Pakistani developers. It provides reliable, typed, and reusable helpers for CNIC validation, phone normalization, mobile network detection, city-to-province lookup, and PKR formatting.

## Why PakDataKit?

Pakistani applications repeatedly solve the same data problems:

- Validating CNIC numbers in multiple input formats
- Normalizing mobile numbers between `03XX`, `3XX`, and `+92` forms
- Detecting mobile networks from number prefixes
- Mapping cities to provinces for forms and analytics
- Displaying amounts in PKR, Lakh, and Crore conventions

PakDataKit centralizes these utilities so you can ship faster with confidence.

## Installation

```bash
npm install pakdatakit
```

Requires Node.js 18+ and ESM.

## Quick Start

```ts
import { validateCNIC, getNetwork, formatLakh } from 'pakdatakit';

validateCNIC('35202-1234567-1'); // true
getNetwork('03001234567'); // "Jazz"
formatLakh(2500000); // "25 Lakh"
```

## API Reference

### CNIC

#### `validateCNIC(cnic: string): boolean`

Validates a Pakistani CNIC (13 digits). Accepts plain, dashed, or spaced formats. Strips separators before validation.

```ts
validateCNIC('3520212345671'); // true
validateCNIC('35202-1234567-1'); // true
validateCNIC('35202-123456-1'); // false
```

### Phone

#### `validatePhone(phone: string): boolean`

Validates Pakistani mobile numbers in local, international, or short formats.

```ts
validatePhone('03001234567'); // true
validatePhone('+923001234567'); // true
validatePhone('3001234567'); // true
```

#### `formatPhone(phone: string): string`

Normalizes a valid Pakistani mobile number to `+923XXXXXXXXX`. Returns an empty string for invalid input.

```ts
formatPhone('03001234567'); // "+923001234567"
formatPhone('+92 300-123-4567'); // "+923001234567"
```

### Networks

#### `getNetwork(phone: string): NetworkName`

Returns the mobile network based on the number prefix: `"Jazz"`, `"Zong"`, `"Telenor"`, `"Ufone"`, or `"Unknown"`.

```ts
getNetwork('03001234567'); // "Jazz"
getNetwork('03151234567'); // "Zong"
getNetwork('03451234567'); // "Telenor"
getNetwork('03331234567'); // "Ufone"
```

> **Note:** Prefix-based detection reflects the **original issuing network**. Due to Mobile Number Portability (MNP) in Pakistan, the current carrier may differ from the prefix.

### Geography

#### `getProvince(city: string): string | null`

Returns the province for an exact city name match (case-insensitive, whitespace-tolerant).

```ts
getProvince('Multan'); // "Punjab"
getProvince('  karachi  '); // "Sindh"
getProvince('Unknown'); // null
```

#### `searchCities(query: string): string[]`

Partial, case-insensitive city search. Returns alphabetically sorted city names.

```ts
searchCities('mul'); // ["Multan"]
searchCities('kar'); // ["Karachi"]
```

### Formatting

#### `formatPKR(amount: number): string`

Formats an amount as Pakistani Rupees with comma separators.

```ts
formatPKR(150000); // "Rs. 150,000"
formatPKR(0); // "Rs. 0"
```

#### `formatLakh(amount: number): string`

Formats amounts using Lakh/Crore conventions.

```ts
formatLakh(2500000); // "25 Lakh"
formatLakh(10000000); // "1 Crore"
formatLakh(50000); // "Rs. 50,000"
```

## Examples

```ts
import {
  validateCNIC,
  validatePhone,
  formatPhone,
  getNetwork,
  getProvince,
  searchCities,
  formatPKR,
  formatLakh,
} from 'pakdatakit';

// CNIC validation
const cnicValid = validateCNIC('35202-1234567-1');

// Phone normalization
const phone = formatPhone('0300 123 4567'); // "+923001234567"
const isValid = validatePhone(phone);

// Network lookup
const network = getNetwork('03001234567'); // "Jazz"

// City lookup
const province = getProvince('Lahore'); // "Punjab"
const cities = searchCities('fais'); // ["Faisalabad"]

// Currency formatting
const price = formatPKR(150000); // "Rs. 150,000"
const budget = formatLakh(2500000); // "25 Lakh"
```

## Development

```bash
npm install
npm test
npm run build
npm run lint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT — see [LICENSE](LICENSE).
