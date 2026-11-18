// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { afterAll, describe, expect, it } from 'vitest';

// Post office records (pakdatakit/postal and the directory behind it) as they
// look once minified. The form itself has a `postalCode` field (labels, empty
// values), so the postal code marker must be followed by an actual code.
const MARKERS = [/town:"/, /postalCode:"\d{5}"/];
const has = (code: string, marker: RegExp) => marker.test(code);

const dir = mkdtempSync(join(tmpdir(), 'pakdatakit-react-forms-'));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('form bundle', () => {
  it('keeps the postal directory out of the entry chunk', async () => {
    const src = resolve(__dirname, '../src/index.ts').replace(/\\/g, '/');
    const entry = join(dir, 'app.tsx');
    writeFileSync(
      entry,
      `import { PakCheckoutForm } from '${src}';\nexport const App = () => <PakCheckoutForm hints />;\n`,
    );
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      splitting: true,
      minify: true,
      outdir: join(dir, 'out'),
      jsx: 'automatic',
      external: ['react', 'react-dom', 'react/jsx-runtime', 'qrcode'],
      metafile: true,
      logLevel: 'silent',
      // Resolve pakdatakit from this package, not from the temp dir.
      nodePaths: [resolve(__dirname, '../node_modules')],
    });

    const outputs = Object.entries(result.metafile.outputs).filter(([file]) =>
      file.endsWith('.js'),
    );
    const entryFile = outputs.find(([, meta]) => meta.entryPoint)?.[0];
    expect(entryFile).toBeTruthy();
    const read = (file: string) =>
      readFileSync(resolve(process.cwd(), file), 'utf8');

    const entryCode = read(entryFile!);
    for (const marker of MARKERS) expect(has(entryCode, marker)).toBe(false);

    // Nor in any chunk the entry imports statically.
    const staticImports = new Set<string>();
    const walk = (file: string) => {
      for (const imp of result.metafile.outputs[file]?.imports ?? []) {
        if (
          imp.kind === 'import-statement' &&
          !imp.external &&
          !staticImports.has(imp.path)
        ) {
          staticImports.add(imp.path);
          walk(imp.path);
        }
      }
    };
    walk(entryFile!);
    for (const file of staticImports) {
      for (const marker of MARKERS) expect(has(read(file), marker)).toBe(false);
    }

    const lazy = outputs
      .map(([file]) => file)
      .filter((file) => file !== entryFile && !staticImports.has(file))
      .filter((file) => MARKERS.some((marker) => has(read(file), marker)));
    expect(lazy.length).toBeGreaterThan(0);

    const gz = (code: string) => gzipSync(code).length;
    const lazyCode = lazy.map(read).join('');
    const baseCode = [entryCode, ...[...staticImports].map(read)].join('');
    console.log(
      `form entry chunk: ${entryCode.length} B, ${gz(entryCode)} B gzipped; ` +
        `with static imports: ${baseCode.length} B, ${gz(baseCode)} B gzipped; ` +
        `lazy hint chunk(s): ${lazyCode.length} B, ${gz(lazyCode)} B gzipped`,
    );
  }, 60_000);
});
