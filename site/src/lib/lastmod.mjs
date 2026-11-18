/**
 * When each page last changed: the date of the last commit that touched the
 * page's source (its Markdown, its Astro page, or for generated pages the
 * code or data they are generated from). Used for the sitemap's <lastmod>
 * and dateModified in structured data. Needs full git history (CI checks out
 * with fetch-depth: 0); without git it falls back to the build time.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const buildTime = new Date().toISOString();

/** path (relative to the repo, forward slashes) → ISO date of its last commit. */
let dates;
function load() {
  if (dates) return dates;
  dates = new Map();
  try {
    const log = execFileSync(
      'git',
      ['log', '--format=@%cI', '--name-only', '--no-renames', 'HEAD'],
      {
        cwd: repo,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      },
    );
    let date;
    for (const line of log.split('\n')) {
      if (line.startsWith('@')) date = line.slice(1);
      else if (line && date && !dates.has(line)) dates.set(line, date);
    }
  } catch {
    /* no git: every page gets the build time */
  }
  return dates;
}

/** Latest date of any of the given files or directory prefixes. */
function latest(paths) {
  const d = load();
  let best;
  for (const p of paths) {
    if (d.has(p)) {
      if (!best || d.get(p) > best) best = d.get(p);
      continue;
    }
    const prefix = p.endsWith('/') ? p : `${p}/`;
    for (const [file, date] of d)
      if (file.startsWith(prefix) && (!best || date > best)) best = date;
  }
  return best;
}

const content = 'site/src/content/docs';

/** Source files for a page path such as "docs/cnic/" or "api/typescript/cnic/functions/validatecnic/". */
export function sourcesFor(path) {
  const p = path.replace(/^\/|\/$/g, '');
  const [top, ...rest] = p.split('/');
  if (p === '') return [`${content}/index.mdx`];
  if (top === 'docs' || top === 'install')
    return [
      `${content}/${p}.mdx`,
      `${content}/${p}.md`,
      `${content}/${p}/index.mdx`,
      ...(top === 'docs' ? ['site/examples'] : []),
    ];
  if (top === 'tools')
    return [
      `site/src/pages/tools/${rest[0]}.astro`,
      'site/src/components/tools',
    ];
  if (top === 'playground')
    return ['site/src/components/playground', 'site/src/pages/playground'];
  if (top === 'api' && rest[0] === 'typescript') {
    if (!rest[1]) return ['src', 'site/src/pages/api/typescript/index.astro'];
    if (rest[1] === 'adapters') return [`src/adapters/${rest[2]}.ts`];
    return [`src/${rest[1]}.ts`];
  }
  if (top === 'releases')
    return [
      'CHANGELOG.md',
      'python/CHANGELOG.md',
      'dart/CHANGELOG.md',
      'dotnet/CHANGELOG.md',
      'php/CHANGELOG.md',
      'react/CHANGELOG.md',
      'vue/CHANGELOG.md',
      'angular/CHANGELOG.md',
      'faker/CHANGELOG.md',
      'pay/CHANGELOG.md',
      'flutter/CHANGELOG.md',
    ];
  if (top === 'data') return ['data', 'DATA.md'];
  return [`${content}/${p}.md`, `${content}/${p}.mdx`, 'site/src'];
}

/** ISO date the page at `path` last changed. */
export function lastModified(path) {
  return latest(sourcesFor(path)) ?? buildTime;
}
