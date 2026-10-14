import { defineConfig } from 'tsup';

/** Public modules; each is also exposed as a subpath (e.g. `pakdatakit/cnic`). */
export const modules = [
  'address',
  'cnic',
  'format',
  'geo',
  'hijri',
  'holidays',
  'iban',
  'input',
  'networks',
  'numbers',
  'phone',
  'postal',
  'raast',
  'tax',
  'text',
  'whatsapp',
  'words',
];

/** Form-library adapters; each is exposed as a subpath (e.g. `pakdatakit/zod`). */
export const adapters = ['valibot', 'yup', 'zod'];

const libraryEntries = Object.fromEntries([
  ['index', 'src/index.ts'],
  ...modules.map((name) => [name, `src/${name}.ts`]),
  ...adapters.map((name) => [name, `src/adapters/${name}.ts`]),
]);

export default defineConfig([
  {
    entry: libraryEntries,
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    treeshake: true,
    target: 'node20',
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    treeshake: true,
    target: 'node20',
    // The CLI imports 'pakdatakit', which resolves to the library build at
    // runtime, so the library is not bundled a second time.
    external: ['pakdatakit'],
  },
]);
