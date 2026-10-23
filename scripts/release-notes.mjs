/**
 * Prints GitHub release notes for a package version: a header linking the
 * package's registry page and the docs, then the version's section from the
 * package's CHANGELOG.
 *
 *   node scripts/release-notes.mjs <changelog> <version> <title> <registry-url>
 */
import { existsSync, readFileSync } from 'node:fs';

const [changelogPath, version, title, registryUrl] = process.argv.slice(2);
if (!changelogPath || !version || !title || !registryUrl) {
  console.error(
    'usage: release-notes.mjs <changelog> <version> <title> <registry-url>',
  );
  process.exit(2);
}

/** The lines between `## <version>` and the next `## ` heading. */
function changelogSection() {
  if (!existsSync(changelogPath)) return '';
  const lines = readFileSync(changelogPath, 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

const section = changelogSection();
const notes = [
  `**${title} ${version}** · [Package](${registryUrl}) · [Docs](https://chmuzamil.github.io/pakdatakit/) · [Playground](https://pakdatakit-playground.vercel.app/)`,
  '',
  section ||
    `See [${changelogPath}](https://github.com/chmuzamil/pakdatakit/blob/main/${changelogPath}).`,
  '',
];
process.stdout.write(notes.join('\n'));
