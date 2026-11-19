/**
 * Every module the package exports has a guide on pakdatakit.dev. Fails when:
 * - a subpath in the root package.json "exports" (pakdatakit/<name>) is not
 *   imported in any guide (site/src/content/docs/docs/*.mdx);
 * - a guide has no title or description, or no link to the TypeScript API
 *   reference;
 * - a guide's <LangTabs module="…"> names a missing site/examples file, or an
 *   examples file has no guide that shows it.
 * Runs before the build (it only reads sources): npm run check:guides.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('..', import.meta.url));
const root = join(site, '..');
const guidesDir = join(site, 'src', 'content', 'docs', 'docs');
const examplesDir = join(site, 'examples');
const problems = [];

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const subpaths = Object.keys(pkg.exports)
  .filter((k) => k !== '.' && k !== './package.json')
  .map((k) => k.slice(2));

const guides = readdirSync(guidesDir)
  .filter((f) => f.endsWith('.mdx') && f !== 'index.mdx')
  .map((f) => ({
    file: `docs/${f}`,
    text: readFileSync(join(guidesDir, f), 'utf8').replace(/\r\n/g, '\n'),
  }));

const text = guides.map((g) => g.text).join('\n');
for (const sub of subpaths)
  if (!new RegExp(`['"\`]pakdatakit/${sub}['"\`]`).test(text))
    problems.push(
      `pakdatakit/${sub} has no guide: import it in a page in site/src/content/docs/docs/`,
    );

const shown = new Set();
for (const { file, text: body } of guides) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(body)?.[1] ?? '';
  for (const key of ['title', 'description'])
    if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(fm))
      problems.push(`${file}: no ${key} in the front matter`);
  if (!/\]\(\/api\/typescript\/[^)]*\)|href="\/api\/typescript\//.test(body))
    problems.push(`${file}: no link to the TypeScript API reference`);
  for (const [, mod] of body.matchAll(/<LangTabs\s+module="([^"]+)"/g)) {
    shown.add(mod);
    if (!existsSync(join(examplesDir, `${mod}.json`)))
      problems.push(`${file}: site/examples/${mod}.json does not exist`);
  }
}
const homeExamples = new Set(['home']); // the home page demo
for (const f of readdirSync(examplesDir).filter((f) => f.endsWith('.json'))) {
  const mod = f.replace(/\.json$/, '');
  if (!shown.has(mod) && !homeExamples.has(mod))
    problems.push(`site/examples/${f} is not shown in any guide`);
}

if (problems.length) {
  console.error(
    `Guides: ${problems.length} problem(s)\n${problems.join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `Guides: all ${subpaths.length} exported modules have a guide (${guides.length} guides).`,
);
