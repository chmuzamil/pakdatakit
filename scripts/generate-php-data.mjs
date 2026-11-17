#!/usr/bin/env node
/**
 * Generates the embedded data for the PHP package (php/).
 *
 *   node scripts/generate-php-data.mjs
 *
 * Writes, under php/data/:
 *
 * - <name>.php for every data/<name>.json, as a PHP array (the shared
 *   datasets, so the package reads no JSON at run time).
 * - data-version.php: `dataVersion` from src/data-version.ts.
 * - collation.php: the order `String.prototype.localeCompare` gives every
 *   dataset string the TypeScript library sorts, so the PHP port sorts like
 *   the npm package without the intl extension.
 * - unicode.php: JavaScript's case mappings and the canonical
 *   (de)composition data for NFC, taken from this Node.js runtime's ICU, so
 *   upper-casing (`ß` to `SS`), lower-casing and NFC behave as in JavaScript
 *   on every PHP version, without the intl extension.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const outDir = join(root, 'php', 'data');
mkdirSync(outDir, { recursive: true });

const HEADER =
  '<?php\n\n// GENERATED - do not edit; run node scripts/generate-php-data.mjs\n\n';

/** A PHP single-quoted string literal. */
const phpString = (text) =>
  `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** A PHP literal for a JSON value. */
function phpValue(value, indent = '') {
  if (value === null) return 'null';
  if (typeof value === 'string') return phpString(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const inner = `${indent}    `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return `[${value.map((item) => phpValue(item)).join(', ')}]`;
    }
    return `[\n${value
      .map((item) => `${inner}${phpValue(item, inner)},`)
      .join('\n')}\n${indent}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '[]';
  const flat = entries.every(([, v]) => typeof v !== 'object' || v === null);
  if (flat) {
    return `[${entries
      .map(([k, v]) => `${phpString(k)} => ${phpValue(v)}`)
      .join(', ')}]`;
  }
  return `[\n${entries
    .map(([k, v]) => `${inner}${phpString(k)} => ${phpValue(v, inner)},`)
    .join('\n')}\n${indent}]`;
}

const written = [];
function write(name, body) {
  writeFileSync(join(outDir, name), `${HEADER}${body}`);
  written.push(name);
}

// ---------------------------------------------------------------------------
// 1. Datasets
// ---------------------------------------------------------------------------

const datasets = {};
for (const name of readdirSync(dataDir)
  .filter((file) => file.endsWith('.json'))
  .sort()) {
  const base = name.slice(0, -'.json'.length);
  const value = JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
  datasets[base] = value;
  write(
    `${base}.php`,
    `// Contents of data/${name}.\nreturn ${phpValue(value)};\n`,
  );
}

const version = /'(\d{4}-\d{2}-\d{2})'/.exec(
  readFileSync(join(root, 'src', 'data-version.ts'), 'utf8'),
);
if (!version) throw new Error('dataVersion not found in src/data-version.ts');
write(
  'data-version.php',
  `// dataVersion from src/data-version.ts.\nreturn ${phpString(version[1])};\n`,
);

// ---------------------------------------------------------------------------
// 2. Collation order of dataset strings (localeCompare)
// ---------------------------------------------------------------------------

const sortable = new Set();
for (const entry of datasets.cities) sortable.add(entry.city);
for (const entry of datasets.districts) sortable.add(entry.district);
for (const entry of datasets.divisions) {
  sortable.add(entry.division);
  for (const district of entry.districts) sortable.add(district);
}
for (const entry of datasets.tehsils) {
  sortable.add(entry.tehsil);
  sortable.add(entry.censusDistrict);
  if (entry.currentDistrict) sortable.add(entry.currentDistrict);
}
for (const entry of datasets['postal-codes']) {
  sortable.add(entry.postalCode);
  if (entry.area) sortable.add(entry.area);
}
const ordered = [...sortable].sort((a, b) => a.localeCompare(b));
const ranks = [];
let rank = 0;
ordered.forEach((text, i) => {
  if (i > 0 && ordered[i - 1].localeCompare(text) !== 0) rank += 1;
  ranks.push(`    ${phpString(text)} => ${rank},`);
});
write(
  'collation.php',
  '// Rank of each dataset string in localeCompare order (equal strings share\n' +
    `// a rank).\nreturn [\n${ranks.join('\n')}\n];\n`,
);

// ---------------------------------------------------------------------------
// 3. Unicode tables
// ---------------------------------------------------------------------------

const MAX = 0x10ffff;
const isSurrogate = (cp) => cp >= 0xd800 && cp <= 0xdfff;
const S = (cp) => String.fromCodePoint(cp);

const upper = [];
const lower = [];
const decompositions = [];
const nonStarters = [];
const composites = [];

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

for (let cp = 0; cp <= MAX; cp += 1) {
  if (isSurrogate(cp)) continue;
  const char = S(cp);
  if (cp >= 0x80) {
    const up = char.toUpperCase();
    if (up !== char) upper.push([cp, up]);
    // Final sigma is context dependent; the PHP code applies it.
    const low = char.toLowerCase();
    if (low !== char) lower.push([cp, low]);
  }

  if (cp >= HANGUL_FIRST && cp <= HANGUL_LAST) continue; // algorithmic
  const nfd = char.normalize('NFD');
  if (nfd !== char) {
    decompositions.push([cp, nfd]);
    if (char.normalize('NFC') === char) composites.push([cp, nfd]);
    continue;
  }
  // Non-zero canonical combining class: reordered against U+0345 (ccc 240)
  // or U+0334 (ccc 1).
  if (
    `ͅ${char}`.normalize('NFD') !== `ͅ${char}` ||
    `${char}̴`.normalize('NFD') !== `${char}̴`
  ) {
    nonStarters.push(cp);
  }
}

// Order non-starters by combining class, using canonical reordering.
function compareClass(a, b) {
  const ab = S(a) + S(b);
  const ba = S(b) + S(a);
  if (ab.normalize('NFD') === ba) return 1;
  if (ba.normalize('NFD') === ab) return -1;
  return 0;
}
nonStarters.sort(compareClass);
const classRanks = [];
let classRank = 1;
nonStarters.forEach((cp, i) => {
  if (i > 0 && compareClass(nonStarters[i - 1], cp) !== 0) classRank += 1;
  classRanks.push([cp, classRank]);
});

// Primary composites: pairs (first, second) that NFC composes to `cp`.
const pairs = [];
for (const [cp, nfd] of composites) {
  const chars = [...nfd];
  if (chars.length < 2) continue;
  const second = chars[chars.length - 1];
  const first = chars.slice(0, -1).join('').normalize('NFC');
  if ([...first].length !== 1) continue;
  if ((first + second).normalize('NFC') !== S(cp)) continue;
  pairs.push([first.codePointAt(0), second.codePointAt(0), cp]);
}

function ranges(regex) {
  const out = [];
  let start = -1;
  for (let cp = 0; cp <= MAX + 1; cp += 1) {
    const match = cp <= MAX && !isSurrogate(cp) && regex.test(S(cp));
    if (match && start < 0) start = cp;
    if (!match && start >= 0) {
      out.push(start, cp - 1);
      start = -1;
    }
  }
  return out;
}

const mapLines = (entries) =>
  entries
    .map(([cp, text]) => `        ${cp} => ${phpString(text)},`)
    .join('\n');
const intLines = (values) => {
  const lines = [];
  for (let i = 0; i < values.length; i += 12) {
    lines.push(`        ${values.slice(i, i + 12).join(', ')},`);
  }
  return lines.join('\n');
};

write(
  'unicode.php',
  `// Unicode ${process.versions.unicode} data from ICU ${process.versions.icu}, as used by JavaScript engines.\n` +
    'return [\n' +
    '    // String.prototype.toUpperCase of every non-ASCII code point it changes.\n' +
    `    'upper' => [\n${mapLines(upper)}\n    ],\n` +
    '    // String.prototype.toLowerCase of every non-ASCII code point it changes\n' +
    '    // (without the context-dependent final sigma rule).\n' +
    `    'lower' => [\n${mapLines(lower)}\n    ],\n` +
    '    // Inclusive (start, end) code point ranges with the Cased property.\n' +
    `    'cased' => [\n${intLines(ranges(/^\p{Cased}$/u))}\n    ],\n` +
    '    // Inclusive (start, end) ranges with the Case_Ignorable property.\n' +
    `    'caseIgnorable' => [\n${intLines(ranges(/^\p{Case_Ignorable}$/u))}\n    ],\n` +
    '    // Full canonical decomposition (NFD) of every code point that has one,\n' +
    '    // except Hangul syllables, which are decomposed algorithmically.\n' +
    `    'decompositions' => [\n${mapLines(decompositions)}\n    ],\n` +
    '    // A rank that sorts non-starters like their canonical combining class.\n' +
    `    'classRanks' => [\n${classRanks
      .map(([cp, r]) => `        ${cp} => ${r},`)
      .join('\n')}\n    ],\n` +
    '    // Canonical compositions: first * 0x200000 + second => composite.\n' +
    `    'compositions' => [\n${pairs
      .map(([a, b, cp]) => `        ${a * 0x200000 + b} => ${cp},`)
      .join('\n')}\n    ],\n` +
    '];\n',
);

console.log(
  `Wrote ${written.length} files to ${outDir}: ${Object.keys(datasets).length} datasets, ` +
    `${ranks.length} collation ranks, ${upper.length}/${lower.length} case mappings, ` +
    `${decompositions.length} decompositions (Unicode ${process.versions.unicode}).`,
);
