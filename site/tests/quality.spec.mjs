// Quality gates: accessibility (axe), no network requests while a tool runs,
// and no CSP violations. Links are checked separately (npm run check:links)
// and the old API URLs by npm run check:redirects.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { HEADER_CSP } from '../site.config.mjs';

const PAGES = [
  '/',
  '/install/typescript/',
  '/docs/cnic/',
  '/docs/salestax/',
  '/docs/withholding/',
  '/docs/zakat/',
  '/docs/population/',
  '/docs/data-info/',
  '/docs/raast/',
  // Module guides added in Phase 2: each has a live widget.
  ...[
    'networks',
    'numbers',
    'whatsapp',
    'tax',
    'passport',
    'vehicle',
    'bills',
    'quality',
    'courier',
    'fbr-invoice',
    'geo',
    'address',
    'text',
    'words',
    'format',
    'amount',
    'hijri',
    'holidays',
    'input',
    'forms',
  ].map((m) => `/docs/${m}/`),
  '/docs/',
  // Use cases: each walks through a task with code and a live demo.
  '/use-cases/',
  ...[
    'checkout-kyc',
    'fbr-digital-invoicing',
    'payroll-salary-tax',
    'cod-screening',
    'raast-collection',
    'bill-payment',
  ].map((m) => `/use-cases/${m}/`),
  '/tools/',
  '/tools/cnic/',
  '/tools/iban/',
  '/tools/salary-tax/',
  '/tools/sales-tax/',
  '/tools/phone/',
  '/tools/bills/',
  '/tools/address-score/',
  '/tools/fbr-invoice-validator/',
  '/tools/urdu-text/',
  '/playground/',
  '/playground/cnic/',
  '/playground/fbr-invoice/',
  '/api/typescript/',
  '/api/typescript/cnic/',
  '/api/typescript/salestax/functions/calculatesalestax/',
  '/api/typescript/salestax/interfaces/salestaxoptions/',
  // The other ports' references: each landing page and one module page.
  '/api/python/',
  '/api/python/cnic/',
  '/api/dart/',
  '/api/dart/salestax/',
  '/api/dotnet/',
  '/api/dotnet/fbr-invoice/',
  '/api/php/',
  '/api/php/laravel/',
  '/releases/',
  '/data/',
  '/about/',
];

// The CSP header the server sends in production (HEADER_CSP in
// site.config.mjs). astro preview sends no headers, so every page is served
// with it here too: browsers enforce it together with each page's <meta> CSP.

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': HEADER_CSP,
      },
    });
  });
});

/** Fails the test on any Content-Security-Policy violation. */
async function watchCsp(page) {
  const violations = [];
  page.on('console', (msg) => {
    if (
      msg.type() === 'error' &&
      /Content Security Policy|violates the following/i.test(msg.text())
    )
      violations.push(msg.text().slice(0, 200));
  });
  return violations;
}

for (const path of PAGES) {
  for (const scheme of ['light', 'dark']) {
    test(`axe: no serious issues on ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const csp = await watchCsp(page);
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // hydrate client:visible widgets
      await page.waitForTimeout(500);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('astro-dev-toolbar')
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        // Starlight's search button is labelled "Search" but also shows its
        // keyboard shortcut (Ctrl K); that is Starlight's markup, not ours, and
        // the name still starts with the visible word.
        .map((v) =>
          v.id === 'label-content-name-mismatch'
            ? {
                ...v,
                nodes: v.nodes.filter(
                  (n) => !String(n.target).includes('data-open-modal'),
                ),
              }
            : v,
        )
        .filter((v) => v.nodes.length > 0);
      expect(
        serious.map(
          (v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target}`,
        ),
        `axe found serious issues on ${path}`,
      ).toEqual([]);
      expect(csp, `CSP violations on ${path}`).toEqual([]);
    });
  }
}

const TOOLS = [
  // The home page's live demo (CNIC tab).
  { path: '/', text: '61101-7654321-3' },
  { path: '/tools/cnic/', text: '42101-1234567-2' },
  { path: '/tools/iban/', text: 'PK36SCBL0000001123456702' },
  { path: '/tools/salary-tax/', text: '987654' },
  { path: '/tools/sales-tax/', text: '45678' },
  { path: '/tools/phone/', text: '03451234500' },
  { path: '/tools/bills/', text: '12345678901234U' },
  {
    path: '/tools/address-score/',
    text: 'House 9 Street 3 near Masjid Lahore',
  },
  {
    path: '/tools/fbr-invoice-validator/',
    text: '{"invoiceType":"Sale Invoice"}',
  },
  { path: '/tools/urdu-text/', text: 'Lahore 2026' },
  { path: '/playground/cnic/', text: '61101-7654321-3' },
];

for (const tool of TOOLS) {
  test(`no network requests while ${tool.path} runs`, async ({ page }) => {
    await page.goto(tool.path);
    // client:load and client:idle islands (the homepage demo) can hydrate after
    // networkidle; Astro drops the island's `ssr` attribute once it has. Wait for
    // them so their own code chunks aren't counted as requests made while typing.
    await page.waitForFunction(
      () =>
        !document.querySelector('astro-island[ssr]:not([client="visible"])'),
    );
    await page.waitForLoadState('networkidle');
    const requests = [];
    page.on('request', (req) => requests.push(req));
    // The tool's first text field (not a radio, checkbox or date).
    const input = page
      .locator('main :is(input:not([type]), input[type="text"], textarea)')
      .first();
    await input.fill('');
    await input.pressSequentially(tool.text, { delay: 20 });
    await page.waitForTimeout(1500);
    const problems = [];
    for (const req of requests) {
      const url = new URL(req.url());
      const sameOrigin = url.origin === new URL(page.url()).origin;
      // The only request allowed is the same-origin analytics event, and it must
      // not contain anything that was typed.
      if (
        sameOrigin &&
        url.pathname === '/api/send' &&
        req.method() === 'POST'
      ) {
        const body = req.postData() ?? '';
        if (
          body.includes(tool.text) ||
          body.includes(tool.text.replace(/\D/g, '')) ||
          body.includes('#')
        )
          problems.push(
            `analytics payload contains input: ${body.slice(0, 120)}`,
          );
        continue;
      }
      // Chromium re-reads the tab icon when the URL hash changes; it is a static
      // file and carries nothing that was typed.
      if (
        sameOrigin &&
        req.method() === 'GET' &&
        url.pathname === '/favicon.svg' &&
        !url.search
      )
        continue;
      problems.push(`${req.method()} ${req.url()}`);
    }
    expect(problems, `requests made while ${tool.path} was running`).toEqual(
      [],
    );
  });
}

for (const [path, text] of [
  ['/tools/cnic/', '35202-1234567-1'],
  ['/tools/phone/', '03451234500'],
  ['/tools/bills/', '12345678901234U'],
  ['/tools/address-score/', 'House 9 Street 3 Lahore'],
  ['/tools/urdu-text/', 'Lahore 2026'],
]) {
  test(`${path} keeps input out of the URL until "Copy share link"`, async ({
    page,
  }) => {
    await page.goto(path);
    await page
      .locator('main :is(input:not([type]), input[type="text"], textarea)')
      .first()
      .fill(text);
    await page.waitForTimeout(300);
    expect(decodeURIComponent(page.url())).not.toContain(text.slice(0, 5));
  });
}

test('?lang=python selects Python in every code tab', async ({ page }) => {
  await page.goto('/docs/cnic/?lang=python');
  const selected = page
    .locator('starlight-tabs [role="tab"][aria-selected="true"]')
    .first();
  await expect(selected).toHaveText('Python');
});
