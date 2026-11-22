// Usage: node scripts/generate-latin-fold-php.mjs php/src/Internal/LatinFold.php
// The table follows the Node.js running it (its Unicode version).
// Generates php/src/Internal/LatinFold.php: for every non-ASCII code point
// whose NFKD form, with U+0300-036F removed, is empty or contains a-z, that
// form with every character other than a-z replaced by a space.
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const entries = [];
for (let cp = 0x80; cp <= 0x10ffff; cp += 1) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue;
  const reduced = String.fromCodePoint(cp)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  if (reduced !== '' && !/[a-z]/.test(reduced)) continue;
  const folded = [...reduced]
    .map((c) => (/^[a-z]$/.test(c) ? c : ' '))
    .join('');
  entries.push([cp, folded]);
}

const lines = [];
for (let i = 0; i < entries.length; i += 6) {
  lines.push(
    '        ' +
      entries
        .slice(i, i + 6)
        .map(([cp, s]) => `0x${cp.toString(16).toUpperCase()} => '${s}',`)
        .join(' '),
  );
}

const php = `<?php

declare(strict_types=1);

namespace PakDataKit\\Internal;

/**
 * What JavaScript's \`normalize('NFKD')\` followed by removing U+0300-036F
 * leaves of a non-ASCII code point, reduced to the letters a-z: every other
 * character becomes a space. Code points not listed leave no a-z letter
 * (they become one space). Used by Text::romanUrduKey(), so that it needs
 * neither the intl extension nor PHP's own Unicode version.
 *
 * Generated from Node.js ${process.versions.node} (Unicode ${process.versions.unicode}, ICU ${process.versions.icu}); ${entries.length} code points.
 *
 * @internal
 */
final class LatinFold
{
    /** @var array<int, string> code point => a-z letters and spaces ('' when nothing is left) */
    public const MAP = [
${lines.join('\n')}
    ];
}
`;
writeFileSync(out, php);
console.log(`${entries.length} entries`);
