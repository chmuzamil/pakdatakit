import { describe, expect, it } from 'vitest';
import {
  buildFbrInvoice,
  expectedSalesTax,
  FBR_DI_SPEC_VERSION,
  validateFbrInvoice,
  type FbrInvoice,
  type FbrInvoiceInput,
} from '../src/fbr-invoice.js';

const input: FbrInvoiceInput = {
  invoiceType: 'Sale Invoice',
  invoiceDate: '2025-04-21',
  sellerNTNCNIC: '1234567',
  sellerBusinessName: 'Example Traders',
  sellerProvince: 'Sindh',
  sellerAddress: 'Karachi',
  buyerNTNCNIC: '7654321',
  buyerBusinessName: 'Example Buyer',
  buyerProvince: 'Punjab',
  buyerAddress: 'Lahore',
  buyerRegistrationType: 'Registered',
  scenarioId: 'SN001',
  items: [
    {
      hsCode: '0101.2100',
      productDescription: 'Horses',
      rate: '18%',
      uoM: 'Numbers, pieces, units',
      quantity: 1,
      valueSalesExcludingST: 1000,
      saleType: 'Goods at standard rate (default)',
    },
    {
      hsCode: '0101.2100',
      productDescription: 'Horses',
      rate: '18%',
      uoM: 'Numbers, pieces, units',
      quantity: 2,
      valueSalesExcludingST: 1234,
      saleType: 'Goods at standard rate (default)',
    },
  ],
};

const valid = (): FbrInvoice => {
  const built = buildFbrInvoice(input);
  if (built === null) throw new Error('build failed');
  return structuredClone(built.invoice);
};

describe('buildFbrInvoice', () => {
  it('works out the sales tax and fills FBR’s defaults', () => {
    const built = buildFbrInvoice(input);
    expect(built?.invoice.items.map((i) => i.salesTaxApplicable)).toEqual([
      180, 222.12,
    ]);
    expect(built?.invoice.items[0]).toMatchObject({
      totalValues: 0,
      fixedNotifiedValueOrRetailPrice: 0,
      salesTaxWithheldAtSource: 0,
    });
    expect(built?.invoice.invoiceRefNo).toBe('');
    expect(built?.totals).toEqual({
      quantity: 3,
      valueSalesExcludingST: 2234,
      salesTaxApplicable: 402.12,
      salesTaxWithheldAtSource: 0,
      extraTax: 0,
      furtherTax: 0,
      fedPayable: 0,
      discount: 0,
    });
    expect(validateFbrInvoice(built!.invoice)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('keeps a tax you give and handles per-unit and Third Schedule rates', () => {
    expect(expectedSalesTax({ rate: 'Rs.3', quantity: 12 })).toBe(36);
    expect(
      expectedSalesTax({
        rate: '18%',
        saleType: '3rd Schedule Goods',
        valueSalesExcludingST: 0,
        fixedNotifiedValueOrRetailPrice: 100,
      }),
    ).toBe(18);
    expect(expectedSalesTax({ rate: 'Exempt' })).toBeNull();
    expect(
      expectedSalesTax({ rate: '1.43%', valueSalesExcludingST: 100 }),
    ).toBe(1.43);
    const built = buildFbrInvoice({
      ...input,
      items: [{ ...input.items[0]!, salesTaxApplicable: 7, rate: 'Exempt' }],
    });
    expect(built?.invoice.items[0]?.salesTaxApplicable).toBe(7);
  });

  it('returns null for input it cannot build from', () => {
    expect(buildFbrInvoice(null as unknown as FbrInvoiceInput)).toBeNull();
    expect(
      buildFbrInvoice({ ...input, items: 'x' } as unknown as FbrInvoiceInput),
    ).toBeNull();
  });
});

describe('validateFbrInvoice', () => {
  it('records the spec version', () => {
    expect(FBR_DI_SPEC_VERSION).toBe('1.12');
  });

  const codes = (invoice: unknown, options?: { today?: string }) =>
    validateFbrInvoice(invoice as FbrInvoice, options).errors.map(
      (e) => `${e.code}:${e.field}`,
    );

  it('checks the header', () => {
    const inv = valid();
    inv.invoiceType = 'Sales Invoice' as 'Sale Invoice';
    inv.invoiceDate = '21-04-2025';
    inv.sellerNTNCNIC = '12345-6789012-3';
    inv.buyerRegistrationType = 'registered' as 'Registered';
    inv.buyerProvince = ' ';
    expect(codes(inv)).toEqual([
      '0003:invoiceType',
      '0005:invoiceDate',
      '0401:sellerNTNCNIC',
      '0012:buyerRegistrationType',
      '0074:buyerProvince',
    ]);
  });

  it('checks dates, the buyer and debit notes', () => {
    const inv = valid();
    inv.invoiceDate = '2025-02-30';
    expect(codes(inv)).toEqual(['0113:invoiceDate']);
    inv.invoiceDate = '2027-01-01';
    expect(codes(inv, { today: '2026-11-18' })).toEqual(['0043:invoiceDate']);
    expect(codes(inv)).toEqual([]);

    const self = valid();
    self.buyerNTNCNIC = self.sellerNTNCNIC;
    expect(codes(self)).toEqual(['0058:buyerNTNCNIC']);

    const unregistered = valid();
    unregistered.buyerRegistrationType = 'Unregistered';
    unregistered.buyerNTNCNIC = '';
    expect(codes(unregistered)).toEqual([]);
    unregistered.buyerRegistrationType = 'Registered';
    expect(codes(unregistered)).toEqual(['0009:buyerNTNCNIC']);

    const note = valid();
    note.invoiceType = 'Debit Note';
    expect(codes(note)).toEqual(['0026:invoiceRefNo']);
    note.invoiceRefNo = '7327556DI1744111990654';
    expect(codes(note)).toEqual([]);
    note.invoiceRefNo = '7327556-1744111990654';
    expect(codes(note)).toEqual(['null:invoiceRefNo']);
  });

  it('checks items, amounts and the tax arithmetic', () => {
    const inv = valid();
    const item = inv.items[0]!;
    item.rate = '17%';
    item.quantity = 1.23456;
    item.discount = -1;
    expect(codes(inv)).toEqual([
      '0302:items[0].quantity',
      '0300:items[0].discount',
      '0077:items[0].sroScheduleNo',
      '0104:items[0].salesTaxApplicable',
    ]);
    expect(
      validateFbrInvoice(inv).errors.find((e) => e.code === '0104')?.message,
    ).toBe('Sales tax should be 170.00 for this rate');
  });

  it('allows one paisa either way', () => {
    const inv = valid();
    inv.items[0]!.salesTaxApplicable = 180.01;
    expect(codes(inv)).toEqual([]);
    inv.items[0]!.salesTaxApplicable = 180.02;
    expect(codes(inv)).toEqual(['0104:items[0].salesTaxApplicable']);
  });

  it('never throws', () => {
    for (const value of [null, undefined, 1, 'x', [], { items: [null] }]) {
      expect(validateFbrInvoice(value as unknown as FbrInvoice).valid).toBe(
        false,
      );
    }
    expect(
      validateFbrInvoice(valid(), null as unknown as { today?: string }).valid,
    ).toBe(true);
  });
});
