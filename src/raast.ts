import { validateIBAN } from './iban.js';
import {
  crc16,
  encodeField,
  parseFields,
  withCrc,
  type EmvField,
} from './internal/emv.js';

export type { EmvField };
import { stripSeparators } from './internal/normalize.js';

/*
 * Implements SBP's "Standard for Interoperable QR Code for Person-to-Person
 * and Merchant Payments" v1.0 (DI&SD Circular Letter No. 1 of 2022, Annex-I).
 */

const PK_IBAN_PATTERN = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/;

/**
 * Scheme identifier written in person-to-person QR codes. SBP's standard lists
 * `30` for Raast, but banking apps (Faysal Bank, easypaisa) generate QR codes
 * with `00`, and the Easypaisa and JazzCash apps reject `30`.
 */
const DEFAULT_P2P_SCHEME = '00';

/** A duration such as `'30m'`, `'12h'` or `'7d'` (minutes, hours or days). */
export type RaastDuration = `${number}${'m' | 'h' | 'd'}`;

const DURATION_UNITS = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** Resolves `expiresAt` / `expiresIn` to a date. */
function resolveExpiry(
  expiresAt: Date | undefined,
  expiresIn: number | RaastDuration | undefined,
  now: Date,
): Date | undefined {
  if (expiresAt !== undefined && expiresIn !== undefined) {
    throw new RangeError('Use either expiresAt or expiresIn, not both');
  }
  if (expiresIn === undefined) return expiresAt;
  let ms: number;
  if (typeof expiresIn === 'number') {
    ms = expiresIn;
  } else {
    const match = /^(\d+(?:\.\d+)?)([mhd])$/.exec(expiresIn);
    if (!match) {
      throw new RangeError(
        `expiresIn must be milliseconds or like '30m', '12h' or '7d', received ${expiresIn}`,
      );
    }
    ms =
      Number(match[1]) *
      DURATION_UNITS[match[2] as keyof typeof DURATION_UNITS];
  }
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new RangeError('expiresIn must be a positive duration');
  }
  return new Date(now.getTime() + ms);
}

/** Options for {@link createRaastP2PQr}. */
export interface RaastP2PQrOptions {
  /** Payee's Pakistani IBAN. */
  iban: string;
  /**
   * Scheme identifier (tag 02). Defaults to `'00'`, as used by banking apps.
   * `'30'` is the value listed for Raast in SBP's QR standard.
   */
  scheme?: '00' | '30';
  /**
   * Amount in PKR. When set, the QR is dynamic (point of initiation 12) and
   * `expiresAt` is required: banking apps reject dynamic QR codes without an
   * expiry, and ignore the amount in static ones.
   */
  amount?: number;
  /**
   * When a QR with an amount stops working (tag 07). With `amount`, give this
   * or `expiresIn`.
   */
  expiresAt?: Date;
  /**
   * How long from now a QR with an amount works, instead of `expiresAt`:
   * milliseconds, or a string such as `'30m'`, `'12h'` or `'7d'`.
   */
  expiresIn?: number | RaastDuration;
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
  /** P2P: expiry of a dynamic QR as local `YYYY-MM-DDTHH:mm`. */
  expiresAt: string | null;
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
  if (text.length > maxLength || !/^\d+\.\d{2}$/.test(text)) {
    throw new RangeError(`${label} is too large for a Raast QR code`);
  }
  return text;
}

/** P2P amounts: whole rupees as `1500` (as banking apps write them), otherwise `1500.50`. */
function formatP2PAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError('amount must be a positive number');
  }
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  // Very large numbers stringify in exponent form ("1e+21"), so check the shape too.
  if (text.length > 10 || !/^\d+(\.\d+)?$/.test(text)) {
    throw new RangeError('amount is too large for a Raast QR code');
  }
  return text;
}

/** `DDMMYYYYhhmm` in local time. */
function formatExpiry(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('expiresAt is invalid');
  }
  const two = (n: number) => String(n).padStart(2, '0');
  return (
    two(date.getDate()) +
    two(date.getMonth() + 1) +
    String(date.getFullYear()).padStart(4, '0') +
    two(date.getHours()) +
    two(date.getMinutes())
  );
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
 * Creates a Raast person-to-person QR payload in SBP's P2P QR format (payload
 * format `02`), matching the QR codes banking apps generate, so it can be
 * scanned by apps such as Easypaisa and JazzCash. Encode the string as a QR
 * code with any QR library.
 *
 * A QR with an `amount` is dynamic and needs `expiresAt`; this layout
 * (`01` = `12`, amount in tag 05, expiry in tag 07) matches dynamic QR codes
 * from banking apps and scans in Easypaisa and JazzCash.
 *
 * @example
 * createRaastP2PQr({ iban: 'PK36SCBL0000001123456702' });
 * createRaastP2PQr({ iban: 'PK36SCBL0000001123456702', amount: 1500, expiresIn: '1d' });
 *
 * @param options - Payee IBAN and optional amount with expiry, bank name and description
 * @returns QR payload string
 * @throws {RangeError} If the IBAN is invalid, a field is too long, or an
 *   amount is given without `expiresAt` or `expiresIn`
 */
export function createRaastP2PQr(options: RaastP2PQrOptions): string {
  const expiresAt = resolveExpiry(
    options.expiresAt,
    options.expiresIn,
    new Date(),
  );
  const iban = normalizeIban(options.iban);
  let payload =
    encodeField('00', '02') +
    encodeField('01', options.amount === undefined ? '11' : '12') +
    encodeField('02', options.scheme ?? DEFAULT_P2P_SCHEME);

  if (options.bankName) {
    payload += encodeField('03', checkLength(options.bankName, 25, 'bankName'));
  }
  payload += encodeField('04', iban);
  if (options.amount !== undefined) {
    payload += encodeField('05', formatP2PAmount(options.amount));
  }
  if (options.particulars) {
    payload += encodeField(
      '06',
      checkLength(options.particulars, 30, 'particulars'),
    );
  }
  if (options.amount !== undefined) {
    if (expiresAt === undefined) {
      throw new RangeError('A QR with an amount needs expiresAt or expiresIn');
    }
    payload += encodeField('07', formatExpiry(expiresAt));
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
  for (const [id] of accountFields) {
    if (!/^\d{2}$/.test(id)) {
      throw new RangeError(`Invalid merchant account sub-field ID: ${id}`);
    }
  }
  // JavaScript lists keys "10"-"99" before "00"-"09", so sort by ID.
  const account = accountFields
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, value]) => encodeField(id, value))
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

/**
 * Reads a `DDMMYYYYhhmm` expiry as local `YYYY-MM-DDTHH:mm`, or null when it
 * is malformed or not a real date and time (e.g. month 13 or hour 25).
 */
function parseExpiry(value: string | null): string | null {
  const match = value
    ? /^(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})$/.exec(value)
    : null;
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match as unknown as string[];
  const [day, month, year, hour, minute] = [dd, mm, yyyy, hh, min].map(
    Number,
  ) as [number, number, number, number, number];
  const date = new Date(2000, month - 1, day, hour, minute);
  date.setFullYear(year);
  const real =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;
  return real ? `${yyyy}-${mm}-${dd}T${hh}:${min}` : null;
}

/** Reads an amount field: plain digits with optional decimals, else null. */
function toAmount(value: string | null): number | null {
  if (value === null || !/^\d+(\.\d+)?$/.test(value)) return null;
  return Number(value);
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
  const expiry = kind === 'p2p' ? fieldValue(fields, '07') : null;

  return {
    kind,
    dynamic: fieldValue(fields, '01') === '12',
    crcValid,
    iban,
    ibanValid: iban !== null && validateIBAN(iban),
    amount: toAmount(fieldValue(fields, kind === 'p2p' ? '05' : '54')),
    expiresAt: parseExpiry(expiry),
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

/** A problem that stops a Raast QR from working or makes it unsafe to pay. */
export type RaastQrError =
  | 'not-a-raast-qr'
  | 'bad-checksum'
  | 'no-iban'
  | 'invalid-iban'
  | 'expired'
  | 'missing-expiry';

/** Something worth telling the payer, but which does not stop payment. */
export type RaastQrWarning = 'amount-ignored' | 'expires-soon';

/** Result of {@link validateRaastQr}. */
export interface RaastQrValidation {
  /** `true` when there are no errors. */
  valid: boolean;
  errors: RaastQrError[];
  warnings: RaastQrWarning[];
  /** The parsed QR, or `null` if it could not be read. */
  qr: ParsedRaastQr | null;
}

/** Options for {@link validateRaastQr}. */
export interface ValidateRaastQrOptions {
  /** The time to check expiry against. Defaults to now. */
  now?: Date;
  /** Warn when a QR expires within this many milliseconds. Defaults to 1 hour. */
  expiresSoonMs?: number;
}

/** Converts parseRaastQr's local `YYYY-MM-DDTHH:mm` to a Date. */
function localDateTime(value: string): Date {
  const [date, time] = value.split('T') as [string, string];
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hour, minute);
}

/**
 * Checks whether a Raast QR code can be paid, e.g. before showing a payment
 * screen or to warn about a tampered sticker.
 *
 * Errors: not a Pakistani payment QR, checksum mismatch (damaged or edited),
 * no IBAN or an IBAN that fails its checksum, expired, or a fixed-amount QR
 * without the expiry that banking apps require.
 * Warnings: an amount in a static QR (apps ignore it, so the payer must type
 * it), or a QR that expires soon (within an hour by default).
 *
 * @example
 * validateRaastQr(scannedText);
 * // { valid: false, errors: ['expired'], warnings: [], qr: { ... } }
 *
 * @param payload - Text decoded from the QR code
 * @param options - Time to check against and the "expires soon" window
 * @returns Validation result with the parsed QR
 */
export function validateRaastQr(
  payload: string,
  options: ValidateRaastQrOptions = {},
): RaastQrValidation {
  const qr = parseRaastQr(payload);
  if (qr === null) {
    return { valid: false, errors: ['not-a-raast-qr'], warnings: [], qr: null };
  }

  const errors: RaastQrError[] = [];
  const warnings: RaastQrWarning[] = [];
  const now = options.now ?? new Date();

  if (!qr.crcValid) errors.push('bad-checksum');
  if (qr.iban === null) errors.push('no-iban');
  else if (!qr.ibanValid) errors.push('invalid-iban');

  if (qr.kind === 'p2p') {
    if (qr.dynamic && qr.expiresAt === null) errors.push('missing-expiry');
    if (!qr.dynamic && qr.amount !== null) warnings.push('amount-ignored');
    if (qr.expiresAt !== null) {
      const remaining = localDateTime(qr.expiresAt).getTime() - now.getTime();
      if (remaining <= 0) {
        errors.push('expired');
      } else if (remaining <= (options.expiresSoonMs ?? 3_600_000)) {
        warnings.push('expires-soon');
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, qr };
}
