/**
 * The four ports with a generated API reference (/api/python/, /api/dart/,
 * /api/dotnet/, /api/php/), shared by the page generator
 * (scripts/api/render.mjs), the landing pages, the language tabs and
 * scripts/check-api.mjs.
 *
 * Each port's version is read from its own manifest at build time, so the
 * pages are stamped with the version the source says.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The repository root: the first folder up from the working directory with dart/ and site/. */
export function repoRoot(start = process.cwd()) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (
      existsSync(join(dir, 'dart', 'pubspec.yaml')) &&
      existsSync(join(dir, 'site', 'package.json'))
    )
      return dir;
    if (dirname(dir) === dir)
      throw new Error(`api-ports: no repository root above ${start}`);
  }
}

/**
 * @typedef {object} Port
 * @property {string} label    Name in titles ("Python", ".NET").
 * @property {string} code     Code block language.
 * @property {string} tab      Label of the matching tab in the language tabs.
 * @property {string} package  Package name on its registry.
 * @property {string} manifest File the version is read from.
 * @property {RegExp} version  Finds the version in the manifest.
 * @property {string} what     What the reference covers.
 */

/** @type {Record<'python' | 'dart' | 'dotnet' | 'php', Port>} */
export const PORTS = {
  python: {
    label: 'Python',
    code: 'python',
    tab: 'Python',
    package: 'pakdatakit (PyPI)',
    manifest: 'python/pyproject.toml',
    version: /^version = "([^"]+)"/m,
    what: 'function, class and constant',
  },
  dart: {
    label: 'Dart',
    code: 'dart',
    tab: 'Dart',
    package: 'pakdatakit (pub.dev)',
    manifest: 'dart/pubspec.yaml',
    version: /^version:\s*(\S+)/m,
    what: 'function, class, enum and constant',
  },
  dotnet: {
    label: '.NET',
    code: 'csharp',
    tab: 'C#',
    package: 'PakDataKit (NuGet)',
    manifest: 'dotnet/Directory.Build.props',
    version: /<Version>([^<]+)<\/Version>/,
    what: 'class, method, record and enum',
  },
  php: {
    label: 'PHP',
    code: 'php',
    tab: 'PHP',
    package: 'chmuzamil/pakdatakit (Packagist)',
    manifest: 'php/src/PakData.php',
    version: /PACKAGE_VERSION = '([^']+)'/,
    what: 'class, method and constant',
  },
};

/** The port's version, from its manifest. */
export function portVersion(port, root = repoRoot()) {
  const p = PORTS[port];
  const m = p.version.exec(readFileSync(join(root, p.manifest), 'utf8'));
  if (!m) throw new Error(`api-ports: no version in ${p.manifest}`);
  return m[1];
}

const apis = new Map();
/** The extracted API of a port (site/api-data/<port>.json). */
export function portApi(port, root = repoRoot()) {
  const file = join(root, 'site', 'api-data', `${port}.json`);
  if (!apis.has(file)) apis.set(file, JSON.parse(readFileSync(file, 'utf8')));
  return apis.get(file);
}

/** Module guide for an API page id, if there is one (/docs/<id>/). */
export function guideFor(id) {
  if (['data-annotations', 'fluent-validation', 'laravel'].includes(id))
    return '/docs/forms/';
  if (id === 'data-version') return '/data/';
  return `/docs/${id}/`;
}

/** Kinds of entry, in the order the pages list them, with their section titles. */
export const SECTIONS = [
  ['function', 'Functions', 'function', 'functions'],
  ['class', 'Classes', 'class', 'classes'],
  ['enum', 'Enums', 'enum', 'enums'],
  ['type', 'Type aliases', 'type', 'types'],
  ['constant', 'Constants', 'constant', 'constants'],
];

/** Section of an entry kind ("record", "mixin" and the like are classes). */
export const sectionOf = (kind) =>
  ['function', 'enum', 'type', 'constant'].includes(kind) ? kind : 'class';

/** "2 functions · 1 class" for a module's entries. */
export function counts(entries) {
  const n = {};
  for (const e of entries) {
    const s = sectionOf(e.kind);
    n[s] = (n[s] ?? 0) + 1;
    if (s === 'class')
      for (const m of e.methods ?? [])
        if (m.kind === 'method') n.method = (n.method ?? 0) + 1;
  }
  return [...SECTIONS, ['method', '', 'method', 'methods']]
    .filter(([k]) => n[k])
    .map(([k, , one, many]) => `${n[k]} ${n[k] === 1 ? one : many}`)
    .join(' · ');
}

/** Description of a port's landing page (its Markdown entry and its page). */
export function landingDescription(port, modules, version) {
  const p = PORTS[port];
  return `Every public ${p.what} in ${p.package} ${version}: ${modules.length} modules, generated from the ${p.label} source and its doc comments.`;
}

/** Port of each language tab (src/lib/snippets.ts LANGS ids). */
const TAB_PORT = {
  ts: 'typescript',
  py: 'python',
  dart: 'dart',
  cs: 'dotnet',
  php: 'php',
};
/** Guides whose examples live in another module's API page. */
const GUIDE_MODULE = { amount: 'format' };

/**
 * The API page for a guide's examples in one language tab: the module's page
 * if that language has one, else the language's API landing page.
 * @param {'ts' | 'py' | 'dart' | 'cs' | 'php'} tab
 * @param {string} module examples module (site/examples/<module>.json)
 * @returns {{ href: string, label: string }}
 */
export function apiPageFor(tab, module, root = repoRoot()) {
  const port = TAB_PORT[tab];
  const id = GUIDE_MODULE[module] ?? module;
  const label = `API: ${port === 'typescript' ? 'TypeScript' : PORTS[port].label}`;
  const ids =
    port === 'typescript'
      ? new Set(
          JSON.parse(readFileSync(join(root, 'typedoc.json'), 'utf8'))
            .entryPoints.map((e) => /^src\/([\w-]+)\.ts$/.exec(e)?.[1])
            .filter(Boolean),
        )
      : new Set(portApi(port, root).modules.map((m) => m.id));
  return {
    href: ids.has(id) ? `/api/${port}/${id}/` : `/api/${port}/`,
    label,
  };
}
