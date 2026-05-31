import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom gives us DOMParser / XMLSerializer for the MathML walk in src/core.
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      // src/core/ is pure logic — hold it to a high bar.
      thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 },
    },
  },
});
