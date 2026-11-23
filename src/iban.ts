import banksData from '../data/banks.json';
import { lazy, stripSeparators } from './internal/normalize.js';

const PK_IBAN_PATTERN = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/;

/** Kind of institution, following the State Bank of Pakistan's grouping. */
export type BankType =
  | 'commercial'
  | 'public-sector'
  | 'islamic'
  | 'microfinance'
  | 'digital'
  | 'emi'
  | 'foreign'
  | 'specialized'
  | 'central';

/** A bank (or other institution) that issues Pakistani IBANs. */
export interface BankInfo {
  /** 4-letter IBAN bank code (characters 5–8 of the IBAN). */
  code: string;
  name: string;
  /**
   * `commercial` (a private commercial bank), `public-sector` (a public
   * sector commercial bank, such as National Bank of Pakistan), `islamic`
   * (full-fledged Islamic bank), `microfinance`, `digital` (digital retail
   * bank), `emi` (electronic money institution such as a wallet), `foreign`
   * (branch of a foreign bank), `specialized` or `central` (State Bank of
   * Pakistan). The groups are the State Bank's.
   */
  type: BankType;
  /** `false` for banks that merged into another or have closed. */
  active: boolean;
  /** Code of the bank this one merged into, if it no longer exists. */
  mergedInto: string | null;
  /** Main code of the same bank, when this is an older code still in use. */
  aliasOf: string | null;
  /** `active`, `merged` (see `mergedInto`) or `liquidated`. */
  status: 'active' | 'merged' | 'liquidated';
  /**
   * The institution's official website (from SBP's lists of regulated
   * institutions, or its own site where SBP lists none or an old domain),
   * or `null` for a bank that no longer exists.
   */
  website: string | null;
  /** What SBP's list gives, where it differs from `website` (an older domain). */
  websiteSbpListed: string | null;
  /**
   * The 8-character SWIFT/BIC code, only where SBP or the institution's own
   * website prints it; otherwise `null` (see `swiftReason`).
   */
  swift: string | null;
  /** Where `swift` is printed, and when it was checked. */
  swiftSource: BankSwiftSource | null;
  /** Why `swift` is `null`, or `null` when it is set. */
  swiftReason: string | null;
}

/** Where a bank's SWIFT/BIC code is printed. */
export interface BankSwiftSource {
  /** `sbp` (State Bank of Pakistan) or `bank-site` (the institution's own domain). */
  bicSource: 'sbp' | 'bank-site';
  /** The code as printed, e.g. `HABBPKKAXXX` or `MEZN PK KA`. */
  printed: string;
  sourceUrl: string;
  /** The PDF page, or `null` for a web page. */
  page: number | null;
  /** When the source was checked (YYYY-MM-DD). */
  checkedAt: string;
}

interface BankEntry {
  code: string;
  name: string;
  type: BankType;
  mergedInto?: string;
  active?: boolean;
  aliasOf?: string;
  status: BankInfo['status'];
  website: string | null;
  websiteSbpListed: string | null;
  swift: string | null;
  swiftSource: BankSwiftSource | null;
  swiftReason: string | null;
}

const banks = /* @__PURE__ */ lazy((): BankInfo[] =>
  (banksData as BankEntry[]).map((entry) => ({
    code: entry.code,
    name: entry.name,
    type: entry.type,
    active: entry.mergedInto === undefined && entry.active !== false,
    mergedInto: entry.mergedInto ?? null,
    aliasOf: entry.aliasOf ?? null,
    status: entry.status,
    website: entry.website,
    websiteSbpListed: entry.websiteSbpListed,
    swift: entry.swift,
    swiftSource: entry.swiftSource ? { ...entry.swiftSource } : null,
    swiftReason: entry.swiftReason,
  })),
);

/** A copy that callers may change without changing the shared data. */
function copyBank(bank: BankInfo | undefined): BankInfo | null {
  if (!bank) return null;
  return {
    ...bank,
    swiftSource: bank.swiftSource ? { ...bank.swiftSource } : null,
  };
}

const bankByCode = /* @__PURE__ */ lazy(
  () => new Map(banks().map((bank) => [bank.code, bank])),
);

/**
 * Expands IBAN letters to digits for mod-97 checksum (A=10 … Z=35).
 */
function expandIbanChars(value: string): string {
  return value.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString(),
  );
}

/**
 * Computes ISO 13616 mod-97 remainder for a numeric IBAN string.
 */
function mod97(numericIban: string): number {
  let remainder = 0;
  for (const digit of numericIban) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

/**
 * Normalizes an IBAN by removing separators and uppercasing.
 */
function normalizeIBAN(iban: string): string {
  return stripSeparators(iban).toUpperCase();
}

/**
 * Validates a Pakistani IBAN using format and ISO 13616 mod-97 checksum.
 *
 * Accepts spaced or unspaced input. Only `PK` IBANs of exactly 24 characters
 * are supported.
 *
 * @param iban - IBAN string to validate
 * @returns `true` if valid, otherwise `false`
 */
export function validateIBAN(iban: string): boolean {
  const normalized = normalizeIBAN(iban);

  if (!PK_IBAN_PATTERN.test(normalized)) {
    return false;
  }

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  return mod97(expandIbanChars(rearranged)) === 1;
}

/**
 * Returns the bank name for a valid Pakistani IBAN based on its 4-letter bank code.
 *
 * Returns `null` when the IBAN is invalid or the bank code is not in the dataset.
 *
 * @param iban - IBAN string to look up
 * @returns Bank name or `null` if not found
 */
export function getBankFromIBAN(iban: string): string | null {
  if (!validateIBAN(iban)) {
    return null;
  }

  return bankByCode().get(normalizeIBAN(iban).slice(4, 8))?.name ?? null;
}

/**
 * Returns details of the bank that issued an IBAN: name, type (commercial,
 * Islamic, microfinance, digital bank, wallet …) and whether it still exists.
 *
 * Also accepts a 4-letter bank code on its own.
 *
 * @example
 * getBankInfo('PK36SCBL0000001123456702');
 * // { code: 'SCBL', name: 'Standard Chartered Bank (Pakistan) Limited',
 * //   type: 'commercial', active: true, mergedInto: null, aliasOf: null,
 * //   status: 'active', website: 'https://www.sc.com/pk/',
 * //   websiteSbpListed: 'standardchartered.com.pk', swift: 'SCBLPKKX',
 * //   swiftSource: { bicSource: 'bank-site', … }, swiftReason: null }
 * getBankInfo('SADA')?.type; // 'emi'
 *
 * @param ibanOrCode - A valid Pakistani IBAN, or a bank code such as `MEZN`
 * @returns Bank details, or `null` if the IBAN is invalid or the code unknown
 */
export function getBankInfo(ibanOrCode: string): BankInfo | null {
  const value = normalizeIBAN(ibanOrCode);
  if (/^[A-Z]{4}$/.test(value)) {
    return copyBank(bankByCode().get(value));
  }
  if (!validateIBAN(value)) {
    return null;
  }
  return copyBank(bankByCode().get(value.slice(4, 8)));
}

/**
 * Lists every bank code in the dataset, sorted by code. Filter it for a
 * bank picker, e.g. `getBanks().filter((b) => b.active && !b.aliasOf)`.
 *
 * @returns All banks, including merged banks and older alias codes
 */
export function getBanks(): BankInfo[] {
  return banks().map((bank) => copyBank(bank) as BankInfo);
}
