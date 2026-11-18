/**
 * Breadcrumbs and structured data (schema.org JSON-LD) for every page.
 * Rich-result rules followed: no FAQ, rating or review markup; every
 * BreadcrumbList item is a real page; dates come from git (lastmod.mjs).
 */
import { GITHUB, SITE } from '../../site.config.mjs';
// @ts-expect-error plain JS module
import { lastModified } from './lastmod.mjs';

export interface Crumb {
  name: string;
  url: string;
}

/** Breadcrumbs for a page path (with slashes), ending with the page itself. */
export function breadcrumbs(path: string, title: string): Crumb[] {
  const p = path.replace(/^\/|\/$/g, '');
  if (!p) return [];
  const parts = p.split('/');
  const crumbs: Crumb[] = [{ name: 'Home', url: '/' }];
  const top = parts[0];
  if (top === 'docs' && parts.length > 1)
    crumbs.push({ name: 'Module guides', url: '/docs/' });
  if (top === 'playground' && parts.length > 1)
    crumbs.push({ name: 'Playground', url: '/playground/' });
  if (top === 'releases' && parts.length > 1)
    crumbs.push({ name: 'Releases', url: '/releases/' });
  if (top === 'api' && parts.length > 2) {
    crumbs.push({ name: 'TypeScript API', url: '/api/typescript/' });
    const adapter = parts[2] === 'adapters';
    const depth = adapter ? 4 : 3;
    if (parts.length > depth) {
      const mod = parts.slice(2, depth).join('/');
      crumbs.push({
        name: `pakdatakit/${adapter ? parts[3] : parts[2]}`,
        url: `/api/typescript/${mod}/`,
      });
    }
  }
  crumbs.push({ name: title, url: `/${p}/` });
  return crumbs;
}

const abs = (url: string) => new URL(url, SITE).href;
const AUTHOR = {
  '@type': 'Person',
  '@id': `${SITE}/#author`,
  name: 'chmuzamil',
  url: 'https://github.com/chmuzamil',
};
const LANGUAGES: Record<string, string> = {
  typescript: 'TypeScript',
  python: 'Python',
  dart: 'Dart',
  flutter: 'Dart',
  dotnet: 'C#',
  php: 'PHP',
  react: 'TypeScript',
  vue: 'TypeScript',
  angular: 'TypeScript',
};

interface Page {
  path: string;
  title: string;
  description: string;
  dataVersion: string;
  version: string;
}

/** The JSON-LD graph for a page. */
export function structuredData({
  path,
  title,
  description,
  dataVersion,
  version,
}: Page) {
  const url = abs(path);
  const p = path.replace(/^\/|\/$/g, '');
  const top = p.split('/')[0];
  const modified = lastModified(path);
  const website = {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: `${SITE}/`,
    name: 'PakDataKit',
    description:
      'Pakistani data utilities for TypeScript, Python, Dart/Flutter, .NET and PHP: CNIC, phone, IBAN, Raast QR, sales and income tax, postal codes.',
    inLanguage: 'en',
    publisher: { '@id': AUTHOR['@id'] },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  const graph: Record<string, unknown>[] = [website, AUTHOR];
  const crumbs = breadcrumbs(path, title);
  if (crumbs.length)
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.url),
      })),
    });

  const code = (
    programmingLanguage: string | string[],
    name: string,
    extra: Record<string, unknown> = {},
  ) => ({
    '@type': 'SoftwareSourceCode',
    name,
    description,
    url,
    codeRepository: GITHUB,
    programmingLanguage,
    license: 'https://opensource.org/licenses/MIT',
    version,
    author: { '@id': AUTHOR['@id'] },
    ...extra,
  });

  if (!p)
    graph.push(
      code(['TypeScript', 'Python', 'Dart', 'C#', 'PHP'], 'PakDataKit'),
    );
  else if (top === 'install') {
    const lang = p.split('/')[1];
    graph.push(
      code(LANGUAGES[lang] ?? 'TypeScript', title, { dateModified: modified }),
    );
  } else if (top === 'data')
    graph.push({
      '@type': 'Dataset',
      name: 'PakDataKit datasets',
      description,
      url,
      license: 'https://opensource.org/licenses/MIT',
      creator: { '@id': AUTHOR['@id'] },
      isAccessibleForFree: true,
      version: dataVersion,
      dateModified: modified,
      spatialCoverage: { '@type': 'Place', name: 'Pakistan' },
      keywords: [
        'Pakistan',
        'CNIC',
        'IBAN',
        'banks',
        'postal codes',
        'districts',
        'mobile networks',
        'sales tax',
        'income tax',
        'holidays',
      ],
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${GITHUB}/tree/main/data`,
      },
    });
  else if (top === 'docs' || top === 'api')
    graph.push({
      '@type': 'TechArticle',
      headline: title,
      description,
      url,
      inLanguage: 'en',
      dateModified: modified,
      author: { '@id': AUTHOR['@id'] },
      publisher: { '@id': AUTHOR['@id'] },
      isPartOf: { '@id': `${SITE}/#website` },
      ...(top === 'api'
        ? { proficiencyLevel: 'Expert' }
        : { proficiencyLevel: 'Beginner' }),
    });

  return { '@context': 'https://schema.org', '@graph': graph };
}
