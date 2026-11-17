import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import liveAreaCodes from '../../data/area-codes.json';
import liveBanks from '../../data/banks.json';
import liveCities from '../../data/cities.json';
import liveDistricts from '../../data/districts.json';
import liveNetworks from '../../data/networks.json';
import livePostalCodes from '../../data/postal-codes.json';
import {
  AREA_CODES,
  BANKS,
  CITIES,
  DISTRICTS,
  NETWORKS,
  POSTAL_CODES,
} from '../src/data.js';
import { createFaker } from '../src/index.js';

const NOW = new Date('2026-06-15T12:00:00Z');
const here = dirname(fileURLToPath(import.meta.url));

type Faker = ReturnType<typeof createFaker>;

/** One of everything that is picked from a dataset, for several seeds. */
function sample(create: typeof createFaker) {
  return [1, 42, 'karachi', 2026].map((seed) => {
    const f: Faker = create({ seed, now: NOW });
    return {
      people: Array.from({ length: 20 }, () => f.person()),
      businesses: Array.from({ length: 20 }, () => f.business()),
      ibans: Array.from({ length: 20 }, () => f.iban()),
      phones: Array.from({ length: 20 }, () => f.phone()),
      landlines: Array.from({ length: 20 }, () => f.landline()),
      addresses: Array.from({ length: 20 }, () => f.address()),
      cities: Array.from({ length: 20 }, () => f.city()),
    };
  });
}

afterEach(() => {
  vi.doUnmock('../../data/area-codes.json');
  vi.doUnmock('../../data/banks.json');
  vi.doUnmock('../../data/cities.json');
  vi.doUnmock('../../data/districts.json');
  vi.doUnmock('../../data/networks.json');
  vi.doUnmock('../../data/postal-codes.json');
  vi.resetModules();
});

describe('frozen datasets', () => {
  it('adding a bank to data/ leaves seeded output unchanged', async () => {
    const before = sample(createFaker);

    // The live datasets as they would be after a data update: a new bank at
    // the front and in the middle, and new rows in every other list.
    vi.resetModules();
    vi.doMock('../../data/banks.json', () => ({
      default: [
        { code: 'AAAA', name: 'A New Bank Limited', type: 'commercial' },
        ...liveBanks.slice(0, 20),
        { code: 'NNNN', name: 'Another New Bank', type: 'microfinance' },
        ...liveBanks.slice(20),
      ],
    }));
    vi.doMock('../../data/cities.json', () => ({
      default: [{ city: 'Aabpara', province: 'Punjab' }, ...liveCities],
    }));
    vi.doMock('../../data/districts.json', () => ({
      default: [{ district: 'Aabpara', province: 'Punjab' }, ...liveDistricts],
    }));
    vi.doMock('../../data/postal-codes.json', () => ({
      default: [
        { city: 'Lahore', postalCode: '54999', area: 'New Area' },
        ...livePostalCodes,
      ],
    }));
    vi.doMock('../../data/area-codes.json', () => ({
      default: [{ code: '20', cities: ['Karachi'] }, ...liveAreaCodes],
    }));
    vi.doMock('../../data/networks.json', () => ({
      default: [{ prefix: '0399', network: 'Jazz' }, ...liveNetworks],
    }));

    const updated = await import('../src/index.js');
    expect(sample(updated.createFaker)).toEqual(before);
  });

  it('no source file reads the live data/ folder', () => {
    const src = join(here, '..', 'src');
    for (const file of readdirSync(src).filter((name) =>
      name.endsWith('.ts'),
    )) {
      expect(readFileSync(join(src, file), 'utf8')).not.toMatch(
        /from '\.\.\/\.\.\/data\//,
      );
    }
  });

  it('every frozen entry is still in the live data', () => {
    // Names may be updated in the live data (a rename, "in liquidation");
    // the codes must still be there so that generated IBANs stay valid.
    const liveBankCodes = new Set(liveBanks.map((bank) => bank.code));
    for (const bank of BANKS) {
      expect(liveBankCodes.has(bank.code), bank.code).toBe(true);
    }

    const liveCity = new Map(liveCities.map((c) => [c.city, c.province]));
    for (const city of CITIES) {
      expect(liveCity.get(city.city), city.city).toBe(city.province);
    }

    const liveDistrict = new Map(
      liveDistricts.map((d) => [d.district, d.province]),
    );
    for (const district of DISTRICTS) {
      expect(liveDistrict.get(district.district), district.district).toBe(
        district.province,
      );
    }

    const livePostal = new Map(
      livePostalCodes.map((entry) => [entry.postalCode, entry.city]),
    );
    for (const entry of POSTAL_CODES) {
      expect(livePostal.get(entry.postalCode), entry.postalCode).toBe(
        entry.city,
      );
    }

    const liveArea = new Map(
      liveAreaCodes.map((entry) => [entry.code, entry.cities]),
    );
    for (const entry of AREA_CODES) {
      expect(liveArea.get(entry.code), entry.code).toEqual(entry.cities);
    }

    const liveNetwork = new Map(
      liveNetworks.map((entry) => [entry.prefix, entry.network]),
    );
    for (const entry of NETWORKS) {
      expect(liveNetwork.get(entry.prefix), entry.prefix).toBe(entry.network);
    }
  });
});
