/**
 * Writes llms.txt and llms-full.txt (https://llmstxt.org) into the docs site,
 * so AI coding assistants can learn the library.
 *
 * Run after `npm run build` and `typedoc`: node scripts/generate-llms.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs-site');
const site = 'https://chmuzamil.github.io/pakdatakit';
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { dataVersion } = await import('../dist/index.js');

/** One line per module: [subpath, docs page, what it covers]. */
const MODULES = [
  [
    'cnic',
    'cnic',
    'Validate CNICs; read province of registration and gender (validateCNIC, getCNICInfo)',
  ],
  [
    'phone',
    'phone',
    'Validate and format mobile numbers; network and E.164 (validatePhone, formatPhone, analyzePhone)',
  ],
  ['networks', 'networks', 'Mobile network from the 03XX prefix (getNetwork)'],
  [
    'numbers',
    'numbers',
    'Landline, UAN 111, toll-free 0800, premium 0900 numbers, area codes (analyzeNumber, getAreaCode)',
  ],
  ['whatsapp', 'whatsapp', 'WhatsApp click-to-chat links (createWhatsAppLink)'],
  [
    'iban',
    'iban',
    'Validate IBANs; bank name, type and status (validateIBAN, getBankFromIBAN, getBankInfo, getBanks)',
  ],
  [
    'raast',
    'raast',
    'Create, read and check Raast payment QR codes (createRaastP2PQr, createMerchantQr, parseRaastQr, validateRaastQr)',
  ],
  [
    'tax',
    'tax',
    'FBR NTN and STRN format checks (analyzeNTN, validateNTN, validateSTRN)',
  ],
  [
    'input',
    'input',
    'As-you-type formatters and empty/incomplete/valid/invalid checkers for CNIC, phone and IBAN fields',
  ],
  [
    'postal',
    'postal',
    'Postal code lookups (getPostalCode, getCityByPostalCode, searchPostalCodes)',
  ],
  [
    'geo',
    'geo',
    'City and district to province (getProvince, getDistrictProvince, searchCities)',
  ],
  [
    'address',
    'address',
    'Parse and format Pakistani addresses (parseAddress, formatAddress)',
  ],
  [
    'words',
    'words',
    'Amounts in words with lakh/crore, English and Urdu, cheque style (amountInWords, numberToWords)',
  ],
  ['format', 'format', 'PKR and lakh/crore formatting (formatPKR, formatLakh)'],
  [
    'text',
    'text',
    'Roman Urdu normalization and Urdu digits (normalizeRomanUrdu, toUrduDigits)',
  ],
  [
    'hijri',
    'hijri',
    'Hijri dates with moon-sighting offset (toHijri, fromHijri, formatHijri, isRamadan)',
  ],
  [
    'holidays',
    'holidays',
    'Federal public holidays with observed Eid dates (getPakistanHolidays, isPakistanHoliday)',
  ],
  [
    'zod',
    'adapters_zod',
    'Zod schemas: pk.cnic(), pk.phone(), pk.iban(), pk.ntn(), pk.strn(), pk.landline()',
  ],
  ['valibot', 'adapters_valibot', 'Valibot schemas with the same names'],
  ['yup', 'adapters_yup', 'Yup schemas with the same names'],
];

const index = `# PakDataKit

> ${pkg.description}. TypeScript, zero runtime dependencies, ESM and CommonJS. npm package \`pakdatakit\` (version ${pkg.version}, data checked ${dataVersion}).

Install with \`npm install pakdatakit\`. Import everything from \`pakdatakit\`, or one module from a subpath such as \`pakdatakit/cnic\` to keep bundles small. Functions return \`null\` (or \`'Unknown'\` for networks) when input is invalid, and throw \`RangeError\` only for programming errors such as a non-finite amount. Never log or store real CNICs or account numbers in examples.

Key facts an assistant should know:
- Raast person-to-person QR codes use scheme \`00\` (banking apps reject the \`30\` in SBP's document). A QR with an amount needs \`expiresAt\` or \`expiresIn\`.
- Bank codes are checked against real IBANs; see DATA.md for every dataset's sources.
- Islamic holiday dates for 2020-2026 are the dates actually observed in Pakistan; later years are estimates marked \`estimated: true\`.

## Modules

${MODULES.map(([subpath, page, text]) => `- [pakdatakit/${subpath}](${site}/modules/${page}.html): ${text}`).join('\n')}

## Guides

- [README](${site}/index.html): overview and examples for every function
- [Data sources](${site}/documents/DATA.html): where each dataset comes from and how sure we are
- [Changelog](${site}/documents/CHANGELOG.html)

## Optional

- [Full text for LLMs](${site}/llms-full.txt): README, data sources and every type signature in one file
- [Playground](https://pakdatakit-playground.vercel.app/): try the functions in a browser
- [Source code](https://github.com/chmuzamil/pakdatakit)
`;

/** Every public module's type declarations, with their doc comments. */
const declarations = readdirSync(join(root, 'dist'))
  .filter(
    (file) =>
      file.endsWith('.d.ts') && file !== 'index.d.ts' && file !== 'cli.d.ts',
  )
  .sort()
  .map((file) => {
    const body = readFileSync(join(root, 'dist', file), 'utf8').replace(
      /\/\/# sourceMappingURL=.*\n?/g,
      '',
    );
    return `### ${file.replace(/\.d\.ts$/, '')}\n\n\`\`\`ts\n${body.trim()}\n\`\`\``;
  })
  .join('\n\n');

const full = `${index}
---

${readFileSync(join(root, 'README.md'), 'utf8')}

---

${readFileSync(join(root, 'DATA.md'), 'utf8')}

---

# Type declarations

${declarations}
`;

writeFileSync(join(out, 'llms.txt'), index);
writeFileSync(join(out, 'llms-full.txt'), full);
console.log(
  `Wrote llms.txt (${index.length} chars) and llms-full.txt (${full.length} chars)`,
);
