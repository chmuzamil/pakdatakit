import banksData from '../data/banks.json';
import { stripSeparators } from './internal/normalize.js';

const PK_IBAN_PATTERN = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/;
const PK_IBAN_LENGTH = 24;

interface BankEntry {
  code: string;
  name: string;
}

const BANK_MAP = new Map<string, string>();

for (const entry of banksData as BankEntry[]) {
  BANK_MAP.set(entry.code, entry.name);
}

// Legacy IBAN bank codes that map to current SBP identifiers
const BANK_ALIASES: Record<string, string> = {
  NBPB: 'NBPA',
  MCBL: 'MUCB',
};

/**
 * Expands IBAN letters to digits for mod-97 checksum (A=10 … Z=35).
 */
function expandIbanChars(value: string): string {
  return value.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());
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
 * Normalizes an IBAN by removing spaces and uppercasing.
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

  if (normalized.length !== PK_IBAN_LENGTH) {
    return false;
  }

  if (!PK_IBAN_PATTERN.test(normalized)) {
    return false;
  }

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const expanded = expandIbanChars(rearranged);

  return mod97(expanded) === 1;
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

  const normalized = normalizeIBAN(iban);
  const bankCode = normalized.slice(4, 8);
  const resolvedCode = BANK_ALIASES[bankCode] ?? bankCode;

  return BANK_MAP.get(resolvedCode) ?? BANK_MAP.get(bankCode) ?? null;
}
