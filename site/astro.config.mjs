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
      editLink: { baseUrl: `${GITHUB}/edit/main/site/` },
      lastUpdated: false,
      favicon: '/favicon.svg',
      customCss: ['./src/styles/theme.css'],
      components: {
        Head: './src/components/Head.astro',
        Footer: './src/components/Footer.astro',
        PageTitle: './src/components/PageTitle.astro',
      },
      head: [
        // Icons from scripts/icons.mjs (favicon.svg is Starlight's `favicon`).
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
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
          items: [
            { label: 'All guides', link: '/docs/' },
            { label: 'CNIC', link: '/docs/cnic/' },
            { label: 'Phone', link: '/docs/phone/' },
            { label: 'IBAN and banks', link: '/docs/iban/' },
            { label: 'Raast QR', link: '/docs/raast/' },
            { label: 'Sales tax', link: '/docs/salestax/' },
            { label: 'Income tax on salary', link: '/docs/incometax/' },
            { label: 'Postal codes', link: '/docs/postal/' },
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
