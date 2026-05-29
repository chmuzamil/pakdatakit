import { describe, expect, it } from 'vitest';
import {
  getDistrictProvince,
  getDistrictsByProvince,
  getProvince,
  searchCities,
  searchDistricts,
} from '../src/geo.js';

describe('getProvince', () => {
  it('returns province for exact city match', () => {
    expect(getProvince('Multan')).toBe('Punjab');
  });

  it('is case insensitive', () => {
    expect(getProvince('multan')).toBe('Punjab');
  });

  it('handles inconsistent spacing', () => {
    expect(getProvince('  karachi  ')).toBe('Sindh');
  });

  it('returns null for unknown city', () => {
    expect(getProvince('Unknownville')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(getProvince('   ')).toBeNull();
  });
});

describe('searchCities', () => {
  it('returns partial matches', () => {
    expect(searchCities('mul')).toContain('Multan');
  });

  it('is case insensitive', () => {
    const results = searchCities('KAR');
    expect(results).toContain('Karachi');
  });

  it('returns sorted unique results', () => {
    const results = searchCities('a');
    expect(results).toEqual([...new Set(results)].sort((a, b) => a.localeCompare(b)));
  });

  it('returns empty array for empty query', () => {
    expect(searchCities('   ')).toEqual([]);
  });
});

describe('getDistrictProvince', () => {
  it('returns province for district match', () => {
    expect(getDistrictProvince('Lahore')).toBe('Punjab');
  });

  it('is case insensitive', () => {
    expect(getDistrictProvince('quetta')).toBe('Balochistan');
  });

  it('returns null for unknown district', () => {
    expect(getDistrictProvince('Unknown District')).toBeNull();
  });
});

describe('searchDistricts', () => {
  it('returns partial district matches', () => {
    expect(searchDistricts('karachi')).toContain('Karachi Central');
  });

  it('returns sorted unique results', () => {
    const results = searchDistricts('a');
    expect(results).toEqual([...new Set(results)].sort((a, b) => a.localeCompare(b)));
  });
});

describe('getDistrictsByProvince', () => {
  it('returns districts for a province', () => {
    const districts = getDistrictsByProvince('Punjab');
    expect(districts).toContain('Lahore');
    expect(districts.length).toBeGreaterThan(30);
  });

  it('returns empty array for unknown province', () => {
    expect(getDistrictsByProvince('Unknown')).toEqual([]);
  });
});
