import { describe, expect, it } from 'vitest';
import cities from '../data/cities.json';
import postOffices from '../data/post-offices.json';
import postalCodes from '../data/postal-codes.json';
import {
  getCityByPostalCode,
  getPostOffice,
  searchPostOffices,
} from '../src/postal.js';

describe('post-offices.json', () => {
  it('has every directory office once, with a known province', () => {
    expect(postOffices).toHaveLength(2560);
    expect(new Set(postOffices.map((o) => o.code)).size).toBe(2560);
    const provinces = new Set(cities.map((c) => c.province));
    for (const office of postOffices) {
      expect(office.code).toMatch(/^\d{5}$/);
      expect(provinces).toContain(office.province);
    }
  });

  it('covers every code of the city lookups, with the same city', () => {
    const byCode = new Map(postOffices.map((o) => [o.code, o]));
    for (const entry of postalCodes) {
      expect(byCode.get(entry.postalCode)?.town, entry.postalCode).toBe(
        entry.city,
      );
    }
  });
});

describe('getCityByPostalCode', () => {
  it('returns only cities on the city list', () => {
    const listed = new Set(cities.map((c) => c.city));
    for (const office of postOffices) {
      const city = getCityByPostalCode(office.code);
      if (city !== null) expect(listed).toContain(city);
    }
  });

  it('returns null for an office in a town or village', () => {
    expect(getCityByPostalCode('48330')).toBeNull();
    expect(getPostOffice('48330')?.office).toBe('Dulmial');
  });
});

describe('getPostOffice', () => {
  it('returns the office for a code', () => {
    expect(getPostOffice('48330')).toEqual({
      code: '48330',
      office: 'Dulmial',
      town: 'Dulmial',
      district: null,
      province: 'Punjab',
    });
    expect(getPostOffice(' 54 660 ')).toEqual({
      code: '54660',
      office: 'Lahore Gulberg Colony',
      town: 'Lahore',
      district: 'Lahore',
      province: 'Punjab',
    });
  });

  it('returns null for unknown or malformed codes', () => {
    expect(getPostOffice('99999')).toBeNull();
    expect(getPostOffice('4833')).toBeNull();
    expect(getPostOffice('')).toBeNull();
    expect(getPostOffice('abc')).toBeNull();
  });

  it('returns copies callers cannot use to change the dataset', () => {
    const office = getPostOffice('48330') as { town: string };
    office.town = 'changed';
    expect(getPostOffice('48330')?.town).toBe('Dulmial');
  });
});

describe('searchPostOffices', () => {
  it('matches office names and towns case-insensitively', () => {
    expect(searchPostOffices('DULMIAL').map((o) => o.code)).toEqual(['48330']);
    const gulberg = searchPostOffices('gulberg').map((o) => o.office);
    expect(gulberg).toContain('Lahore Gulberg Colony');
  });

  it('matches post code prefixes and sorts by code', () => {
    const results = searchPostOffices('4833');
    expect(results.length).toBeGreaterThan(0);
    for (const office of results) {
      expect(office.code.startsWith('4833') || /4833/.test(office.office)).toBe(
        true,
      );
    }
    const codes = results.map((o) => o.code);
    expect(codes).toEqual([...codes].sort());
  });

  it('returns an empty list for empty or unmatched queries', () => {
    expect(searchPostOffices('')).toEqual([]);
    expect(searchPostOffices('   ')).toEqual([]);
    expect(searchPostOffices('qqqq')).toEqual([]);
  });
});
