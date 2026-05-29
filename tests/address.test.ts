import { describe, expect, it } from 'vitest';
import { formatAddress, parseAddress } from '../src/address.js';

describe('parseAddress', () => {
  it('extracts city, province, and postal code', () => {
    expect(
      parseAddress('House 12, Gulberg III, Lahore, Punjab 54660'),
    ).toMatchObject({
      street: 'House 12',
      area: 'Gulberg III',
      city: 'Lahore',
      province: 'Punjab',
      postalCode: '54660',
    });
  });

  it('infers city from postal code', () => {
    expect(parseAddress('Street 5, 60000')).toMatchObject({
      city: 'Multan',
      postalCode: '60000',
    });
  });

  it('returns empty structure for blank input', () => {
    expect(parseAddress('   ')).toEqual({
      raw: '',
      street: null,
      area: null,
      city: null,
      district: null,
      province: null,
      postalCode: null,
    });
  });
});

describe('formatAddress', () => {
  it('formats structured components', () => {
    const formatted = formatAddress({
      raw: '',
      street: 'House 12',
      area: 'Gulberg III',
      city: 'Lahore',
      district: null,
      province: 'Punjab',
      postalCode: '54660',
    });

    expect(formatted).toContain('House 12');
    expect(formatted).toContain('Lahore');
    expect(formatted).toContain('54660');
  });
});
