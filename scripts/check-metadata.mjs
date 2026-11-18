#!/usr/bin/env node
/**
 * Fails if package metadata drifts between the ports:
 *
 * - the core version (npm, PyPI, pub.dev, NuGet, Packagist) and dataVersion;
 * - each package's changelog has a section for its version;
 * - the add-on packages require a pakdatakit version that exists here;
 * - repository URL, homepage, licence, author and copyright notice;
 * - the core packages' description style and shared keywords;
 * - SECURITY.md lists the current minor version of every package.
 *
 *   npm run check:metadata
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const problems = [];
const fail = (message) => problems.push(message);

/** First capture group of `re` in the file, or a recorded problem. */
function grab(path, re, what) {
  const match = read(path).match(re);
  if (!match) {
    fail(`${path}: could not find ${what}`);
    return undefined;
  }
  return match[1].trim();
}

const REPO = 'https://github.com/chmuzamil/pakdatakit';
const AUTHOR = 'Muzamil Chaudhery';
const LICENSE = 'MIT';

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

const npmDirs = ['.', 'react', 'faker', 'vue', 'angular', 'pay'];
const npm = Object.fromEntries(
  npmDirs.map((dir) => [dir, json(join(dir, 'package.json'))]),
);
const core = npm['.'];
const version = core.version;

const pyproject = 'python/pyproject.toml';
const pubspec = { dart: 'dart/pubspec.yaml', flutter: 'flutter/pubspec.yaml' };
const props = 'dotnet/Directory.Build.props';
const composer = json('php/composer.json');

/** A YAML list under `key:` (only the simple `  - item` form). */
function yamlList(path, key) {
  const block = read(path).match(
    new RegExp(`^${key}:\\n((?:  - .*\\n)+)`, 'm'),
  );
  return block
    ? block[1]
        .split('\n')
        .filter(Boolean)
        .map((l) => l.replace(/^ {2}- /, '').trim())
    : [];
}

/** A folded (`>-`) or plain YAML scalar. */
function yamlScalar(path, key) {
  const text = read(path);
  const folded = text.match(new RegExp(`^${key}: >-\\n((?:  .*\\n)+)`, 'm'));
  if (folded)
    return folded[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ');
  const plain = text.match(new RegExp(`^${key}: *(.+)$`, 'm'));
  return plain ? plain[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

const xml = (tag) =>
  grab(props, new RegExp(`<${tag}>([^<]*)</${tag}>`), `<${tag}>`);
const toml = (key) =>
  grab(pyproject, new RegExp(`^${key} = "([^"]*)"`, 'm'), key);

// ---------------------------------------------------------------------------
// 1. Core version and data version
// ---------------------------------------------------------------------------

const versions = {
  'package.json': version,
  [pyproject]: toml('version'),
  'python/src/pakdatakit/__init__.py': grab(
    'python/src/pakdatakit/__init__.py',
    /^__version__ = "([^"]+)"/m,
    '__version__',
  ),
  [pubspec.dart]: yamlScalar(pubspec.dart, 'version'),
  [props]: xml('Version'),
  'php/src/PakData.php': grab(
    'php/src/PakData.php',
    /PACKAGE_VERSION = '([^']+)'/,
    'PACKAGE_VERSION',
  ),
};
for (const [where, found] of Object.entries(versions)) {
  if (found !== undefined && found !== version) {
    fail(`${where}: version ${found}, but package.json has ${version}`);
  }
}

const dataVersion = grab(
  'src/data-version.ts',
  /'(\d{4}-\d{2}-\d{2}[^']*)'/,
  'dataVersion',
);
const dataVersions = {
  'python/src/pakdatakit/data_version.py': grab(
    'python/src/pakdatakit/data_version.py',
    /"(\d{4}-\d{2}-\d{2}[^"]*)"/,
    'DATA_VERSION',
  ),
  'dart/lib/src/data_version.dart': grab(
    'dart/lib/src/data_version.dart',
    /'(\d{4}-\d{2}-\d{2}[^']*)'/,
    'dataVersion',
  ),
  'DATA.md': grab(
    'DATA.md',
    /\*\*Data version: ([^*]+)\*\*/,
    'the data version line',
  ),
};
for (const [where, found] of Object.entries(dataVersions)) {
  if (found !== undefined && found !== dataVersion) {
    fail(
      `${where}: data version ${found}, but src/data-version.ts has ${dataVersion}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Changelogs have a section for the current version
// ---------------------------------------------------------------------------

const changelogs = {
  'CHANGELOG.md': version,
  'python/CHANGELOG.md': version,
  'dart/CHANGELOG.md': version,
  'dotnet/CHANGELOG.md': version,
  'php/CHANGELOG.md': version,
  'react/CHANGELOG.md': npm.react.version,
  'faker/CHANGELOG.md': npm.faker.version,
  'pay/CHANGELOG.md': npm.pay.version,
  'vue/CHANGELOG.md': npm.vue.version,
  'angular/CHANGELOG.md': npm.angular.version,
  'flutter/CHANGELOG.md': yamlScalar(pubspec.flutter, 'version'),
};
for (const [path, v] of Object.entries(changelogs)) {
  if (!existsSync(join(root, path))) {
    fail(`${path}: missing`);
    continue;
  }
  const escaped = v.replace(/\./g, '\\.');
  if (!new RegExp(`^## \\[?${escaped}\\]?\\b`, 'm').test(read(path))) {
    fail(`${path}: no "## ${v}" section`);
  }
}

// ---------------------------------------------------------------------------
// 3. Add-on packages require a pakdatakit version that exists
// ---------------------------------------------------------------------------

const parse = (v) => v.split('.').map(Number);
const compare = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};
// Versions the core CHANGELOG lists as "(unreleased)": an add-on may already
// require one of them, as it is released first (see RELEASING.md).
const unreleased = [
  ...read('CHANGELOG.md').matchAll(/^## (\d+\.\d+\.\d+) \(unreleased\)/gm),
].map((m) => m[1]);
function checkRange(where, range, current) {
  const min = range?.match(/(\d+\.\d+\.\d+)/)?.[1];
  if (!min)
    return fail(`${where}: cannot read the pakdatakit range "${range}"`);
  if (unreleased.includes(min) && parse(min)[0] === parse(current)[0]) return;
  if (parse(min)[0] !== parse(current)[0] || compare(min, current) > 0) {
    fail(
      `${where}: requires pakdatakit ${range}, but the current version is ${current}`,
    );
  }
}
for (const dir of ['react', 'faker', 'vue', 'angular']) {
  const pkg = npm[dir];
  const range =
    pkg.peerDependencies?.pakdatakit ?? pkg.dependencies?.pakdatakit;
  checkRange(`${dir}/package.json`, range, version);
}
checkRange(
  pubspec.flutter,
  read(pubspec.flutter).match(/^ {2}pakdatakit: *(.+)$/m)?.[1],
  versions[pubspec.dart] ?? version,
);

// ---------------------------------------------------------------------------
// 4. Repository, homepage, licence, author
// ---------------------------------------------------------------------------

/** https://github.com/owner/repo, without git+, .git or a path inside it. */
const normalise = (url) =>
  url
    ?.replace(/^git\+/, '')
    .replace(/#.*$/, '')
    .replace(/\.git$/, '')
    .replace(/\/(tree|blob)\/.*$/, '')
    .replace(/\/$/, '');

const repositories = {};
const homepages = {};
for (const dir of npmDirs) {
  const where = join(dir, 'package.json').replace(/\\/g, '/');
  const pkg = npm[dir];
  repositories[where] =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (
    typeof pkg.repository === 'object' &&
    !pkg.repository.url?.startsWith('git+https://')
  ) {
    fail(
      `${where}: repository.url should start with git+https:// (npm rewrites it otherwise)`,
    );
  }
  if (dir !== '.' && pkg.repository?.directory !== dir) {
    fail(`${where}: repository.directory should be "${dir}"`);
  }
  homepages[where] = pkg.homepage;
  if (pkg.license !== LICENSE) fail(`${where}: license ${pkg.license}`);
  const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
  if (author !== AUTHOR) fail(`${where}: author ${author}`);
  if (pkg.bugs?.url !== `${REPO}/issues`)
    fail(`${where}: bugs.url ${pkg.bugs?.url}`);
  for (const [name, target] of Object.entries(pkg.bin ?? {})) {
    if (target.startsWith('./')) {
      fail(
        `${where}: bin.${name} should not start with ./ (npm removes it on publish)`,
      );
    }
  }
}

repositories[pyproject] = grab(
  pyproject,
  /^Repository = "([^"]+)"/m,
  'Repository URL',
);
homepages[pyproject] = grab(
  pyproject,
  /^Homepage = "([^"]+)"/m,
  'Homepage URL',
);
if (toml('license') !== LICENSE)
  fail(`${pyproject}: license ${toml('license')}`);
if (
  grab(pyproject, /^authors = \[\{ name = "([^"]+)" \}\]/m, 'authors') !==
  AUTHOR
) {
  fail(`${pyproject}: authors should be ${AUTHOR}`);
}

for (const path of Object.values(pubspec)) {
  repositories[path] = yamlScalar(path, 'repository');
  homepages[path] = yamlScalar(path, 'homepage');
  if (yamlScalar(path, 'issue_tracker') !== `${REPO}/issues`) {
    fail(`${path}: issue_tracker should be ${REPO}/issues`);
  }
}

repositories[props] = xml('RepositoryUrl');
homepages[props] = xml('PackageProjectUrl');
if (xml('PackageLicenseExpression') !== LICENSE) fail(`${props}: licence`);
if (xml('Authors') !== AUTHOR) fail(`${props}: Authors ${xml('Authors')}`);

repositories['php/composer.json'] = composer.support?.source;
homepages['php/composer.json'] = composer.homepage;
if (composer.license !== LICENSE)
  fail(`php/composer.json: license ${composer.license}`);
if (composer.authors?.[0]?.name !== AUTHOR) fail('php/composer.json: authors');
if (composer.support?.issues !== `${REPO}/issues`)
  fail('php/composer.json: support.issues');

for (const [where, url] of Object.entries(repositories)) {
  if (normalise(url) !== REPO)
    fail(`${where}: repository ${url}, expected ${REPO}`);
}
for (const [where, url] of Object.entries(homepages)) {
  if (!url?.startsWith(REPO) && !url?.startsWith('https://pakdatakit.dev/'))
    fail(
      `${where}: homepage ${url} is neither in ${REPO} nor on https://pakdatakit.dev/`,
    );
}

// Every LICENSE file is the root one, and the .NET copyright matches it.
const license = read('LICENSE');
const copyright = license.match(/^Copyright .*$/m)?.[0];
for (const dir of [
  'react',
  'faker',
  'vue',
  'angular',
  'pay',
  'python',
  'dart',
  'flutter',
  'php',
]) {
  const path = `${dir}/LICENSE`;
  if (!existsSync(join(root, path))) fail(`${path}: missing`);
  else if (
    read(path).replace(/\r\n/g, '\n') !== license.replace(/\r\n/g, '\n')
  ) {
    fail(`${path}: differs from LICENSE`);
  }
}
if (xml('Copyright') !== copyright) {
  fail(
    `${props}: Copyright "${xml('Copyright')}", but LICENSE says "${copyright}"`,
  );
}
for (const path of ['NOTICE', 'README.md']) {
  if (!read(path).includes(copyright))
    fail(`${path}: does not contain "${copyright}"`);
}

// ---------------------------------------------------------------------------
// 5. Core packages: description style and shared keywords
// ---------------------------------------------------------------------------

const descriptions = {
  'package.json': core.description,
  [pyproject]: toml('description'),
  [pubspec.dart]: yamlScalar(pubspec.dart, 'description'),
  'dotnet/src/PakDataKit/PakDataKit.csproj': grab(
    'dotnet/src/PakDataKit/PakDataKit.csproj',
    /<Description>([^<]*)<\/Description>/,
    '<Description>',
  ),
  'php/composer.json': composer.description,
};
for (const [where, text] of Object.entries(descriptions)) {
  if (!text?.startsWith('Pakistani data utilities for ')) {
    fail(`${where}: description should start "Pakistani data utilities for …"`);
  }
  if (!text?.includes('validate CNIC, mobile, IBAN')) {
    fail(`${where}: description should list "validate CNIC, mobile, IBAN, …"`);
  }
}
const dartDescription = descriptions[pubspec.dart] ?? '';
if (dartDescription.length < 60 || dartDescription.length > 180) {
  fail(
    `${pubspec.dart}: pub.dev wants a description of 60 to 180 characters (${dartDescription.length})`,
  );
}

const SHARED_KEYWORDS = ['pakistan', 'cnic', 'iban', 'validation', 'qr'];
const keywords = {
  'package.json': core.keywords,
  [pyproject]: [
    ...(
      read(pyproject).match(/^keywords = \[([\s\S]*?)\]/m)?.[1] ?? ''
    ).matchAll(/"([^"]+)"/g),
  ].map((m) => m[1]),
  [pubspec.dart]: yamlList(pubspec.dart, 'topics'),
  [props]: xml('PackageTags')?.split(';'),
  'php/composer.json': composer.keywords,
};
for (const [where, list] of Object.entries(keywords)) {
  const missingWords = SHARED_KEYWORDS.filter((k) => !list?.includes(k));
  if (missingWords.length)
    fail(`${where}: keywords lack ${missingWords.join(', ')}`);
}
for (const dir of ['react', 'faker', 'vue', 'angular', 'pay']) {
  for (const word of ['pakistan', 'pakdatakit']) {
    if (!npm[dir].keywords?.includes(word))
      fail(`${dir}/package.json: keywords lack ${word}`);
  }
}
if (!yamlList(pubspec.flutter, 'topics').includes('pakistan')) {
  fail(`${pubspec.flutter}: topics lack pakistan`);
}
for (const path of Object.values(pubspec)) {
  if (yamlList(path, 'topics').length > 5)
    fail(`${path}: pub.dev allows at most 5 topics`);
}

// ---------------------------------------------------------------------------
// 6. SECURITY.md lists every package's current minor version
// ---------------------------------------------------------------------------

const security = read('SECURITY.md');
const minor = (v) => v.split('.').slice(0, 2).join('.') + '.x';
const supported = {
  pakdatakit: minor(version),
  PakDataKit: minor(version),
  'chmuzamil/pakdatakit': minor(version),
  'pakdatakit-react': minor(npm.react.version),
  'pakdatakit-faker': minor(npm.faker.version),
  'pakdatakit-vue': minor(npm.vue.version),
  'pakdatakit-angular': minor(npm.angular.version),
  'pakdatakit-pay': minor(npm.pay.version),
  pakdatakit_flutter: minor(yamlScalar(pubspec.flutter, 'version')),
};
for (const [name, v] of Object.entries(supported)) {
  const rows = security
    .split('\n')
    .filter((line) => line.startsWith('|') && line.includes(`\`${name}\``));
  if (!rows.length) fail(`SECURITY.md: no row for \`${name}\``);
  else if (!rows.every((row) => row.includes(v)))
    fail(`SECURITY.md: \`${name}\` should list ${v}`);
}

// ---------------------------------------------------------------------------
// 7. The API reference documents every public subpath
// ---------------------------------------------------------------------------

const typedoc = JSON.parse(read('typedoc.json'));
const documented = new Set(
  typedoc.entryPoints.map((entry) =>
    entry.replace(/^src\/(adapters\/)?/, '').replace(/\.ts$/, ''),
  ),
);
for (const key of Object.keys(core.exports ?? {})) {
  if (key === '.' || key === './package.json') continue;
  const subpath = key.slice(2);
  if (!documented.has(subpath))
    fail(`typedoc.json: add the entry point for pakdatakit/${subpath}`);
}

// ---------------------------------------------------------------------------

if (problems.length) {
  console.error(`Metadata check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `Metadata consistent: version ${version}, data ${dataVersion}, ${Object.keys(repositories).length} manifests point to ${REPO}.`,
);
