/**
 * Build-time data for /postal-codes/: Pakistan Post's delivery post offices
 * (data/post-offices.json) grouped by city and by province. Only used by
 * .astro pages, which run in Node at build time (cwd is site/).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PostOffice } from 'pakdatakit/postal';

interface PostalEntry {
  city: string;
  postalCode: string;
  area?: string;
  primary?: boolean;
  province: string;
}

const data = join(process.cwd(), '..', 'data');
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(join(data, file), 'utf8'));

export const OFFICES = read<PostOffice[]>('post-offices.json');
const ENTRIES = read<PostalEntry[]>('postal-codes.json');
const MANIFEST =
  read<{ id: string; sourceUrl: string; sourceDate: string }[]>(
    'manifest.json',
  );
export const SOURCE = MANIFEST.find((d) => d.id === 'post-offices')!;

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const byName = (a: PostOffice, b: PostOffice) =>
  a.office.localeCompare(b.office, 'en');

export interface City {
  name: string;
  slug: string;
  province: string;
  /** The city's main code (its GPO, or its only office). */
  main: string;
  mainOffice: string;
  offices: PostOffice[];
}

/** Every city on pakdatakit's list, with its post offices. */
export const CITIES: City[] = [...new Set(ENTRIES.map((e) => e.city))]
  .map((name) => {
    const entries = ENTRIES.filter((e) => e.city === name);
    const main = (entries.find((e) => e.primary) ?? entries[0]).postalCode;
    const offices = OFFICES.filter((o) => o.town === name).sort(byName);
    return {
      name,
      slug: slug(name),
      province: entries[0].province,
      main,
      mainOffice: OFFICES.find((o) => o.code === main)?.office ?? name,
      offices,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

/** Cities with a page of their own: more than one post office. */
export const CITY_PAGES = CITIES.filter((c) => c.offices.length > 1);

export interface Province {
  name: string;
  slug: string;
  offices: PostOffice[];
  cities: City[];
}

export const PROVINCES: Province[] = [
  ...new Set(OFFICES.map((o) => o.province)),
]
  .map((name) => ({
    name,
    slug: slug(name),
    offices: OFFICES.filter((o) => o.province === name).sort(byName),
    cities: CITIES.filter((c) => c.province === name),
  }))
  .sort((a, b) => b.offices.length - a.offices.length);

/**
 * Provinces with a page of their own: not those whose offices are all on one
 * city's page (Islamabad Capital Territory is the city of Islamabad).
 */
export const PROVINCE_PAGES = PROVINCES.filter(
  (p) =>
    !CITY_PAGES.some(
      (c) => c.offices.length === p.offices.length && c.province === p.name,
    ),
);

{
  const seen = new Set<string>();
  for (const s of [...CITY_PAGES, ...PROVINCE_PAGES].map((p) => p.slug)) {
    if (seen.has(s))
      throw new Error(`postal-codes: two pages would be /postal-codes/${s}/`);
    seen.add(s);
  }
}

/** Link to a city's page, when it has one. */
export const cityHref = (town: string) => {
  const c = CITY_PAGES.find((x) => x.name === town);
  return c ? `/postal-codes/${c.slug}/` : null;
};

export const n = (x: number) => x.toLocaleString('en-US');

/** "February 2021" from "2021-02". */
export const sourceMonth = new Date(
  `${SOURCE.sourceDate}-01T00:00:00Z`,
).toLocaleDateString('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
