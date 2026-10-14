import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2020',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'pakdatakit', 'qrcode'],
  // The hooks and components only run on the client (React Server Components).
  banner: { js: "'use client';" },
});
