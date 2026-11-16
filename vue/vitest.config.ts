import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The template compiler is only needed by the plugin test's inline template.
  resolve: { alias: { vue: 'vue/dist/vue.esm-bundler.js' } },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
