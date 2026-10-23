import {
  analyzeNTN,
  analyzeNumber,
  getBankFromIBAN,
  getBankInfo,
  getCityByPostalCode,
  getCNICInfo,
  getNetwork,
  getProvince,
  parseAddress,
  parseRaastQr,
  validateCNIC,
  validateIBAN,
  validateNTN,
  validatePhone,
  validateRaastQr,
  validateSTRN,
} from 'pakdatakit';
import { describe, expect, it } from 'vitest';
import { createFaker, RESERVED_EMAIL_DOMAINS } from '../src/index.js';

const SEEDS = 2000;
const NOW = new Date('2026-06-15T12:00:00Z');
const EMAIL = /^[a-z0-9._]+@(example\.com|example\.org|example\.net)$/;

const CNIC_PROVINCE: Record<string, string> = {
  '1': 'Khyber Pakhtunkhwa',
  '3': 'Punjab',
  '4': 'Sindh',
  '5': 'Balochistan',
  '6': 'Islamabad Capital Territory',
  '7': 'Gilgit-Baltistan',
  '8': 'Azad Jammu and Kashmir',
};

function ageOn(dateOfBirth: string, now: Date): number {
  const [y, m, d] = dateOfBirth.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() + 1 < m ||
    (now.getUTCMonth() + 1 === m && now.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

describe(`every generator, ${SEEDS} seeds`, () => {
  it('cnic passes validateCNIC and getCNICInfo agrees', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      const gender = f.gender();
      const value = f.cnic({ gender });
      expect(validateCNIC(value), value).toBe(true);
      expect(value).toMatch(/^[134567]\d{4}-\d{7}-\d$/);
      const info = getCNICInfo(value)!;
      expect(info.gender).toBe(gender);
      expect(info.province).toBe(CNIC_PROVINCE[value[0]!]);
      expect(f.cnic({ formatted: false })).toMatch(/^[134567]\d{12}$/);
    }
  });

  it('phone passes validatePhone in every format', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      const local = f.phone();
      expect(local).toMatch(/^03\d{9}$/);
      expect(validatePhone(local), local).toBe(true);
      expect(getNetwork(local)).not.toBe('Unknown');
      const intl = f.phone({ format: 'international' });
      expect(intl).toMatch(/^\+92 3\d{2} \d{7}$/);
      expect(validatePhone(intl), intl).toBe(true);
      const e164 = f.phone({ format: 'e164' });
      expect(e164).toMatch(/^\+923\d{9}$/);
      expect(validatePhone(e164), e164).toBe(true);
    }
  });

  it('landline and uan pass analyzeNumber', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      const line = f.landline();
      expect(analyzeNumber(line)?.type, line).toBe('landline');
      expect(analyzeNumber(line)?.cities.length).toBeGreaterThan(0);
      const uan = f.uan();
      expect(analyzeNumber(uan)?.type, uan).toBe('uan');
      expect(analyzeNumber(uan)?.formatted).toBe(uan);
    }
  });

  it('iban passes validateIBAN with an active bank', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      const details = f.ibanDetails();
      expect(validateIBAN(details.iban), details.iban).toBe(true);
      expect(getBankFromIBAN(details.iban)).toBe(details.bank);
      const info = getBankInfo(details.iban)!;
      expect(info.active).toBe(true);
      expect(info.aliasOf).toBeNull();
      expect(info.type).not.toBe('central');
      const spaced = f.iban({ formatted: true });
      expect(spaced).toMatch(/^PK\d{2}( [A-Z0-9]{4}){5}$/);
      expect(validateIBAN(spaced)).toBe(true);
    }
  });

  it('ntn and strn pass validateNTN / validateSTRN', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      const business = f.ntn();
      expect(business).toMatch(/^\d{7}-\d$/);
      expect(analyzeNTN(business)?.type).toBe('business');
      expect(validateNTN(f.ntn({ checkDigit: false }))).toBe(true);
      const individual = f.ntn({ type: 'individual' });
      expect(analyzeNTN(individual)?.type).toBe('individual');
      expect(validateSTRN(f.strn())).toBe(true);
    }
  });

  it('address is read back by parseAddress with the same city and province', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      const parts = f.addressParts({ includeProvince: seed % 2 === 0 });
      const parsed = parseAddress(parts.full);
      expect(parsed.city, parts.full).toBe(parts.city);
      expect(parsed.province, parts.full).toBe(parts.province);
      expect(parsed.warnings, parts.full).toEqual([]);
      expect(parsed.postalCode, parts.full).toBe(parts.postalCode);
      if (parts.postalCode !== null) {
        expect(getCityByPostalCode(parts.postalCode)).toBe(parts.city);
      }
    }
  });

  it('email uses RFC 2606 domains only', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed });
      expect(f.email()).toMatch(EMAIL);
    }
  });

  it('person is internally consistent', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const f = createFaker({ seed, now: NOW });
      const p = f.person();
      const ctx = JSON.stringify(p);
      expect(p.name).toBe(`${p.firstName} ${p.lastName}`);
      expect(validateCNIC(p.cnic), ctx).toBe(true);
      const info = getCNICInfo(p.cnic)!;
      expect(info.province, ctx).toBe(p.province);
      expect(info.gender, ctx).toBe(p.gender);
      expect(p.cnic[0]).not.toBe('8');
      expect(p.province).not.toBe('Azad Jammu and Kashmir');
      expect(getProvince(p.city)).toBe(p.province);
      expect(validatePhone(p.phone), ctx).toBe(true);
      expect(p.email).toMatch(EMAIL);
      expect(validateIBAN(p.iban), ctx).toBe(true);
      expect(getBankFromIBAN(p.iban)).toBe(p.bank);
      expect(p.ntn).toBe(p.cnic);
      expect(analyzeNTN(p.ntn)?.type).toBe('individual');
      const age = ageOn(p.dateOfBirth, NOW);
      expect(age, ctx).toBeGreaterThanOrEqual(18);
      expect(age, ctx).toBeLessThanOrEqual(65);
      const parsed = parseAddress(p.address);
      expect(parsed.city, ctx).toBe(p.city);
      expect(parsed.province, ctx).toBe(p.province);
      expect(parsed.postalCode).toBe(p.postalCode);
      if (p.landline !== null) {
        const line = analyzeNumber(p.landline)!;
        expect(line.type, ctx).toBe('landline');
        const known = analyzeNumber(p.landline)!.cities;
        expect(
          known.includes(p.city) ||
            known.some((name) => getProvince(name) === p.province),
          ctx,
        ).toBe(true);
      }
      if (p.district !== undefined) {
        expect(p.district).toBe(p.city);
      }
    }
  });

  it('person landline uses the city area code when the city has one', () => {
    let checked = 0;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const p = createFaker({ seed }).person();
      if (p.landline === null) continue;
      const cities = analyzeNumber(p.landline)!.cities;
      const f = createFaker({ seed: `probe-${seed}` });
      let cityHasCode = true;
      try {
        f.landline({ city: p.city });
      } catch {
        cityHasCode = false;
      }
      if (cityHasCode) {
        expect(cities, p.city).toContain(p.city);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(SEEDS / 4);
  });

  it('business is internally consistent', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const b = createFaker({ seed }).business();
      const ctx = JSON.stringify(b);
      expect(b.name.length).toBeGreaterThan(3);
      expect(analyzeNTN(b.ntn)?.type, ctx).toBe('business');
      expect(validateSTRN(b.strn)).toBe(true);
      expect(getProvince(b.city)).toBe(b.province);
      const parsed = parseAddress(b.address);
      expect(parsed.city, ctx).toBe(b.city);
      expect(parsed.province, ctx).toBe(b.province);
      expect(validatePhone(b.phone)).toBe(true);
      if (b.landline !== null) {
        expect(analyzeNumber(b.landline)?.type, ctx).toBe('landline');
      }
      if (b.uan !== null) {
        const uan = analyzeNumber(b.uan)!;
        expect(uan.type, ctx).toBe('uan');
        expect(uan.cities, ctx).toContain(b.city);
      }
      expect(validateIBAN(b.iban)).toBe(true);
      expect(getBankFromIBAN(b.iban)).toBe(b.bank);
    }
  });

  it('raastQr produces a valid P2P QR for the IBAN', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const f = createFaker({ seed });
      const iban = f.iban();
      const qr = f.raastQr({ iban });
      expect(validateRaastQr(qr).valid, qr).toBe(true);
      expect(parseRaastQr(qr)?.iban).toBe(iban);
      const dynamic = f.raastQr({ amount: f.amount({ min: 1, max: 5000 }) });
      const result = validateRaastQr(dynamic);
      expect(result.valid, JSON.stringify(result.errors)).toBe(true);
      expect(result.qr?.dynamic).toBe(true);
    }
  });

  it('RESERVED_EMAIL_DOMAINS is exactly the RFC 2606 set', () => {
    expect([...RESERVED_EMAIL_DOMAINS]).toEqual([
      'example.com',
      'example.org',
      'example.net',
    ]);
  });
});
