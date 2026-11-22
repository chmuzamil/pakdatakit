/**
 * FBR Digital Invoicing (DI): types for the invoice JSON that is posted to
 * PRAL's gateway, a builder that works out the sales tax, and an offline
 * validator for the rules that can be checked without FBR's reference APIs.
 *
 * Built from PRAL's "Technical Specification for DI API", version 1.12
 * (last updated 24 July 2025), and PRAL's "Error Message Guide (Sales)"; see
 * DATA.md. Nothing here talks to FBR: there is no HTTP client and no token
 * handling. Values that only FBR's reference APIs can confirm (provinces, HS
 * codes, units, rates, sale types, SRO numbers) are checked for presence,
 * not against FBR's lists, unless the app passes the lists it synced from
 * those APIs (`validateFbrInvoice(invoice, { reference })`).
 */
import saleTypesData from '../data/fbr-sale-types.json';
import { divideHalfUp, fromPaisa, toUnits } from './internal/money.js';
import { normalizeKey } from './internal/normalize.js';
import { calculateSalesTax } from './salestax.js';

/** Version of PRAL's technical specification this module follows. */
export const FBR_DI_SPEC_VERSION = '1.12';

/** `invoiceType` values in the specification. */
export type FbrInvoiceType = 'Sale Invoice' | 'Debit Note';

/** `buyerRegistrationType` values in the specification. */
export type FbrRegistrationType = 'Registered' | 'Unregistered';

/** One line of an invoice (spec §4.1, `items`). Amounts are in rupees. */
export interface FbrInvoiceItem {
  /** HS code, e.g. `0101.2100`. */
  hsCode: string;
  productDescription: string;
  /** Rate as FBR's SaleTypeToRate API describes it: `18%`, `Rs.3`, `Exempt` … */
  rate: string;
  /** Unit of measure as in FBR's UoM API, e.g. `Numbers, pieces, units`. */
  uoM: string;
  /** Up to 4 decimals. */
  quantity: number;
  /** "Total Sales Value (Including Tax)". FBR's own samples send 0. */
  totalValues: number;
  valueSalesExcludingST: number;
  /** Notified or retail price; required for Third Schedule goods. */
  fixedNotifiedValueOrRetailPrice: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax?: number;
  furtherTax?: number;
  /** Required when the rate is not 18% (error 0077). */
  sroScheduleNo?: string;
  fedPayable?: number;
  discount?: number;
  /** Sale type as in FBR's transaction type API, e.g. `Goods at standard rate (default)`. */
  saleType: string;
  /** Required when `sroScheduleNo` is given (error 0078). */
  sroItemSerialNo?: string;
}

/** The invoice body for `postinvoicedata` and `validateinvoicedata` (spec §4.1, §4.2). */
export interface FbrInvoice {
  invoiceType: FbrInvoiceType;
  /** `YYYY-MM-DD`. */
  invoiceDate: string;
  /** 7-digit NTN or 13-digit CNIC. */
  sellerNTNCNIC: string;
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
  /** 7-digit NTN or 13-digit CNIC; may be empty for an unregistered buyer. */
  buyerNTNCNIC: string;
  buyerBusinessName: string;
  buyerProvince: string;
  buyerAddress: string;
  buyerRegistrationType: FbrRegistrationType;
  /** FBR invoice number of the original invoice; required for a debit note. */
  invoiceRefNo: string;
  /** Sandbox only: `SN001` to `SN028`. */
  scenarioId?: string;
  items: FbrInvoiceItem[];
}

/** An item for {@link buildFbrInvoice}: the tax may be left out. */
export type FbrInvoiceItemInput = Omit<
  FbrInvoiceItem,
  | 'salesTaxApplicable'
  | 'salesTaxWithheldAtSource'
  | 'totalValues'
  | 'fixedNotifiedValueOrRetailPrice'
> & {
  salesTaxApplicable?: number;
  salesTaxWithheldAtSource?: number;
  totalValues?: number;
  fixedNotifiedValueOrRetailPrice?: number;
};

/** Input for {@link buildFbrInvoice}. */
export type FbrInvoiceInput = Omit<
  FbrInvoice,
  'items' | 'invoiceRefNo' | 'buyerNTNCNIC'
> & {
  invoiceRefNo?: string;
  buyerNTNCNIC?: string;
  items: FbrInvoiceItemInput[];
};

/** Column totals of an invoice, in rupees. Not sent to FBR. */
export interface FbrInvoiceTotals {
  quantity: number;
  valueSalesExcludingST: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax: number;
  furtherTax: number;
  fedPayable: number;
  discount: number;
}

/** Result of {@link buildFbrInvoice}. */
export interface FbrInvoiceBuild {
  invoice: FbrInvoice;
  totals: FbrInvoiceTotals;
}

/** One problem found by {@link validateFbrInvoice}. */
export interface FbrInvoiceError {
  /**
   * FBR's error code (spec §7 and the Error Message Guide), or `null` for a
   * required field the specification gives no code for.
   */
  code: string | null;
  /** Where: `invoiceDate`, `items[0].rate` … */
  field: string;
  message: string;
}

/** Result of {@link validateFbrInvoice}. */
export interface FbrInvoiceValidation {
  valid: boolean;
  errors: FbrInvoiceError[];
}

/**
 * Reference lists from FBR's own APIs (PRAL's `/pdi/v1/provinces`,
 * `/pdi/v1/uom`, `/pdi/v2/HS_UOM`, sale types from `/pdi/v2/SaleTypeToRate`
 * …), which an app syncs with its token. FBR's APIs are authoritative; this
 * library ships no copy of these lists.
 */
export interface FbrInvoiceReference {
  /** Province names as FBR lists them, e.g. `['PUNJAB', 'SINDH', …]`. */
  provinces?: string[];
  /** Sale type descriptions as FBR lists them. */
  saleTypes?: string[];
  /** Unit of measure descriptions as FBR lists them. */
  uoms?: string[];
  /**
   * The units allowed for each HS code, as FBR's HS_UOM API returns them:
   * `{ '0101.2100': ['Numbers, pieces, units'] }`.
   */
  hsUom?: Record<string, string[]>;
}

/** Options for {@link validateFbrInvoice}. */
export interface FbrInvoiceValidationOptions {
  /** Today as `YYYY-MM-DD`, to reject invoices dated later (error 0043). Not checked when left out. */
  today?: string;
  /**
   * Lists synced from FBR's reference APIs. Each list given is checked:
   * provinces (0073, 0074), sale types (0013), units (0099) and, with
   * `hsUom`, that the HS code is listed and the unit is allowed for it
   * (0099). Lists left out are not checked.
   */
  reference?: FbrInvoiceReference;
}

/** A sale type as PRAL's specification names it, with its sandbox scenarios. */
export interface FbrSaleType {
  saleType: string;
  /** The specification's sandbox scenarios (SN001-SN028) that use it. */
  scenarioIds: string[];
}

/**
 * The sale types named in PRAL's DI specification (v1.12, section 9,
 * "Scenarios for Sandbox Testing"), with the scenarios that use each. FBR's
 * full, current list comes from its reference API; this is a convenience
 * for building forms and tests, and `validateFbrInvoice` does not reject a
 * sale type that is not in it.
 *
 * @example
 * getSaleTypes()[0]; // { saleType: 'Goods at Standard Rate (default)', scenarioIds: ['SN001', 'SN002', 'SN026'] }
 */
export function getSaleTypes(): FbrSaleType[] {
  return (saleTypesData as FbrSaleType[]).map((t) => ({
    saleType: t.saleType,
    scenarioIds: [...t.scenarioIds],
  }));
}

/** A reference list as a set of normalized keys, or `null` if not given as a list of strings. */
function keySet(list: unknown): Set<string> | null {
  if (!Array.isArray(list)) return null;
  return new Set(
    list.filter((v): v is string => typeof v === 'string').map(normalizeKey),
  );
}

const INVOICE_TYPES = new Set(['Sale Invoice', 'Debit Note']);
const REGISTRATION_TYPES = new Set(['Registered', 'Unregistered']);
const NTN_OR_CNIC = /^(?:\d{7}|\d{13})$/;
/** An FBR invoice number: the seller's NTN (7) or CNIC (13), "DI", 13 digits. */
const FBR_INVOICE_NUMBER = /^(?:\d{7}|\d{13})DI\d{13}$/;
const SCENARIO = /^SN0(?:0[1-9]|1\d|2[0-8])$/;
const PERCENT_RATE = /^(\d+(?:\.\d+)?)%$/;
const PER_UNIT_RATE = /^rs\.?\s*(\d+(?:\.\d+)?)$/i;

const isText = (value: unknown): value is string => typeof value === 'string';
const filled = (value: unknown): boolean =>
  isText(value) && value.trim().length > 0;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const saleTypeKey = (value: unknown): string =>
  isText(value) ? normalizeKey(value) : '';

/** Decimal places in a number's shortest decimal form, or `null` if not finite. */
function decimalPlaces(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const match = /^-?\d+(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(value));
  if (!match) return null;
  const places = (match[1] ?? '').length - Number(match[2] ?? '0');
  return places > 0 ? places : 0;
}

/**
 * The sales tax FBR expects on a line, in rupees, or `null` when the rate is
 * not a plain percentage or per-unit amount (spec §7, errors 0102, 0104,
 * 0105):
 *
 * - `N%` on Third Schedule goods: retail price × rate (0102);
 * - `N%` otherwise: value excluding sales tax × rate (0104);
 * - `Rs.N`: quantity × N (0105).
 *
 * Rounded half up to the paisa (the specification allows 2 decimals and
 * gives no rounding rule).
 */
export function expectedSalesTax(item: {
  rate: string;
  saleType?: string;
  quantity?: number;
  valueSalesExcludingST?: number;
  fixedNotifiedValueOrRetailPrice?: number;
}): number | null {
  if (!isObject(item) || !isText(item.rate)) return null;
  const rate = item.rate.trim();
  const percent = PERCENT_RATE.exec(rate);
  if (percent) {
    const base =
      saleTypeKey(item.saleType) === '3rd schedule goods'
        ? item.fixedNotifiedValueOrRetailPrice
        : item.valueSalesExcludingST;
    if (typeof base !== 'number') return null;
    return calculateSalesTax(base, { rate: Number(percent[1]) })?.tax ?? null;
  }
  const perUnit = PER_UNIT_RATE.exec(rate);
  if (perUnit) {
    if (typeof item.quantity !== 'number') return null;
    const quantity = toUnits(item.quantity, 4);
    const price = toUnits(Number(perUnit[1]), 2);
    if (quantity === null || price === null) return null;
    return fromPaisa(divideHalfUp(BigInt(quantity) * BigInt(price), 10000n));
  }
  return null;
}

const NUMBER_FIELDS = [
  'quantity',
  'valueSalesExcludingST',
  'salesTaxApplicable',
  'salesTaxWithheldAtSource',
  'extraTax',
  'furtherTax',
  'fedPayable',
  'discount',
] as const;

/** Adds up a column in paisa (quantity in ten-thousandths) so the sum is exact. */
function columnTotal(
  items: FbrInvoiceItem[],
  key: (typeof NUMBER_FIELDS)[number],
): number {
  const scale = key === 'quantity' ? 4 : 2;
  let sum = 0;
  for (const item of items) {
    const value = item[key];
    if (typeof value !== 'number') continue;
    const units = toUnits(value, scale);
    if (units !== null) sum += units;
  }
  return sum / (scale === 4 ? 10000 : 100);
}

/**
 * Builds an FBR digital invoice from your own fields, working out
 * `salesTaxApplicable` on each line where you leave it out (see
 * {@link expectedSalesTax}; uses `calculateSalesTax`). Lines with a rate
 * that is neither `N%` nor `Rs.N` (`Exempt`, combined rates) get 0 unless you
 * give the tax.
 *
 * `salesTaxWithheldAtSource`, `totalValues` and
 * `fixedNotifiedValueOrRetailPrice` default to 0, and `invoiceRefNo` and
 * `buyerNTNCNIC` to `""`, as in FBR's samples. Nothing else is filled in or
 * changed; check the result with {@link validateFbrInvoice}.
 *
 * Also returns column totals, which are for your own records: the
 * specification has no invoice-level totals.
 *
 * @returns The invoice and totals, or `null` if `input` is not an object
 *   with an `items` array. Never throws.
 */
export function buildFbrInvoice(
  input: FbrInvoiceInput,
): FbrInvoiceBuild | null {
  if (!isObject(input) || !Array.isArray(input.items)) return null;
  const items: FbrInvoiceItem[] = [];
  for (const raw of input.items as unknown[]) {
    if (!isObject(raw)) return null;
    const line = raw as FbrInvoiceItemInput;
    const item = {
      ...line,
      totalValues: line.totalValues ?? 0,
      fixedNotifiedValueOrRetailPrice:
        line.fixedNotifiedValueOrRetailPrice ?? 0,
      salesTaxWithheldAtSource: line.salesTaxWithheldAtSource ?? 0,
    } as FbrInvoiceItem;
    item.salesTaxApplicable =
      line.salesTaxApplicable ?? expectedSalesTax(item) ?? 0;
    items.push(item);
  }
  const invoice: FbrInvoice = {
    ...(input as FbrInvoice),
    buyerNTNCNIC: input.buyerNTNCNIC ?? '',
    invoiceRefNo: input.invoiceRefNo ?? '',
    items,
  };
  const totals = Object.fromEntries(
    NUMBER_FIELDS.map((key) => [key, columnTotal(items, key)]),
  ) as unknown as FbrInvoiceTotals;
  return { invoice, totals };
}

function validDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return m >= 1 && m <= 12 && d >= 1 && d <= (days[m - 1] as number);
}

/**
 * Checks an FBR digital invoice against the rules of PRAL's specification
 * (v1.12) and Error Message Guide that need no call to FBR, and returns every
 * problem with FBR's error code.
 *
 * Checked: invoice type (0003, 0011), date format (0005, 0042, 0113) and,
 * with `options.today`, a future date (0043); seller and buyer NTN/CNIC
 * (0401, 0402, 0009), self-invoicing (0058), names, provinces (0073, 0074),
 * addresses, buyer registration type (0012), the reference number of a debit
 * note (0026), the sandbox scenario, and on each line: HS code (0044), rate
 * (0020), unit, sale type (0013), required and valid amounts (0021, 0023,
 * 0024, 0098, 0300, 0302), SRO schedule and serial (0077, 0078), Third
 * Schedule retail price (0090), extra tax on reduced-rate goods (0091) and
 * the sales tax arithmetic (0102, 0104, 0105, to within one paisa).
 *
 * Not checked, because they need FBR's data: registration status, whether a
 * province, HS code, unit, rate, sale type or SRO is in FBR's lists or fits
 * the others, and the original invoice of a debit note. Pass the lists your
 * app syncs from FBR's reference APIs as `options.reference` to check
 * provinces, sale types, units and HS code/unit pairs against them; FBR's
 * APIs are authoritative.
 *
 * @returns `{ valid, errors }`. Never throws.
 */
export function validateFbrInvoice(
  invoice: FbrInvoice,
  options: FbrInvoiceValidationOptions = {},
): FbrInvoiceValidation {
  const errors: FbrInvoiceError[] = [];
  const add = (code: string | null, field: string, message: string) =>
    errors.push({ code, field, message });
  if (!isObject(invoice)) {
    add(null, 'invoice', 'The invoice must be an object');
    return { valid: false, errors };
  }
  const inv = invoice as unknown as Record<string, unknown>;

  // Invoice type
  if (!filled(inv.invoiceType)) {
    add('0011', 'invoiceType', 'Invoice type is empty');
  } else if (!INVOICE_TYPES.has(inv.invoiceType as string)) {
    add(
      '0003',
      'invoiceType',
      'Invoice type must be "Sale Invoice" or "Debit Note"',
    );
  }

  // Date
  if (!filled(inv.invoiceDate)) {
    add('0042', 'invoiceDate', 'Invoice date is empty');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(inv.invoiceDate as string)) {
    add('0005', 'invoiceDate', 'Invoice date must be in YYYY-MM-DD format');
  } else if (!validDate(inv.invoiceDate as string)) {
    add('0113', 'invoiceDate', 'Invoice date is not a valid date');
  } else if (
    isText(options?.today) &&
    validDate(options.today) &&
    (inv.invoiceDate as string) > options.today
  ) {
    add('0043', 'invoiceDate', 'Invoice date is later than today');
  }

  // Seller
  if (!isText(inv.sellerNTNCNIC) || !NTN_OR_CNIC.test(inv.sellerNTNCNIC)) {
    add('0401', 'sellerNTNCNIC', 'Seller NTN or CNIC must be 7 or 13 digits');
  }
  if (!filled(inv.sellerBusinessName)) {
    add(null, 'sellerBusinessName', 'Seller business name is required');
  }
  if (!filled(inv.sellerProvince)) {
    add('0073', 'sellerProvince', 'Seller province is empty');
  }
  if (!filled(inv.sellerAddress)) {
    add(null, 'sellerAddress', 'Seller address is required');
  }

  // Buyer
  const registration = inv.buyerRegistrationType;
  if (!isText(registration) || !REGISTRATION_TYPES.has(registration)) {
    add(
      '0012',
      'buyerRegistrationType',
      'Buyer registration type must be "Registered" or "Unregistered"',
    );
  }
  const buyerId = inv.buyerNTNCNIC;
  if (!filled(buyerId)) {
    if (registration !== 'Unregistered') {
      add('0009', 'buyerNTNCNIC', 'Buyer NTN or CNIC is empty');
    }
  } else if (!NTN_OR_CNIC.test(buyerId as string)) {
    add('0402', 'buyerNTNCNIC', 'Buyer NTN or CNIC must be 7 or 13 digits');
  } else if (buyerId === inv.sellerNTNCNIC) {
    add(
      '0058',
      'buyerNTNCNIC',
      'Buyer and seller must be different (self-invoicing is not allowed)',
    );
  }
  if (!filled(inv.buyerBusinessName)) {
    add('0010', 'buyerBusinessName', 'Buyer business name is empty');
  }
  if (!filled(inv.buyerProvince)) {
    add('0074', 'buyerProvince', 'Buyer province is empty');
  }
  if (!filled(inv.buyerAddress)) {
    add(null, 'buyerAddress', 'Buyer address is required');
  }

  // Reference number and scenario
  if (filled(inv.invoiceRefNo)) {
    if (!FBR_INVOICE_NUMBER.test((inv.invoiceRefNo as string).trim())) {
      add(
        null,
        'invoiceRefNo',
        'Invoice reference number must be an FBR invoice number (NTN or CNIC, "DI", 13 digits)',
      );
    }
  } else if (inv.invoiceType === 'Debit Note') {
    add(
      '0026',
      'invoiceRefNo',
      'Invoice reference number is required for a debit note',
    );
  }
  if (
    inv.scenarioId !== undefined &&
    inv.scenarioId !== null &&
    inv.scenarioId !== ''
  ) {
    if (!isText(inv.scenarioId) || !SCENARIO.test(inv.scenarioId)) {
      add(null, 'scenarioId', 'Scenario ID must be SN001 to SN028');
    }
  }

  // Reference lists synced from FBR's APIs (options.reference), if given.
  const reference = isObject(options?.reference)
    ? (options.reference as FbrInvoiceReference)
    : {};
  const provinces = keySet(reference.provinces);
  if (provinces) {
    for (const [field, code, who] of [
      ['sellerProvince', '0073', 'Seller'],
      ['buyerProvince', '0074', 'Buyer'],
    ] as const) {
      const value = inv[field];
      if (filled(value) && !provinces.has(normalizeKey(value as string))) {
        add(code, field, `${who} province is not in FBR's province list`);
      }
    }
  }

  // Items
  if (!Array.isArray(inv.items) || inv.items.length === 0) {
    add(null, 'items', 'The invoice needs at least one item');
    return { valid: errors.length === 0, errors };
  }
  (inv.items as unknown[]).forEach((raw, index) => {
    const at = (key: string) => `items[${index}].${key}`;
    if (!isObject(raw)) {
      add(null, `items[${index}]`, 'Each item must be an object');
      return;
    }
    const item = raw;
    if (!filled(item.hsCode)) add('0044', at('hsCode'), 'HS code is empty');
    if (!isText(item.productDescription)) {
      add(null, at('productDescription'), 'Product description is required');
    }
    if (!filled(item.rate)) add('0020', at('rate'), 'Rate is empty');
    if (!filled(item.uoM)) add(null, at('uoM'), 'Unit of measure is required');
    if (!filled(item.saleType))
      add('0013', at('saleType'), 'Sale type is empty');

    const missingCodes: Record<string, string | null> = {
      quantity: '0098',
      valueSalesExcludingST: '0021',
      salesTaxApplicable: '0023',
      salesTaxWithheldAtSource: '0024',
      totalValues: null,
      fixedNotifiedValueOrRetailPrice: null,
    };
    const numbersOk: Record<string, boolean> = {};
    for (const key of [
      ...Object.keys(missingCodes),
      'extraTax',
      'furtherTax',
      'fedPayable',
      'discount',
    ]) {
      const value = item[key];
      const required = key in missingCodes;
      if (
        value === undefined ||
        value === null ||
        (!required && value === '')
      ) {
        if (required) {
          add(missingCodes[key] ?? null, at(key), `${key} is required`);
        }
        continue;
      }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        add('0300', at(key), `${key} must be a number, not negative`);
        continue;
      }
      const places = decimalPlaces(value) as number;
      const limit = key === 'quantity' ? 4 : 2;
      if (places > limit) {
        add('0302', at(key), `${key} has more than ${limit} decimal places`);
        continue;
      }
      numbersOk[key] = true;
    }

    const rate = isText(item.rate) ? item.rate.trim() : '';
    if (filled(item.rate) && rate !== '18%' && !filled(item.sroScheduleNo)) {
      add(
        '0077',
        at('sroScheduleNo'),
        'SRO/schedule number is required when the rate is not 18%',
      );
    }
    if (filled(item.sroScheduleNo) && !filled(item.sroItemSerialNo)) {
      add(
        '0078',
        at('sroItemSerialNo'),
        'Item serial number is required when an SRO/schedule number is given',
      );
    }
    const saleType = saleTypeKey(item.saleType);
    if (
      saleType === '3rd schedule goods' &&
      numbersOk.fixedNotifiedValueOrRetailPrice === true &&
      item.fixedNotifiedValueOrRetailPrice === 0
    ) {
      add(
        '0090',
        at('fixedNotifiedValueOrRetailPrice'),
        'Retail price is required for Third Schedule goods',
      );
    }
    if (
      saleType === 'goods at reduced rate' &&
      item.extraTax !== undefined &&
      item.extraTax !== null &&
      item.extraTax !== ''
    ) {
      add(
        '0091',
        at('extraTax'),
        'Extra tax must be empty for goods at a reduced rate',
      );
    }

    // Sales tax arithmetic
    if (numbersOk.salesTaxApplicable === true) {
      const percent = PERCENT_RATE.test(rate);
      const perUnit = PER_UNIT_RATE.test(rate);
      const baseKey = perUnit
        ? 'quantity'
        : saleType === '3rd schedule goods'
          ? 'fixedNotifiedValueOrRetailPrice'
          : 'valueSalesExcludingST';
      if ((percent || perUnit) && numbersOk[baseKey] === true) {
        const expected = expectedSalesTax(item as unknown as FbrInvoiceItem);
        if (expected !== null) {
          const actual = toUnits(item.salesTaxApplicable as number, 2);
          const wanted = toUnits(expected, 2);
          if (
            actual !== null &&
            wanted !== null &&
            Math.abs(actual - wanted) > 1
          ) {
            const code = perUnit
              ? '0105'
              : saleType === '3rd schedule goods'
                ? '0102'
                : '0104';
            add(
              code,
              at('salesTaxApplicable'),
              `Sales tax should be ${expected.toFixed(2)} for this rate`,
            );
          }
        }
      }
    }
  });

  const saleTypes = keySet(reference.saleTypes);
  const uoms = keySet(reference.uoms);
  const hsUom = isObject(reference.hsUom)
    ? new Map(
        Object.entries(reference.hsUom).map(([hs, units]) => [
          normalizeKey(hs),
          keySet(units) ?? new Set<string>(),
        ]),
      )
    : null;
  if (saleTypes || uoms || hsUom) {
    (inv.items as unknown[]).forEach((raw, index) => {
      if (!isObject(raw)) return;
      const at = (key: string) => `items[${index}].${key}`;
      if (
        saleTypes &&
        filled(raw.saleType) &&
        !saleTypes.has(normalizeKey(raw.saleType as string))
      ) {
        add('0013', at('saleType'), "Sale type is not in FBR's sale type list");
      }
      const unit = filled(raw.uoM) ? normalizeKey(raw.uoM as string) : null;
      if (uoms && unit !== null && !uoms.has(unit)) {
        add('0099', at('uoM'), "Unit of measure is not in FBR's unit list");
      }
      if (hsUom && filled(raw.hsCode)) {
        const allowed = hsUom.get(normalizeKey(raw.hsCode as string));
        if (!allowed) {
          add(null, at('hsCode'), "HS code is not in FBR's HS code list");
        } else if (unit !== null && !allowed.has(unit)) {
          add(
            '0099',
            at('uoM'),
            'Unit of measure is not allowed for this HS code',
          );
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
