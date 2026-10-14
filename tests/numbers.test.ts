import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { describe, expect, it } from 'vitest';
import {
  analyzeNumber,
  getAreaCode,
  getNumberType,
  validateLandline,
} from '../src/numbers.js';

describe('analyzeNumber', () => {
  it('identifies landlines with area codes', () => {
    expect(analyzeNumber('042 35761234')).toEqual({
      type: 'landline',
      formatted: '042-35761234',
      e164: '+924235761234',
      areaCode: '042',
      cities: ['Lahore'],
    });
    expect(analyzeNumber('+92 51 9260138')).toMatchObject({
      formatted: '051-9260138',
      cities: ['Islamabad', 'Rawalpindi'],
    });
    expect(analyzeNumber('0992-345678')).toMatchObject({
      type: 'landline',
      areaCode: '0992',
      cities: ['Abbottabad'],
    });
  });

  it('identifies UAN numbers', () => {
    expect(analyzeNumber('021-111-825-888')).toEqual({
      type: 'uan',
      formatted: '021-111-825-888',
      e164: '+9221111825888',
      areaCode: '021',
      cities: ['Karachi'],
    });
    expect(analyzeNumber('111-825-888')).toEqual({
      type: 'uan',
      formatted: '111-825-888',
      e164: null,
      areaCode: null,
      cities: [],
    });
  });

  it('identifies toll-free, premium and personal numbers', () => {
    expect(analyzeNumber('0800-12345')).toMatchObject({
      type: 'toll-free',
      formatted: '0800-12345',
      e164: '+9280012345',
    });
    expect(analyzeNumber('0900 12345')?.type).toBe('premium');
    expect(analyzeNumber('0122 044444')?.type).toBe('personal');
  });

  it('identifies mobiles', () => {
    expect(analyzeNumber('+92 300 1234567')).toMatchObject({
      type: 'mobile',
      formatted: '0300-1234567',
      e164: '+923001234567',
    });
  });

  it('rejects invalid numbers', () => {
    expect(analyzeNumber('021-1234')).toBeNull();
    expect(analyzeNumber('+1 212 555 0100')).toBeNull();
    expect(analyzeNumber('hello')).toBeNull();
    expect(getNumberType('0210123456')).toBeNull();
  });

  it('agrees with libphonenumber on number types', () => {
    const expected: Record<string, string> = {
      FIXED_LINE: 'landline',
      MOBILE: 'mobile',
      TOLL_FREE: 'toll-free',
      PREMIUM_RATE: 'premium',
      PERSONAL_NUMBER: 'personal',
      UAN: 'uan',
    };
    const samples = [
      '02135761234',
      '04235761234',
      '0519260138',
      '0619330701',
      '0992345678',
      '09461234567',
      '021111825888',
      '051111123456',
      '080012345',
      '080012345678',
      '090012345',
      '0122044444',
      '03001234567',
      '03451234567',
    ];
    for (const sample of samples) {
      const reference = parsePhoneNumberFromString(sample, 'PK')?.getType();
      expect(getNumberType(sample), sample).toBe(
        expected[reference ?? ''] ?? null,
      );
    }
  });
});

describe('validateLandline', () => {
  it('accepts only landlines', () => {
    expect(validateLandline('021-35761234')).toBe(true);
    expect(validateLandline('03001234567')).toBe(false);
    expect(validateLandline('0800-12345')).toBe(false);
  });
});

describe('getAreaCode', () => {
  it('looks up area codes by city', () => {
    expect(getAreaCode('Lahore')).toBe('042');
    expect(getAreaCode('rawalpindi')).toBe('051');
    expect(getAreaCode('Mardan')).toBe('0937');
    expect(getAreaCode('Atlantis')).toBeNull();
  });
});
