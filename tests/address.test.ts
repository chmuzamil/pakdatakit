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
      warnings: [],
    });
  });

  it('ignores house, plot and PO box numbers', () => {
    expect(parseAddress('PO Box 12345, Karachi').postalCode).toBeNull();
    expect(parseAddress('House 54000, Model Town, Lahore').postalCode).toBeNull();
    expect(parseAddress('Plot 12345, DHA, Karachi 75500').postalCode).toBe('75500');
    expect(parseAddress('Block 4, Gulshan East 75300, Karachi').postalCode).toBe('75300');
  });

  it('parses addresses without commas', () => {
    expect(parseAddress('12 Model Town Lahore')).toMatchObject({
      street: '12 Model Town',
      city: 'Lahore',
      province: 'Punjab',
    });
    expect(parseAddress('House 5 Satellite Town Rawalpindi Punjab 46300')).toMatchObject({
      street: 'House 5 Satellite Town',
      city: 'Rawalpindi',
      province: 'Punjab',
      postalCode: '46300',
    });
  });

  it('warns when the city and province disagree', () => {
    const parsed = parseAddress('House 1, Lahore, Sindh');
    expect(parsed.province).toBe('Sindh');
    expect(parsed.warnings).toEqual([
      'Lahore is in Punjab, but the address says Sindh',
    ]);
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

  it('does not invent a postal code', () => {
    expect(formatAddress({ street: 'House 12', city: 'Lahore' })).toBe(
      'House 12, Lahore',
    );
  });
});
