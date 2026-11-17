import { describe, expect, it } from 'vitest';
import districts from '../data/districts.json';
import divisions from '../data/divisions.json';
import tehsils from '../data/tehsils.json';
import {
  getDistrictProvince,
  getDivisionOfDistrict,
  getDivisions,
  getTehsilDistrict,
  getTehsils,
} from '../src/geo.js';

describe('divisions and tehsils data (2023 census)', () => {
  it('has the census totals', () => {
    expect(divisions).toHaveLength(30);
    expect(tehsils).toHaveLength(591);

    const count = (province: string) =>
      tehsils.filter((t) => t.province === province).length;
    expect(count('Punjab')).toBe(146);
    expect(count('Sindh')).toBe(138);
    expect(count('Khyber Pakhtunkhwa')).toBe(148);
    expect(count('Balochistan')).toBe(158);
    expect(count('Islamabad Capital Territory')).toBe(1);

    // 136 census districts: 135 in a division, plus Islamabad.
    const inDivisions = divisions.flatMap((d) => d.districts);
    expect(inDivisions).toHaveLength(135);
    expect(new Set(inDivisions).size).toBe(135);
    expect(new Set(tehsils.map((t) => t.censusDistrict)).size).toBe(136);
  });

  it('records a known district for every tehsil', () => {
    const current = new Set(districts.map((d) => d.district));
    const former = new Set(['Quetta', 'Dera Bugti', 'South Waziristan']);
    for (const tehsil of tehsils) {
      expect(
        current.has(tehsil.censusDistrict) || former.has(tehsil.censusDistrict),
        tehsil.censusDistrict,
      ).toBe(true);
      expect(getDistrictProvince(tehsil.censusDistrict)).toBe(tehsil.province);
      if (tehsil.currentDistrict !== null) {
        expect(current.has(tehsil.currentDistrict)).toBe(true);
      }
    }
    // A district that has been split cannot be anyone's current district.
    for (const name of former) {
      expect(tehsils.some((t) => t.currentDistrict === name)).toBe(false);
    }
  });
});

describe('getDivisions', () => {
  it('lists all 30 divisions, sorted', () => {
    const all = getDivisions();
    expect(all).toHaveLength(30);
    expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b)));
  });

  it('filters by province', () => {
    expect(getDivisions('Punjab')).toEqual([
      'Bahawalpur',
      'Dera Ghazi Khan',
      'Faisalabad',
      'Gujranwala',
      'Lahore',
      'Multan',
      'Rawalpindi',
      'Sahiwal',
      'Sargodha',
    ]);
    expect(getDivisions(' sindh ')).toHaveLength(6);
    expect(getDivisions('Khyber Pakhtunkhwa')).toHaveLength(7);
    expect(getDivisions('Balochistan')).toHaveLength(8);
  });

  it('returns an empty list where the census has no divisions', () => {
    expect(getDivisions('Islamabad Capital Territory')).toEqual([]);
    expect(getDivisions('Gilgit-Baltistan')).toEqual([]);
    expect(getDivisions('Atlantis')).toEqual([]);
    expect(getDivisions('')).toEqual([]);
  });
});

describe('getDivisionOfDistrict', () => {
  it('returns the census division of a district', () => {
    expect(getDivisionOfDistrict('Lahore')).toBe('Lahore');
    expect(getDivisionOfDistrict('  attock ')).toBe('Rawalpindi');
    expect(getDivisionOfDistrict('Tharparkar')).toBe('Mirpur Khas');
    expect(getDivisionOfDistrict('Swat')).toBe('Malakand');
    expect(getDivisionOfDistrict('Gwadar')).toBe('Mekran');
  });

  it('knows districts by the name they had in the census', () => {
    expect(getDivisionOfDistrict('Quetta')).toBe('Quetta');
    expect(getDivisionOfDistrict('South Waziristan')).toBe('Dera Ismail Khan');
  });

  it('returns null for districts the census does not place', () => {
    expect(getDivisionOfDistrict('Quetta East')).toBeNull();
    expect(getDivisionOfDistrict('Islamabad')).toBeNull();
    expect(getDivisionOfDistrict('Gilgit')).toBeNull();
    expect(getDivisionOfDistrict('Atlantis')).toBeNull();
    expect(getDivisionOfDistrict('')).toBeNull();
    expect(getDivisionOfDistrict('constructor')).toBeNull();
  });
});

describe('getTehsils', () => {
  it('lists the census tehsils of a district, sorted', () => {
    expect(getTehsils('Toba Tek Singh')).toEqual([
      'Gojra',
      'Kamalia',
      'Pirmahal',
      'Toba Tek Singh',
    ]);
    expect(getTehsils('badin')).toEqual([
      'Badin',
      'Golarchi (S.F. Rahu)',
      'Matli',
      'Talhar',
      'Tando Bago',
    ]);
    expect(getTehsils('Islamabad')).toEqual(['Islamabad']);
  });

  it('keeps census membership for districts that were split later', () => {
    // Murree became a district after the census.
    expect(getTehsils('Rawalpindi')).toContain('Murree');
    expect(getTehsils('Quetta')).toEqual([
      'City',
      'Kuchlak',
      'Panjpai',
      'Saddar',
      'Sariab',
    ]);
  });

  it('lists only confirmed tehsils for post-census districts', () => {
    for (const district of ['Quetta East', 'Bar Swat', 'Tump']) {
      const expected = tehsils
        .filter((t) => t.currentDistrict === district)
        .map((t) => t.tehsil)
        .sort((a, b) => a.localeCompare(b));
      expect(getTehsils(district)).toEqual(expected);
    }
  });

  it('returns an empty list for unknown or uncovered districts', () => {
    expect(getTehsils('Gilgit')).toEqual([]);
    expect(getTehsils('Atlantis')).toEqual([]);
    expect(getTehsils('')).toEqual([]);
  });
});

describe('getTehsilDistrict', () => {
  it('returns the census district of a tehsil', () => {
    expect(getTehsilDistrict('Gojra')).toBe('Toba Tek Singh');
    expect(getTehsilDistrict('  MURREE ')).toBe('Rawalpindi');
    expect(getTehsilDistrict('Kuchlak')).toBe('Quetta');
    expect(getTehsilDistrict('Wana')).toBe('South Waziristan');
  });

  it('needs a province for names shared across provinces', () => {
    expect(getTehsilDistrict('Khanpur')).toBeNull();
    expect(getTehsilDistrict('Khanpur', 'Sindh')).toBe('Shikarpur');
    expect(getTehsilDistrict('Khanpur', 'punjab')).toBe('Rahim Yar Khan');
    expect(getTehsilDistrict('Khanpur', 'Khyber Pakhtunkhwa')).toBe('Haripur');
  });

  it('returns null when a province does not settle it', () => {
    // Two Punjab districts have a Sahiwal tehsil.
    expect(getTehsilDistrict('Sahiwal', 'Punjab')).toBeNull();
    expect(getTehsilDistrict('Gojra', 'Sindh')).toBeNull();
    expect(getTehsilDistrict('Atlantis')).toBeNull();
    expect(getTehsilDistrict('')).toBeNull();
  });
});
