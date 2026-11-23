import { describe, expect, it } from 'vitest';
import {
  calculateWithholding,
  getBankInfo,
  getBanks,
  findCNICs,
  getDataInfo,
  getDistrictPopulation,
  getSaleTypes,
  getTehsilPopulation,
  getWithholdingRates,
  getZakatNisab,
  listDataInfo,
  maskCNICs,
  zakatDeduction,
} from '../src/index.js';
import manifest from '../data/manifest.json';

describe('data manifest', () => {
  it('has an entry for every dataset, with a source and dates', () => {
    expect(listDataInfo().map((d) => d.id)).toEqual(
      manifest.map((m) => m.id).sort(),
    );
    const slabs = getDataInfo('income-tax-slabs');
    expect(slabs?.issuer).toContain('FBR');
    expect(slabs?.sourceUrl).toMatch(/^https:\/\//);
    expect(getDataInfo('nope')).toBeNull();
    expect(getDataInfo(null as unknown as string)).toBeNull();
  });
});

describe('zakat', () => {
  it('reads the notified nisab by year, label and date', () => {
    expect(getZakatNisab({ zakatYear: 1447 })?.nisab).toBe(503529);
    expect(getZakatNisab({ zakatYear: '1446-47' })?.zakatYear).toBe(1447);
    expect(getZakatNisab({ zakatYear: 1433 })?.nisab).toBe(51086);
    expect(getZakatNisab({ date: '2025-06-01' })?.nisab).toBe(179689);
    // 1 Ramazan 1447 is confirmed as 19 February 2026.
    expect(getZakatNisab({ date: '2026-02-18' })?.zakatYear).toBe(1446);
    expect(getZakatNisab({ date: '2026-02-19' })?.zakatYear).toBe(1447);
    // Every year starts on its announced 1 Ramazan.
    expect(getZakatNisab({ date: '2025-03-01' })?.zakatYear).toBe(1445);
    expect(getZakatNisab({ date: '2025-03-02' })?.zakatYear).toBe(1446);
    expect(getZakatNisab({ zakatYear: 1433 })?.bankHolidayDate).toBe(
      '2012-07-23',
    );
    expect(getZakatNisab({ date: '2012-07-20' })).toBeNull();
    expect(getZakatNisab({ date: '2026-02-20' })?.zakatYear).toBe(1447);
    expect(getZakatNisab({ zakatYear: 1432 })).toBeNull();
  });

  it('deducts 2.5% of the whole balance at or above the nisab', () => {
    expect(zakatDeduction({ balance: 600000, zakatYear: 1447 })).toMatchObject({
      deductible: true,
      zakat: 15000,
      source: { id: 'zakat-nisab' },
    });
    expect(
      zakatDeduction({ balance: 503529, zakatYear: 1447 })?.deductible,
    ).toBe(true);
    expect(
      zakatDeduction({ balance: 503528.99, zakatYear: 1447 })?.reason,
    ).toBe('below-nisab');
    expect(
      zakatDeduction({ balance: 600000, zakatYear: 1447, exempt: true }),
    ).toMatchObject({ deductible: false, reason: 'exempt', zakat: 0 });
    expect(zakatDeduction({ balance: -1, zakatYear: 1447 })).toBeNull();
  });
});

describe('withholding', () => {
  it('uses each section’s own non-ATL rule', () => {
    // 236K TY2027: 1.25% for ATL; non-ATL by value band.
    expect(
      calculateWithholding({
        section: '236K',
        amount: 60e6,
        atl: true,
        taxYear: 2027,
      })?.tax,
    ).toBe(750000);
    expect(
      calculateWithholding({
        section: '236K',
        amount: 60e6,
        atl: false,
        taxYear: 2027,
      }),
    ).toMatchObject({ rate: 14.5, tax: 8700000, nonAtlRule: 'slabs' });
    // 236C TY2026: a fixed 11.5% for non-ATL, late filers by band.
    expect(
      calculateWithholding({
        section: '236C',
        amount: 60e6,
        atl: false,
        taxYear: 2026,
      })?.rate,
    ).toBe(11.5);
    expect(
      calculateWithholding({
        section: '236C',
        amount: 60e6,
        atl: true,
        lateFiler: true,
        taxYear: 2026,
      })?.rate,
    ).toBe(8.5);
    // 151 TY2025: a fixed 35% for non-ATL, not double.
    expect(
      calculateWithholding({
        section: '151',
        subType: 'other',
        amount: 100,
        atl: false,
        taxYear: 2025,
      })?.rate,
    ).toBe(35);
    expect(
      calculateWithholding({
        section: '151',
        subType: 'other',
        amount: 100,
        atl: false,
        taxYear: 2027,
      })?.rate,
    ).toBe(30);
  });

  it('applies the 231AB threshold of Rs 50,000 a day to non-ATL only', () => {
    expect(
      calculateWithholding({
        section: '231AB',
        amount: 50000,
        atl: false,
        taxYear: 2027,
      })?.tax,
    ).toBe(0);
    expect(
      calculateWithholding({
        section: '231AB',
        amount: 80000,
        atl: false,
        taxYear: 2027,
      })?.tax,
    ).toBe(640);
    expect(
      calculateWithholding({
        section: '231AB',
        amount: 80000,
        atl: false,
        taxYear: 2025,
      })?.tax,
    ).toBe(480);
    expect(
      calculateWithholding({
        section: '231AB',
        amount: 80000,
        atl: true,
        taxYear: 2027,
      })?.tax,
    ).toBe(0);
  });

  it('follows the statute where the card differs', () => {
    const r = calculateWithholding({
      section: '153',
      subType: 'exporter-services',
      amount: 100000,
      atl: true,
      taxYear: 2027,
    });
    expect(r?.rate).toBe(1.25);
    expect(r?.statuteOverride).toContain('Finance Act 2026');
    expect(
      getWithholdingRates(2027, '150').some(
        (x) => x.subType === 'mutual-fund-mostly-debt',
      ),
    ).toBe(false);
    expect(
      getWithholdingRates(2025, '150').some(
        (x) => x.subType === 'mutual-fund-mostly-debt',
      ),
    ).toBe(true);
  });

  it('has 154B only from tax year 2027, and 149 as the salaried table', () => {
    expect(
      calculateWithholding({
        section: '154B',
        amount: 1000,
        atl: true,
        taxYear: 2026,
      }),
    ).toBeNull();
    expect(
      calculateWithholding({
        section: '149',
        amount: 2_400_000,
        atl: false,
        taxYear: 2027,
      })?.tax,
    ).toBe(156000);
  });
});

describe('2.8.0 review findings', () => {
  it('rounds Zakat to the rupee (First Schedule, Note 2)', () => {
    expect(zakatDeduction({ balance: 600019.99, zakatYear: 1447 })?.zakat).toBe(
      15000,
    );
    expect(zakatDeduction({ balance: 600020, zakatYear: 1447 })?.zakat).toBe(
      15001,
    );
  });

  it('rounds withholding to the rupee (section 219)', () => {
    expect(
      calculateWithholding({
        section: '151',
        subType: 'bank-deposit',
        amount: 1234.56,
        atl: true,
        taxYear: 2027,
      })?.tax,
    ).toBe(247);
  });

  it('gives no sukuk rate for a return of exactly Rs 1 million', () => {
    for (const subType of [
      'sukuk-individual-above-1m',
      'sukuk-individual-below-1m',
    ])
      expect(
        calculateWithholding({
          section: '151',
          subType,
          amount: 1_000_000,
          atl: true,
          taxYear: 2027,
        }),
      ).toBeNull();
    expect(
      calculateWithholding({
        section: '151',
        subType: 'sukuk-individual-below-1m',
        amount: 20_000,
        returnOnInvestment: 900_000,
        atl: true,
        taxYear: 2027,
      })?.rate,
    ).toBe(10);
  });

  it('taxes a company’s mutual fund debt part at 29% (clause (ba) proviso)', () => {
    expect(
      calculateWithholding({
        section: '150',
        subType: 'mutual-fund-debt-part-company',
        amount: 100,
        atl: true,
        taxYear: 2027,
      })?.rate,
    ).toBe(29);
    expect(
      calculateWithholding({
        section: '150',
        subType: 'mutual-fund-debt-part-company',
        amount: 100,
        atl: true,
        taxYear: 2025,
      }),
    ).toBeNull();
  });

  it('gives 154B’s tax nature by residency', () => {
    const r = (resident: boolean) =>
      calculateWithholding({
        section: '154B',
        amount: 1000,
        atl: true,
        taxYear: 2027,
        resident,
      })?.taxNature;
    expect(r(true)).toBe('minimum');
    expect(r(false)).toBe('final');
  });
});

describe('banks (#94)', () => {
  it('ships only well-formed, unique Pakistani BICs, each with a source', () => {
    const banks = getBanks();
    const owner = new Map<string, string>();
    for (const b of banks) {
      if (b.swift === null) {
        expect(b.swiftSource).toBeNull();
        expect(b.swiftReason).toEqual(expect.any(String));
        continue;
      }
      // ISO 9362: 4 letters (bank), country PK, 2 letters or digits (location).
      expect(b.swift).toMatch(/^[A-Z]{4}PK[A-Z0-9]{2}$/);
      expect(['sbp', 'bank-site', 'directory']).toContain(
        b.swiftSource?.bicSource,
      );
      expect(b.swiftSource?.sourceUrl).toMatch(/^https?:\/\//);
      const bank = b.aliasOf ?? b.code;
      expect(owner.get(b.swift) ?? bank).toBe(bank);
      owner.set(b.swift, bank);
    }
    expect(banks.filter((b) => b.website).length).toBe(47);
    const by = (s: string) =>
      banks.filter((b) => b.swiftSource?.bicSource === s).length;
    expect([by('sbp') + by('bank-site'), by('directory')]).toEqual([16, 17]);
    expect(getBankInfo('FAYS')?.swiftSource).toMatchObject({
      bicSource: 'directory',
      sourceUrl: 'https://wise.com/us/swift-codes/FAYSPKKAXXX',
    });
    expect(getBankInfo('SADA')?.swift).toBeNull();
    expect(getBankInfo('NIBP')).toMatchObject({
      status: 'merged',
      mergedInto: 'MUCB',
      website: null,
    });
    expect(getBankInfo('SMES')?.status).toBe('liquidated');
  });
});

describe('population', () => {
  it('returns census figures, and null for districts created later', () => {
    expect(getDistrictPopulation('lahore')).toMatchObject({
      population: 13004135,
      census: 2023,
      boundaryChanged: false,
    });
    expect(getDistrictPopulation('Murree')).toMatchObject({
      population: null,
      censusDistrict: 'Rawalpindi',
    });
    expect(getDistrictPopulation('Rawalpindi')?.boundaryChanged).toBe(true);
    expect(getDistrictPopulation('Astore')?.population).toBeNull();
    expect(getTehsilPopulation('Murree')?.population).toBe(252526);
    expect(getDistrictPopulation('Nowhere')).toBeNull();
  });
});

describe('FBR sale types', () => {
  it('lists the specification’s sale types', () => {
    expect(getSaleTypes()).toHaveLength(24);
    expect(getSaleTypes()[0]?.saleType).toBe(
      'Goods at Standard Rate (default)',
    );
  });
});

describe('findCNICs acrossLines (#88)', () => {
  it('joins across one line break, never across a blank line', () => {
    expect(findCNICs('35202\n1234567\n1', { acrossLines: true })).toHaveLength(
      1,
    );
    expect(findCNICs('35202\n1234567\n1')).toHaveLength(0);
    expect(
      findCNICs('35202\n\n1234567\n\n1', { acrossLines: true }),
    ).toHaveLength(0);
    expect(maskCNICs('35202\n1234567\n1', { acrossLines: true }).text).toBe(
      'XXXXX\nXXXXXXX\nX',
    );
    expect(
      maskCNICs('Us ka CNIC\n35202\n1234567\n1\nhai', {
        replacement: '[CNIC removed]',
        acrossLines: true,
      }).text,
    ).toBe('Us ka CNIC\n[CNIC removed]\nhai');
  });
});
