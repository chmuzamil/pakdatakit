// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { lastModified } from './src/lib/lastmod.mjs';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
import { GITHUB, INDEXABLE, SITE } from './site.config.mjs';

// The TypeScript API reference uses the same entry points as the root
// typedoc.json, rendered as Starlight pages under /api/typescript/.
const rootTypedoc = JSON.parse(
  readFileSync(new URL('../typedoc.json', import.meta.url), 'utf8'),
);

const lang = (code, label) => ({ label, link: `/install/${code}/` });
/** A collapsible sidebar group of module guides: [label, slug] pairs. */
const guides = (label, items) => ({
  label,
  collapsed: true,
  items: items.map(([text, slug]) => ({ label: text, link: `/docs/${slug}/` })),
});

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Hashes for every inline script and <style> go into a <meta> CSP on each
  // page. Inline style *attributes* (code highlighting, React style={}) are
  // allowed through style-src-attr; they can't run script. The Nginx header
  // adds the rest (connect-src 'self', frame-ancestors 'none', ...).
  security: {
    csp: {
      styleDirective: {
        resources: [
          "'self'",
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Never inline fonts as data: URLs: the server's CSP allows fonts from
    // this site only (font-src 'self').
    build: {
      assetsInlineLimit: (file) =>
        /\.(woff2?|ttf|otf)$/.test(file) ? false : undefined,
    },
  },
  integrations: [
    // Added here (Starlight would add a plain one) to give every URL a
    // <lastmod>: the last commit that changed the page's source.
    sitemap({
      serialize(item) {
        item.lastmod = lastModified(new URL(item.url).pathname);
        return item;
      },
    }),
    starlight({
      title: 'PakDataKit',
      routeMiddleware: './src/routeData.ts',
      plugins: [
        starlightTypeDoc({
          entryPoints: rootTypedoc.entryPoints.map((e) => `../${e}`),
          tsconfig: '../tsconfig.json',
          output: 'api/typescript',
          sidebar: { label: 'TypeScript API', collapsed: true },
          typeDoc: {
            entryPointStrategy: 'resolve',
            excludePrivate: true,
            excludeInternal: true,
            sort: ['source-order'],
            name: 'TypeScript API reference',
            readme: 'none',
            entryFileName: 'index',
            indexFormat: 'table',
            tableColumnSettings: { hideSources: true, leftAlignHeaders: true },
            parametersFormat: 'table',
            interfacePropertiesFormat: 'table',
            typeDeclarationFormat: 'table',
            enumMembersFormat: 'table',
            useCodeBlocks: true,
            expandObjects: false,
            logLevel: 'Warn',
          },
        }),
      ],
      description:
        'Pakistani data utilities for TypeScript, Python, Dart/Flutter, .NET and PHP/Laravel, with React, Vue and Angular helpers.',
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      social: [{ icon: 'github', label: 'GitHub', href: GITHUB }],
      lastUpdated: false,
      favicon: '/favicon.svg',
      customCss: ['./src/styles/theme.css'],
      components: {
        Head: './src/components/Head.astro',
        Footer: './src/components/Footer.astro',
        PageTitle: './src/components/PageTitle.astro',
        Hero: './src/components/Hero.astro',
      },
      head: [
        // Icons from scripts/icons.mjs (favicon.svg is Starlight's `favicon`).
        {
          tag: 'link',
          attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        },
        { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.json' } },
        ...(INDEXABLE
          ? []
          : [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } }]),
      ],
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'Overview', link: '/' },
            {
              label: 'Install',
              items: [
                lang('typescript', 'TypeScript / JavaScript'),
                lang('python', 'Python'),
                lang('dart', 'Dart'),
                lang('flutter', 'Flutter'),
                lang('dotnet', '.NET'),
                lang('php', 'PHP / Laravel'),
                lang('react', 'React'),
                lang('vue', 'Vue'),
                lang('angular', 'Angular'),
              ],
            },
          ],
        },
        {
          label: 'Modules',
          // Grouped like the module cards on the home page and /docs/.
          items: [
            { label: 'All guides', link: '/docs/' },
            guides('Identity', [
              ['CNIC', 'cnic'],
              ['Passport', 'passport'],
              ['Vehicle plates', 'vehicle'],
            ]),
            guides('Phone', [
              ['Mobile numbers', 'phone'],
              ['Mobile networks', 'networks'],
              ['Landlines and area codes', 'numbers'],
              ['WhatsApp links', 'whatsapp'],
            ]),
            guides('Banking and payments', [
              ['IBAN and banks', 'iban'],
              ['Raast QR', 'raast'],
              ['Utility bills', 'bills'],
              ['Amounts in words', 'words'],
              ['PKR and lakh/crore', 'format'],
            ]),
            guides('Tax and FBR', [
              ['Sales tax', 'salestax'],
              ['Income tax on salary', 'incometax'],
              ['NTN and STRN', 'tax'],
              ['FBR digital invoices', 'fbr-invoice'],
            ]),
            guides('Geography and postal', [
              ['Postal codes', 'postal'],
              ['Provinces and districts', 'geo'],
              ['Addresses', 'address'],
            ]),
            guides('Delivery and COD', [
              ['COD address and phone checks', 'quality'],
              ['Courier statuses', 'courier'],
            ]),
            guides('Text and dates', [
              ['Urdu text', 'text'],
              ['Hijri dates', 'hijri'],
              ['Public holidays', 'holidays'],
            ]),
            guides('Forms', [
              ['As-you-type input', 'input'],
              ['Form kits and adapters', 'forms'],
            ]),
          ],
        },
        {
          label: 'Tools',
          items: [
            { label: 'CNIC checker', link: '/tools/cnic/' },
            { label: 'IBAN checker', link: '/tools/iban/' },
            { label: 'Salary tax calculator', link: '/tools/salary-tax/' },
            { label: 'Sales tax calculator', link: '/tools/sales-tax/' },
            { label: 'Playground', link: '/playground/' },
          ],
        },
        {
          label: 'Reference',
          items: [typeDocSidebarGroup],
        },
        {
          label: 'Project',
          items: [
            { label: 'Releases', link: '/releases/' },
            { label: 'Data sources', link: '/data/' },
            { label: 'About and privacy', link: '/about/' },
          ],
        },
      ],
    }),
    react(),
  ],
});
