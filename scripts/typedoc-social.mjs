/**
 * TypeDoc plugin: adds share-preview (Open Graph / Twitter card) tags and a
 * favicon to every docs page, and copies the share image into the output.
 *
 * The image is docs/og-image.png, rendered from docs/og-image.svg.
 */
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSX, RendererEvent } from 'typedoc';

const docsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const description =
  'Validate and format Pakistani CNICs, phones and IBANs, create Raast QR codes, and look up cities, postal codes and holidays. For TypeScript, Python, Dart and Flutter.';

/** @param {import('typedoc').Application} app */
export function load(app) {
  app.renderer.hooks.on('head.end', (context) => {
    const base = app.options.getValue('hostedBaseUrl') ?? '';
    const pageUrl = base + context.page.url.replace(/(^|\/)index\.html$/, '$1');
    const title =
      context.page.model.isProject?.() === true
        ? 'PakDataKit Documentation'
        : `${context.page.model.name} · PakDataKit Documentation`;
    const image = `${base}og-image.png`;
    const meta = (key, content) =>
      JSX.createElement('meta', {
        [key.startsWith('og:') ? 'property' : 'name']: key,
        content,
      });

    return JSX.createElement(
      JSX.Fragment,
      null,
      JSX.createElement('link', {
        rel: 'icon',
        type: 'image/svg+xml',
        href: context.relativeURL('favicon.svg'),
      }),
      meta('og:type', 'website'),
      meta('og:site_name', 'PakDataKit'),
      meta('og:title', title),
      meta('og:description', description),
      meta('og:url', pageUrl),
      meta('og:image', image),
      meta('og:image:width', '1200'),
      meta('og:image:height', '630'),
      meta(
        'og:image:alt',
        'PakDataKit: Pakistani data utilities for every stack',
      ),
      meta('twitter:card', 'summary_large_image'),
      meta('twitter:title', title),
      meta('twitter:description', description),
      meta('twitter:image', image),
    );
  });

  app.renderer.on(RendererEvent.END, (event) => {
    for (const file of ['og-image.png', 'favicon.svg']) {
      copyFileSync(join(docsDir, file), join(event.outputDirectory, file));
    }
  });
}
