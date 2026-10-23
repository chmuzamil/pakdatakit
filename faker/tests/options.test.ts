import {
  analyzeNumber,
  getBankInfo,
  getBanks,
  getCNICInfo,
  getNetwork,
  getProvince,
  parseAddress,
  validateIBAN,
  validatePhone,
} from 'pakdatakit';
import { describe, expect, it } from 'vitest';
import areaCodes from '../../data/area-codes.json';
import cities from '../../data/cities.json';
import networks from '../../data/networks.json';
import { createFaker, PROVINCES, type Network } from '../src/index.js';
import {
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
} from '../src/names.js';

const N = 500;

describe('option filters', () => {
  it('cnic province and gender', () => {
    const f = createFaker({ seed: 'cnic' });
    const cases = [
      ['Punjab', '3'],
      ['Sindh', '4'],
      ['KP', '1'],
      ['Khyber Pakhtunkhwa', '1'],
      ['Balochistan', '5'],
      ['ICT', '6'],
      ['Gilgit-Baltistan', '7'],
      ['AJK', '8'],
    ] as const;
    for (const [province, digit] of cases) {
      for (let i = 0; i < 50; i += 1) {
        const value = f.cnic({ province, gender: 'female' });
        expect(value[0]).toBe(digit);
        expect(getCNICInfo(value)?.gender).toBe('female');
      }
    }
    expect(f.cnic({ provinceCode: 2 })[0]).toBe('2');
    expect(getCNICInfo(f.cnic({ gender: 'male' }))?.gender).toBe('male');
    expect(() => f.cnic({ province: 'Nowhere' as 'Punjab' })).toThrow(
      RangeError,
    );
  });

  it('cnic never uses codes 2 or 8 by default', () => {
    const f = createFaker({ seed: 'default-cnic' });
    const firsts = new Set(f.many(5000, () => f.cnic()[0]));
    expect([...firsts].sort()).toEqual(['1', '3', '4', '5', '6', '7']);
  });

  it('phone network', () => {
    const f = createFaker({ seed: 'phone' });
    for (const network of [
      'Jazz',
      'Zong',
      'Ufone',
      'Telenor',
      'SCO',
    ] as const) {
      for (let i = 0; i < 50; i += 1) {
        const value = f.phone({ network });
        expect(getNetwork(value)).toBe(network);
      }
    }
  });

  it('phone dialable: false is format-correct but unallocated', () => {
    const f = createFaker({ seed: 'demo' });
    for (let i = 0; i < N; i += 1) {
      const local = f.phone({ dialable: false });
      expect(local).toMatch(/^036\d{8}$/);
      expect(validatePhone(local)).toBe(false);
      expect(f.phone({ dialable: false, format: 'e164' })).toMatch(
        /^\+9236\d{8}$/,
      );
    }
    expect(networks.some((entry) => entry.prefix.startsWith('036'))).toBe(
      false,
    );
  });

  it('landline for every city with an area code', () => {
    const f = createFaker({ seed: 'landline' });
    for (const entry of areaCodes) {
      for (const city of entry.cities) {
        for (let i = 0; i < 10; i += 1) {
          const info = analyzeNumber(f.landline({ city }))!;
          expect(info.type).toBe('landline');
          expect(info.areaCode).toBe(`0${entry.code}`);
          expect(info.cities).toContain(city);
        }
      }
    }
    expect(() => f.landline({ city: 'Gilgit' })).toThrow(RangeError);
    expect(() => f.landline({ city: 'Atlantis' })).toThrow(RangeError);
  });

  it('uan for a city', () => {
    const f = createFaker({ seed: 'uan' });
    for (const city of [
      'Karachi',
      'Lahore',
      'Islamabad',
      'Peshawar',
      'Quetta',
    ]) {
      const info = analyzeNumber(f.uan({ city }))!;
      expect(info.type).toBe('uan');
      expect(info.cities).toContain(city);
    }
    expect(f.uan({ city: 'karachi' })).toMatch(/^021-111-\d{3}-\d{3}$/);
  });

  it('iban bank and type', () => {
    const f = createFaker({ seed: 'iban' });
    expect(getBankInfo(f.iban({ bank: 'MEZN' }))?.code).toBe('MEZN');
    expect(getBankInfo(f.iban({ bank: 'habb' }))?.code).toBe('HABB');
    for (let i = 0; i < 50; i += 1) {
      expect(getBankInfo(f.iban({ type: 'islamic' }))?.type).toBe('islamic');
      expect(getBankInfo(f.iban({ type: 'microfinance' }))?.type).toBe(
        'microfinance',
      );
    }
    // Merged and alias codes only when asked for.
    const merged = f.iban({ bank: 'NIBP' });
    expect(validateIBAN(merged)).toBe(true);
    expect(getBankInfo(merged)?.active).toBe(false);
    expect(() => f.iban({ bank: 'ZZZZ' })).toThrow(RangeError);
  });

  it('SadaPay IBANs are SADA + 000000 + mobile number', () => {
    const f = createFaker({ seed: 'sada' });
    for (let i = 0; i < N; i += 1) {
      const iban = f.iban({ bank: 'SADA' });
      expect(validateIBAN(iban)).toBe(true);
      expect(iban).toMatch(/^PK\d{2}SADA0000003\d{9}$/);
      expect(validatePhone(`0${iban.slice(14)}`)).toBe(true);
    }
  });

  it('city and address by province / city', () => {
    const f = createFaker({ seed: 'city' });
    for (const province of PROVINCES) {
      for (let i = 0; i < 30; i += 1) {
        expect(getProvince(f.city({ province }))).toBe(province);
        const parts = f.addressParts({ province });
        expect(parts.province).toBe(province);
        expect(parseAddress(parts.full).province).toBe(province);
      }
    }
    for (let i = 0; i < 50; i += 1) {
      const parts = f.addressParts({ city: 'lahore' });
      expect(parts.city).toBe('Lahore');
      expect(parts.postalCode).toMatch(/^5\d{4}$/);
      const isb = f.addressParts({ city: 'Islamabad' });
      expect(isb.area).toMatch(/^Sector [EFGI]-\d{1,2}\/[1-4]$/);
      expect(isb.postalCode).toBe('44000');
    }
    expect(() => f.city({ province: 'Atlantis' as 'Punjab' })).toThrow(
      RangeError,
    );
    expect(() => f.address({ city: 'Atlantis' })).toThrow(RangeError);
  });

  it('every city in the dataset produces a parseable address', () => {
    const f = createFaker({ seed: 'all-cities' });
    for (const { city, province } of cities) {
      for (let i = 0; i < 15; i += 1) {
        const full = f.address({ city });
        const parsed = parseAddress(full);
        expect(parsed.city, full).toBe(city);
        expect(parsed.province, full).toBe(province);
      }
    }
  });

  it('names respect gender', () => {
    const f = createFaker({ seed: 'names' });
    for (let i = 0; i < N; i += 1) {
      expect(MALE_FIRST_NAMES).toContain(f.firstName({ gender: 'male' }));
      expect(FEMALE_FIRST_NAMES).toContain(f.firstName({ gender: 'female' }));
      expect(LAST_NAMES).toContain(f.lastName());
      const [first] = f.name({ gender: 'female' }).split(' ');
      expect(FEMALE_FIRST_NAMES.some((n) => n.startsWith(first!))).toBe(true);
    }
  });

  it('email from a given name and domain', () => {
    const f = createFaker({ seed: 'email' });
    for (let i = 0; i < 50; i += 1) {
      const value = f.email({
        name: 'Zaib-un-Nisa Khattak',
        domain: 'example.org',
      });
      expect(value).toMatch(/^[a-z0-9._]+@example\.org$/);
      expect(value).toMatch(/zaibunnisa|z\./);
    }
    expect(() => f.email({ domain: 'gmail.com' as 'example.com' })).toThrow(
      RangeError,
    );
  });

  it('amount, date and dob ranges', () => {
    const now = new Date('2026-03-01T00:00:00Z');
    const f = createFaker({ seed: 'ranges', now });
    for (let i = 0; i < N; i += 1) {
      const a = f.amount({ min: 500, max: 600 });
      expect(Number.isInteger(a)).toBe(true);
      expect(a).toBeGreaterThanOrEqual(500);
      expect(a).toBeLessThanOrEqual(600);
      const d = f.amount({ min: 1, max: 2, decimals: 2 });
      expect(Math.round(d * 100) / 100).toBe(d);
      const from = new Date('2025-01-01T00:00:00Z');
      const to = new Date('2025-12-31T00:00:00Z');
      const date = f.date({ from, to });
      expect(date.getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(to.getTime());
      const dob = f.dob({ minAge: 30, maxAge: 30 });
      // Exactly 30 years old on 2026-03-01.
      expect(dob.getTime()).toBeGreaterThan(Date.UTC(1995, 2, 1));
      expect(dob.getTime()).toBeLessThanOrEqual(Date.UTC(1996, 2, 1));
      expect(dob.getUTCHours()).toBe(0);
    }
    expect(() => f.amount({ min: 5, max: 1 })).toThrow(RangeError);
    expect(() => f.dob({ minAge: 40, maxAge: 20 })).toThrow(RangeError);
  });

  it('person options', () => {
    const f = createFaker({
      seed: 'person-options',
      now: new Date('2026-01-01'),
    });
    for (let i = 0; i < 100; i += 1) {
      const p = f.person({
        gender: 'female',
        city: 'Quetta',
        bank: 'MEZN',
        minAge: 20,
        maxAge: 25,
      });
      expect(p.gender).toBe('female');
      expect(p.city).toBe('Quetta');
      expect(p.province).toBe('Balochistan');
      expect(p.cnic[0]).toBe('5');
      expect(p.cnic.slice(-1)).toMatch(/[02468]/);
      expect(getBankInfo(p.iban)?.code).toBe('MEZN');
      expect(analyzeNumber(p.landline!)?.areaCode).toBe('081');
      // districts.json splits Quetta into East and West.
      expect(p.district).toBeUndefined();
      expect(f.person({ city: 'Lahore' }).district).toBe('Lahore');
      const born = Number(p.dateOfBirth.slice(0, 4));
      expect(born).toBeGreaterThanOrEqual(2000);
      expect(born).toBeLessThanOrEqual(2005);
    }
    const ajk = f.person({ province: 'AJK' });
    expect(ajk.province).toBe('Azad Jammu and Kashmir');
    expect(ajk.cnic[0]).toBe('8');
    const kp = f.person({ province: 'KP', phone: { network: 'Zong' } });
    expect(kp.cnic[0]).toBe('1');
    expect(getNetwork(kp.phone)).toBe('Zong');
    const demo = f.person({ phone: { dialable: false } });
    expect(validatePhone(demo.phone)).toBe(false);
  });

  it('business options', () => {
    const f = createFaker({ seed: 'business-options' });
    for (let i = 0; i < 50; i += 1) {
      const b = f.business({ city: 'Karachi', bank: 'HABB' });
      expect(b.city).toBe('Karachi');
      expect(b.province).toBe('Sindh');
      expect(analyzeNumber(b.uan!)?.areaCode).toBe('021');
      expect(analyzeNumber(b.landline!)?.areaCode).toBe('021');
      expect(getBankInfo(b.iban)?.code).toBe('HABB');
    }
    expect(f.business({ province: 'Punjab' }).province).toBe('Punjab');
  });

  it('createFaker rejects seed + random together and bad random output', () => {
    expect(() => createFaker({ seed: 1, random: () => 0.5 })).toThrow(
      RangeError,
    );
    expect(() => createFaker({ random: () => 1 }).int(0, 9)).toThrow(
      RangeError,
    );
  });
});

describe('distribution', () => {
  const f = createFaker({ seed: 'distribution' });

  it('reaches every province', () => {
    const people = new Set(f.many(3000, () => f.person().province));
    expect([...people].sort()).toEqual(
      PROVINCES.filter((p) => p !== 'Azad Jammu and Kashmir').sort(),
    );
    const anyCity = new Set(f.many(3000, () => getProvince(f.city())));
    expect([...anyCity].sort()).toEqual([...PROVINCES].sort());
  });

  it('reaches every network and every allocated prefix', () => {
    const phones = f.many(10000, () => f.phone());
    const found = new Set(phones.map((p) => getNetwork(p)));
    expect([...found].sort()).toEqual(
      (['Jazz', 'SCO', 'Telenor', 'Ufone', 'Zong'] as Network[]).sort(),
    );
    const prefixes = new Set(phones.map((p) => p.slice(0, 4)));
    expect(prefixes.size).toBe(networks.length);
  });

  it('reaches every default bank and never a merged, alias or central code', () => {
    const expected = getBanks()
      .filter((b) => b.active && b.aliasOf === null && b.type !== 'central')
      .map((b) => b.code)
      .sort();
    const found = new Set(f.many(5000, () => f.ibanDetails().bankCode));
    expect([...found].sort()).toEqual(expected);
  });

  it('reaches every area code for landlines', () => {
    const found = new Set(
      f.many(10000, () => analyzeNumber(f.landline())!.areaCode),
    );
    expect(found.size).toBe(areaCodes.length);
  });

  it('balances genders and uses most of the name lists', () => {
    const genders = f.many(4000, () => f.gender());
    const male = genders.filter((g) => g === 'male').length;
    expect(male).toBeGreaterThan(1800);
    expect(male).toBeLessThan(2200);
    expect(
      new Set(f.many(5000, () => f.firstName({ gender: 'male' }))).size,
    ).toBe(MALE_FIRST_NAMES.length);
    expect(new Set(f.many(5000, () => f.lastName())).size).toBe(
      LAST_NAMES.length,
    );
  });
});

describe('name lists', () => {
  it('have the intended size, no duplicates and Latin script only', () => {
    for (const list of [MALE_FIRST_NAMES, FEMALE_FIRST_NAMES, LAST_NAMES]) {
      expect(new Set(list).size).toBe(list.length);
      for (const n of list) expect(n).toMatch(/^[A-Z][A-Za-z' -]+$/);
    }
    expect(MALE_FIRST_NAMES.length).toBeGreaterThanOrEqual(115);
    expect(FEMALE_FIRST_NAMES.length).toBeGreaterThanOrEqual(115);
    expect(LAST_NAMES.length).toBeGreaterThanOrEqual(95);
  });
});
