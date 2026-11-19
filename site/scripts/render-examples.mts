// Dev helper: prints site/examples/<module>.json as the five code tabs, with
// each result computed by the built library (dist/), e.g.
//   node site/scripts/render-examples.mts networks
import { readFileSync } from 'node:fs';
import { LANGS, snippet, type Example } from '../src/lib/snippets.ts';
const lib = await import('../../dist/index.js');
const mod = process.argv[2];
const file = JSON.parse(
  readFileSync(new URL(`../examples/${mod}.json`, import.meta.url), 'utf8'),
);
const revive = (v: unknown): unknown =>
  v && typeof v === 'object' && '$date' in (v as object)
    ? new Date((v as { $date: string }).$date)
    : v;
const enc = (v: unknown): unknown =>
  v instanceof Date
    ? { $date: v.toISOString() }
    : JSON.parse(JSON.stringify(v ?? null));
const examples: Example[] = file.examples.map((ex: Example) => {
  if ('expected' in ex) return ex;
  const args = (ex.args ?? []).map(revive);
  const kw = Object.fromEntries(
    Object.entries(ex.kwargs ?? {}).map(([k, v]) => [k, revive(v)]),
  );
  const got = (lib as Record<string, (...a: unknown[]) => unknown>)[ex.fn](
    ...args,
    ...(Object.keys(kw).length ? [kw] : []),
  );
  return { ...ex, expected: enc(got) };
});
for (const l of LANGS)
  console.log(`----- ${l.label}\n${snippet(l.id, examples)}\n`);
