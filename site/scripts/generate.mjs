/**
 * Generates the parts of pakdatakit.dev that come from the repository, before
 * `astro build` (all outputs are gitignored):
 *
 * - src/content/docs/releases/: /releases/ and one page per version, from
 *   every package's CHANGELOG.md
 * - src/content/docs/data.md: /data/, from DATA.md and data/*.json
 * - public/api/typescript/: the TypeDoc API reference (same paths as the old
 *   GitHub Pages site, so old links map one to one)
 * - public/llms.txt and public/llms-full.txt
 * - public/robots.txt (follows INDEXABLE in site.config.mjs)
 *
 * Needs the library built first (`npm run build` at the repository root).
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GITHUB, INDEXABLE, SITE } from '../site.config.mjs';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(site, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

if (!existsSync(join(root, 'dist', 'index.js'))) {
  throw new Error(
    'Build the library first: npm run build (at the repository root)',
  );
}

/** Relative links in repository Markdown → GitHub URLs. */
function absolutize(md, fromDir = '') {
  return md.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (_, href) => {
    const clean = href.replace(/^\.\//, '');
    const path = fromDir ? `${fromDir}/${clean}` : clean;
    return `](${GITHUB}/blob/main/${path.replace(/\/[^/]+\/\.\.\//g, '/')})`;
  });
}

const yaml = (s) => JSON.stringify(s);

// ---------------------------------------------------------------- releases --

const CORE = [
  [
    'CHANGELOG.md',
    'TypeScript (npm)',
    'pakdatakit',
    'https://www.npmjs.com/package/pakdatakit/v/',
  ],
  [
    'python/CHANGELOG.md',
    'Python (PyPI)',
    'pakdatakit',
    'https://pypi.org/project/pakdatakit/',
  ],
  [
    'dart/CHANGELOG.md',
    'Dart (pub.dev)',
    'pakdatakit',
    'https://pub.dev/packages/pakdatakit/versions/',
  ],
  [
    'dotnet/CHANGELOG.md',
    '.NET (NuGet)',
    'PakDataKit',
    'https://www.nuget.org/packages/PakDataKit/',
  ],
  [
    'php/CHANGELOG.md',
    'PHP (Packagist)',
    'chmuzamil/pakdatakit',
    'https://packagist.org/packages/chmuzamil/pakdatakit#v',
  ],
];
const ADDONS = [
  [
    'react/CHANGELOG.md',
    'pakdatakit-react',
    'https://www.npmjs.com/package/pakdatakit-react/v/',
  ],
  [
    'vue/CHANGELOG.md',
    'pakdatakit-vue',
    'https://www.npmjs.com/package/pakdatakit-vue/v/',
  ],
  [
    'angular/CHANGELOG.md',
    'pakdatakit-angular',
    'https://www.npmjs.com/package/pakdatakit-angular/v/',
  ],
  [
    'faker/CHANGELOG.md',
    'pakdatakit-faker',
    'https://www.npmjs.com/package/pakdatakit-faker/v/',
  ],
  [
    'pay/CHANGELOG.md',
    'pakdatakit-pay',
    'https://www.npmjs.com/package/pakdatakit-pay/v/',
  ],
  [
    'flutter/CHANGELOG.md',
    'pakdatakit_flutter',
    'https://pub.dev/packages/pakdatakit_flutter/versions/',
  ],
];

/** Version → section body, for every `## x.y.z` section (Unreleased skipped). */
function sections(file) {
  if (!existsSync(join(root, file))) return new Map();
  const out = new Map();
  const parts = read(file).split(/^## /m).slice(1);
  for (const part of parts) {
    const [head, ...rest] = part.split('\n');
    const m = /^\[?(\d+\.\d+\.\d+[^\]\s]*)\]?/.exec(head.trim());
    if (!m) continue;
    out.set(
      m[1],
      absolutize(
        rest.join('\n').trim(),
        dirname(file) === '.' ? '' : dirname(file),
      ),
    );
  }
  return out;
}

const semverDesc = (a, b) => {
  const pa = a.split(/[.-]/).map(Number);
  const pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++)
    if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  return 0;
};

const relDir = join(site, 'src', 'content', 'docs', 'releases');
rmSync(relDir, { recursive: true, force: true });
mkdirSync(relDir, { recursive: true });

const core = CORE.map(([file, label, pkg, url]) => ({
  label,
  pkg,
  url,
  versions: sections(file),
}));
const coreVersions = [
  ...new Set(core.flatMap((c) => [...c.versions.keys()])),
].sort(semverDesc);
for (const v of coreVersions) {
  const ports = core.filter((c) => c.versions.has(v));
  const body = ports
    .map(
      (c) =>
        `## ${c.label}\n\n[${c.pkg} ${v}](${c.url}${v}${c.url.endsWith('#v') ? '' : c.url.includes('pypi') ? '/' : ''})\n\n${c.versions.get(v).replace(/^### /gm, '### ')}`,
    )
    .join('\n\n');
  writeFileSync(
    join(relDir, `${v}.md`),
    `---\ntitle: ${yaml(`pakdatakit ${v}`)}\nslug: ${yaml(`releases/${v}`)}\ndescription: ${yaml(`Release notes for pakdatakit ${v} (${ports.map((p) => p.label.split(' ')[0]).join(', ')}): what changed, what was fixed and how to upgrade.`)}\n---\n\n${body}\n`,
  );
}
const addons = ADDONS.map(([file, pkg, url]) => ({
  pkg,
  url,
  versions: sections(file),
}));
/** Shift headings up so the shallowest one is h2 (the page title is the h1). */
const fromH2 = (md) => {
  const levels = [...md.matchAll(/^(#{2,6}) /gm)].map((m) => m[1].length);
  const shift = levels.length ? Math.min(...levels) - 2 : 0;
  return shift > 0
    ? md.replace(/^(#{2,6}) /gm, (_, h) => `${'#'.repeat(h.length - shift)} `)
    : md;
};
for (const a of addons) {
  for (const [v, raw] of a.versions) {
    const text = fromH2(raw);
    writeFileSync(
      join(relDir, `${a.pkg}-${v}.md`),
      `---\ntitle: ${yaml(`${a.pkg} ${v}`)}\nslug: ${yaml(`releases/${a.pkg}-${v}`)}\ndescription: ${yaml(`Release notes for ${a.pkg} ${v}, a PakDataKit companion package: what changed, what was fixed and how to upgrade.`)}\n---\n\n[${a.pkg} ${v} on its registry](${a.url}${v})\n\n${text}\n`,
    );
  }
}
writeFileSync(
  join(relDir, 'index.md'),
  `---\ntitle: Releases\ndescription: Every version of every pakdatakit package, from each package's changelog.\n---\n\nThe core library has one version number in every language: TypeScript, Python, Dart, .NET and PHP are released together and give the same results. The add-ons have their own versions.\n\n## Core library\n\n| Version | Ports |\n| --- | --- |\n${coreVersions
    .map(
      (v) =>
        `| [${v}](/releases/${v}/) | ${core
          .filter((c) => c.versions.has(v))
          .map((c) => c.label.split(' ')[0])
          .join(', ')} |`,
    )
    .join('\n')}\n\n## Add-ons\n\n${addons
    .map(
      (a) =>
        `- **${a.pkg}**: ${[...a.versions.keys()]
          .sort(semverDesc)
          .map((v) => `[${v}](/releases/${a.pkg}-${v}/)`)
          .join(', ')}`,
    )
    .join(
      '\n',
    )}\n\nGitHub releases, with the attested .NET packages attached: [github.com/chmuzamil/pakdatakit/releases](${GITHUB}/releases).\n`,
);
console.log(
  `releases: ${coreVersions.length} core versions, ${addons.reduce((n, a) => n + a.versions.size, 0)} add-on versions`,
);

// -------------------------------------------------------------------- data --

const { dataVersion } = await import(
  new URL(`file:///${join(root, 'dist', 'index.js').replace(/\\/g, '/')}`).href
);
const dataFiles = readdirSync(join(root, 'data'))
  .filter((f) => f.endsWith('.json'))
  .sort();
const rows = dataFiles.map((f) => {
  const json = JSON.parse(read(`data/${f}`));
  const count = Array.isArray(json) ? json.length : Object.keys(json).length;
  const kb = (statSync(join(root, 'data', f)).size / 1024).toFixed(0);
  return `| [\`${f}\`](${GITHUB}/blob/main/data/${f}) | ${count.toLocaleString('en-US')} | ${kb} KB |`;
});
const dataMd = read('DATA.md').replace(/^# .*\n+/, '');
writeFileSync(
  join(site, 'src', 'content', 'docs', 'data.md'),
  `---\ntitle: Data sources\ndescription: Where every pakdatakit dataset comes from, how many records it has, and when it was last checked (data version ${dataVersion}).\n---\n\n**Data version: ${dataVersion}.** Every port ships the same files from \`data/\`, and the shared test vectors check that they agree.\n\n| File | Records | Size |\n| --- | --- | --- |\n${rows.join('\n')}\n\n${absolutize(dataMd)}\n`,
);
console.log(`data: ${dataFiles.length} files, data version ${dataVersion}`);

// --------------------------------------------------------------- TypeDoc --
// The API reference is generated by starlight-typedoc during `astro build`
// (see astro.config.mjs), as Starlight pages under /api/typescript/.
rmSync(join(site, 'public', 'api'), { recursive: true, force: true });

// -------------------------------------------------------------- llms.txt --

execFileSync(
  process.execPath,
  [
    join(root, 'scripts', 'generate-llms.mjs'),
    '--out',
    join(site, 'public'),
    '--site',
    SITE,
    '--api',
    `${SITE}/api/typescript`,
    '--pages',
  ],
  { cwd: root, stdio: 'inherit' },
);

// ----------------------------------------------------------------- icons --

await import('./icons.mjs');

// ------------------------------------------------------------ robots.txt --

writeFileSync(
  join(site, 'public', 'robots.txt'),
  INDEXABLE
    ? [
        '# Search engines and AI assistants are welcome: this is public',
        '# documentation, and llms.txt / llms-full.txt are written for them.',
        ...[
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-SearchBot',
          'PerplexityBot',
          'Google-Extended',
        ].flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', '']),
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${SITE}/sitemap-index.xml`,
        '',
      ].join('\n')
    : `# Not launched yet: keep the site out of search results (site.config.mjs INDEXABLE).\nUser-agent: *\nDisallow: /\n`,
);
console.log(`robots.txt: ${INDEXABLE ? 'indexable' : 'noindex'}`);
