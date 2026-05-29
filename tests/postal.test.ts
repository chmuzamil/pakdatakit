import { describe, expect, it } from 'vitest';
import {
  getCityByPostalCode,
  getPostalCode,
  getPostalCodes,
  getPostalAreas,
  searchPostalCodes,
} from '../src/postal.js';

describe('getCityByPostalCode', () => {
  it('returns city for known postal code', () => {
    expect(getCityByPostalCode('60000')).toBe('Multan');
  });

  it('handles spaced postal code input', () => {
    expect(getCityByPostalCode(' 74000 ')).toBe('Karachi');
  });

  it('returns null for unknown postal code', () => {
    expect(getCityByPostalCode('99999')).toBeNull();
  });
});

describe('getPostalCode', () => {
  it('returns primary postal code for known city', () => {
    expect(getPostalCode('Multan')).toBe('60000');
  });

  it('returns primary GPO for cities with multiple codes', () => {
    expect(getPostalCode('karachi')).toBe('74200');
  });

  it('is case insensitive', () => {
    expect(getPostalCode('lahore')).toBe('54000');
  });

  it('handles inconsistent spacing', () => {
    expect(getPostalCode('  lahore  ')).toBe('54000');
  });

  it('returns null for unknown city', () => {
    expect(getPostalCode('Unknownville')).toBeNull();
  });
});

describe('getPostalCodes', () => {
  it('returns all postal codes for a city', () => {
    const codes = getPostalCodes('Karachi');
    expect(codes).toContain('74200');
    expect(codes).toContain('74000');
    expect(codes.length).toBeGreaterThan(5);
  });
});

describe('searchPostalCodes', () => {
  it('finds postal codes by city prefix', () => {
    expect(searchPostalCodes('multan')).toContain('60000');
  });

  it('finds postal codes by area name', () => {
    expect(searchPostalCodes('gulberg')).toContain('54660');
  });
});

describe('getPostalAreas', () => {
  it('returns areas for Karachi', () => {
    const areas = getPostalAreas('Karachi');
    expect(areas.length).toBeGreaterThan(3);
    expect(areas).toContain('Karachi GPO');
  });
});
