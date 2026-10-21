#!/usr/bin/env node
/**
 * Generates the embedded data for the Dart package (dart/).
 *
 *   node scripts/generate-dart-data.mjs
 *
 * Writes, under dart/lib/src/data/:
 * - <name>.g.dart for every data/<name>.json, as a const Dart literal (the
 *   shared datasets, embedded so the package needs no file access and works
 *   on every platform, including the web).
 * - collation.g.dart: the order `String.prototype.localeCompare` gives every
 *   dataset string the TypeScript library sorts (city, district, postal code
 *   and area names), so the Dart port sorts exactly like the npm package.
 * - unicode.g.dart: JavaScript's case mappings and the canonical
 *   (de)composition data for NFC, taken from this Node.js runtime's ICU, so
 *   `toUpperCase`, `toLowerCase` and `normalize('NFC')` behave as in
 *   JavaScript on every Dart platform.
 *
 * Then runs `dart format` on the output, if the Dart SDK is installed.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const outDir = join(root, 'dart', 'lib', 'src', 'data');
mkdirSync(outDir, { recursive: true });

const HEADER =
  '// GENERATED — do not edit; run node scripts/generate-dart-data.mjs\n';

// ---------------------------------------------------------------------------
// Dart literals
// ---------------------------------------------------------------------------

const ESCAPE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Zs}\p{Mn}\p{Me}\p{Cs}\p{Co}\p{Cn}]/u;

/** A single-quoted Dart string literal. */
function dartString(text, asciiOnly = false) {
  let out = "'";
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (char === '\\') out += '\\\\';
    else if (char === "'") out += "\\'";
    else if (char === '$') out += '\\$';
    else if (char === '\n') out += '\\n';
    else if (char === '\r') out += '\\r';
    else if (char === '\t') out += '\\t';
    else if (char !== ' ' && (ESCAPE.test(char) || (asciiOnly && cp > 0x7e))) {
      out += `\\u{${cp.toString(16)}}`;
    } else out += char;
  }
  return `${out}'`;
}

function dartValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number in data');
    return String(value);
  }
  if (typeof value === 'string') return dartString(value);
  if (Array.isArray(value)) {
    const items = value.map(dartValue);
    return `<Object?>[${items.join(', ')}${items.length > 1 ? ',' : ''}]`;
  }
  const entries = Object.entries(value).map(
    ([key, item]) => `${dartString(key)}: ${dartValue(item)}`,
  );
  return `<String, Object?>{${entries.join(', ')}${entries.length > 1 ? ',' : ''}}`;
}

const camel = (name) =>
  name.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());

const written = [];
function write(name, body) {
  const file = join(outDir, name);
  writeFileSync(file, `${HEADER}\n${body}`);
  written.push(file);
}

// ---------------------------------------------------------------------------
// 1. Datasets
// ---------------------------------------------------------------------------

const dataFiles = readdirSync(dataDir)
  .filter((name) => name.endsWith('.json'))
  .sort();
const datasets = {};
for (const name of dataFiles) {
  const base = name.slice(0, -'.json'.length);
  const value = JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
  datasets[base] = value;
  const type = Array.isArray(value) ? 'List<Object?>' : 'Map<String, Object?>';
  write(
    `${base.replace(/-/g, '_')}.g.dart`,
    `/// Contents of \`data/${name}\`.\n` +
      `const ${type} ${camel(base)}Json = ${dartValue(value)};\n`,
  );
}

// ---------------------------------------------------------------------------
// 2. Collation order of dataset strings (localeCompare)
// ---------------------------------------------------------------------------

const sortable = new Set();
for (const entry of datasets.cities) sortable.add(entry.city);
for (const entry of datasets.districts) sortable.add(entry.district);
for (const entry of datasets['postal-codes']) {
  sortable.add(entry.postalCode);
  if (entry.area) sortable.add(entry.area);
}
const ordered = [...sortable].sort((a, b) => a.localeCompare(b));
const rankLines = [];
let rank = 0;
ordered.forEach((text, i) => {
  if (i > 0 && ordered[i - 1].localeCompare(text) !== 0) rank += 1;
  rankLines.push(`  ${dartString(text)}: ${rank},`);
});
write(
  'collation.g.dart',
  '/// Rank of each dataset string in `localeCompare` order (equal strings\n' +
    '/// share a rank).\n' +
    `const Map<String, int> collationRanks = <String, int>{\n${rankLines.join('\n')}\n};\n`,
);

// ---------------------------------------------------------------------------
// 3. Unicode tables
// ---------------------------------------------------------------------------

const MAX = 0x10ffff;
const isSurrogate = (cp) => cp >= 0xd800 && cp <= 0xdfff;
const S = (cp) => String.fromCodePoint(cp);
const hex = (cp) => `0x${cp.toString(16).toUpperCase()}`;

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
  const up = char.toUpperCase();
  if (up !== char) upper.push([cp, up]);
  // Final sigma is context dependent; the Dart code applies it.
  const low = char.toLowerCase();
  if (low !== char) lower.push([cp, low]);

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
const cased = ranges(/^\p{Cased}$/u);
const caseIgnorable = ranges(/^\p{Case_Ignorable}$/u);

const mapLines = (entries) =>
  entries.map(([cp, text]) => `  ${hex(cp)}: ${dartString(text, true)},`).join('\n');
const intList = (values) => {
  const lines = [];
  for (let i = 0; i < values.length; i += 8) {
    lines.push(`  ${values.slice(i, i + 8).map(hex).join(', ')},`);
  }
  return lines.join('\n');
};

write(
  'unicode.g.dart',
  `/// Unicode data from ICU ${process.versions.icu} (Unicode ${process.versions.unicode}),\n` +
    '/// as used by JavaScript engines.\n' +
    'library;\n\n' +
    '/// `String.prototype.toUpperCase` of every code point it changes.\n' +
    `const Map<int, String> upperCaseMap = <int, String>{\n${mapLines(upper)}\n};\n\n` +
    '/// `String.prototype.toLowerCase` of every code point it changes\n' +
    '/// (without the context-dependent final sigma rule).\n' +
    `const Map<int, String> lowerCaseMap = <int, String>{\n${mapLines(lower)}\n};\n\n` +
    '/// Code point ranges (inclusive start, end pairs) with the Cased property.\n' +
    `const List<int> casedRanges = <int>[\n${intList(cased)}\n];\n\n` +
    '/// Code point ranges (inclusive start, end pairs) with the\n' +
    '/// Case_Ignorable property.\n' +
    `const List<int> caseIgnorableRanges = <int>[\n${intList(caseIgnorable)}\n];\n\n` +
    '/// Full canonical decomposition (NFD) of every code point that has one,\n' +
    '/// except Hangul syllables, which are decomposed algorithmically.\n' +
    `const Map<int, String> canonicalDecompositions = <int, String>{\n${mapLines(decompositions)}\n};\n\n` +
    '/// Canonical combining class order of non-starters: a rank that sorts like\n' +
    '/// the combining class (starters, class 0, are not listed).\n' +
    `const Map<int, int> combiningClassRanks = <int, int>{\n${classRanks
      .map(([cp, r]) => `  ${hex(cp)}: ${r},`)
      .join('\n')}\n};\n\n` +
    '/// Canonical compositions: `first * 0x200000 + second` to the composite\n' +
    '/// (Hangul syllables are composed algorithmically).\n' +
    `const Map<int, int> canonicalCompositions = <int, int>{\n${pairs
      .map(([a, b, cp]) => `  ${a * 0x200000 + b}: ${hex(cp)},`)
      .join('\n')}\n};\n`,
);

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

try {
  // A fixed command line (no user input), run through the shell so the
  // Windows `dart.bat` launcher is found too.
  execSync('dart format lib/src/data', {
    cwd: join(root, 'dart'),
    stdio: 'inherit',
  });
} catch {
  console.warn('dart format failed or the Dart SDK is not installed;');
  console.warn('run `dart format lib/src/data` in dart/ before committing.');
}

console.log(
  `Wrote ${written.length} files to ${outDir}: ${dataFiles.length} datasets, ` +
    `${ordered.length} collation ranks, ${upper.length}/${lower.length} case ` +
    `mappings, ${decompositions.length} decompositions, ${classRanks.length} ` +
    `non-starters, ${pairs.length} compositions.`,
);
