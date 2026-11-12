#!/usr/bin/env node
/**
 * Generates the Unicode case data for the .NET package (dotnet/).
 *
 *   node scripts/generate-dotnet-data.mjs
 *
 * Writes dotnet/src/PakDataKit/Generated/unicode-case.json: JavaScript's
 * `toUpperCase` and `toLowerCase` mappings, taken from this Node.js runtime's
 * ICU, so the .NET port upper- and lowercases text exactly like the npm
 * package on every machine (.NET's own invariant casing maps one character to
 * one character, so `ß` would not become `SS`).
 *
 * The datasets themselves (data/*.json) are not generated: the .NET project
 * embeds them straight from data/ when it is built.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dotnet', 'src', 'PakDataKit', 'Generated');
mkdirSync(outDir, { recursive: true });

const MAX = 0x10ffff;
const isSurrogate = (cp) => cp >= 0xd800 && cp <= 0xdfff;
const S = (cp) => String.fromCodePoint(cp);
const hex = (cp) => cp.toString(16);
/** A string as space-separated hex code points. */
const points = (text) => [...text].map((c) => hex(c.codePointAt(0))).join(' ');

const upper = {};
const lower = {};
for (let cp = 0x80; cp <= MAX; cp += 1) {
  if (isSurrogate(cp)) continue;
  const char = S(cp);
  const up = char.toUpperCase();
  if (up !== char) upper[hex(cp)] = points(up);
  // Final sigma is context dependent; the .NET code applies it.
  const low = char.toLowerCase();
  if (low !== char) lower[hex(cp)] = points(low);
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

const data = {
  comment:
    'GENERATED - do not edit; run node scripts/generate-dotnet-data.mjs. ' +
    `Unicode ${process.versions.unicode} (ICU ${process.versions.icu}). ` +
    'upper/lower: code point -> mapped code points (hex) for every non-ASCII ' +
    'code point JavaScript changes. cased/caseIgnorable: inclusive ranges.',
  upper,
  lower,
  cased: ranges(/^\p{Cased}$/u),
  caseIgnorable: ranges(/^\p{Case_Ignorable}$/u),
};

const file = join(outDir, 'unicode-case.json');
writeFileSync(file, `${JSON.stringify(data)}\n`);
console.log(
  `Wrote ${file}: ${Object.keys(upper).length} upper and ` +
    `${Object.keys(lower).length} lower mappings (Unicode ${process.versions.unicode}).`,
);
