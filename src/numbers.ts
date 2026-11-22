import areaCodesData from '../data/area-codes.json';
import { normalizePhoneDigits } from './internal/phone-utils.js';
import {
  lazy,
  normalizeKey,
  stripSeparators,
  toAsciiDigits,
} from './internal/normalize.js';

/**
 * Kind of Pakistani telephone number. `'personal'` is never returned since
 * 2.7.0 (0122 numbers have no PTA source; see DATA.md); it stays in the type
 * so existing code compiles, and will be removed in 3.0.
 */
export type NumberType =
  'mobile' | 'landline' | 'uan' | 'toll-free' | 'premium' | 'personal';

/** Result of {@link analyzeNumber}. */
export interface NumberInfo {
  type: NumberType;
  /** National format with trunk prefix and separators, e.g. `021-111-825-888`. */
  formatted: string;
  /** E.164 format, e.g. `+9221111825888`. `null` for a UAN dialled without an area code. */
  e164: string | null;
  /** Area code with trunk prefix (e.g. `021`) for landlines and UANs. */
  areaCode: string | null;
  /** Cities served by the area code, when known. */
  cities: string[];
}

interface AreaCodeEntry {
  code: string;
  cities: string[];
}

/*
 * Number patterns. They apply to the national significant number, without
 * the trunk prefix 0.
 *
 * - Fixed lines and area codes: Google libphonenumber's PK metadata
 *   (v9.0.41), which matches PTA's numbering plan (ITU, 9 November 2021).
 * - UAN: an area code, then 111 and six digits (PTA's plan, "National
 *   Universal Access Number"). Written without the area code, `111-XXX-XXX`
 *   is how UANs are advertised and dialled within a city.
 * - Toll-free: 800 and five digits (PTA's plan, "National Toll Free Number").
 * - Premium rate: 900 and five digits (PTA, National Numbering Plan 2008,
 *   9.1.4, "current structure"; the 2021 plan does not list 0900).
 * - 0122 numbers: seen in use, no PTA source, not supported since 2.7.0 (see DATA.md).
 */
const FIXED_LINE =
  /^(?:(?:(?:21|42)[2-9]|58[126])\d{7}|(?:2[25]|4[0146-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9]\d{6,7}|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8]))[2-9]\d{5,6})$/;
const UAN =
  /^((?:2(?:[125]|3[2358]|4[2-4]|9[2-8])|4(?:[0-246-9]|5[3479])|5(?:[1-35-7]|4[2-467])|6(?:0[468]|[1-8])|7(?:[14]|2[236])|8(?:[16]|2[2-689]|3[23578]|4[3478]|5[2356])|9(?:1|22|3[27-9]|4[2-6]|6[3569]|9[2-7])))111(\d{6})$/;
const UAN_WITHOUT_AREA_CODE = /^111(\d{6})$/;
const TOLL_FREE = /^800(\d{5})$/;
const PREMIUM = /^900(\d{5})$/;

const areaCodes = /* @__PURE__ */ lazy(() => areaCodesData as AreaCodeEntry[]);

const areaCodeMap = /* @__PURE__ */ lazy(
  () => new Map(areaCodes().map((entry) => [entry.code, entry.cities])),
);

/** Strips the country code and trunk prefix, leaving the national significant number. */
function toNationalNumber(input: string): string | null {
  let digits = stripSeparators(toAsciiDigits(input));
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
    if (!digits.startsWith('92')) return null;
    digits = digits.slice(2);
  } else if (digits.startsWith('0092')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return /^\d{8,12}$/.test(digits) ? digits : null;
}

/** Finds the longest known area code at the start of a national number. */
function findAreaCode(national: string): string | null {
  for (let length = 4; length >= 2; length -= 1) {
    const prefix = national.slice(0, length);
    if (areaCodeMap().has(prefix)) {
      return prefix;
    }
  }
  return null;
}

function groupDigits(digits: string, size = 3): string {
  return digits.match(new RegExp(`\\d{1,${size}}`, 'g'))?.join('-') ?? digits;
}

/**
 * Identifies and formats any Pakistani telephone number: mobile, landline,
 * UAN (`111`), toll-free (`0800`) or premium-rate (`0900`). 0122 numbers are
 * not recognised: no PTA document lists them (see DATA.md).
 *
 * @example
 * analyzeNumber('021-111-825-888');
 * // { type: 'uan', formatted: '021-111-825-888', e164: '+9221111825888',
 * //   areaCode: '021', cities: ['Karachi'] }
 * analyzeNumber('042 35761234');
 * // { type: 'landline', formatted: '042-35761234', e164: '+924235761234',
 * //   areaCode: '042', cities: ['Lahore'] }
 *
 * @param phone - Number in local or international format
 * @returns Number details, or `null` if it is not a valid Pakistani number
 */
export function analyzeNumber(phone: string): NumberInfo | null {
  const mobile = normalizePhoneDigits(phone);
  if (mobile !== null) {
    const national = mobile.slice(2);
    return {
      type: 'mobile',
      formatted: `0${national.slice(0, 3)}-${national.slice(3)}`,
      e164: `+${mobile}`,
      areaCode: null,
      cities: [],
    };
  }

  const bareUan = UAN_WITHOUT_AREA_CODE.exec(
    stripSeparators(toAsciiDigits(phone)),
  );
  if (bareUan) {
    return {
      type: 'uan',
      formatted: `111-${groupDigits(bareUan[1] as string)}`,
      e164: null,
      areaCode: null,
      cities: [],
    };
  }

  const national = toNationalNumber(phone);
  if (national === null) {
    return null;
  }

  const service = (
    type: NumberType,
    prefix: string,
    rest: string,
  ): NumberInfo => ({
    type,
    formatted: `0${prefix}-${rest}`,
    e164: `+92${national}`,
    areaCode: null,
    cities: [],
  });

  const tollFree = TOLL_FREE.exec(national);
  if (tollFree) return service('toll-free', '800', tollFree[1] as string);

  const premium = PREMIUM.exec(national);
  if (premium) return service('premium', '900', premium[1] as string);

  const uan = UAN.exec(national);
  if (uan) {
    const code = uan[1] as string;
    return {
      type: 'uan',
      formatted: `0${code}-111-${groupDigits(uan[2] as string)}`,
      e164: `+92${national}`,
      areaCode: `0${code}`,
      cities: areaCodeMap().get(code) ?? [],
    };
  }

  if (FIXED_LINE.test(national)) {
    const code = findAreaCode(national);
    return {
      type: 'landline',
      formatted: code
        ? `0${code}-${national.slice(code.length)}`
        : `0${national}`,
      e164: `+92${national}`,
      areaCode: code ? `0${code}` : null,
      cities: code ? (areaCodeMap().get(code) ?? []) : [],
    };
  }

  return null;
}

/**
 * Returns the type of a Pakistani telephone number. See {@link analyzeNumber}.
 *
 * @param phone - Number in local or international format
 * @returns Number type, or `null` if it is not a valid Pakistani number
 */
export function getNumberType(phone: string): NumberType | null {
  return analyzeNumber(phone)?.type ?? null;
}

/** Options for {@link validateLandline}. */
export interface LandlineOptions {
  /**
   * Also accept the non-geographic service numbers a business may give as
   * its landline: UAN (`021-111-123-456`, `111-123-456`), toll-free
   * (`0800-12345`) and premium rate (`0900-12345`). Default `false`.
   */
  services?: boolean;
}

/** The number types {@link validateLandline} accepts with `services: true`. */
const SERVICE_TYPES: ReadonlySet<NumberType> = new Set([
  'uan',
  'toll-free',
  'premium',
]);

/**
 * Validates a Pakistani landline (fixed-line) number such as `042-35761234`.
 * With `{ services: true }` it also accepts UAN, toll-free and premium-rate
 * numbers; {@link analyzeNumber} tells them apart with its `type` field.
 *
 * @example
 * validateLandline('042-35761234'); // true
 * validateLandline('021-111-123-456'); // false
 * validateLandline('021-111-123-456', { services: true }); // true
 *
 * @param phone - Number in local or international format
 * @param options - `services: true` to accept UAN, toll-free and premium numbers
 * @returns `true` for a valid landline number (or service number, with
 *   `services`). Never throws.
 */
export function validateLandline(
  phone: string,
  options: LandlineOptions = {},
): boolean {
  if (typeof phone !== 'string') return false;
  const type = getNumberType(phone);
  if (type === 'landline') return true;
  return options.services === true && type !== null && SERVICE_TYPES.has(type);
}

/**
 * Returns the landline area code for a city, with trunk prefix (e.g. `"042"`).
 *
 * @param city - City name (case-insensitive)
 * @returns Area code, or `null` if the city is not in the dataset
 */
export function getAreaCode(city: string): string | null {
  const key = normalizeKey(city);
  const entry = areaCodes().find((item) =>
    item.cities.some((name) => normalizeKey(name) === key),
  );
  return entry ? `0${entry.code}` : null;
}
