import { describe, expect, it } from 'vitest';
import banks from '../data/banks.json';
import cities from '../data/cities.json';
import districts from '../data/districts.json';
import networks from '../data/networks.json';
import postalCodes from '../data/postal-codes.json';
import {
  getDistrictProvince,
  getDistrictsByProvince,
  getProvince,
} from '../src/geo.js';

const PROVINCES = new Set([
  'Azad Jammu and Kashmir',
  'Balochistan',
  'Gilgit-Baltistan',
  'Islamabad Capital Territory',
  'Khyber Pakhtunkhwa',
  'Punjab',
  'Sindh',
]);

function duplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

describe('dataset integrity', () => {
  it('has no duplicate keys', () => {
    expect(duplicates(districts.map((d) => d.district))).toEqual([]);
    expect(duplicates(cities.map((c) => c.city))).toEqual([]);
    expect(duplicates(banks.map((b) => b.code))).toEqual([]);
    expect(duplicates(networks.map((n) => n.prefix))).toEqual([]);
    expect(duplicates(postalCodes.map((p) => p.postalCode))).toEqual([]);
  });

  it('uses only known province names', () => {
    for (const entry of [...districts, ...cities]) {
      expect(PROVINCES).toContain(entry.province);
    }
  });

  it('resolves a province for every postal city', () => {
    for (const { city } of postalCodes) {
      expect(getProvince(city), city).not.toBeNull();
    }
  });

  it('resolves major cities that were previously cut off', () => {
    expect(getProvince('Bahawalpur')).toBe('Punjab');
    expect(getProvince('Larkana')).toBe('Sindh');
    expect(getProvince('Mardan')).toBe('Khyber Pakhtunkhwa');
  });

  it('does not list neighbourhoods as cities', () => {
    expect(getProvince('Gulberg')).toBeNull();
    expect(getProvince('Saddar')).toBeNull();
  });

  it('returns each district once per province', () => {
    const gb = getDistrictsByProvince('Gilgit-Baltistan');
    expect(duplicates(gb)).toEqual([]);
  });

  it('uses valid formats', () => {
    for (const { postalCode } of postalCodes) {
      expect(postalCode).toMatch(/^\d{5}$/);
    }
    for (const { code } of banks) {
      expect(code).toMatch(/^[A-Z]{4}$/);
    }
    for (const { prefix } of networks) {
      expect(prefix).toMatch(/^03\d{2}$/);
    }
  });
});

describe('district counts (October 2026)', () => {
  it('matches official counts per province', () => {
    const counts: Record<string, number> = {};
    for (const { province } of districts) {
      counts[province] = (counts[province] ?? 0) + 1;
    }
    expect(counts).toEqual({
      'Azad Jammu and Kashmir': 10,
      Balochistan: 41,
      'Gilgit-Baltistan': 14,
      'Islamabad Capital Territory': 1,
      'Khyber Pakhtunkhwa': 40,
      Punjab: 41,
      Sindh: 30,
    });
  });

  it('still resolves former district names', () => {
    expect(getDistrictProvince('Quetta')).toBe('Balochistan');
    expect(getDistrictProvince('South Waziristan')).toBe('Khyber Pakhtunkhwa');
    expect(getDistrictProvince('Dera Bugti')).toBe('Balochistan');
    expect(getDistrictProvince('Quetta East')).toBe('Balochistan');
  });
});

describe('dataVersion', () => {
  it('matches the version in DATA.md', async () => {
    const { readFileSync } = await import('node:fs');
    const { dataVersion } = await import('../src/index.js');
    expect(readFileSync('DATA.md', 'utf8')).toContain(
      `**Data version: ${dataVersion}**`,
    );
  });
});
