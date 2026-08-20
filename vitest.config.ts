import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // apps/mobile: yalnizca yapisal testler (rota adlari, yapilandirma tutarliligi).
    // Bilesen testi degil -- React yorumlayicisi yok; burada sinanan sey dosya duzeni.
    include: ['packages/*/src/**/*.test.ts', 'apps/mobile/src/**/*.test.ts'],
    testTimeout: 30_000,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@made2fit/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
      '@made2fit/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
    },
  },
});
