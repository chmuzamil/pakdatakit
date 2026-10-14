import { defineConfig } from 'tsup';

/** Public modules; each is also exposed as a subpath (e.g. `pakdatakit/cnic`). */
export const modules = [
  'address',
  'cnic',
  'format',
  'geo',
  'hijri',
  'iban',
  'networks',
  'phone',
  'postal',
  'text',
  'whatsapp',
];

const libraryEntries = Object.fromEntries([
  ['index', 'src/index.ts'],
  ...modules.map((name) => [name, `src/${name}.ts`]),
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
