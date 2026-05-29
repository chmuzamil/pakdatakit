import { describe, expect, it } from 'vitest';
import {
  normalizeRomanUrdu,
  normalizeText,
  toEnglishDigits,
  toUrduDigits,
} from '../src/text.js';

describe('normalizeText', () => {
  it('collapses whitespace', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world');
  });
});

describe('toEnglishDigits', () => {
  it('converts Urdu digits', () => {
    expect(toEnglishDigits('۰۱۲۳')).toBe('0123');
  });
});

describe('toUrduDigits', () => {
  it('converts English digits', () => {
    expect(toUrduDigits('0123')).toBe('۰۱۲۳');
  });
});

describe('normalizeRomanUrdu', () => {
  it('normalizes common spellings', () => {
    expect(normalizeRomanUrdu('ap kia ker rhe ho')).toBe(
      'aap kya kar rhe ho',
    );
  });

  it('normalizes greeting variants', () => {
    expect(normalizeRomanUrdu('Assalam o Alaikum')).toBe('assalamualaikum');
  });
});
