import { parseAddress, type ParsedAddress } from './address.js';
import { normalizeWhitespace, toAsciiDigits } from './internal/normalize.js';
import { analyzeNumber } from './numbers.js';
import { getPostOffice } from './post-offices.js';

/** A part of a delivery address that {@link scoreAddress} looks for. */
export type AddressPart =
  'city' | 'houseNumber' | 'street' | 'area' | 'postalCode' | 'landmark';

/** Result of {@link scoreAddress}. */
export interface AddressScore {
  /** 0 (unusable) to 100 (every part present and consistent). */
  score: number;
  /** Parts not found, in the order of {@link ADDRESS_WEIGHTS}. */
  missing: AddressPart[];
  /** The address as `parseAddress` reads it, with any extra warnings. */
  parsed: ParsedAddress;
}

/**
 * Points for each part of an address. They add up to 100. A postal code
 * scores in full only when it is a known post office code; an unknown one
 * scores 5.
 */
export const ADDRESS_WEIGHTS: Readonly<Record<AddressPart, number>> = {
  city: 30,
  houseNumber: 20,
  street: 15,
  area: 10,
  postalCode: 15,
  landmark: 10,
};

const UNKNOWN_POSTAL_CODE_POINTS = 5;
/** Taken off when the post office and the city are in different provinces. */
const MISMATCH_PENALTY = 15;

/** Words that introduce a landmark, in English and Roman Urdu. */
const LANDMARK_WORDS = [
  'near',
  'nr',
  'opposite',
  'opp',
  'behind',
  'beside',
  'besides',
  'adjacent',
  'next to',
  'in front of',
  'facing',
  'nazd',
  'nazdeek',
  'nazdik',
  'qareeb',
  'qarib',
  'kareeb',
  'samne',
  'saamne',
  'samnay',
  'peeche',
  'peechay',
  'pichay',
  'bil muqabil',
  'bilmuqabil',
  'muttasil',
  'mutasil',
];

/** The same, in Urdu script. */
const URDU_LANDMARK_WORDS = [
  'نزد',
  'نزدیک',
  'قریب',
  'سامنے',
  'پیچھے',
  'بالمقابل',
  'متصل',
];

/** Words that name a street or lane. */
const STREET_WORDS = [
  'street',
  'st',
  'road',
  'rd',
  'lane',
  'gali',
  'avenue',
  'ave',
  'boulevard',
  'blvd',
  'chowk',
  'bazar',
  'bazaar',
  'mohalla',
  'muhalla',
];

const URDU_STREET_WORDS = ['گلی', 'سڑک', 'روڈ', 'محلہ', 'چوک', 'بازار'];

/** Words that name an area within a city. */
const AREA_WORDS = [
  'block',
  'sector',
  'phase',
  'town',
  'colony',
  'society',
  'scheme',
  'housing',
  'garden',
  'gardens',
  'park',
  'estate',
  'abad',
  'nagar',
  'cantt',
  'cantonment',
];

const URDU_AREA_WORDS = ['بلاک', 'سیکٹر', 'فیز', 'ٹاؤن', 'کالونی', 'سوسائٹی'];

/** Lower-cases, folds Urdu digits and collapses everything but letters and digits to single spaces. */
function words(text: string): string {
  return ` ${toAsciiDigits(text)
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()} `;
}

function hasWord(haystack: string, list: readonly string[]): boolean {
  return list.some((word) => haystack.includes(` ${word} `));
}

function hasUrdu(text: string, list: readonly string[]): boolean {
  return list.some((word) => text.includes(word));
}

/**
 * Scores how complete a free-form Pakistani delivery address is, for cash on
 * delivery and other courier use.
 *
 * Built on {@link parseAddress}. It looks for a city, a house, plot or flat
 * number, a street, an area, a postal code and a landmark ("near", "opp",
 * "nazd", "qareeb", "سامنے" …), and adds up {@link ADDRESS_WEIGHTS}. A postal
 * code that is a known post office raises the score more than an unknown
 * one, and a post office in a different province from the city lowers it
 * (with a warning in `parsed.warnings`).
 *
 * This is a heuristic: it says how much an address tells a rider, not whether
 * the address exists. It never throws.
 *
 * @example
 * scoreAddress('House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660');
 * // { score: 100, missing: [], parsed: { … } }
 */
export function scoreAddress(input: string): AddressScore {
  const text = typeof input === 'string' ? normalizeWhitespace(input) : '';
  const parsed = parseAddress(text);
  const found = new Set<AddressPart>();
  const lowered = words(text);
  const postal = parsed.postalCode;
  // The text without the postal code, for the house-number check.
  const rest = postal === null ? lowered : lowered.replace(` ${postal} `, ' ');

  if (parsed.city !== null) found.add('city');
  // A number other than the postal code: house, plot, flat or street number.
  // ("12", "12b", "4th").
  if (/ \d+[a-z]{0,2} /.test(rest)) {
    found.add('houseNumber');
  }
  if (hasWord(lowered, STREET_WORDS) || hasUrdu(text, URDU_STREET_WORDS)) {
    found.add('street');
  }
  if (
    parsed.area !== null ||
    hasWord(lowered, AREA_WORDS) ||
    hasUrdu(text, URDU_AREA_WORDS)
  ) {
    found.add('area');
  }
  if (hasWord(lowered, LANDMARK_WORDS) || hasUrdu(text, URDU_LANDMARK_WORDS)) {
    found.add('landmark');
  }

  let score = 0;
  const warnings = [...parsed.warnings];
  for (const part of found) score += ADDRESS_WEIGHTS[part];

  if (postal !== null) {
    const office = getPostOffice(postal);
    if (office === null) {
      score += UNKNOWN_POSTAL_CODE_POINTS;
    } else {
      found.add('postalCode');
      score += ADDRESS_WEIGHTS.postalCode;
      if (parsed.province !== null && office.province !== parsed.province) {
        score -= MISMATCH_PENALTY;
        warnings.push(
          `Postal code ${postal} is in ${office.province}, but the address is in ${parsed.province}`,
        );
      }
    }
  }

  const missing = (Object.keys(ADDRESS_WEIGHTS) as AddressPart[]).filter(
    (part) => !found.has(part),
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    missing,
    parsed: { ...parsed, warnings },
  };
}

/** A reason to double-check a phone number given for a delivery. */
export type PhoneRiskFlag =
  | 'invalid'
  | 'landline'
  | 'not-mobile'
  | 'repeated-digits'
  | 'sequential-digits'
  | 'test-number';

const ASCENDING = '01234567890';
const DESCENDING = '09876543210';

/**
 * Flags a phone number that a courier cannot reach by SMS or call, or that
 * looks made up. Pure heuristics on the number itself: no list of real
 * numbers, no personal data, no network call.
 *
 * - `invalid`: not a Pakistani phone number.
 * - `landline`: a fixed-line number (no SMS, often unanswered).
 * - `not-mobile`: a UAN, toll-free or other service number.
 * - `repeated-digits`: the 7-digit subscriber part uses at most two
 *   different digits (`0300-0000000`, `0300-1111112`).
 * - `sequential-digits`: the subscriber part is a run such as `1234567` or
 *   `7654321`.
 * - `test-number`: a placeholder often typed into forms (`03XX-1234567`,
 *   `03XX-7654321`, `0312-3456789`).
 *
 * A valid mobile number with nothing suspicious returns `[]`. It never
 * throws.
 */
export function phoneRiskSignals(input: string): PhoneRiskFlag[] {
  const info = typeof input === 'string' ? analyzeNumber(input) : null;
  if (info === null) return ['invalid'];
  if (info.type === 'landline') return ['landline'];
  if (info.type !== 'mobile' || info.e164 === null) return ['not-mobile'];

  const national = info.e164.slice(3); // 3XXXXXXXXX
  const subscriber = national.slice(3);
  const flags: PhoneRiskFlag[] = [];
  if (new Set(subscriber).size <= 2) flags.push('repeated-digits');
  if (ASCENDING.includes(subscriber) || DESCENDING.includes(subscriber)) {
    flags.push('sequential-digits');
  }
  if (
    subscriber === '1234567' ||
    subscriber === '7654321' ||
    national === '3123456789'
  ) {
    flags.push('test-number');
  }
  return flags;
}
