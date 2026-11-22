#!/usr/bin/env node
/**
 * Checks what an app pays for importing pakdatakit, using the built dist/
 * (run `npm run build` first). Each case is bundled with esbuild (minified,
 * tree-shaken, as a browser app would be) and must stay under its gzipped
 * size limit and must not contain datasets it does not use.
 *
 * Run: npm run size
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/**
 * How to recognise each dataset in a bundle. Each marker is a field name that
 * only that dataset has, followed by the kind of literal its records hold:
 *
 * - `string`: a non-empty string, as in `town:"Dulmial"`
 * - `strings`: a non-empty array of strings, as in `cities:["Karachi"]`
 * - `objects`: a non-empty array of objects, as in `slabs:[{over:0,…}]`
 *
 * Field names are part of the schema, so the markers survive data refreshes,
 * and code never writes these fields with such a literal (it writes `null`,
 * `[]` or a variable). The script checks both: every record must still have
 * its marker field with a value of that kind, and each dataset is planted
 * into unrelated bundles to prove it is caught.
 */
const DATASETS = {
  'post offices': { file: 'post-offices.json', key: 'town', kind: 'string' },
  'postal codes': {
    file: 'postal-codes.json',
    key: 'postalCode',
    kind: 'string',
  },
  tehsils: { file: 'tehsils.json', key: 'censusDistrict', kind: 'string' },
  divisions: { file: 'divisions.json', key: 'division', kind: 'string' },
  'area codes': { file: 'area-codes.json', key: 'cities', kind: 'strings' },
  'sales tax rates': {
    file: 'sales-tax-rates.json',
    key: 'authority',
    kind: 'string',
  },
  'income tax slabs': {
    file: 'income-tax-slabs.json',
    key: 'slabs',
    kind: 'objects',
  },
  'zakat nisab': {
    file: 'zakat-nisab.json',
    key: 'valuationDateHijri',
    kind: 'string',
  },
  'census population': {
    file: 'tehsil-population.json',
    key: 'households',
    kind: 'number',
  },
};

const LITERAL = {
  string: '"',
  strings: '\\[\\s*"',
  objects: '\\[\\s*\\{',
  number: '\\d',
};
const MARKERS = Object.fromEntries(
  Object.entries(DATASETS).map(([dataset, { key, kind }]) => [
    dataset,
    // `town:"` minified, or `"town": "` if a bundler keeps quotes.
    new RegExp(`(?:^|[{,\\s])"?${key}"?\\s*:\\s*${LITERAL[kind]}`),
  ]),
);

/** Datasets whose marker occurs in `text`. */
const datasetsIn = (text) =>
  Object.keys(MARKERS).filter((dataset) => MARKERS[dataset].test(text));

let failed = false;

// 1. Every record still carries its marker field, with a value of that kind.
const fits = {
  string: (v) => typeof v === 'string' && v.length > 0,
  strings: (v) =>
    Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string'),
  objects: (v) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x)),
  number: (v) => typeof v === 'number' && Number.isFinite(v),
};
for (const [dataset, { file, key, kind }] of Object.entries(DATASETS)) {
  const records = JSON.parse(readFileSync(join(root, 'data', file), 'utf8'));
  const bad = records.filter((r) => !fits[kind](r?.[key])).length;
  if (bad > 0 || records.length === 0) {
    failed = true;
    console.log(
      `FAIL marker for ${dataset}: ${bad} of ${records.length} records in data/${file} have no ${kind} \`${key}\``,
    );
  }
}

const CASES = [
  {
    name: "validateCNIC from 'pakdatakit'",
    code: "import { validateCNIC } from 'pakdatakit'; console.log(validateCNIC('35202-1234567-1'));",
    limit: 1024,
    allowed: [],
  },
  {
    name: "validateCNIC from 'pakdatakit/cnic'",
    code: "import { validateCNIC } from 'pakdatakit/cnic'; console.log(validateCNIC('35202-1234567-1'));",
    limit: 1024,
    allowed: [],
  },
  {
    name: "getCityByPostalCode from 'pakdatakit/postal'",
    code: "import { getCityByPostalCode } from 'pakdatakit/postal'; console.log(getCityByPostalCode('54000'));",
    limit: 12 * 1024,
    allowed: ['postal codes'],
  },
  {
    name: "getPostOffice from 'pakdatakit/postal'",
    code: "import { getPostOffice } from 'pakdatakit/postal'; console.log(getPostOffice('48330'));",
    limit: 48 * 1024,
    allowed: ['post offices'],
  },
  {
    name: "getProvince from 'pakdatakit/geo'",
    code: "import { getProvince } from 'pakdatakit/geo'; console.log(getProvince('Lahore'));",
    limit: 4 * 1024,
    allowed: [],
  },
  {
    name: "validateLandline from 'pakdatakit'",
    code: "import { validateLandline } from 'pakdatakit'; console.log(validateLandline('042-35761234'));",
    limit: 4 * 1024,
    allowed: ['area codes'],
  },
  {
    name: "phoneRiskSignals from 'pakdatakit/quality'",
    code: "import { phoneRiskSignals } from 'pakdatakit/quality'; console.log(phoneRiskSignals('03001234567'));",
    limit: 4 * 1024,
    allowed: ['area codes'],
  },
  {
    name: "scoreAddress from 'pakdatakit/quality'",
    code: "import { scoreAddress } from 'pakdatakit/quality'; console.log(scoreAddress('House 1, Lahore 54660'));",
    limit: 64 * 1024,
    allowed: ['post offices', 'postal codes'],
  },
  {
    name: "calculateSalesTax from 'pakdatakit/salestax'",
    code: "import { calculateSalesTax } from 'pakdatakit/salestax'; console.log(calculateSalesTax(1000, { rate: 18 }));",
    limit: 4 * 1024,
    allowed: ['sales tax rates'],
  },
  {
    name: "calculateSalaryTax from 'pakdatakit/incometax'",
    code: "import { calculateSalaryTax } from 'pakdatakit/incometax'; console.log(calculateSalaryTax(1800000, { taxYear: 2026 }));",
    limit: 4 * 1024,
    allowed: ['income tax slabs'],
  },
  {
    name: "compareUrdu, slugify, isRTL, wrapBidi from 'pakdatakit/text'",
    code: "import { compareUrdu, slugify, isRTL, wrapBidi } from 'pakdatakit/text'; console.log(['b', 'a'].sort(compareUrdu), slugify('a b'), isRTL('a'), wrapBidi('a'));",
    limit: 4 * 1024,
    allowed: [],
  },
  {
    name: "validateElectricityRef from 'pakdatakit/bills'",
    code: "import { validateElectricityRef } from 'pakdatakit/bills'; console.log(validateElectricityRef('01141111234567'));",
    limit: 2 * 1024,
    allowed: [],
  },
  {
    name: "mapCourierStatus from 'pakdatakit/courier'",
    code: "import { mapCourierStatus } from 'pakdatakit/courier'; console.log(mapCourierStatus('PostEx', 5));",
    limit: 4 * 1024,
    allowed: [],
  },
  {
    name: "validateFbrInvoice from 'pakdatakit/fbr-invoice'",
    code: "import { validateFbrInvoice } from 'pakdatakit/fbr-invoice'; console.log(validateFbrInvoice({}));",
    limit: 8 * 1024,
    allowed: ['sales tax rates'],
  },
  {
    name: "zakatDeduction from 'pakdatakit/zakat'",
    code: "import { zakatDeduction } from 'pakdatakit/zakat'; console.log(zakatDeduction({ balance: 600000, zakatYear: 1447 }));",
    limit: 4 * 1024,
    allowed: ['zakat nisab'],
  },
  {
    name: "getDistrictPopulation from 'pakdatakit/population'",
    code: "import { getDistrictPopulation } from 'pakdatakit/population'; console.log(getDistrictPopulation('Lahore'));",
    limit: 8 * 1024,
    allowed: ['census population'],
  },
  {
    name: "getTehsilPopulation from 'pakdatakit/population'",
    code: "import { getTehsilPopulation } from 'pakdatakit/population'; console.log(getTehsilPopulation('Murree'));",
    limit: 20 * 1024,
    allowed: ['census population'],
  },
  {
    // Every rule of the adapter; zod itself is the app's own dependency.
    name: "pk from 'pakdatakit/zod' (zod external)",
    code: "import { pk } from 'pakdatakit/zod'; console.log(pk.cnic());",
    external: ['zod'],
    limit: 8 * 1024,
    allowed: ['area codes'],
  },
];

/** Resolves `pakdatakit` and its subpaths through package.json "exports". */
const selfPackage = {
  name: 'pakdatakit',
  setup(b) {
    b.onResolve({ filter: /^pakdatakit(\/.*)?$/ }, (args) => {
      const sub = args.path === 'pakdatakit' ? '.' : `.${args.path.slice(10)}`;
      const target = pkg.exports[sub]?.import?.default;
      if (!target) return { errors: [{ text: `No export for ${args.path}` }] };
      return { path: join(root, target) };
    });
  },
};

const bundle = async (code, external = []) => {
  const result = await build({
    stdin: { contents: code, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    plugins: [selfPackage],
    external,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
};

// 2. Each dataset is caught when it leaks into (a) an import that holds no
//    data, and (b) an import that legitimately holds a different dataset.
const empty = CASES[0];
for (const [dataset, { file }] of Object.entries(DATASETS)) {
  const other = CASES.find(
    (c) => c.allowed.length > 0 && !c.allowed.includes(dataset),
  );
  const leak = `import leaked from ${JSON.stringify(join(root, 'data', file))};\nconsole.log(leaked);\n`;
  for (const [label, host] of [
    ['a', empty],
    ['b', other],
  ]) {
    const found = datasetsIn(await bundle(host.code + '\n' + leak));
    if (!found.includes(dataset) || host.allowed.includes(dataset)) {
      failed = true;
      console.log(
        `FAIL leak test (${label}): ${dataset} planted into ${host.name} was not detected`,
      );
    }
  }
}
console.log(
  `ok   leak tests: each of ${Object.keys(DATASETS).length} datasets is detected in an import without data and in one with other data`,
);

for (const c of CASES) {
  const text = await bundle(c.code, c.external);
  const gz = gzipSync(text, { level: 9 }).length;
  const found = datasetsIn(text);
  const extra = found.filter((dataset) => !c.allowed.includes(dataset));
  // Positive control: every dataset a case is allowed, it really uses, so its
  // marker must be found there (a marker that stopped matching would fail).
  const missing = c.allowed.filter((d) => !found.includes(d));
  const ok = gz <= c.limit && extra.length === 0 && missing.length === 0;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${c.name}: ${(text.length / 1024).toFixed(1)} kB, ` +
      `${(gz / 1024).toFixed(1)} kB gzipped (limit ${(c.limit / 1024).toFixed(1)} kB)` +
      (found.length ? `; contains ${found.join(', ')}` : '') +
      (extra.length ? `; must not contain ${extra.join(', ')}` : '') +
      (missing.length
        ? `; marker not found for ${missing.join(', ')} (update DATASETS)`
        : ''),
  );
}
if (failed) process.exit(1);
