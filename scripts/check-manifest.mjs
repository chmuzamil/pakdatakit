#!/usr/bin/env node
/**
 * Checks data/manifest.json against the datasets in data/:
 *
 * - every data/*.json file (except the manifest) has exactly one entry, and
 *   every entry names a file that exists;
 * - every entry has all the fields, with dates as YYYY, YYYY-MM or
 *   YYYY-MM-DD;
 * - `recordCount` matches the data (array length, or keys of an object);
 * - for datasets with a `series` (year- or period-based data), the records in
 *   each group cover a continuous range: no overlap, no gap, and only the
 *   last may be open-ended (`to: null`).
 *
 *   node scripts/check-manifest.mjs          # the checks above; exit 1 on failure
 *   node scripts/check-manifest.mjs --due    # prints JSON of the entries whose
 *                                            # nextExpectedUpdate is before today
 *   node scripts/check-manifest.mjs --due --today 2027-08-01
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const manifest = JSON.parse(
  readFileSync(join(dataDir, 'manifest.json'), 'utf8'),
);

const args = process.argv.slice(2);
if (args.includes('--due')) {
  const at = args.indexOf('--today');
  const today = at >= 0 ? args[at + 1] : new Date().toISOString().slice(0, 10);
  const due = manifest.filter(
    (e) => e.nextExpectedUpdate && e.nextExpectedUpdate < today,
  );
  console.log(JSON.stringify(due, null, 2));
  process.exit(0);
}

const FIELDS = [
  'id',
  'file',
  'title',
  'issuer',
  'sourceUrl',
  'sourceReference',
  'sourceDate',
  'retrievedAt',
  'checkedAt',
  'effectiveFrom',
  'effectiveTo',
  'coverage',
  'recordCount',
  'nextExpectedUpdate',
  'updateCadence',
  'notes',
];
/** Fields that may be null (unknown or open-ended). */
const NULLABLE = new Set(['sourceDate', 'effectiveTo']);
const DATE = /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FIELDS = [
  'sourceDate',
  'retrievedAt',
  'checkedAt',
  'effectiveFrom',
  'effectiveTo',
  'nextExpectedUpdate',
];

const errors = [];
const fail = (msg) => errors.push(msg);

/** The day after an ISO date. */
function nextDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const files = readdirSync(dataDir).filter(
  (f) => f.endsWith('.json') && f !== 'manifest.json',
);
const ids = new Set();
const byFile = new Map();
for (const entry of manifest) {
  const label = entry.id ?? JSON.stringify(entry).slice(0, 40);
  for (const field of FIELDS) {
    if (!(field in entry)) fail(`${label}: missing "${field}"`);
    else if (entry[field] === null && !NULLABLE.has(field))
      fail(`${label}: "${field}" is null`);
    else if (entry[field] === '') fail(`${label}: "${field}" is empty`);
  }
  if (ids.has(entry.id)) fail(`${label}: duplicate id`);
  ids.add(entry.id);
  if (byFile.has(entry.file)) fail(`${label}: ${entry.file} has two entries`);
  byFile.set(entry.file, entry);
  for (const field of DATE_FIELDS) {
    const value = entry[field];
    if (value !== null && value !== undefined && !DATE.test(value))
      fail(`${label}: "${field}" is not YYYY, YYYY-MM or YYYY-MM-DD: ${value}`);
  }
  for (const field of ['retrievedAt', 'checkedAt', 'nextExpectedUpdate'])
    if (entry[field] && !FULL_DATE.test(entry[field]))
      fail(`${label}: "${field}" must be a full date`);
  if (
    entry.effectiveTo &&
    entry.effectiveFrom &&
    entry.effectiveTo < entry.effectiveFrom
  )
    fail(`${label}: effectiveTo is before effectiveFrom`);
  if (
    typeof entry.sourceUrl === 'string' &&
    !/^https:\/\//.test(entry.sourceUrl)
  )
    fail(`${label}: sourceUrl must be https`);
}

for (const file of files)
  if (!byFile.has(file))
    fail(`data/${file} has no entry in data/manifest.json`);

// Each dataset has a refresh section: a heading tagged `<!-- dataset: id -->`.
const refresh = readFileSync(join(root, 'scripts', 'data-refresh.md'), 'utf8');
for (const entry of manifest)
  if (!refresh.includes(`<!-- dataset: ${entry.id} -->`))
    fail(`${entry.id}: no section in scripts/data-refresh.md`);

for (const [file, entry] of byFile) {
  if (!files.includes(file)) {
    fail(`${entry.id}: data/${file} does not exist`);
    continue;
  }
  const data = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
  const records = Array.isArray(data)
    ? data
    : Array.isArray(data.records)
      ? data.records
      : null;
  const count = records ? records.length : Object.keys(data).length;
  if (count !== entry.recordCount)
    fail(`${entry.id}: recordCount is ${entry.recordCount}, data has ${count}`);

  if (entry.series) {
    if (!records) {
      fail(`${entry.id}: a series needs an array of records`);
      continue;
    }
    // A numbered series (e.g. Zakat years): consecutive, no repeats, no gaps.
    if (entry.series.sequence) {
      const key = entry.series.sequence;
      const values = records.map((r) => r[key]).sort((a, b) => a - b);
      values.forEach((v, i) => {
        if (!Number.isInteger(v))
          fail(`${entry.id}: ${key} ${v} is not an integer`);
        else if (i > 0 && v !== values[i - 1] + 1)
          fail(`${entry.id}: ${key} jumps from ${values[i - 1]} to ${v}`);
      });
      continue;
    }
    const { from, to, groupBy = [] } = entry.series;
    const groups = new Map();
    for (const record of records) {
      const key = JSON.stringify(groupBy.map((k) => record[k] ?? null));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    for (const [key, list] of groups) {
      const where = `${entry.id} ${groupBy.length ? key : ''}`.trim();
      list.sort((a, b) => (a[from] < b[from] ? -1 : 1));
      list.forEach((record, i) => {
        if (!FULL_DATE.test(record[from] ?? ''))
          fail(`${where}: "${from}" ${record[from]} is not a full date`);
        if (record[to] !== null && !FULL_DATE.test(record[to] ?? ''))
          fail(`${where}: "${to}" ${record[to]} is not a full date or null`);
        if (record[to] !== null && record[to] < record[from])
          fail(`${where}: ${record[from]} ends before it starts`);
        const next = list[i + 1];
        if (!next) return;
        if (record[to] === null)
          fail(
            `${where}: ${record[from]} is open-ended but ${next[from]} follows`,
          );
        else if (next[from] <= record[to])
          fail(
            `${where}: ${record[from]}..${record[to]} overlaps ${next[from]}`,
          );
        else if (next[from] !== nextDay(record[to]))
          fail(`${where}: gap between ${record[to]} and ${next[from]}`);
      });
    }
  }
}

if (errors.length) {
  console.error(`check-manifest: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(
  `check-manifest: ${manifest.length} datasets, every data file listed, counts and series ranges correct`,
);
