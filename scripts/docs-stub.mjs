/**
 * Builds the redirect-only GitHub Pages site that replaces the old TypeDoc
 * docs at chmuzamil.github.io/pakdatakit/ once pakdatakit.dev is live.
 *
 * Every old page (site/api-redirects.json, generated from TypeDoc's output by
 * site/scripts/api-redirects.mjs) becomes a tiny page with a canonical link,
 * a meta refresh and a plain link to its new address. Anything else that is
 * requested (404.html) goes to the API reference's front page.
 *
 * Usage: node scripts/docs-stub.mjs <out-dir>
 * docs.yml runs it only when the repository variable PDK_DOCS_STUB is "true".
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2];
if (!out) throw new Error('usage: node scripts/docs-stub.mjs <out-dir>');

const SITE = 'https://pakdatakit.dev';
const map = JSON.parse(
  readFileSync(join(root, 'site', 'api-redirects.json'), 'utf8'),
);

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const page = (to) => {
  const url = esc(new URL(to, SITE).href);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved to pakdatakit.dev</title>
<link rel="canonical" href="${url}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
<p>The PakDataKit docs have moved: <a href="${url}">${url}</a></p>
</body>
</html>
`;
};

rmSync(out, { recursive: true, force: true });
for (const [from, to] of Object.entries(map)) {
  const file = join(out, from);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(to));
}
writeFileSync(join(out, '404.html'), page('/api/typescript/'));
writeFileSync(join(out, '.nojekyll'), '');
console.log(
  `docs-stub: ${Object.keys(map).length} redirect pages written to ${out}`,
);
