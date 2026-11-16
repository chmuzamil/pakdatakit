import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Angular's decorators are compiled as TypeScript legacy decorators and
  // run through the JIT compiler in tests.
  esbuild: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
