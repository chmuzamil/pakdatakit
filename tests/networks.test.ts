import { describe, expect, it } from 'vitest';
import { getNetwork } from '../src/networks.js';

describe('getNetwork', () => {
  it('detects Jazz from 0300 prefix', () => {
    expect(getNetwork('03001234567')).toBe('Jazz');
  });

  it('detects Zong from 0310 prefix', () => {
    expect(getNetwork('03101234567')).toBe('Zong');
  });

  it('detects Ufone from 0330 prefix', () => {
    expect(getNetwork('03301234567')).toBe('Ufone');
  });

  it('detects Telenor from 0340 prefix', () => {
    expect(getNetwork('03401234567')).toBe('Telenor');
  });

  it('works with international format', () => {
    expect(getNetwork('+923001234567')).toBe('Jazz');
  });

  it('returns Unknown for unmapped prefix', () => {
    expect(getNetwork('03551234567')).toBe('Unknown');
  });

  it('returns Unknown for invalid phone', () => {
    expect(getNetwork('invalid')).toBe('Unknown');
  });
});
