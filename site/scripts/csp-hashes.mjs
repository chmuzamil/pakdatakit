/**
 * After `astro build`: makes every page's <meta> CSP cover all of its inline
 * scripts. Astro hashes the scripts it renders, but a few small inline scripts
 * inside Starlight components (search shortcut, theme and tab restore) are not
 * included. This adds the SHA-256 of any inline script a page's script-src does
 * not already allow, so the policy stays hash-only (no 'unsafe-inline').
 *
 * The TypeDoc reference under /api/ has no CSP of its own; it gets one here:
 * script-src limited to its own files plus the hash of each inline script,
 * and inline styles allowed (TypeDoc uses style attributes).
 *
 * Every page then carries its script-src and style-src in a <meta> CSP, so
 * the Nginx header leaves those two out (both policies are enforced).
 * Fails if a built page has no CSP meta.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const META = /<meta http-equiv="content-security-policy" content="([^"]*)"\s*\/?>/i;
const INLINE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
let pages = 0;
let added = 0;
const missing = [];
let typedoc = 0;

const hashOf = (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

for (const file of htmlFiles(dist)) {
  const rel = relative(dist, file).replace(/\\/g, '/');
  let html = readFileSync(file, 'utf8');
  if (rel.startsWith('api/') && !META.test(html)) {
    const hashes = new Set();
    for (const [, attrs, body] of html.matchAll(INLINE)) {
      if (!/type="application\/(ld\+)?json"/.test(attrs)) hashes.add(hashOf(body));
    }
    const policy = `script-src 'self' ${[...hashes].join(' ')}; style-src 'self' 'unsafe-inline'`.replace(/ ;/, ';');
    const tag = `<meta http-equiv="content-security-policy" content="${policy.replace(/'/g, '&#39;')}">`;
    if (!/<head>/i.test(html)) throw new Error(`csp-hashes: no <head> in ${rel}`);
    writeFileSync(file, html.replace(/<head>/i, (h) => `${h}${tag}`));
    typedoc++;
    continue;
  }
  const meta = META.exec(html);
  if (!meta) {
    missing.push(rel);
    continue;
  }
  const policy = meta[1].replace(/&#39;/g, "'");
  const have = new Set(policy.match(/'sha256-[^']+'/g) ?? []);
  const extra = [];
  for (const [, attrs, body] of html.matchAll(INLINE)) {
    if (/type="application\/(ld\+)?json"/.test(attrs)) continue; // data, not script
    const hash = hashOf(body);
    if (!have.has(hash)) {
      have.add(hash);
      extra.push(hash);
    }
  }
  if (extra.length) {
    const updated = policy.replace(/script-src ([^;]*)/, (m) => `${m} ${extra.join(' ')}`);
    html = html.replace(meta[0], meta[0].replace(meta[1], updated.replace(/'/g, '&#39;')));
    writeFileSync(file, html);
    added += extra.length;
  }
  pages++;
}

if (missing.length) {
  console.error(`csp-hashes: no CSP meta in ${missing.length} page(s): ${missing.slice(0, 5).join(', ')}`);
  process.exit(1);
}
console.log(`csp-hashes: ${pages} pages checked, ${added} script hash(es) added; CSP added to ${typedoc} API reference page(s)`);
