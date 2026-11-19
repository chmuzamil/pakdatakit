/**
 * Open Graph images, one per page, rendered at build time with resvg (which
 * shapes Urdu correctly). Fonts are the official OFL TTFs; nothing is fetched.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import registry from '../../components/playground/registry.json';

const require = createRequire(import.meta.url);
const font = (p: string) => require.resolve(`@expo-google-fonts/${p}`);
const FONTS = [
  font('inter/400Regular/Inter_400Regular.ttf'),
  font('inter/700Bold/Inter_700Bold.ttf'),
  font('noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf'),
];

interface Page {
  title: string;
  description: string;
}

const TOOLS: Record<string, Page> = {
  'tools/cnic': {
    title: 'CNIC format checker and decoder',
    description:
      'Format, province and gender. Runs in your browser. Not NADRA verification.',
  },
  'tools/iban': {
    title: 'Pakistan IBAN checker and bank lookup',
    description:
      'Mod-97 check digits and the bank from its code. Runs in your browser.',
  },
  'tools/salary-tax': {
    title: 'Salary tax calculator 2026-27',
    description:
      'Tax year 2027 salaried rates from the Finance Act 2026, every slab shown.',
  },
  'tools/sales-tax': {
    title: 'Sales tax calculator',
    description:
      'FBR goods and provincial services (PRA, SRB, KPRA, BRA, ICT), by date.',
  },
  playground: {
    title: 'Playground',
    description: 'Every pakdatakit module, live in your browser.',
  },
};

export const getStaticPaths = (async () => {
  const docs = await getCollection('docs');
  const pages: { params: { slug: string }; props: Page }[] = docs.map(
    (entry) => ({
      params: { slug: entry.id === '' ? 'index' : entry.id },
      props: {
        title: entry.data.title,
        description: entry.data.description ?? '',
      },
    }),
  );
  for (const [slug, page] of Object.entries(TOOLS))
    pages.push({ params: { slug }, props: page });
  for (const tool of registry)
    pages.push({
      params: { slug: `playground/${tool.slug}` },
      props: {
        title: `${tool.label.replace(/ \(experimental\)$/, '')} playground`,
        description: tool.description,
      },
    });
  return pages;
}) satisfies GetStaticPaths;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap by character count (good enough for these fonts). */
function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max) {
      out.push(line.trim());
      line = word;
      if (out.length === lines) break;
    } else line = `${line} ${word}`;
  }
  if (out.length < lines && line.trim()) out.push(line.trim());
  if (out.length === lines && text.length > out.join(' ').length)
    out[lines - 1] = out[lines - 1].replace(/\W*$/, '…');
  return out;
}

function svg({ title, description }: Page): string {
  const titleLines = wrap(title, 30, 2);
  const descLines = wrap(description, 62, 2);
  const titleY = 250;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b3d2e"/>
  <rect x="0" y="600" width="1200" height="30" fill="#15803d"/>
  <g transform="translate(80 70) scale(1.25)">
    <rect width="64" height="64" rx="14" fill="#0f4d39"/>
    <rect x="11" y="17" width="42" height="30" rx="5" fill="none" stroke="#a7e8c3" stroke-width="3"/>
    <path d="M18 27h11M18 33h8" stroke="#a7e8c3" stroke-width="3" stroke-linecap="round"/>
    <path d="m33 33 5 5 9-11" fill="none" stroke="#4ade80" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="185" y="122" font-family="Inter" font-weight="700" font-size="36" fill="#f2f6f3">PakDataKit</text>
  <text x="1120" y="122" font-family="Noto Naskh Arabic" font-size="34" fill="#a7e8c3" text-anchor="end" direction="rtl">پاکستانی ڈیٹا، درست اور محفوظ</text>
  ${titleLines.map((l, i) => `<text x="80" y="${titleY + i * 76}" font-family="Inter" font-weight="700" font-size="64" fill="#ffffff">${esc(l)}</text>`).join('\n  ')}
  ${descLines.map((l, i) => `<text x="80" y="${titleY + titleLines.length * 76 + 30 + i * 44}" font-family="Inter" font-size="32" fill="#cfe9da">${esc(l)}</text>`).join('\n  ')}
  <text x="80" y="560" font-family="Inter" font-size="28" fill="#a7e8c3">pakdatakit.dev · TypeScript · Python · Dart · .NET · PHP</text>
</svg>`;
}

export const GET: APIRoute = ({ props }) => {
  const png = new Resvg(svg(props as Page), {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles: FONTS,
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
    },
  })
    .render()
    .asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
