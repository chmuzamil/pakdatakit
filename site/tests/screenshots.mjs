// Screenshots for pull requests: home, a docs page, a tool page, the API
// reference and the playground, in light and dark, on mobile and desktop.
// Usage: PW_BASE_URL=http://localhost:4321 node tests/screenshots.mjs <out-dir>
// (PW_CHANNEL=msedge to use an installed browser.)
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.PW_BASE_URL ?? 'http://localhost:4329';
const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });

const PAGES = [
  ['home', '/'],
  ['docs-cnic', '/docs/cnic/'],
  ['tool-salary-tax', '/tools/salary-tax/#salary=150000&per=month&year=2027'],
  ['api', '/api/typescript/'],
  ['playground-cnic', '/playground/cnic/'],
];
const VIEWS = [
  ['desktop', { viewport: { width: 1280, height: 860 } }],
  ['mobile', devices['Pixel 7']],
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
for (const [view, opts] of VIEWS) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ ...opts, colorScheme: scheme });
    const page = await ctx.newPage();
    for (const [name, path] of PAGES) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(out, `${name}-${view}-${scheme}.png`) });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`screenshots: ${PAGES.length * 4} written to ${out}`);
