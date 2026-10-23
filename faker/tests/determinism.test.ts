import { describe, expect, it } from 'vitest';
import * as defaults from '../src/index.js';
import { createFaker, seededRandom } from '../src/index.js';

const NOW = new Date('2026-06-15T12:00:00Z');

function sample(seed: number | string) {
  const f = createFaker({ seed, now: NOW });
  return {
    cnic: f.cnic(),
    phone: f.phone(),
    iban: f.iban(),
    name: f.name(),
    address: f.address(),
    person: f.person(),
    business: f.business(),
  };
}

describe('determinism', () => {
  it('the PRNG produces a fixed sequence (cross-platform contract)', () => {
    const next = seededRandom(42);
    expect([next(), next(), next()]).toMatchInlineSnapshot(`
      [
        0.9430338514503092,
        0.7610700796358287,
        0.08751116436906159,
      ]
    `);
    // Numbers and strings hash the same.
    expect(seededRandom('42')()).toBe(seededRandom(42)());
  });

  it('same seed gives the same output', () => {
    for (const seed of [0, 1, 42, 'hello', 'پاکستان']) {
      expect(sample(seed)).toEqual(sample(seed));
    }
  });

  it('different seeds give different output', () => {
    expect(sample(1)).not.toEqual(sample(2));
  });

  it('known values for seed 42', () => {
    expect(sample(42)).toMatchInlineSnapshot(`
      {
        "address": "113-B, Mohallah Bilal Ganj, Swat 19200",
        "business": {
          "address": "67-D, Mohallah Noorpur, Dalbandin",
          "bank": "Soneri Bank Limited",
          "city": "Dalbandin",
          "iban": "PK95SONE1271577384459688",
          "landline": "0852-348003",
          "name": "Al-Ameen Enterprises",
          "ntn": "9327996-0",
          "phone": "03493766936",
          "postalCode": null,
          "province": "Balochistan",
          "strn": "6578292153034",
          "uan": null,
        },
        "cnic": "68707-6932604-0",
        "iban": "PK44MEZN5165216300839683",
        "name": "Rehana Tanoli",
        "person": {
          "address": "House # 383, Street # 3, Civil Lines, Lakki Marwat 28420",
          "bank": "Askari Bank Limited",
          "city": "Lakki Marwat",
          "cnic": "16221-1058327-4",
          "dateOfBirth": "1994-12-10",
          "district": "Lakki Marwat",
          "email": "marviraisani784@example.org",
          "firstName": "Marvi",
          "gender": "female",
          "iban": "PK83ASCM3772893706128459",
          "landline": "0969-357350",
          "lastName": "Raisani",
          "name": "Marvi Raisani",
          "ntn": "16221-1058327-4",
          "phone": "03432507443",
          "postalCode": "28420",
          "province": "Khyber Pakhtunkhwa",
        },
        "phone": "03095592120",
      }
    `);
  });

  it('seed() restarts the sequence', () => {
    const f = createFaker({ seed: 'x' });
    const first = f.many(5, () => f.cnic());
    f.seed('x');
    expect(f.many(5, () => f.cnic())).toEqual(first);
  });

  it('a custom random source drives every generator', () => {
    let state = 0;
    const counter = () => {
      state = (state + 0.618033988749895) % 1;
      return state;
    };
    const a = createFaker({ random: counter, now: NOW }).person();
    state = 0;
    const b = createFaker({ random: counter, now: NOW }).person();
    expect(a).toEqual(b);
  });

  it('the default instance and bound functions share one source', () => {
    defaults.seed(7);
    const viaFunctions = [defaults.cnic(), defaults.phone(), defaults.name()];
    defaults.faker.seed(7);
    const viaInstance = [
      defaults.faker.cnic(),
      defaults.faker.phone(),
      defaults.faker.name(),
    ];
    expect(viaFunctions).toEqual(viaInstance);
    expect(defaults.many(3, () => defaults.int(1, 6))).toHaveLength(3);
  });
});
