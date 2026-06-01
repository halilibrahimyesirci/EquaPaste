// Rasterizes the brand SVGs in store/promo/ to exact-size Chrome Web Store PNGs:
//   marquee.png    1400x560  (marquee promo tile)
//   promotitle.png  440x280  (small promo tile — landscape, the size the store requires)
// Uses the Playwright Chromium the e2e tests already depend on, so there is no extra
// runtime dependency. Run once: `npx playwright install chromium`, then `pnpm promo`.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = [
  { svg: 'store/promo/marquee.svg', out: 'store/screenshots/marquee.png', w: 1400, h: 560 },
  { svg: 'store/promo/small-tile.svg', out: 'store/screenshots/promotitle.png', w: 440, h: 280 },
];

const browser = await chromium.launch();
try {
  for (const job of JOBS) {
    const svg = readFileSync(resolve(ROOT, job.svg), 'utf8');
    const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: 1 });
    const html = `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:${job.w}px;height:${job.h}px;overflow:hidden}</style>${svg}`;
    await page.setContent(html, { waitUntil: 'load' });
    // Runs in the browser context (Playwright), where `document` exists.
    // eslint-disable-next-line no-undef
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(ROOT, job.out), clip: { x: 0, y: 0, width: job.w, height: job.h } });
    await page.close();
    console.log(`wrote ${job.out} (${job.w}x${job.h})`);
  }
} finally {
  await browser.close();
}
