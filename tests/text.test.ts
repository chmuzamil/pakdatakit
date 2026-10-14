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
    expect(normalizeRomanUrdu('ap kia ker rhe ho')).toBe('aap kya kar rhe ho');
  });

  it('normalizes greeting variants', () => {
    expect(normalizeRomanUrdu('Assalam o Alaikum')).toBe('Assalamualaikum');
    expect(normalizeRomanUrdu('assalamu alaikum')).toBe('assalamualaikum');
  });

  it('does not change the meaning of mein/main', () => {
    expect(normalizeRomanUrdu('ghar mein hun')).toBe('ghar mein hun');
    expect(normalizeRomanUrdu('main ghar hun')).toBe('main ghar hun');
  });

  it('leaves acronyms and English words alone', () => {
    expect(normalizeRomanUrdu('AP news and men')).toBe('AP news and men');
    expect(normalizeRomanUrdu('Ap kia ker')).toBe('Aap kya kar');
  });
});

describe('digit conversion', () => {
  it('converts Arabic-Indic digits both ways', () => {
    expect(toEnglishDigits('٠١٢٣')).toBe('0123');
    expect(toUrduDigits('٤٥ and 67')).toBe('۴۵ and ۶۷');
  });
});
