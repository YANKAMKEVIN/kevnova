import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 600 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/sim/**', 'src/data/**', 'src/save/**', 'src/meta/**', 'src/input/touch.ts'],
      thresholds: { lines: 95, functions: 95, branches: 88, statements: 95 },
    },
  },
});
