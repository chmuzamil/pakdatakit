/**
 * Writes llms.txt and llms-full.txt (https://llmstxt.org) into the docs site,
 * so AI coding assistants can learn the library.
 *
 * Run after `npm run build` and `typedoc`: node scripts/generate-llms.mjs
 *
 * Options (for pakdatakit.dev, see site/scripts/generate.mjs):
 *   --out <dir>    where to write (default docs-site/)
 *   --site <url>   base URL of the site (default the GitHub Pages docs)
 *   --api <url>    base URL of the TypeDoc reference (default --site)
 *   --pages        also list the site's guide pages (pakdatakit.dev only)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const out = arg('out') ?? join(root, 'docs-site');
const site = (arg('site') ?? 'https://chmuzamil.github.io/pakdatakit').replace(
  /\/$/,
  '',
);
const api = (arg('api') ?? site).replace(/\/$/, '');
const sitePages = process.argv.includes('--pages');
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
  [
    'format',
    'format',
    'PKR and lakh/crore formatting, and reading amounts as typed (formatPKR, formatLakh, parseAmount, formatAmountInput)',
  ],
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
  ['passport', 'passport', 'Passport number format check (validatePassport)'],
  [
    'vehicle',
    'vehicle',
    'Vehicle registration plates: series, number, year (parseVehiclePlate, validateVehiclePlate)',
  ],
  [
    'salestax',
    'salestax',
    'Standard sales tax rates for goods (FBR) and services (PRA, SRB, KPRA, BRA, ICT) by date, and exact amounts (getSalesTaxRate, calculateSalesTax, splitInclusive)',
  ],
  [
    'incometax',
    'incometax',
    'Income tax on salary, tax years 2020 to 2027 (calculateSalaryTax, calculateMonthlySalaryTax, getSalaryTaxSlabs, getSalaryTaxYears, getTaxYear)',
  ],
  [
    'fbr-invoice',
    'fbr-invoice',
    'FBR Digital Invoicing: build an invoice and validate it offline with FBR error codes (buildFbrInvoice, validateFbrInvoice, expectedSalesTax)',
  ],
  [
    'bills',
    'bills',
    'Electricity bill references and gas consumer numbers (parseElectricityRef, validateElectricityRef, validateGasConsumerNumber)',
  ],
  [
    'courier',
    'courier',
    'Courier status mapping and city name matching; experimental (mapCourierStatus, normalizeCityForCourier)',
  ],
  [
    'quality',
    'quality',
    'Cash-on-delivery checks: address completeness score and phone risk signals (scoreAddress, phoneRiskSignals)',
  ],
  [
    'zod',
    'adapters_zod',
    'Zod schemas: pk.cnic(), pk.phone(), pk.iban(), pk.ntn(), pk.strn(), pk.landline()',
  ],
  ['valibot', 'adapters_valibot', 'Valibot schemas with the same names'],
  ['yup', 'adapters_yup', 'Yup schemas with the same names'],
  ['joi', 'adapters_joi', 'Joi schemas with the same names'],
  [
    'superstruct',
    'adapters_superstruct',
    'Superstruct structs with the same names',
  ],
  [
    'class-validator',
    'adapters_class-validator',
    'class-validator decorators for DTOs and NestJS (IsCNIC, IsPakPhone, IsPakIBAN, IsNTN, IsSTRN and more)',
  ],
];

// Every public subpath must be listed, so new modules can't be left out.
const listed = new Set(MODULES.map(([subpath]) => subpath));
const unlisted = Object.keys(pkg.exports)
  .filter((key) => key !== '.' && key !== './package.json')
  .map((key) => key.slice(2))
  .filter((subpath) => subpath !== 'data-version' && !listed.has(subpath));
if (unlisted.length > 0) {
  throw new Error(
    `llms.txt: add these subpaths to MODULES: ${unlisted.join(', ')}`,
  );
}

/** A module's API reference page: pakdatakit.dev (Starlight) or the old TypeDoc site. */
const moduleUrl = (page) =>
  sitePages
    ? `${api}/${page.replace(/^adapters_/, 'adapters/')}/`
    : `${api}/modules/${page}.html`;

/** Front matter title and description of a Markdown page. */
function frontMatter(file) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
  const field = (key) =>
    new RegExp(`^${key}:\\s*(.*)$`, 'm')
      .exec(fm)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '');
  return { title: field('title'), description: field('description') };
}

/** pakdatakit.dev: every guide, install page and tool, read from the site's pages. */
function siteGuides() {
  const content = join(root, 'site', 'src', 'content', 'docs');
  const section = (dir, order) =>
    readdirSync(join(content, dir))
      .filter((f) => /\.mdx?$/.test(f) && !f.startsWith('index.'))
      .map((f) => ({
        slug: f.replace(/\.mdx?$/, ''),
        ...frontMatter(join(content, dir, f)),
      }))
      .sort(
        (a, b) =>
          (order.indexOf(a.slug) + 1 || 99) - (order.indexOf(b.slug) + 1 || 99),
      )
      .map((p) => `- [${p.title}](${site}/${dir}/${p.slug}/): ${p.description}`)
      .join('\n');
  const toolsDir = join(root, 'site', 'src', 'pages', 'tools');
  const tools = readdirSync(toolsDir)
    .filter((f) => f.endsWith('.astro') && f !== 'index.astro')
    .map((f) => {
      const src = readFileSync(join(toolsDir, f), 'utf8');
      const title = /\btitle="([^"]+)"/.exec(src)?.[1];
      const description = /\bdescription="([^"]+)"/.exec(src)?.[1];
      if (!title || !description)
        throw new Error(`llms.txt: no title or description in tools/${f}`);
      return `- [${title}](${site}/tools/${f.replace(/\.astro$/, '')}/): ${description}`;
    })
    .join('\n');
  return `### Module guides (examples in TypeScript, Python, Dart, C# and PHP)

${section('docs', ['cnic', 'passport', 'vehicle', 'tax', 'phone', 'networks', 'numbers', 'whatsapp', 'iban', 'raast', 'bills', 'words', 'format', 'amount', 'salestax', 'incometax', 'fbr-invoice', 'postal', 'geo', 'address', 'quality', 'courier', 'text', 'hijri', 'holidays', 'input', 'forms'])}

### Use cases (end-to-end walkthroughs)

${section('use-cases', ['checkout-kyc', 'fbr-digital-invoicing', 'payroll-salary-tax', 'cod-screening', 'raast-collection', 'bill-payment'])}

### Install

${section('install', ['typescript', 'python', 'dart', 'flutter', 'dotnet', 'php', 'react', 'vue', 'angular'])}

### Tools (run in the browser; nothing is uploaded)

${tools}

### Reference

- [TypeScript API reference](${api}/): every function, type and option in all modules
- [Python API reference](${site}/api/python/): every public function, class and constant in the Python package
- [Dart API reference](${site}/api/dart/): every public function, class, enum and constant in the Dart package
- [.NET API reference](${site}/api/dotnet/): every public class, method, record and enum in the PakDataKit NuGet packages
- [PHP API reference](${site}/api/php/): every public class, method and constant in the PHP package, with the Laravel bridge
- [Playground](${site}/playground/): try every module in the browser
- [Data sources](${site}/data/): where each dataset comes from, with counts and dates
- [Releases](${site}/releases/): every version of every package
- [About and privacy](${site}/about/)`;
}

const index = `# PakDataKit

> ${pkg.description.replace(/\.$/, '')}. TypeScript, zero runtime dependencies, ESM and CommonJS. npm package \`pakdatakit\` (version ${pkg.version}, data checked ${dataVersion}).

Install with \`npm install pakdatakit\`. Import everything from \`pakdatakit\`, or one module from a subpath such as \`pakdatakit/cnic\` to keep bundles small. Functions return \`null\` (or \`'Unknown'\` for networks) when input is invalid, and throw \`RangeError\` only for programming errors such as a non-finite amount. Never log or store real CNICs or account numbers in examples.

Key facts an assistant should know:
- Raast person-to-person QR codes use scheme \`00\` (banking apps reject the \`30\` in SBP's document). A QR with an amount needs \`expiresAt\` or \`expiresIn\`.
- Bank codes are checked against real IBANs; see DATA.md for every dataset's sources.
- Islamic holiday dates for 2020-2026 are the dates actually observed in Pakistan; later years are estimates marked \`estimated: true\`.

## Modules

${MODULES.map(([subpath, page, text]) => `- [pakdatakit/${subpath}](${moduleUrl(page)}): ${text}`).join('\n')}

## Guides

${
  sitePages
    ? siteGuides()
    : `- [README](${api}/index.html): overview and examples for every function
- [Data sources](${api}/documents/DATA.html): where each dataset comes from and how sure we are
- [Changelog](${api}/documents/CHANGELOG.html)`
}

## Optional

- [Full text for LLMs](${site}/llms-full.txt): README, data sources and every type signature in one file
- [Playground](${sitePages ? `${site}/playground/` : 'https://pakdatakit-playground.vercel.app/'}): try the functions in a browser
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
