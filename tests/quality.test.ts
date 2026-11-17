import { describe, expect, it } from 'vitest';
import {
  ADDRESS_WEIGHTS,
  phoneRiskSignals,
  scoreAddress,
} from '../src/quality.js';

describe('scoreAddress', () => {
  it('gives 100 to a complete address with a known post office', () => {
    const result = scoreAddress(
      'House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660',
    );
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.parsed.city).toBe('Lahore');
    expect(result.parsed.postalCode).toBe('54660');
  });

  it('weights add up to 100', () => {
    const total = Object.values(ADDRESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('lists what is missing', () => {
    const result = scoreAddress('Lahore');
    expect(result.score).toBe(30);
    expect(result.missing).toEqual([
      'houseNumber',
      'street',
      'area',
      'postalCode',
      'landmark',
    ]);
  });

  it('recognises Roman Urdu and Urdu landmark words', () => {
    for (const address of [
      'Makan 5, gali 3, masjid ke samne, Multan',
      'H 5 nazd Jamia Masjid, Multan',
      'مکان 5، گلی 3، مسجد کے سامنے، Multan',
      'Flat 2, opp. Civil Hospital, Karachi',
    ]) {
      expect(scoreAddress(address).missing, address).not.toContain('landmark');
    }
    expect(scoreAddress('Flat 2, Karachi').missing).toContain('landmark');
  });

  it('scores an unknown postal code lower than a known one', () => {
    const known = scoreAddress('House 1, Lahore 54660').score;
    const unknown = scoreAddress('House 1, Lahore 54999').score;
    expect(known - unknown).toBe(ADDRESS_WEIGHTS.postalCode - 5);
    expect(scoreAddress('House 1, Lahore 54999').missing).toContain(
      'postalCode',
    );
  });

  it('lowers the score when the post office is in another province', () => {
    // 75500 is a Karachi post office.
    const result = scoreAddress('House 1, Street 2, Lahore 75500');
    expect(result.parsed.warnings.join(' ')).toMatch(/75500 is in Sindh/);
    // city + house number + street + area ("Street 2", as parseAddress
    // reads it) + postal code, less the penalty.
    expect(result.score).toBe(30 + 20 + 15 + 10 + 15 - 15);
  });

  it('does not take the postal code for a house number', () => {
    expect(scoreAddress('Lahore 54660').missing).toContain('houseNumber');
  });

  it('never throws and scores empty or hostile input 0', () => {
    for (const input of ['', '   ', '!!!', '\u0000', 'x'.repeat(10000)]) {
      const result = scoreAddress(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
    expect(scoreAddress('').score).toBe(0);
    expect(scoreAddress(undefined as unknown as string).score).toBe(0);
  });
});

describe('phoneRiskSignals', () => {
  it('returns no flags for an ordinary mobile number', () => {
    expect(phoneRiskSignals('0301-2945716')).toEqual([]);
    expect(phoneRiskSignals('+92 333 5820147')).toEqual([]);
  });

  it('flags invalid, landline and service numbers', () => {
    expect(phoneRiskSignals('12345')).toEqual(['invalid']);
    expect(phoneRiskSignals('')).toEqual(['invalid']);
    expect(phoneRiskSignals('042 35761234')).toEqual(['landline']);
    expect(phoneRiskSignals('0800-12345')).toEqual(['not-mobile']);
  });

  it('flags repeated, sequential and placeholder numbers', () => {
    expect(phoneRiskSignals('03000000000')).toEqual(['repeated-digits']);
    expect(phoneRiskSignals('03001111112')).toEqual(['repeated-digits']);
    expect(phoneRiskSignals('03001234567')).toEqual([
      'sequential-digits',
      'test-number',
    ]);
    expect(phoneRiskSignals('03217654321')).toEqual([
      'sequential-digits',
      'test-number',
    ]);
    expect(phoneRiskSignals('03123456789')).toEqual([
      'sequential-digits',
      'test-number',
    ]);
    expect(phoneRiskSignals('03002345678')).toEqual(['sequential-digits']);
  });

  it('never throws', () => {
    expect(phoneRiskSignals(undefined as unknown as string)).toEqual([
      'invalid',
    ]);
  });
});
