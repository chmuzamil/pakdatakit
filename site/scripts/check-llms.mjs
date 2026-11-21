/**
 * After `npm run build`: checks dist/llms.txt and dist/llms-full.txt.
 * - every https://pakdatakit.dev/... URL in them is a page or file in dist/;
 * - llms.txt lists every module guide, install page, tool and API module.
 * Absolute URLs are not followed by the link check (linkinator), so this is
 * what keeps llms.txt from pointing at pages that moved.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../site.config.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const problems = [];
const exists = (path) => {
  const p = join(dist, decodeURIComponent(path.split('#')[0]));
  return (
    (existsSync(p) && statSync(p).isFile()) || existsSync(join(p, 'index.html'))
  );
};

const txt = {};
for (const file of ['llms.txt', 'llms-full.txt']) {
  if (!existsSync(join(dist, file))) {
    problems.push(`dist/${file} is missing`);
    continue;
  }
  txt[file] = readFileSync(join(dist, file), 'utf8');
  const urls = new Set(
    [...txt[file].matchAll(/https:\/\/pakdatakit\.dev(\/[^\s)<>"'`\]]*)/g)].map(
      (m) => m[1].replace(/[.,;:]+$/, ''),
    ),
  );
  for (const path of urls)
    if (!exists(path)) problems.push(`${file}: ${SITE}${path} is not a page`);
}

const listed = txt['llms.txt'] ?? '';
const pages = (dir) =>
  existsSync(join(dist, dir))
    ? readdirSync(join(dist, dir)).filter((d) =>
        existsSync(join(dist, dir, d, 'index.html')),
      )
    : [];
const expect = [
  ...pages('docs').map((d) => `/docs/${d}/`),
  ...pages('use-cases').map((d) => `/use-cases/${d}/`),
  ...pages('install').map((d) => `/install/${d}/`),
  ...pages('tools').map((d) => `/tools/${d}/`),
  ...pages('api/typescript')
    // data-version has no subpath of its own (import it from 'pakdatakit')
    .filter((d) => d !== 'adapters' && d !== 'data-version')
    .map((d) => `/api/typescript/${d}/`),
  ...pages('api/typescript/adapters').map(
    (d) => `/api/typescript/adapters/${d}/`,
  ),
  '/api/typescript/',
  '/api/python/',
  '/api/dart/',
  '/api/dotnet/',
  '/api/php/',
  '/playground/',
];
for (const path of expect)
  if (!listed.includes(`${SITE}${path})`))
    problems.push(`llms.txt does not list ${SITE}${path}`);

if (problems.length) {
  console.error(
    `check-llms: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(
  `check-llms: llms.txt lists all ${expect.length} pages; every pakdatakit.dev URL in both files exists`,
);
