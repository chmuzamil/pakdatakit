/**
 * Checks the Python, Dart, .NET and PHP API reference (npm run check:api).
 * Fails when:
 *
 * 1. a public function or method in a port's source has no entry in
 *    site/api-data/<port>.json (or the file lists one the source no longer
 *    has): regenerate with `npm run api:extract`. The source is read here
 *    with simple patterns, independently of the extractors, so a broken or
 *    stale extraction is caught too;
 * 2. an entry (function, method, class, enum, type or constant) has no
 *    description: write a doc comment in the port's source;
 * 3. a generated page is missing, has no title or description, shares a
 *    title with another page, or lacks the heading of one of its entries;
 * 4. after `npm run build` (when dist/ exists): a page is not built, an
 *    entry's anchor is not on its built page, or a page is not in the
 *    sitemap, or the landing page does not show the port's version.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../site.config.mjs';
import {
  PORTS,
  portApi,
  portVersion,
  repoRoot,
  sectionOf,
} from '../src/lib/api-ports.mjs';

const root = repoRoot(fileURLToPath(new URL('.', import.meta.url)));
const site = join(root, 'site');
const problems = [];
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n');
const files = (dir, ext) => {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        if (
          ![
            'bin',
            'obj',
            'Internal',
            'internal',
            'Generated',
            '_internal',
            'data',
          ].includes(name)
        )
          walk(p);
      } else if (name.endsWith(ext)) out.push(p);
    }
  };
  walk(join(root, dir));
  return out.sort();
};
const rel = (p) => relative(root, p).replace(/\\/g, '/');

// ------------------------------------------------ 1. source vs extraction --

/** Public functions and methods found in each port's source, as "Owner.name". */
const scanned = {
  python() {
    const found = new Set();
    for (const file of files('python/src/pakdatakit', '.py')) {
      const name = file.replace(/\\/g, '/').split('/').pop();
      if (name.startsWith('_')) continue;
      const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const all = /^__all__ = \[([\s\S]*?)\]/m.exec(src);
      const exported = all
        ? new Set([...all[1].matchAll(/"(\w+)"/g)].map((m) => m[1]))
        : null;
      const isPublic = (n) => (exported ? exported.has(n) : !n.startsWith('_'));
      for (const m of src.matchAll(/^def (\w+)\(/gm))
        if (isPublic(m[1])) found.add(m[1]);
      // Re-exported functions (from ._internal.x import name).
      for (const m of src.matchAll(
        /^from \.(_\w+(?:\.\w+)*) import ([^\n(]+|\([^)]*\))/gm,
      ))
        for (const n of m[2].replace(/[()]/g, '').split(','))
          if (exported?.has(n.trim())) {
            const target = join(
              root,
              'python/src/pakdatakit',
              `${m[1].replace(/\./g, '/')}.py`,
            );
            if (
              existsSync(target) &&
              new RegExp(`^def ${n.trim()}\\(`, 'm').test(
                readFileSync(target, 'utf8'),
              )
            )
              found.add(n.trim());
          }
      // Methods of public classes: "    def name(" not starting with _ and not a @property.
      let cls = null;
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        const c = /^class (\w+)/.exec(line);
        if (c) cls = isPublic(c[1]) ? c[1] : null;
        else if (/^\S/.test(line)) cls = null;
        const d = /^ {4}def ([a-zA-Z]\w*)\(/.exec(line);
        if (cls && d && !/@property/.test(lines[i - 1] ?? ''))
          found.add(`${cls}.${d[1]}`);
      });
    }
    return found;
  },
  dart() {
    const found = new Set();
    const main = read('dart/lib/pakdatakit.dart');
    const hidden = new Set(
      [...main.matchAll(/hide ([\w, ]+);/g)].flatMap((m) =>
        m[1].split(',').map((s) => s.trim()),
      ),
    );
    // A return type: a class name or a core type, maybe generic or nullable.
    const TYPE = String.raw`(?:[A-Z]\w*|bool|int|double|num|void|dynamic)(?:<[^()]*>)?\??`;
    const TOP = new RegExp(
      String.raw`^${TYPE}\s+([a-zA-Z]\w*)\s*(?:<[^>]*>)?\(`,
    );
    const METHOD = new RegExp(
      String.raw`^ {2}(?:static\s+)?${TYPE}\s+([a-zA-Z]\w*)\s*(?:<[^>]*>)?\(`,
    );
    const CLASS =
      /^(?:(?:abstract|sealed|final|base|interface|mixin)\s+)*(?:class|enum|mixin|extension)\s+(\w+)/;
    const scan = (src, only) => {
      let cls = null;
      for (const line of src.split('\n')) {
        const c = CLASS.exec(line);
        if (c) {
          cls = c[1].startsWith('_') || (only && !only.has(c[1])) ? null : c[1];
          continue;
        }
        if (line === '}') {
          cls = null;
          continue;
        }
        if (/^\s/.test(line)) {
          const m = METHOD.exec(line);
          if (cls && m && m[1] !== 'toString') found.add(`${cls}.${m[1]}`);
          continue;
        }
        const f = TOP.exec(line);
        if (f && !hidden.has(f[1]) && (!only || only.has(f[1])))
          found.add(f[1]);
      }
    };
    for (const file of files('dart/lib/src', '.dart')) {
      const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      scan(src);
      // Names a src file re-exports from src/internal/.
      for (const m of src.matchAll(
        /^export '(internal\/\w+\.dart)' show ([\w, ]+);/gm,
      ))
        scan(
          read(`dart/lib/src/${m[1]}`),
          new Set(m[2].split(',').map((s) => s.trim())),
        );
    }
    return found;
  },
  dotnet() {
    const found = new Set();
    for (const file of files('dotnet/src', '.cs')) {
      const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      let cls = null;
      for (const line of src.split('\n')) {
        const t =
          /^(\w+(?:\s+\w+)*)\s+(?:class|record|struct|interface|enum)\s+(\w+)/.exec(
            line,
          );
        if (t) {
          cls = /\bpublic\b/.test(t[1]) ? t[2] : null;
          continue;
        }
        const m =
          /^ {4}public\s+(?:(?:static|override|virtual|abstract|sealed|new|async|extern|unsafe)\s+)*(?!class\b|record\b|struct\b|enum\b|interface\b|const\b|event\b|delegate\b|readonly\b)([\w<>[\]?,.() ]+?)\s+(\w+)\s*(?:<[^>]*>)?\s*\(/.exec(
            line,
          );
        if (cls && m && m[2] !== cls && !/\boperator\b/.test(line))
          found.add(`${cls}.${m[2]}`);
      }
    }
    return found;
  },
  php() {
    const found = new Set();
    for (const file of files('php/src', '.php')) {
      const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const ns = /^namespace ([\w\\]+);/m.exec(src)?.[1] ?? '';
      const c =
        /^(?:(?:final|abstract|readonly)\s+)*(?:class|interface|enum|trait)\s+(\w+)/m.exec(
          src,
        );
      if (!c) continue;
      const owner = `${ns}\\${c[1]}`.replace(/^PakDataKit\\(Laravel\\)?/, '');
      // A public method, with the docblock right above it (to skip @internal).
      for (const m of src.matchAll(
        /(\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*)?^ {4}(?:(?:final|abstract|static)\s+)*public\s+(?:static\s+)?function\s+(\w+)\s*\(/gm,
      ))
        if (!m[2].startsWith('__') && !/@internal\b/.test(m[1] ?? ''))
          found.add(`${owner}::${m[2]}`);
    }
    return found;
  },
};

for (const port of Object.keys(PORTS)) {
  const api = portApi(port, root);
  const sep = port === 'php' ? '::' : '.';
  const listed = new Set();
  for (const mod of api.modules)
    for (const e of mod.entries) {
      if (e.kind === 'function') listed.add(e.name);
      for (const m of e.methods ?? [])
        if (m.kind === 'method') listed.add(`${e.name}${sep}${m.name}`);
    }
  const inSource = scanned[port]();
  for (const name of inSource)
    if (!listed.has(name))
      problems.push(
        `${port}: ${name} is public in the source but has no API entry (run npm run api:extract)`,
      );
  for (const name of listed)
    if (!inSource.has(name))
      problems.push(
        `${port}: ${name} is in site/api-data/${port}.json but not in the source (run npm run api:extract)`,
      );
}

// ------------------------------------------------------ 2. descriptions --

for (const port of Object.keys(PORTS)) {
  for (const mod of portApi(port, root).modules)
    for (const e of mod.entries) {
      if (!e.doc?.trim())
        problems.push(
          `${port}: ${e.name} (${e.kind}, ${mod.id}) has no description`,
        );
      for (const m of e.methods ?? [])
        if (m.kind === 'method' && !m.doc?.trim())
          problems.push(
            `${port}: ${e.name}${port === 'php' ? '::' : '.'}${m.name}() (${mod.id}) has no description`,
          );
    }
}

// ------------------------------------------------------ 3. generated pages --

const content = join(site, 'src', 'content', 'docs');
const frontmatter = (text) => {
  const fm =
    /^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, '\n'))?.[1] ?? '';
  const get = (k) => {
    const m = new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(fm)?.[1]?.trim();
    if (!m) return undefined;
    try {
      return m.startsWith('"') ? JSON.parse(m) : m.replace(/^'|'$/g, '');
    } catch {
      return m;
    }
  };
  return { title: get('title'), description: get('description') };
};
const titles = new Map();
const walkContent = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walkContent(p);
    else if (/\.mdx?$/.test(name)) {
      const { title } = frontmatter(readFileSync(p, 'utf8'));
      if (title) titles.set(title, [...(titles.get(title) ?? []), rel(p)]);
    }
  }
};
if (!existsSync(join(content, 'api', 'python')))
  problems.push(
    'No generated API pages: run `npm run build` (or node scripts/generate.mjs) first',
  );
else walkContent(content);

const pages = [];
for (const port of Object.keys(PORTS)) {
  const api = portApi(port, root);
  const dir = join(content, 'api', port);
  for (const id of ['index', ...api.modules.map((m) => m.id)]) {
    const file = join(dir, `${id}.md`);
    if (!existsSync(file)) {
      problems.push(`${rel(file)} was not generated`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const { title, description } = frontmatter(text);
    if (!title) problems.push(`${rel(file)} has no title`);
    if (!description || description.length < 50)
      problems.push(`${rel(file)} has no description (or a very short one)`);
    if (title && titles.get(title)?.length > 1)
      problems.push(
        `${rel(file)}: title "${title}" is also used by ${titles
          .get(title)
          .filter((f) => f !== rel(file))
          .join(', ')}`,
      );
    const url = id === 'index' ? `/api/${port}/` : `/api/${port}/${id}/`;
    const mod = api.modules.find((m) => m.id === id);
    const anchors = [];
    for (const e of mod?.entries ?? []) {
      anchors.push(e);
      for (const m of e.methods ?? []) anchors.push(m);
    }
    pages.push({ port, url, file, anchors, mod });
  }
}

// Headings are matched by text here and by id in the built pages.
for (const page of pages) {
  if (!page.mod || !existsSync(page.file)) continue;
  const headings = new Set(
    [...readFileSync(page.file, 'utf8').matchAll(/^#{3,4} (.+)$/gm)].map(
      (m) => m[1],
    ),
  );
  for (const e of page.mod.entries) {
    const h = sectionOf(e.kind) === 'function' ? `${e.name}()` : e.name;
    if (!headings.has(h))
      problems.push(`${rel(page.file)}: no heading for ${e.name}`);
    for (const m of e.methods ?? [])
      if (
        ![...headings].some((x) =>
          x.startsWith(
            `${e.name}${page.port === 'php' ? '::' : '.'}${m.kind === 'constructor' ? 'constructor' : m.name}`,
          ),
        )
      )
        problems.push(`${rel(page.file)}: no heading for ${e.name} ${m.name}`);
  }
}

// ------------------------------------------------------------ 4. built site --

const dist = join(site, 'dist');
let built = 0;
if (existsSync(join(dist, 'index.html'))) {
  const sitemap = readdirSync(dist)
    .filter((f) => /^sitemap-\d+\.xml$/.test(f))
    .map((f) => readFileSync(join(dist, f), 'utf8'))
    .join('\n');
  const ids = (html) =>
    new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const page of pages) {
    const file = join(dist, page.url, 'index.html');
    if (!existsSync(file)) {
      problems.push(`${page.url} was not built`);
      continue;
    }
    built++;
    const html = readFileSync(file, 'utf8');
    if (!sitemap.includes(`<loc>${SITE}${page.url}</loc>`))
      problems.push(`${page.url} is not in the sitemap`);
    if (!/<meta name="description" content="[^"]{50,}"/.test(html))
      problems.push(`${page.url} has no meta description`);
    if (!page.mod) {
      const v = portVersion(page.port, root);
      if (!html.includes(v))
        problems.push(`${page.url} does not show version ${v}`);
      continue;
    }
    // Every entry has an id on the page; recompute them the way render.mjs does.
    const have = ids(html);
    const { slugger, headingOf } = await import('./api/render.mjs');
    const slug = slugger();
    // Mirror the order headings appear in: Index, then each section and its entries.
    const order = [];
    order.push('Index');
    const sections = [
      ['function', 'Functions'],
      ['class', 'Classes'],
      ['enum', 'Enums'],
      ['type', 'Type aliases'],
      ['constant', 'Constants'],
    ];
    for (const [kind, title] of sections) {
      const es = page.mod.entries.filter((e) => sectionOf(e.kind) === kind);
      if (!es.length) continue;
      order.push(title);
      for (const e of es) {
        order.push([e, headingOf(page.port, e)]);
        const counts = new Map();
        for (const m of e.methods ?? [])
          counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
        for (const m of e.methods ?? []) {
          let h = headingOf(page.port, m, e);
          if (counts.get(m.name) > 1)
            h = h.replace(
              /\(\)$|$/,
              `(${(m.params ?? []).map((p) => p.type).join(', ')})`,
            );
          order.push([m, h]);
        }
      }
    }
    for (const item of order) {
      if (typeof item === 'string') {
        slug(item);
        continue;
      }
      const [entry, heading] = item;
      const id = slug(heading);
      if (!have.has(id))
        problems.push(
          `${page.url}: no element with id="${id}" for ${entry.name}`,
        );
    }
  }
}

if (problems.length) {
  console.error(
    `check-api: ${problems.length} problem(s):\n  ${problems.join('\n  ')}`,
  );
  process.exit(1);
}
const entries = Object.keys(PORTS)
  .map((port) => {
    const api = portApi(port, root);
    const n = api.modules.reduce(
      (k, m) =>
        k +
        m.entries.length +
        m.entries.reduce((j, e) => j + (e.methods?.length ?? 0), 0),
      0,
    );
    return `${port} ${api.modules.length + 1} pages/${n} entries`;
  })
  .join(', ');
console.log(
  `check-api: every public function and method has a described entry (${entries})${built ? `; ${built} built pages have every anchor and are in the sitemap` : '; dist/ not built, page checks skipped'}`,
);
