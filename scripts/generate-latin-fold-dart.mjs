// Usage (then format it, as CI checks the format):
//   node scripts/generate-latin-fold-dart.mjs dart/lib/src/internal/latin_fold.dart
//   (cd dart && dart format lib/src/internal/latin_fold.dart)
// The table follows the Node.js running it (its Unicode version).
// Writes dart/lib/src/internal/latin_fold.dart: for each code point whose
// NFKD form, without U+0300-036F, differs from "itself if a-z, else a word
// break", what it becomes ('a'-'z' kept, anything else a space).
import { writeFileSync } from 'node:fs';

const entries = [];
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue;
  if (cp >= 0x300 && cp <= 0x36f) continue; // removed by a rule
  const s = String.fromCodePoint(cp);
  const n = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const proj = n.replace(/[^a-z]+/g, ' ');
  const def = /^[a-z]$/.test(s) ? s : ' ';
  if (proj !== def) entries.push([cp, proj]);
}

const hex = (cp) => '0x' + cp.toString(16);
const items = entries.map(([cp, v]) => `${hex(cp)}: '${v}'`);
const lines = [];
let line = '  ';
for (const item of items) {
  if (line.length + item.length + 2 > 80) {
    lines.push(line.trimEnd());
    line = '  ';
  }
  line += item + ', ';
}
if (line.trim()) lines.push(line.trimEnd());

const out = `// Compatibility decompositions for romanUrduKey, from Node.js
// String.prototype.normalize('NFKD') with Unicode ${process.versions.unicode}.
//
// For each code point (after lowercasing) whose NFKD form, without the
// combining marks U+0300-036F, is not simply itself as a letter a-z or a
// word break: what it becomes, with a-z kept and anything else a space.
// U+0300-036F themselves are removed by a rule and are not listed.
//
// ignore_for_file: lines_longer_than_80_chars

/// Code point → its NFKD form without combining marks, a-z kept and
/// anything else a space. ${entries.length} entries.
const Map<int, String> latinFold = <int, String>{
${lines.join('\n')}
};
`;
writeFileSync(process.argv[2], out);
console.log(entries.length);
