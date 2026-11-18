// @vitest-environment node
import { build } from 'esbuild';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'pakdatakit-angular-bundle-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Post office and postal code records, as esbuild minifies them. The form's
// own `postalCode: ''` field is not a record, so the code must be digits.
const MARKERS = [/town:"/, /postalCode:"\d{5}"/];

describe('bundle of an app using only the form', () => {
  it('keeps the post office directory out of the entry chunk', async () => {
    const src = resolve(__dirname, '../src/public-api.ts').replace(/\\/g, '/');
    const entry = join(dir, 'app.ts');
    writeFileSync(
      entry,
      `import { bootstrapApplication } from '@angular/platform-browser';\n` +
        `import { PakCheckoutFormComponent } from '${src}';\n` +
        `void bootstrapApplication(PakCheckoutFormComponent);\n`,
    );
    const outdir = join(dir, 'out');
    await build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      splitting: true,
      minify: true,
      outdir,
      external: ['@angular/*', 'rxjs', 'rxjs/*'],
      // The library's decorators, as its own tsconfig compiles them.
      tsconfig: resolve(__dirname, '../tsconfig.json'),
      nodePaths: [resolve(__dirname, '../node_modules')],
      logLevel: 'silent',
    });
    const read = (name: string) => readFileSync(join(outdir, name), 'utf8');
    // The entry and every chunk it imports statically load with the page.
    const initial = new Set<string>();
    const visit = (name: string): void => {
      if (initial.has(name)) return;
      initial.add(name);
      for (const match of read(name).matchAll(
        /(?:from|import)\s*"\.\/([^"]+\.js)"/g,
      )) {
        visit(match[1]!);
      }
    };
    visit('app.js');
    const initialCode = [...initial].map(read).join('\n');
    for (const marker of MARKERS) expect(initialCode).not.toMatch(marker);

    const lazy = readdirSync(outdir)
      .filter((name) => name.endsWith('.js') && !initial.has(name))
      .map(read);
    for (const marker of MARKERS) {
      expect(lazy.some((code) => marker.test(code))).toBe(true);
    }
    const kB = (code: string) => (gzipSync(code).length / 1024).toFixed(1);
    console.info(
      `pakdatakit-angular form bundle: entry ${kB(read('app.js'))} kB gzipped, ` +
        `initial load ${kB(initialCode)} kB gzipped, ` +
        `lazy hints chunks ${kB(lazy.join('\n'))} kB gzipped`,
    );
  }, 60_000);
});
