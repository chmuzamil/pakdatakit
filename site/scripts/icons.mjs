/**
 * Site icons, generated from the two logo sources:
 * - src/assets/favicon-16.svg: concept 1 simplified for 16px (card and tick)
 * - src/assets/logo.svg: concept 1, used for 32px and up
 *
 * Writes into public/: favicon.svg (the 16px design; browser tabs show it at
 * 16px), favicon.ico (16 simplified + 32 and 48 full), apple-touch-icon.png
 * (180, full bleed), icon-192.png, icon-512.png, icon-maskable-512.png and
 * manifest.json. Run by scripts/generate.mjs.
 */
import { Resvg } from '@resvg/resvg-js';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('..', import.meta.url));
const pub = join(site, 'public');
const small = readFileSync(join(site, 'src/assets/favicon-16.svg'), 'utf8');
const logo = readFileSync(join(site, 'src/assets/logo.svg'), 'utf8');
const BG = '#0b3d2e';

const png = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

/** The logo's artwork on a square, full-bleed background (no rounded tile). */
function square(scale) {
  const inner = logo
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<rect width="64" height="64" rx="14" fill="[^"]+"\/>/, '');
  const t = (64 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BG}"/><g transform="translate(${t} ${t}) scale(${scale})">${inner}</g></svg>`;
}

/** An .ico holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

copyFileSync(join(site, 'src/assets/favicon-16.svg'), join(pub, 'favicon.svg'));
writeFileSync(
  join(pub, 'favicon.ico'),
  ico([
    { size: 16, data: png(small, 16) },
    { size: 32, data: png(logo, 32) },
    { size: 48, data: png(logo, 48) },
  ]),
);
writeFileSync(join(pub, 'apple-touch-icon.png'), png(square(0.86), 180));
writeFileSync(join(pub, 'icon-192.png'), png(logo, 192));
writeFileSync(join(pub, 'icon-512.png'), png(logo, 512));
// Maskable: the artwork inside the central 80% safe zone.
writeFileSync(join(pub, 'icon-maskable-512.png'), png(square(0.7), 512));
writeFileSync(
  join(pub, 'manifest.json'),
  `${JSON.stringify(
    {
      name: 'PakDataKit',
      short_name: 'PakDataKit',
      description:
        'Pakistani data utilities: CNIC, phone, IBAN, Raast QR, sales and income tax, postal codes.',
      start_url: '/',
      display: 'browser',
      background_color: '#0c1611',
      theme_color: BG,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    null,
    2,
  )}\n`,
);
console.log(
  'icons: favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png, manifest.json',
);
