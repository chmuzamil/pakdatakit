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
 * Text that only occurs in one dataset, to see which ones a bundle holds. A
 * field name followed by `:"` only appears in the inlined data, not in code.
 */
const DATASETS = {
  'post offices': 'town:"',
  'postal codes': 'postalCode:"',
  tehsils: 'sub-tehsil',
  divisions: 'Mekran',
  'area codes': 'Naushero Feroze',
};

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

let failed = false;
for (const c of CASES) {
  const result = await build({
    stdin: { contents: c.code, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    plugins: [selfPackage],
    external: c.external ?? [],
    logLevel: 'silent',
  });
  const text = result.outputFiles[0].text;
  const gz = gzipSync(text, { level: 9 }).length;
  const found = Object.entries(DATASETS)
    .filter(([, marker]) => text.includes(marker))
    .map(([dataset]) => dataset);
  const extra = found.filter((dataset) => !c.allowed.includes(dataset));
  const ok = gz <= c.limit && extra.length === 0;
  if (!ok) failed = true;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${c.name}: ${(text.length / 1024).toFixed(1)} kB, ` +
      `${(gz / 1024).toFixed(1)} kB gzipped (limit ${(c.limit / 1024).toFixed(1)} kB)` +
      (found.length ? `; contains ${found.join(', ')}` : '') +
      (extra.length ? `; must not contain ${extra.join(', ')}` : ''),
  );
}
if (failed) process.exit(1);
