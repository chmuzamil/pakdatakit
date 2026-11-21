import { describe, expect, it } from 'vitest';
import names from '../data/sources/roman-urdu-names.json';
import { normalizeRomanUrdu, romanUrduKey } from '../src/text.js';

const same = (...spellings: string[]) =>
  new Set(spellings.map(romanUrduKey)).size === 1;

describe('romanUrduKey', () => {
  it('matches the spellings it was asked to', () => {
    expect(same('Mubeen', 'Mobeen')).toBe(true);
    expect(same('Muhammad', 'Mohammad', 'Muhammed')).toBe(true);
    expect(same('Rehman', 'Rahman')).toBe(true);
    expect(same('Chaudhry', 'Chaudhary', 'Chaudhery')).toBe(true);
  });

  it('keeps similar but different names apart', () => {
    expect(same('Hussain', 'Hassan')).toBe(false);
    expect(same('Imran', 'Umran')).toBe(false);
    expect(same('Saeed', 'Saad')).toBe(false);
    expect(same('Ehsan', 'Ahsan')).toBe(false);
    expect(same('Ali', 'Alia')).toBe(false);
  });

  it('keys each word, ignoring case, accents and punctuation', () => {
    expect(romanUrduKey('Muhammad Rehman')).toBe('muhmd rahmn');
    expect(romanUrduKey('MUHAMMAD  rehman!')).toBe('muhmd rahmn');
    expect(romanUrduKey('José')).toBe(romanUrduKey('Jose'));
  });

  it('returns an empty key when there are no Latin letters', () => {
    expect(romanUrduKey('')).toBe('');
    expect(romanUrduKey('123')).toBe('');
    expect(romanUrduKey(null as unknown as string)).toBe('');
  });

  it('does not change normalizeRomanUrdu', () => {
    expect(normalizeRomanUrdu('ap kaise ho')).toBe('aap kaise ho');
  });

  // The list of common Pakistani names: spellings of one name should share a
  // key, spellings of different names should not. These are the rates
  // measured when romanUrduKey was written (2.7.0); a change that makes them
  // worse fails here.
  it('matches 95%+ of spelling pairs with under 0.05% false matches', () => {
    const all = names.groups.flatMap((group, g) =>
      group.map((name) => ({ g, key: romanUrduKey(name) })),
    );
    let variants = 0;
    let variantsMatched = 0;
    let others = 0;
    let othersMatched = 0;
    for (let i = 0; i < all.length; i += 1)
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i]!;
        const b = all[j]!;
        if (a.g === b.g) {
          variants += 1;
          if (a.key === b.key) variantsMatched += 1;
        } else {
          others += 1;
          if (a.key === b.key) othersMatched += 1;
        }
      }
    expect(variantsMatched / variants).toBeGreaterThanOrEqual(0.95);
    expect(othersMatched / others).toBeLessThan(0.0005);
  });
});
