import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', web: 'src/web.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2022',
  platform: 'neutral',
  // node:crypto is only imported by the Node entry point.
  external: ['node:crypto'],
  removeNodeProtocol: false,
});
