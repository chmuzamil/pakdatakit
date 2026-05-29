# 🇵🇰 PakDataKit

> The missing standard utility toolkit for Pakistani developers.

PakDataKit is a production-ready, open-source TypeScript utility library that provides reliable, typed, and reusable helpers for Pakistani application development — including CNIC validation, phone normalization, mobile network detection, geographic lookup, and PKR formatting.

---

## ✨ Why PakDataKit?

Most Pakistani applications repeatedly implement the same logic:

- CNIC validation across multiple formats
- Phone number normalization (+92 / 03XX / raw formats)
- Mobile network detection from prefixes
- City → province mapping for forms and analytics
- PKR formatting (Lakh / Crore system)

PakDataKit standardizes all of these into one lightweight, typed, and reusable library.

---

## 🚀 Features

- Fully typed (TypeScript)
- Zero runtime dependencies
- Tree-shakeable exports
- Lightweight and fast
- Works in Node.js and modern bundlers
- Developer-friendly API

---

## 📦 Installation

```bash
npm install pakdatakit
```

Requires Node.js 18+ (ESM support).

---

## ⚡ Quick Start

```ts
import { validateCNIC, getNetwork, formatLakh } from "pakdatakit";

validateCNIC("35202-1234567-1"); // true
getNetwork("03001234567"); // "Jazz"
formatLakh(2500000); // "25 Lakh"
```

---

## 🆔 CNIC

```ts
validateCNIC(cnic: string): boolean
```

```ts
validateCNIC("3520212345671"); // true
validateCNIC("35202-1234567-1"); // true
validateCNIC("35202-123456-1"); // false
```

---

## 📱 Phone

```ts
validatePhone(phone: string): boolean
formatPhone(phone: string): string
```

```ts
validatePhone("03001234567"); // true
formatPhone("03001234567"); // "+923001234567"
```

---

## 📡 Network

```ts
getNetwork(phone: string): string
```

```ts
getNetwork("03001234567"); // "Jazz"
```

---

## 🗺️ Geography

```ts
getProvince(city: string): string | null
searchCities(query: string): string[]
```

```ts
getProvince("Multan"); // "Punjab"
searchCities("mul"); // ["Multan"]
```

---

## 💰 Currency

```ts
formatPKR(amount: number): string
formatLakh(amount: number): string
```

```ts
formatPKR(150000); // "Rs. 150,000"
formatLakh(2500000); // "25 Lakh"
```

---

## 🛣️ Roadmap

- Bank utilities
- Address parsing
- Islamic calendar utilities
- Roman Urdu normalization
- CLI tool

---

## 🤝 Contributing

PRs welcome 🇵🇰

---

## 📄 License

MIT
