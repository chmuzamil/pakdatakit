# 🇵🇰 PakDataKit

![npm](https://img.shields.io/npm/v/pakdatakit)
![license](https://img.shields.io/github/license/yourname/pakdatakit)
![typescript](https://img.shields.io/badge/TypeScript-ready-blue)
![downloads](https://img.shields.io/npm/dm/pakdatakit)

> **The missing standard utility toolkit for Pakistani developers.**

**PakDataKit** is a fast, typed, production-ready TypeScript utility library for building Pakistan-based applications. It eliminates the need for hardcoding regional data and reinventing validation logic for local formats.

---

## ⚡ Why PakDataKit?

Every Pakistani app repeatedly solves the same problems:
- Validating CNIC formats (dashes, no dashes)
- Parsing phone numbers (`+92`, `03XX`)
- Detecting mobile networks from prefixes
- Mapping cities to provinces
- Formatting PKR amounts in the Lakh/Crore system

**PakDataKit** standardizes these tasks in one lightweight, zero-dependency package.

---

## 🚀 Installation

```bash
npm install pakdatakit
Requires Node.js 18+ (ESM support)

⚡ Quick Example
TypeScript
import { validateCNIC, getNetwork, formatLakh } from "pakdatakit";

console.log(validateCNIC("35202-1234567-1")); // true
console.log(getNetwork("03001234567"));       // "Jazz"
console.log(formatLakh(2500000));             // "25 Lakh"
🧠 Core Features
Fully Typed: Built with TypeScript for excellent IDE autocomplete.

Zero Dependencies: Keeps your bundle size minimal.

Tree-shakeable: Import only what you need.

Developer-friendly: Clean, intuitive API.

📚 API Reference
🆔 CNIC Validation
TypeScript
import { validateCNIC } from "pakdatakit";

validateCNIC("3520212345671");     // true
validateCNIC("35202-1234567-1");    // true
📱 Phone Utilities
TypeScript
import { validatePhone, formatPhone } from "pakdatakit";

validatePhone("03001234567");      // true
formatPhone("03001234567");        // "+923001234567"
📡 Network Detection
TypeScript
import { getNetwork } from "pakdatakit";

getNetwork("03001234567"); // "Jazz"
⚠️ Note: Due to Mobile Number Portability (MNP), the actual carrier may differ.

🗺️ Geography
TypeScript
import { getProvince, searchCities } from "pakdatakit";

getProvince("Multan"); // "Punjab"
searchCities("mul");    // ["Multan"]
💰 Currency Formatting
TypeScript
import { formatPKR, formatLakh } from "pakdatakit";

formatPKR(150000);   // "Rs. 150,000"
formatLakh(2500000); // "25 Lakh"
🛣️ Roadmap
We are actively expanding PakDataKit:

[ ] 🏦 Banking: IBAN and account validation.

[ ] 🏠 Address Parsing: Optimized for local formats.

[ ] 🕌 Islamic Utilities: Date conversions.

[ ] 🔤 Roman Urdu: Normalization and transliteration.

[ ] ⚡ CLI: Command-line tool for quick data lookups.

🤝 Contributing
We welcome contributions 🇵🇰!

Open an issue to discuss a new feature.

Submit a PR for improvements or bug fixes.

Help us make this the standard toolkit for all Pakistani developers.

📄 License
Distributed under the MIT License. See LICENSE for more information.
