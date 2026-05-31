import { defineConfig } from '@playwright/test';

// E2E runs against a local fixture page that mimics a KaTeX-rendered AI chat,
// plus (optionally, when EQUAPASTE_E2E_LIVE=1) the real ChatGPT/Claude DOM.
// Loading the built MV3 extension requires a persistent Chromium context; the
// helper in tests/e2e/fixtures.ts builds and loads .output/chrome-mv3.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: false,
  },
});
