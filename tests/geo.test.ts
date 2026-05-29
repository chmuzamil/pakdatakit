import { describe, expect, it } from 'vitest';
import { getProvince, searchCities } from '../src/geo.js';

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
