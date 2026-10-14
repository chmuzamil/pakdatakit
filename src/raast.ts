import { validateIBAN } from './iban.js';
import {
  crc16,
  encodeField,
  parseFields,
  withCrc,
  type EmvField,
} from './internal/emv.js';
import { stripSeparators } from './internal/normalize.js';

/*
 * Implements SBP's "Standard for Interoperable QR Code for Person-to-Person
 * and Merchant Payments" v1.0 (DI&SD Circular Letter No. 1 of 2022, Annex-I).
 */

const PK_IBAN_PATTERN = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/;

/** Scheme identifier for Raast in person-to-person QR codes. */
const RAAST_P2P_SCHEME = '30';

/** Options for {@link createRaastP2PQr}. */
export interface RaastP2PQrOptions {
  /** Payee's Pakistani IBAN. */
  iban: string;
  /** Amount in PKR. When set, the QR is dynamic (point of initiation 12). */
  amount?: number;
  /** Payee's bank name (up to 25 characters). */
  bankName?: string;
  /** Payment description (up to 30 characters). */
  particulars?: string;
}

/** Account details for a merchant QR, as issued by the merchant's bank. */
export interface MerchantAccountInfo {
  /** Template tag. SBP reserves `28`–`30` for Raast. Defaults to `28`. */
  tag?: string;
  /** Sub-fields of the template, keyed by 2-digit ID, in the order given. */
  fields: Record<string, string>;
}

/** Options for {@link createMerchantQr}. */
export interface MerchantQrOptions {
  /** Raast merchant account template. Its sub-fields are defined by the bank. */
  merchantAccount: MerchantAccountInfo;
  /** Merchant name (up to 25 characters). */
  merchantName: string;
  /** Merchant city (up to 15 characters). */
  city: string;
  /** ISO 18245 merchant category code. Defaults to `0000`. */
  mcc?: string;
  /** Amount in PKR. When set, the QR is dynamic unless `dynamic` is `false`. */
  amount?: number;
  /** Overrides the point of initiation (static `11` / dynamic `12`). */
  dynamic?: boolean;
  /** Bill or invoice number (tag 62-01, up to 25 characters). */
  billNumber?: string;
  /** Customer mobile number (tag 62-02, up to 15 characters). */
  mobileNumber?: string;
  /** Reference label (tag 62-05, up to 25 characters). */
  reference?: string;
  /** Payment due date (Pakistan-specific tag 62-50). Requires `amountAfterDueDate`. */
  dueDate?: Date;
  /** Amount payable after the due date (Pakistan-specific tag 62-51). */
  amountAfterDueDate?: number;
}

/** Result of {@link parseRaastQr}. */
export interface ParsedRaastQr {
  /** `p2p` for person-to-person QR codes, `merchant` for EMVCo merchant QR codes. */
  kind: 'p2p' | 'merchant';
  /** Whether the QR carries a fixed amount (point of initiation 12). */
  dynamic: boolean;
  /** Whether the CRC checksum matches. */
  crcValid: boolean;
  /** Payee IBAN, if one is present. */
  iban: string | null;
  /** Whether `iban` passes the IBAN checksum. */
  ibanValid: boolean;
  amount: number | null;
  /** P2P: bank name. */
  bankName: string | null;
  /** P2P: payment description. */
  particulars: string | null;
  merchantName: string | null;
  city: string | null;
  mcc: string | null;
  billNumber: string | null;
  /** Due date as `YYYY-MM-DD`. */
  dueDate: string | null;
  amountAfterDueDate: number | null;
  /** All top-level fields, with template fields parsed into `children`. */
  fields: EmvField[];
}

function formatAmount(
  amount: number,
  maxLength: number,
  label: string,
): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError(`${label} must be a positive number`);
  }
  const text = amount.toFixed(2);
  if (text.length > maxLength) {
    throw new RangeError(`${label} is too large for a Raast QR code`);
  }
  return text;
}

function checkLength(value: string, max: number, label: string): string {
  if ([...value].length > max) {
    throw new RangeError(`${label} must be at most ${max} characters`);
  }
  return value;
}

function normalizeIban(iban: string): string {
  const normalized = stripSeparators(iban).toUpperCase();
  if (!validateIBAN(normalized)) {
    throw new RangeError(`Invalid Pakistani IBAN: ${iban}`);
  }
  return normalized;
}

/**
 * Creates a Raast person-to-person QR payload, following SBP's P2P QR format
 * (payload format `02`, scheme `30`). Encode the string as a QR code with any
 * QR library.
 *
 * @example
 * createRaastP2PQr({ iban: 'PK36SCBL0000001123456702', amount: 1500 });
 *
 * @param options - Payee IBAN and optional amount, bank name and description
 * @returns QR payload string
 * @throws {RangeError} If the IBAN is invalid or a field is too long
 */
export function createRaastP2PQr(options: RaastP2PQrOptions): string {
  const iban = normalizeIban(options.iban);
  let payload =
    encodeField('00', '02') +
    encodeField('01', options.amount === undefined ? '11' : '12') +
    encodeField('02', RAAST_P2P_SCHEME);

  if (options.bankName) {
    payload += encodeField('03', checkLength(options.bankName, 25, 'bankName'));
  }
  payload += encodeField('04', iban);
  if (options.amount !== undefined) {
    payload += encodeField('05', formatAmount(options.amount, 10, 'amount'));
  }
  if (options.particulars) {
    payload += encodeField(
      '06',
      checkLength(options.particulars, 30, 'particulars'),
    );
  }

  const data = `${payload}1004`;
  return `${data}${crc16(data)}`;
}

/**
 * Creates an EMVCo merchant-presented QR payload following SBP's Pakistan QR
 * standard (currency `586`, country `PK`, CRC in tag 63), including the
 * Pakistan-specific due-date fields.
 *
 * SBP leaves the layout of the Raast merchant account template to the scheme
 * and has shared it only with banks, so pass the template sub-fields your bank
 * gives you in `merchantAccount`.
 *
 * @param options - Merchant account template, name, city and payment details
 * @returns QR payload string
 * @throws {RangeError} If a field is missing, too long, or out of range
 */
export function createMerchantQr(options: MerchantQrOptions): string {
  const tag = options.merchantAccount.tag ?? '28';
  if (!/^(2[6-9]|[34]\d|5[01])$/.test(tag)) {
    throw new RangeError('merchantAccount.tag must be between 26 and 51');
  }
  const accountFields = Object.entries(options.merchantAccount.fields);
  if (accountFields.length === 0) {
    throw new RangeError('merchantAccount.fields must not be empty');
  }
  const mcc = options.mcc ?? '0000';
  if (!/^\d{4}$/.test(mcc)) {
    throw new RangeError('mcc must be 4 digits');
  }
  if (
    (options.dueDate === undefined) !==
    (options.amountAfterDueDate === undefined)
  ) {
    throw new RangeError(
      'dueDate and amountAfterDueDate must be used together',
    );
  }

  const dynamic = options.dynamic ?? options.amount !== undefined;
  const account = accountFields
    .map(([id, value]) => {
      if (!/^\d{2}$/.test(id)) {
        throw new RangeError(`Invalid merchant account sub-field ID: ${id}`);
      }
      return encodeField(id, value);
    })
    .join('');

  let payload =
    encodeField('00', '01') +
    encodeField('01', dynamic ? '12' : '11') +
    encodeField(tag, account) +
    encodeField('52', mcc) +
    encodeField('53', '586');
  if (options.amount !== undefined) {
    payload += encodeField('54', formatAmount(options.amount, 13, 'amount'));
  }
  payload +=
    encodeField('58', 'PK') +
    encodeField('59', checkLength(options.merchantName, 25, 'merchantName')) +
    encodeField('60', checkLength(options.city, 15, 'city'));

  let additional = '';
  if (options.billNumber) {
    additional += encodeField(
      '01',
      checkLength(options.billNumber, 25, 'billNumber'),
    );
  }
  if (options.mobileNumber) {
    additional += encodeField(
      '02',
      checkLength(options.mobileNumber, 15, 'mobileNumber'),
    );
  }
  if (options.reference) {
    additional += encodeField(
      '05',
      checkLength(options.reference, 25, 'reference'),
    );
  }
  if (
    options.dueDate !== undefined &&
    options.amountAfterDueDate !== undefined
  ) {
    const d = options.dueDate;
    if (Number.isNaN(d.getTime())) {
      throw new RangeError('dueDate is invalid');
    }
    const ddmmyyyy =
      String(d.getDate()).padStart(2, '0') +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getFullYear()).padStart(4, '0');
    additional +=
      encodeField('50', ddmmyyyy) +
      encodeField(
        '51',
        formatAmount(options.amountAfterDueDate, 13, 'amountAfterDueDate'),
      );
  }
  if (additional) {
    payload += encodeField('62', additional);
  }

  const result = withCrc(payload);
  if ([...result].length > 512) {
    throw new RangeError('QR payload exceeds 512 characters');
  }
  return result;
}

function fieldValue(fields: EmvField[], id: string): string | null {
  return fields.find((field) => field.id === id)?.value ?? null;
}

function toAmount(value: string | null): number | null {
  if (value === null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Parses a Raast QR payload: either a person-to-person QR (payload format
 * `02`) or an EMVCo merchant QR (payload format `01`), and verifies its CRC.
 *
 * @param payload - Text decoded from the QR code
 * @returns Parsed details, or `null` if the payload is not a well-formed Pakistani QR code
 */
export function parseRaastQr(payload: string): ParsedRaastQr | null {
  const text = payload.trim();
  let fields: EmvField[];
  try {
    fields = parseFields(text);
  } catch {
    return null;
  }

  const format = fieldValue(fields, '00');
  const kind = format === '02' ? 'p2p' : format === '01' ? 'merchant' : null;
  if (kind === null) {
    return null;
  }

  const crcId = kind === 'p2p' ? '10' : '63';
  const last = fields[fields.length - 1];
  const crcValid =
    last?.id === crcId &&
    last.value.length === 4 &&
    crc16(text.slice(0, -4)) === last.value.toUpperCase();

  let iban: string | null = null;
  if (kind === 'p2p') {
    iban = fieldValue(fields, '04');
  } else {
    for (const field of fields) {
      const n = Number(field.id);
      if (n >= 26 && n <= 51) {
        const match = field.children?.find((child) =>
          PK_IBAN_PATTERN.test(child.value),
        );
        if (match) {
          iban = match.value;
          break;
        }
      }
    }
  }

  const additional = fields.find((field) => field.id === '62')?.children ?? [];
  const due = fieldValue(additional, '50');

  return {
    kind,
    dynamic: fieldValue(fields, '01') === '12',
    crcValid,
    iban,
    ibanValid: iban !== null && validateIBAN(iban),
    amount: toAmount(fieldValue(fields, kind === 'p2p' ? '05' : '54')),
    bankName: kind === 'p2p' ? fieldValue(fields, '03') : null,
    particulars: kind === 'p2p' ? fieldValue(fields, '06') : null,
    merchantName: kind === 'merchant' ? fieldValue(fields, '59') : null,
    city: kind === 'merchant' ? fieldValue(fields, '60') : null,
    mcc: kind === 'merchant' ? fieldValue(fields, '52') : null,
    billNumber: fieldValue(additional, '01'),
    dueDate:
      due && /^\d{8}$/.test(due)
        ? `${due.slice(4)}-${due.slice(2, 4)}-${due.slice(0, 2)}`
        : null,
    amountAfterDueDate: toAmount(fieldValue(additional, '51')),
    fields,
  };
}
