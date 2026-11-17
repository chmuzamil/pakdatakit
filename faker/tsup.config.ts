import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2020',
  // pakdatakit is a runtime dependency. The frozen datasets in src/snapshot
  // are bundled into dist, so the package is self-contained.
  external: ['pakdatakit'],
});
