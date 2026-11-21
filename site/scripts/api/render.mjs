/**
 * Renders the API reference of the Python, Dart, .NET and PHP ports as
 * Starlight pages, from the extracted APIs in site/api-data/<port>.json:
 *
 * - src/content/docs/api/<port>/index.md: the landing page's Markdown (the
 *   page itself is src/pages/api/<port>/index.astro; this entry gives it its
 *   Markdown copy, Open Graph image and search text)
 * - src/content/docs/api/<port>/<module>.md: one page per module, with every
 *   public function, class, method, enum and constant
 *
 * Called by scripts/generate.mjs before `astro build`; the output is
 * gitignored like the TypeScript reference. Headings get the ids Starlight
 * gives them (github-slugger), so links and scripts/check-api.mjs can point
 * at each entry.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import groups from '../../src/lib/api-modules.json' with { type: 'json' };
import {
  PORTS,
  SECTIONS,
  counts,
  guideFor,
  landingDescription,
  portApi,
  portVersion,
  repoRoot,
  sectionOf,
} from '../../src/lib/api-ports.mjs';

const MODULES = new Map(
  groups.groups.flatMap((g) =>
    g.modules.map((m) => [m.id, { ...m, group: g }]),
  ),
);
/** Modules that have a TypeScript API page. */
const TS_MODULES = new Set(
  groups.groups.slice(0, -1).flatMap((g) => g.modules.map((m) => m.id)),
);

const yaml = (s) => JSON.stringify(s);

/** github-slugger, as Starlight uses it for heading ids. */
export function slugger() {
  const seen = new Map();
  return (text) => {
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-');
    let slug = base;
    while (seen.has(slug)) {
      const n = seen.get(base) + 1;
      seen.set(base, n);
      slug = `${base}-${n}`;
    }
    seen.set(slug, 0);
    return slug;
  };
}

/** Cut to at most `max` characters at a word boundary. */
export function clip(text, max = 155) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** Heading text of an entry or member. */
export function headingOf(port, entry, owner) {
  const sep = port === 'php' ? '::' : '.';
  const callable = ['function', 'method', 'constructor'].includes(entry.kind);
  if (!owner) return callable ? `${entry.name}()` : entry.name;
  const name = entry.kind === 'constructor' ? 'constructor' : entry.name;
  return `${owner.name}${sep}${name}${callable && entry.kind !== 'constructor' ? '()' : ''}`;
}

/** The blocks of a module page in order, with the id of every heading. */
function layout(port, mod) {
  const slug = slugger();
  const sections = SECTIONS.map(([kind, title, one]) => ({
    kind,
    title,
    one: one.charAt(0).toUpperCase() + one.slice(1),
    entries: mod.entries.filter((e) => sectionOf(e.kind) === kind),
  })).filter((s) => s.entries.length);
  slug('Index');
  for (const s of sections) {
    s.id = slug(s.title);
    for (const e of s.entries) {
      e._heading = headingOf(port, e);
      e._id = slug(e._heading);
      // Overloads (.NET): same name, so the heading names the parameter types.
      const names = new Map();
      for (const m of e.methods ?? [])
        names.set(m.name, (names.get(m.name) ?? 0) + 1);
      for (const m of e.methods ?? []) {
        let h = headingOf(port, m, e);
        if (names.get(m.name) > 1)
          h = h.replace(
            /\(\)$|$/,
            `(${(m.params ?? []).map((p) => p.type).join(', ')})`,
          );
        m._heading = h;
        m._id = slug(h);
      }
    }
  }
  return sections;
}

/** name -> page URL with anchor, for {@link name} in doc comments. */
function linkIndex(port, modules) {
  const top = new Map();
  const member = new Map();
  const bare = new Map();
  const sep = port === 'php' ? '::' : '.';
  for (const mod of modules) {
    const page = `/api/${port}/${mod.id}/`;
    for (const e of mod.entries) {
      top.set(e.name, `${page}#${e._id}`);
      for (const m of e.methods ?? []) {
        const url = `${page}#${m._id}`;
        for (const key of [`${e.name}.${m.name}`, `${e.name}${sep}${m.name}`])
          if (!member.has(key)) member.set(key, url);
        bare.set(m.name, bare.has(m.name) ? null : url);
      }
      for (const f of [...(e.fields ?? []), ...(e.values ?? [])]) {
        const url = `${page}#${e._id}`;
        for (const key of [`${e.name}.${f.name}`, `${e.name}${sep}${f.name}`])
          if (!member.has(key)) member.set(key, url);
      }
    }
  }
  return (target, owner) => {
    const t = target.replace(/\(\)$/, '').replace(/^\$/, '');
    if (owner) {
      const own = member.get(`${owner.name}.${t}`);
      if (own) return own;
    }
    return top.get(t) ?? member.get(t) ?? bare.get(t) ?? undefined;
  };
}

/** Escapes `<` outside code, so prose like List<String> is not read as HTML. */
function safe(md) {
  const out = [];
  let fenced = false;
  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      out.push(line);
      continue;
    }
    if (fenced) {
      out.push(line);
      continue;
    }
    out.push(
      line
        .split(/(`[^`]*`)/)
        .map((part, i) => (i % 2 ? part : part.replace(/</g, '&lt;')))
        .join(''),
    );
  }
  return out.join('\n');
}

/** Doc comment Markdown -> page Markdown: links resolved, HTML-safe. */
function prose(md, resolve, owner) {
  if (!md) return '';
  return safe(
    md.replace(/\{@link ([^}]+)\}/g, (_, target) => {
      const t = target.trim();
      const url = resolve(t, owner);
      return url ? `[\`${t}\`](${url})` : `\`${t}\``;
    }),
  ).trim();
}

/** First sentence of a doc comment, on one line, for summary tables. */
function summary(md, resolve, owner) {
  const para = (md ?? '').split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ');
  const m = /^(.+?[.!?])(?=\s+[A-Z`(])/.exec(para);
  return cell(prose(m ? m[1] : para, resolve, owner));
}

/** A table cell: one line, pipes escaped. */
const cell = (s) =>
  (s ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
const code = (s) => (s ? `\`${cell(s).replace(/`/g, "'")}\`` : '');

/**
 * A Markdown table in a focusable, labelled region: on a phone a wide table
 * scrolls sideways, and keyboard users must be able to reach it (axe
 * scrollable-region-focusable).
 */
function table(head, rows, label) {
  // Leave out columns that are empty in every row.
  const keep = head.map((_, i) => i === 0 || rows.some((r) => r[i]));
  const pick = (r) => r.filter((_, i) => keep[i]);
  const h = pick(head);
  const attr = label
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
  return [
    `<div class="api-table" role="region" aria-label="${attr}" tabindex="0">`,
    '',
    `| ${h.join(' | ')} |`,
    `| ${h.map(() => ':------').join(' | ')} |`,
    ...rows.map(
      (r) =>
        `| ${pick(r)
          .map((c) => c || '-')
          .join(' | ')} |`,
    ),
    '',
    '</div>',
  ].join('\n');
}

function callable(port, fn, resolve, owner, level) {
  const out = [];
  out.push(`${'#'.repeat(level)} ${fn._heading}`, '');
  out.push(`\`\`\`${PORTS[port].code}\n${fn.signature}\n\`\`\``, '');
  if (fn.doc) out.push(prose(fn.doc, resolve, owner), '');
  if (fn.typeParams?.length) {
    out.push('**Type parameters**', '');
    out.push(
      table(
        ['Name', 'Description'],
        fn.typeParams.map((t) => [
          code(t.name),
          cell(prose(t.doc, resolve, owner)),
        ]),
        `Type parameters of ${fn._heading}`,
      ),
      '',
    );
  }
  if (fn.params?.length) {
    out.push('**Parameters**', '');
    out.push(
      table(
        ['Parameter', 'Type', 'Default', 'Description'],
        fn.params.map((p) => [
          code(p.name),
          code(p.type),
          code(p.default),
          cell(prose(p.doc, resolve, owner)),
        ]),
        `Parameters of ${fn._heading}`,
      ),
      '',
    );
  }
  if (fn.returns?.type) {
    out.push(
      `**Returns** ${code(fn.returns.type)}${fn.returns.doc ? `: ${cell(prose(fn.returns.doc, resolve, owner))}` : ''}`,
      '',
    );
  }
  if (fn.throws?.length) {
    out.push('**Throws**', '');
    for (const t of fn.throws)
      out.push(
        `- ${code(t.type)}${t.doc ? `: ${cell(prose(t.doc, resolve, owner))}` : ''}`,
      );
    out.push('');
  }
  return out;
}

function entryBlock(port, e, resolve) {
  const sec = sectionOf(e.kind);
  if (sec === 'function') return callable(port, e, resolve, undefined, 3);
  const out = [`### ${e._heading}`, ''];
  out.push(`\`\`\`${PORTS[port].code}\n${e.signature}\n\`\`\``, '');
  if (e.doc) out.push(prose(e.doc, resolve, e), '');
  if (e.values?.length) {
    out.push('**Members**', '');
    out.push(
      table(
        ['Member', 'Description'],
        e.values.map((v) => [code(v.name), cell(prose(v.doc, resolve, e))]),
        `Members of ${e._heading}`,
      ),
      '',
    );
  }
  if (e.fields?.length) {
    const label =
      port === 'dart' || port === 'python' ? 'Fields' : 'Properties';
    out.push(`**${label}**`, '');
    out.push(
      table(
        ['Name', 'Type', 'Value', 'Description'],
        e.fields.map((f) => [
          `${code(f.name)}${f.static && port !== 'python' ? ' (static)' : ''}`,
          code(f.type),
          code(f.default),
          cell(prose(f.doc, resolve, e)),
        ]),
        `${label} of ${e._heading}`,
      ),
      '',
    );
  }
  for (const m of e.methods ?? [])
    out.push(...callable(port, m, resolve, e, 4));
  return out;
}

/** The import line(s) shown at the top of a module page. */
function importLine(port, mod) {
  if (port !== 'python') return mod.import;
  const names = mod.entries
    .filter((e) => e.kind === 'function' || e.kind === 'class')
    .map((e) => e.name);
  const shown = names.slice(0, 3).join(', ');
  return names.length
    ? `from ${mod.name} import ${shown}${names.length > 3 ? ', ...' : ''}`
    : `import ${mod.name}`;
}

function modulePage(port, mod, sections, resolve, version) {
  const p = PORTS[port];
  const meta = MODULES.get(mod.id);
  if (!meta)
    throw new Error(
      `render: module "${mod.id}" (${port}) is not in src/lib/api-modules.json`,
    );
  const title = `${meta.title} (${p.label} API)`;
  const names = mod.entries.map((e) =>
    sectionOf(e.kind) === 'function' ? `${e.name}()` : e.name,
  );
  const description = clip(
    `${p.label} API for ${meta.title}${port === 'python' || port === 'dart' ? ` (${mod.name})` : ''}: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ' and more' : ''}. Signatures, parameters and descriptions.`,
  );
  const links = [
    `[${meta.title} guide](${guideFor(mod.id)})`,
    ...(TS_MODULES.has(mod.id)
      ? [`[TypeScript API](/api/typescript/${mod.id}/)`]
      : []),
    `[All ${p.label} modules](/api/${port}/)`,
  ];
  const out = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(description)}`,
    'editUrl: false',
    'next: false',
    'prev: false',
    '---',
    '',
    `${meta.description} Part of **${p.package} ${version}**; generated from [\`${mod.source}\`](https://github.com/chmuzamil/pakdatakit/tree/main/${mod.source}).`,
    '',
    links.join(' · '),
    '',
  ];
  if (mod.doc) out.push(prose(mod.doc, resolve), '');
  out.push(`\`\`\`${p.code}\n${importLine(port, mod)}\n\`\`\``, '');
  out.push('## Index', '');
  for (const s of sections) {
    out.push(
      table(
        [s.one, 'Description'],
        s.entries.map((e) => [
          `[${cell(e._heading)}](#${e._id})`,
          summary(e.doc, resolve, e),
        ]),
        `${s.title} in this module`,
      ),
      '',
    );
  }
  for (const s of sections) {
    out.push(`## ${s.title}`, '');
    for (const e of s.entries) out.push(...entryBlock(port, e, resolve));
  }
  return {
    title,
    description,
    text: `${out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()}\n`,
  };
}

function landingPage(port, modules, version) {
  const p = PORTS[port];
  const fns = modules.reduce(
    (n, m) =>
      n +
      m.entries.reduce(
        (k, e) =>
          k +
          (e.kind === 'function' ? 1 : 0) +
          (e.methods ?? []).filter((x) => x.kind === 'method').length,
        0,
      ),
    0,
  );
  const ids = new Set(modules.map((m) => m.id));
  const out = [
    '---',
    `title: ${yaml(`${p.label} API reference`)}`,
    `description: ${yaml(landingDescription(port, modules, version))}`,
    'editUrl: false',
    'next: false',
    'prev: false',
    '---',
    '',
    `Every public ${p.what} in ${p.package} ${version}, generated from the source and its doc comments: ${fns} functions and methods in ${modules.length} modules.`,
    '',
  ];
  for (const g of groups.groups) {
    const mods = g.modules.filter((m) => ids.has(m.id));
    if (!mods.length) continue;
    out.push(`## ${g.title}`, '', g.intro, '');
    for (const m of mods)
      out.push(`- [${m.title}](/api/${port}/${m.id}/): ${m.description}`);
    out.push('');
  }
  return `${out.join('\n').trim()}\n`;
}

/** Writes every port's pages; returns { port: pageCount }. */
export function renderApi(root = repoRoot()) {
  const dir = join(root, 'site', 'src', 'content', 'docs', 'api');
  const stats = {};
  for (const port of Object.keys(PORTS)) {
    const api = portApi(port, root);
    const version = portVersion(port, root);
    const out = join(dir, port);
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const laid = api.modules.map((mod) => ({
      mod,
      sections: layout(port, mod),
    }));
    const resolve = linkIndex(port, api.modules);
    for (const { mod, sections } of laid) {
      const page = modulePage(port, mod, sections, resolve, version);
      writeFileSync(join(out, `${mod.id}.md`), page.text);
    }
    writeFileSync(
      join(out, 'index.md'),
      landingPage(port, api.modules, version),
    );
    stats[port] = api.modules.length + 1;
  }
  return stats;
}
