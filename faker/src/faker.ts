import {
  analyzeNumber,
  createRaastP2PQr,
  type RaastDuration,
} from 'pakdatakit';
import {
  AREA_CODES,
  BANKS,
  CITIES,
  NETWORKS,
  PROVINCES,
  areaCodeFor,
  districtFor,
  postalEntriesFor,
  areaCodesIn,
  citiesIn,
  resolveCity,
  resolveProvince,
  type AreaCodeEntry,
  type BankEntry,
  type BankType,
  type CityEntry,
  type Network,
  type Province,
  type ProvinceAlias,
} from './data.js';
import { FEMALE_FIRST_NAMES, LAST_NAMES, MALE_FIRST_NAMES } from './names.js';
import { seededRandom, type RandomSource } from './random.js';

export type Gender = 'male' | 'female';

/** A province name as pakdatakit spells it, or a short form such as `KP`. */
export type ProvinceInput = Province | ProvinceAlias;

/** Domains reserved for examples by RFC 2606. Nothing is ever delivered there. */
export const RESERVED_EMAIL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
] as const;
export type ReservedEmailDomain = (typeof RESERVED_EMAIL_DOMAINS)[number];

export interface CreateFakerOptions {
  /**
   * Seed for the built-in generator (sfc32 + cyrb128). The same seed gives
   * the same values on every platform and JavaScript engine.
   */
  seed?: number | string | undefined;
  /**
   * Your own source of numbers in `[0, 1)`, for example
   * `() => faker.number.float()` from `@faker-js/faker`, so that one seed
   * drives both libraries. Cannot be combined with `seed`.
   */
  random?: RandomSource | undefined;
  /**
   * Reference "today" for `dob`, `date` and `person` ages. Defaults to the
   * current time on each call. Set it with a seed for fully reproducible dates.
   */
  now?: Date | undefined;
}

export interface CnicOptions {
  /**
   * Province of registration. Defaults to a random province weighted roughly
   * by population (codes 1, 3, 4, 5, 6 and 7). Azad Jammu and Kashmir (code 8,
   * not in FBR's list) is only used when you ask for it.
   */
  province?: ProvinceInput | undefined;
  /**
   * Force the first digit, including 2 (former FATA) or 8 (AJK). Overrides
   * `province`.
   */
  provinceCode?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | undefined;
  /** Encoded in the last digit: odd for male, even for female. */
  gender?: Gender | undefined;
  /** `#####-#######-#` (default) or 13 plain digits. */
  formatted?: boolean | undefined;
}

export type PhoneFormat = 'local' | 'international' | 'e164';

export interface PhoneOptions {
  /** Network the prefix was originally allocated to. */
  network?: Network | undefined;
  /**
   * `local` → `03001234567` (default), `international` → `+92 300 1234567`,
   * `e164` → `+923001234567`.
   */
  format?: PhoneFormat | undefined;
  /**
   * `false` gives a number on an unallocated `036X` prefix: right shape, but
   * it cannot reach anyone. It deliberately FAILS `validatePhone`. Use it for
   * screenshots and UI demos where nothing should ever be contacted.
   * `network` is ignored.
   */
  dialable?: boolean | undefined;
}

export interface CityNumberOptions {
  /** City served by the area code. Throws if the city has no known code. */
  city?: string | undefined;
}

export interface IbanOptions {
  /**
   * 4-letter bank code such as `MEZN` or `SADA`. Any code in the dataset is
   * accepted when named explicitly, including merged banks and older aliases.
   */
  bank?: string | undefined;
  /** Restrict the random bank to one kind of institution. */
  type?: BankType | undefined;
  /** Group in blocks of four (`PK36 SCBL 0000 …`). Defaults to `false`. */
  formatted?: boolean | undefined;
}

export interface IbanDetails {
  iban: string;
  /** 4-letter bank code. */
  bankCode: string;
  /** Bank name as `getBankFromIBAN` returns it. */
  bank: string;
  bankType: BankType;
}

export interface NtnOptions {
  /**
   * `business` (default): 7 digits and a check digit, `1234567-8`.
   * `individual`: a CNIC, which individuals use as their NTN.
   */
  type?: 'business' | 'individual' | undefined;
  /** For `individual`: CNIC options such as province and gender. */
  cnic?: CnicOptions | undefined;
  /** For `business`: include the `-8` check digit. Defaults to `true`. */
  checkDigit?: boolean | undefined;
}

export interface NameOptions {
  gender?: Gender | undefined;
}

export interface CityOptions {
  province?: ProvinceInput | undefined;
}

export interface AddressOptions {
  /** City from pakdatakit's dataset. Random when omitted. */
  city?: string | undefined;
  /** Province to pick the random city from. Ignored when `city` is set. */
  province?: ProvinceInput | undefined;
  /** Append the province after the city. Defaults to `false`. */
  includeProvince?: boolean | undefined;
}

export interface AddressParts {
  /** First line: house, street and block, e.g. `House # 12, Street # 4`. */
  street: string;
  /** Neighbourhood, sector or scheme. */
  area: string;
  city: string;
  province: Province;
  /** From postal-codes.json for the city (and area when listed), else `null`. */
  postalCode: string | null;
  /** Everything joined into one mailing line. */
  full: string;
}

export interface CompanyOptions {
  city?: string | undefined;
}

export interface EmailOptions {
  /** Full name to build the local part from. Random when omitted. */
  name?: string | undefined;
  /** One of the RFC 2606 reserved domains. Random when omitted. */
  domain?: ReservedEmailDomain | undefined;
}

export interface AmountOptions {
  /** Defaults to 100. */
  min?: number | undefined;
  /** Defaults to 100,000. */
  max?: number | undefined;
  /** Decimal places. Defaults to 0 (whole rupees). */
  decimals?: number | undefined;
}

export interface DateOptions {
  /** Defaults to one year before `now`. */
  from?: Date | undefined;
  /** Defaults to `now`. */
  to?: Date | undefined;
}

export interface DobOptions {
  /** Defaults to 18. */
  minAge?: number | undefined;
  /** Defaults to 65. */
  maxAge?: number | undefined;
}

export interface RaastQrOptions {
  /** Payee IBAN. A random one when omitted. */
  iban?: string | undefined;
  /** Amount in PKR. Makes the QR dynamic, which needs an expiry. */
  amount?: number | undefined;
  /** Expiry for a QR with an amount. Defaults to `'1h'` when `amount` is set. */
  expiresIn?: number | RaastDuration | undefined;
}

export interface PersonOptions {
  gender?: Gender | undefined;
  /**
   * Province to live in. When omitted, any province except Azad Jammu and
   * Kashmir (whose CNIC code 8 is unverified); pass it to include AJK.
   */
  province?: ProvinceInput | undefined;
  /** City to live in. Sets the province. */
  city?: string | undefined;
  minAge?: number | undefined;
  maxAge?: number | undefined;
  /** Bank code for the IBAN. */
  bank?: string | undefined;
  phone?: Omit<PhoneOptions, 'format'> | undefined;
}

/** A coherent, entirely fictional person. */
export interface Person {
  name: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  /** First digit matches `province`, last digit matches `gender`. */
  cnic: string;
  /** `YYYY-MM-DD`. */
  dateOfBirth: string;
  phone: string;
  email: string;
  city: string;
  province: Province;
  /** District of the same name as the city, when there is one. */
  district?: string;
  address: string;
  postalCode: string | null;
  /**
   * Landline on the city's area code when known; otherwise on another area
   * code in the same province; `null` if the province has none in the dataset.
   */
  landline: string | null;
  iban: string;
  bank: string;
  /** Individuals use their CNIC as their NTN. */
  ntn: string;
}

export interface BusinessOptions {
  city?: string | undefined;
  province?: ProvinceInput | undefined;
  bank?: string | undefined;
}

/** A coherent, entirely fictional business. */
export interface Business {
  name: string;
  /** 7 digits and a check digit. */
  ntn: string;
  strn: string;
  city: string;
  province: Province;
  address: string;
  postalCode: string | null;
  phone: string;
  /** Same rules as {@link Person.landline}. */
  landline: string | null;
  /** UAN (`111`) on the city's area code, or `null` if it has none that UANs use. */
  uan: string | null;
  iban: string;
  bank: string;
}

/**
 * A set of generators that share one random source.
 *
 * SAFETY: CNICs, mobile numbers and IBANs are structurally valid and may belong
 * to REAL people or accounts; Pakistan has no reserved test ranges. Never call,
 * SMS or WhatsApp generated numbers, never send generated IBANs to real payment
 * providers. Use them in test and demo systems only.
 */
export interface Faker {
  /** Restart the built-in generator from a seed (replaces a custom `random`). */
  seed(seed: number | string): void;
  /** Next number in `[0, 1)`. */
  random(): number;
  /** Integer between `min` and `max`, inclusive. */
  int(min: number, max: number): number;
  /** Number between `min` (inclusive) and `max` (exclusive). */
  float(min: number, max: number): number;
  /** `true` with the given probability (default 0.5). */
  bool(probability?: number): boolean;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** String of `length` random digits (may start with 0). */
  digits(length: number): string;
  /** Calls `fn` `count` times. */
  many<T>(count: number, fn: (index: number) => T): T[];

  gender(): Gender;
  /** CNIC that passes `validateCNIC`; `getCNICInfo` reads back the province and gender. */
  cnic(options?: CnicOptions): string;
  /** Mobile number that passes `validatePhone` (unless `dialable: false`). */
  phone(options?: PhoneOptions): string;
  /** Landline such as `042-35761234`; `analyzeNumber` reports type `landline`. */
  landline(options?: CityNumberOptions): string;
  /** UAN such as `021-111-482-907`; `analyzeNumber` reports type `uan`. */
  uan(options?: CityNumberOptions): string;
  /** Checksum-valid PK IBAN of an active bank. */
  iban(options?: IbanOptions): string;
  /** IBAN with its bank's code, name and type. */
  ibanDetails(options?: IbanOptions): IbanDetails;
  ntn(options?: NtnOptions): string;
  /** 13-digit sales tax registration number. */
  strn(): string;
  firstName(options?: NameOptions): string;
  lastName(): string;
  name(options?: NameOptions): string;
  city(options?: CityOptions): string;
  /** Mailing address that `parseAddress` reads back with the same city. */
  address(options?: AddressOptions): string;
  addressParts(options?: AddressOptions): AddressParts;
  company(options?: CompanyOptions): string;
  /** Address on an RFC 2606 reserved domain (`example.com/.org/.net`). */
  email(options?: EmailOptions): string;
  amount(options?: AmountOptions): number;
  date(options?: DateOptions): Date;
  /** Date of birth at UTC midnight. */
  dob(options?: DobOptions): Date;
  /** Raast P2P QR payload for a (random) IBAN. */
  raastQr(options?: RaastQrOptions): string;
  person(options?: PersonOptions): Person;
  business(options?: BusinessOptions): Business;
}

const CNIC_PROVINCE_CODES: Readonly<Record<Province, number>> = {
  'Khyber Pakhtunkhwa': 1,
  Punjab: 3,
  Sindh: 4,
  Balochistan: 5,
  'Islamabad Capital Territory': 6,
  'Gilgit-Baltistan': 7,
  'Azad Jammu and Kashmir': 8,
};

/** Default CNIC province codes, weighted roughly by population. */
const DEFAULT_CNIC_CODES: ReadonlyArray<readonly [number, number]> = [
  [3, 50],
  [4, 22],
  [1, 15],
  [5, 6],
  [6, 4],
  [7, 3],
];

/** Unallocated mobile prefixes used for `dialable: false`. */
const UNALLOCATED_PREFIXES = [
  '0360',
  '0361',
  '0362',
  '0363',
  '0364',
  '0365',
  '0366',
  '0367',
  '0368',
  '0369',
];

const AREAS_BY_CITY: Readonly<Record<string, readonly string[]>> = {
  Lahore: [
    'Johar Town',
    'Wapda Town',
    'Faisal Town',
    'Garden Town',
    'Samanabad',
    'Shadman',
    'Township',
    'Valencia Town',
    'Bahria Town',
    'DHA Phase 5',
  ],
  Karachi: [
    'North Nazimabad',
    'Gulistan-e-Jauhar',
    'PECHS',
    'Bahadurabad',
    'Gulshan-e-Maymar',
    'North Karachi',
    'Scheme 33',
    'DHA Phase 6',
  ],
  Rawalpindi: [
    'Westridge',
    'Chaklala Scheme III',
    'Bahria Town',
    'Gulraiz Housing Scheme',
    'Lalazar',
  ],
  Faisalabad: [
    'Peoples Colony',
    'Madina Town',
    'Gulistan Colony',
    'Jinnah Colony',
    'Susan Road',
  ],
  Peshawar: ['Hayatabad', 'University Town', 'Gulbahar', 'Warsak Road'],
  Quetta: ['Jinnah Town', 'Samungli Housing Scheme', 'Shahbaz Town'],
  Multan: ['Gulgasht Colony', 'Shah Rukn-e-Alam Colony', 'New Multan'],
  Hyderabad: ['Latifabad', 'Qasimabad', 'Hirabad'],
  Gujranwala: ['Satellite Town', 'Peoples Colony', 'Model Town'],
  Sialkot: ['Cantt', 'Model Town', 'Defence Road'],
};

const GENERIC_AREAS: readonly string[] = [
  'Model Town',
  'Satellite Town',
  'Civil Lines',
  'Madina Town',
  'Muslim Town',
  'Jinnah Colony',
  'Iqbal Colony',
  'Officers Colony',
  'Garden Town',
  'Rehmanabad',
  'Farooq Colony',
  'Gulshan Colony',
  'Railway Colony',
  'Cantt',
];

const MOHALLAH_NAMES: readonly string[] = [
  'Islampura',
  'Rehmanpura',
  'Qasimpura',
  'Ghousia',
  'Noorpur',
  'Bilal Ganj',
  'Mustafabad',
  'Shah Faisal',
];

const COMPANY_PREFIXES: readonly string[] = [
  'Indus',
  'Ravi',
  'Chenab',
  'Sutlej',
  'Mehran',
  'Margalla',
  'Karakoram',
  'Bolan',
  'Hunza',
  'Shalimar',
  'Crescent Star',
  'Green Valley',
  'Sitara',
  'Kohsar',
  'Pak Asia',
  'United',
  'National',
  'Prime',
  'Sunrise',
  'Silver Oak',
];

const COMPANY_INDUSTRIES: readonly string[] = [
  'Textiles',
  'Foods',
  'Pharma',
  'Logistics',
  'Builders',
  'Steel',
  'Agro',
  'Rice Mills',
  'Cotton Ginners',
  'Electronics',
  'Packages',
  'Chemicals',
  'Motors',
  'Software',
  'Solar Energy',
  'Garments',
  'Surgical',
  'Sports',
  'Leather',
  'Cables',
];

const COMPANY_ARABIC_WORDS: readonly string[] = [
  'Noor',
  'Rehman',
  'Madina',
  'Hamd',
  'Fateh',
  'Barakat',
  'Hayat',
  'Mustafa',
  'Raheem',
  'Ameen',
];

const COMPANY_SUFFIXES: readonly string[] = [
  '(Pvt) Ltd',
  '(Pvt) Ltd',
  '(Pvt) Ltd',
  'Ltd',
  '(SMC-Pvt) Ltd',
];

const ISLAMABAD_SECTORS: ReadonlyArray<readonly [string, number, number]> = [
  ['E', 7, 11],
  ['F', 6, 11],
  ['G', 6, 15],
  ['I', 8, 10],
];

const DAY_MS = 86_400_000;

function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function shiftYears(date: Date, years: number): Date {
  const shifted = new Date(date.getTime());
  shifted.setUTCFullYear(shifted.getUTCFullYear() - years);
  return shifted;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** ISO 13616 check digits for a PK BBAN. */
function ibanCheckDigits(bban: string): string {
  const numeric = `${bban}PK00`.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString(),
  );
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return String(98 - remainder).padStart(2, '0');
}

function isDefaultBank(bank: BankEntry): boolean {
  return (
    bank.mergedInto === undefined &&
    bank.aliasOf === undefined &&
    bank.type !== 'central'
  );
}

let outsideAjk: CityEntry[] | undefined;
function citiesOutsideAjk(): CityEntry[] {
  outsideAjk ??= CITIES.filter(
    (entry) => entry.province !== 'Azad Jammu and Kashmir',
  );
  return outsideAjk;
}

let uanCodes: AreaCodeEntry[] | undefined;
/** Area codes whose UANs pass pakdatakit's UAN pattern. */
function uanAreaCodes(): AreaCodeEntry[] {
  uanCodes ??= AREA_CODES.filter(
    (entry) => analyzeNumber(`0${entry.code}111234567`)?.type === 'uan',
  );
  return uanCodes;
}

/**
 * Creates an independent set of generators.
 *
 * @example
 * const f = createFaker({ seed: 42 });
 * f.cnic();   // same value on every run and platform
 * f.person(); // coherent persona
 */
export function createFaker(options: CreateFakerOptions = {}): Faker {
  if (options.seed !== undefined && options.random !== undefined) {
    throw new RangeError('Pass either seed or random, not both');
  }
  let source: RandomSource =
    options.random ??
    seededRandom(options.seed ?? Math.floor(Math.random() * 2 ** 32));
  const fixedNow = options.now;
  const now = (): Date =>
    fixedNow ? new Date(fixedNow.getTime()) : new Date();

  function random(): number {
    const value = source();
    if (!(value >= 0 && value < 1)) {
      throw new RangeError(
        `random() must return a number in [0, 1), got ${value}`,
      );
    }
    return value;
  }

  function int(min: number, max: number): number {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return lo + Math.floor(random() * (hi - lo + 1));
  }

  function float(min: number, max: number): number {
    return min + random() * (max - min);
  }

  function bool(probability = 0.5): boolean {
    return random() < probability;
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('Cannot pick from an empty array');
    }
    return items[Math.floor(random() * items.length)] as T;
  }

  function weighted<T>(items: ReadonlyArray<readonly [T, number]>): T {
    const total = items.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = random() * total;
    for (const [item, weight] of items) {
      roll -= weight;
      if (roll < 0) return item;
    }
    return (items[items.length - 1] as readonly [T, number])[0];
  }

  function digits(length: number): string {
    let out = '';
    for (let i = 0; i < length; i += 1) out += String(int(0, 9));
    return out;
  }

  function many<T>(count: number, fn: (index: number) => T): T[] {
    return Array.from({ length: count }, (_, index) => fn(index));
  }

  function gender(): Gender {
    return bool() ? 'male' : 'female';
  }

  function cnic(opts: CnicOptions = {}): string {
    const first =
      opts.provinceCode ??
      (opts.province !== undefined
        ? CNIC_PROVINCE_CODES[resolveProvince(opts.province)]
        : weighted(DEFAULT_CNIC_CODES));
    const sex = opts.gender ?? gender();
    const last = sex === 'male' ? pick([1, 3, 5, 7, 9]) : pick([0, 2, 4, 6, 8]);
    const body = `${first}${int(1, 9)}${digits(3)}`;
    const middle = digits(7);
    return opts.formatted === false
      ? `${body}${middle}${last}`
      : `${body}-${middle}-${last}`;
  }

  function mobileNational(network?: Network): string {
    const prefixes = network
      ? NETWORKS.filter((entry) => entry.network === network)
      : NETWORKS;
    if (prefixes.length === 0) {
      throw new RangeError(`Unknown network: ${String(network)}`);
    }
    // 10 digits without the trunk 0, e.g. 3001234567
    return `${pick(prefixes).prefix.slice(1)}${int(1, 9)}${digits(6)}`;
  }

  function formatMobile(national: string, format: PhoneFormat): string {
    switch (format) {
      case 'e164':
        return `+92${national}`;
      case 'international':
        return `+92 ${national.slice(0, 3)} ${national.slice(3)}`;
      default:
        return `0${national}`;
    }
  }

  function phone(opts: PhoneOptions = {}): string {
    const national =
      opts.dialable === false
        ? `${pick(UNALLOCATED_PREFIXES).slice(1)}${int(1, 9)}${digits(6)}`
        : mobileNational(opts.network);
    return formatMobile(national, opts.format ?? 'local');
  }

  function areaEntryFor(city: string, uanOnly: boolean): AreaCodeEntry {
    // Some area-code cities (e.g. Naushero Feroze) are not in cities.json.
    const found = areaCodeFor(city);
    if (!found) resolveCity(city);
    const entry =
      found && (!uanOnly || uanAreaCodes().includes(found)) ? found : undefined;
    if (!entry) {
      throw new RangeError(
        `No ${uanOnly ? 'UAN' : 'landline'} area code is known for ${city}`,
      );
    }
    return entry;
  }

  function landlineOn(entry: AreaCodeEntry): string {
    const length =
      entry.code === '21' || entry.code === '42'
        ? 8
        : entry.code.length === 2
          ? 7
          : 6;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const subscriber = `${int(2, 9)}${digits(length - 1)}`;
      const value = `0${entry.code}-${subscriber}`;
      const info = analyzeNumber(value);
      if (info?.type === 'landline' && info.areaCode === `0${entry.code}`) {
        return value;
      }
    }
    throw new Error(
      `Could not generate a landline for area code 0${entry.code}`,
    );
  }

  function landline(opts: CityNumberOptions = {}): string {
    const entry =
      opts.city !== undefined
        ? areaEntryFor(opts.city, false)
        : pick(AREA_CODES);
    return landlineOn(entry);
  }

  function uanOn(entry: AreaCodeEntry): string {
    return `0${entry.code}-111-${int(1, 9)}${digits(2)}-${digits(3)}`;
  }

  function uan(opts: CityNumberOptions = {}): string {
    const entry =
      opts.city !== undefined
        ? areaEntryFor(opts.city, true)
        : pick(uanAreaCodes());
    return uanOn(entry);
  }

  function ibanDetails(opts: IbanOptions = {}): IbanDetails {
    let bank: BankEntry | undefined;
    if (opts.bank !== undefined) {
      const code = opts.bank.trim().toUpperCase();
      bank = BANKS.find((entry) => entry.code === code);
      if (!bank) throw new RangeError(`Unknown bank code: ${opts.bank}`);
    } else {
      const candidates = BANKS.filter((entry) =>
        opts.type !== undefined
          ? entry.type === opts.type &&
            entry.mergedInto === undefined &&
            entry.aliasOf === undefined
          : isDefaultBank(entry),
      );
      if (candidates.length === 0) {
        throw new RangeError(`No active bank of type ${String(opts.type)}`);
      }
      bank = pick(candidates);
    }
    // SadaPay account numbers are the holder's mobile number.
    const account =
      bank.code === 'SADA' ? `000000${mobileNational()}` : digits(16);
    const bban = `${bank.code}${account}`;
    const iban = `PK${ibanCheckDigits(bban)}${bban}`;
    return {
      iban:
        opts.formatted === true
          ? (iban.match(/.{1,4}/g) ?? []).join(' ')
          : iban,
      bankCode: bank.code,
      bank: bank.name,
      bankType: bank.type,
    };
  }

  function iban(opts: IbanOptions = {}): string {
    return ibanDetails(opts).iban;
  }

  function ntn(opts: NtnOptions = {}): string {
    if (opts.type === 'individual') {
      return cnic(opts.cnic);
    }
    const base = `${int(1, 9)}${digits(6)}`;
    return opts.checkDigit === false ? base : `${base}-${int(0, 9)}`;
  }

  function strn(): string {
    return `${int(1, 9)}${digits(12)}`;
  }

  function firstName(opts: NameOptions = {}): string {
    const sex = opts.gender ?? gender();
    return pick(sex === 'male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
  }

  function lastName(): string {
    return pick(LAST_NAMES);
  }

  function name(opts: NameOptions = {}): string {
    return `${firstName(opts)} ${lastName()}`;
  }

  function cityEntry(opts: {
    province?: ProvinceInput | undefined;
  }): CityEntry {
    if (opts.province === undefined) return pick(CITIES);
    const province = resolveProvince(opts.province);
    return pick(citiesIn(province));
  }

  function city(opts: CityOptions = {}): string {
    return cityEntry(opts).city;
  }

  function addressParts(opts: AddressOptions = {}): AddressParts {
    const entry =
      opts.city !== undefined ? resolveCity(opts.city) : cityEntry(opts);
    const postal = postalEntriesFor(entry.city);
    const primary = postal.find((item) => item.primary) ?? postal[0];
    const postalAreas = postal.filter(
      (item) => item.area !== undefined && !/\bGPO\b/.test(item.area),
    );

    let area: string;
    let postalCode = primary?.postalCode ?? null;
    let street = `House # ${int(1, 450)}`;

    if (entry.city === 'Islamabad') {
      const [letter, lo, hi] = pick(ISLAMABAD_SECTORS);
      area = `Sector ${letter}-${int(lo, hi)}/${int(1, 4)}`;
      street += `, Street # ${int(1, 90)}`;
    } else {
      const named = AREAS_BY_CITY[entry.city] ?? [];
      const roll = random();
      if (postalAreas.length > 0 && roll < 0.4) {
        const chosen = pick(postalAreas);
        area = chosen.area as string;
        postalCode = chosen.postalCode;
      } else if (named.length > 0) {
        area = pick(named);
      } else if (bool(0.25)) {
        area = `Mohallah ${pick(MOHALLAH_NAMES)}`;
      } else {
        area = pick(GENERIC_AREAS);
      }
      const style = int(0, 2);
      if (style === 0) {
        street += `, Street # ${int(1, 40)}`;
      } else if (style === 1) {
        street += `, Block ${pick(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])}`;
      } else {
        street = `${int(1, 300)}-${pick(['A', 'B', 'C', 'D'])}`;
      }
    }

    const segments = [street, area, entry.city];
    if (opts.includeProvince === true) segments.push(entry.province);
    let full = segments.join(', ');
    if (postalCode !== null) full += ` ${postalCode}`;

    return {
      street,
      area,
      city: entry.city,
      province: entry.province,
      postalCode,
      full,
    };
  }

  function address(opts: AddressOptions = {}): string {
    return addressParts(opts).full;
  }

  function company(opts: CompanyOptions = {}): string {
    const place =
      opts.city !== undefined ? resolveCity(opts.city).city : city();
    switch (int(0, 6)) {
      case 0:
        return `${lastName()} Traders`;
      case 1:
        return `${lastName()} & Sons`;
      case 2:
        return `${lastName()} Brothers`;
      case 3:
        return `Al-${pick(COMPANY_ARABIC_WORDS)} Enterprises`;
      case 4:
        return `${pick(COMPANY_PREFIXES)} Industries`;
      case 5:
        return `${place}${pick(COMPANY_INDUSTRIES)} ${pick(COMPANY_SUFFIXES)}`;
      default:
        return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_INDUSTRIES)} ${pick(COMPANY_SUFFIXES)}`;
    }
  }

  function email(opts: EmailOptions = {}): string {
    const domain = opts.domain ?? pick(RESERVED_EMAIL_DOMAINS);
    if (!(RESERVED_EMAIL_DOMAINS as readonly string[]).includes(domain)) {
      throw new RangeError(
        `Only RFC 2606 domains are allowed: ${RESERVED_EMAIL_DOMAINS.join(', ')}`,
      );
    }
    const parts = (opts.name ?? name())
      .split(/\s+/)
      .map(slug)
      .filter((part) => part.length > 0);
    const first = parts[0] ?? 'user';
    const last = parts.length > 1 ? (parts[parts.length - 1] as string) : '';
    const number = int(1, 999);
    let local: string;
    switch (last === '' ? 3 : int(0, 3)) {
      case 0:
        local = `${first}.${last}`;
        break;
      case 1:
        local = `${first}${last}${number}`;
        break;
      case 2:
        local = `${first[0]}.${last}${number}`;
        break;
      default:
        local = `${first}${last === '' ? '' : `_${last}`}${number}`;
    }
    return `${local}@${domain}`;
  }

  function amount(opts: AmountOptions = {}): number {
    const min = opts.min ?? 100;
    const max = opts.max ?? 100_000;
    const decimals = opts.decimals ?? 0;
    if (min > max) throw new RangeError('amount: min must not exceed max');
    const factor = 10 ** decimals;
    return int(Math.ceil(min * factor), Math.floor(max * factor)) / factor;
  }

  function date(opts: DateOptions = {}): Date {
    const to = opts.to ?? now();
    const from = opts.from ?? shiftYears(to, 1);
    const start = from.getTime();
    const end = to.getTime();
    if (start > end) throw new RangeError('date: from must not be after to');
    return new Date(start + Math.floor(random() * (end - start + 1)));
  }

  function dob(opts: DobOptions = {}): Date {
    const minAge = opts.minAge ?? 18;
    const maxAge = opts.maxAge ?? 65;
    if (minAge > maxAge)
      throw new RangeError('dob: minAge must not exceed maxAge');
    const today = now();
    const latest = utcMidnight(shiftYears(today, minAge));
    const earliest = utcMidnight(shiftYears(today, maxAge + 1)) + DAY_MS;
    const days = Math.floor((latest - earliest) / DAY_MS);
    return new Date(earliest + int(0, days) * DAY_MS);
  }

  function raastQr(opts: RaastQrOptions = {}): string {
    const payee = opts.iban ?? iban();
    if (opts.amount === undefined) {
      return createRaastP2PQr(
        opts.expiresIn === undefined
          ? { iban: payee }
          : { iban: payee, expiresIn: opts.expiresIn },
      );
    }
    return createRaastP2PQr({
      iban: payee,
      amount: opts.amount,
      expiresIn: opts.expiresIn ?? '1h',
    });
  }

  function landlineNear(place: string, province: Province): string | null {
    const own = areaCodeFor(place);
    if (own) return landlineOn(own);
    const nearby = areaCodesIn(province);
    return nearby.length > 0 ? landlineOn(pick(nearby)) : null;
  }

  function homeCity(opts: {
    city?: string | undefined;
    province?: ProvinceInput | undefined;
  }): CityEntry {
    if (opts.city !== undefined) return resolveCity(opts.city);
    if (opts.province !== undefined) return cityEntry(opts);
    return pick(citiesOutsideAjk());
  }

  function person(opts: PersonOptions = {}): Person {
    const home = homeCity(opts);
    const sex = opts.gender ?? gender();
    const first = firstName({ gender: sex });
    const last = lastName();
    const fullName = `${first} ${last}`;
    const id = cnic({ province: home.province, gender: sex });
    const born = dob({ minAge: opts.minAge, maxAge: opts.maxAge });
    const mobile = phone(opts.phone);
    const mail = email({ name: fullName });
    const addr = addressParts({ city: home.city });
    const phoneLine = landlineNear(home.city, home.province);
    const account = ibanDetails({ bank: opts.bank });
    const district = districtFor(home.city);

    const result: Person = {
      name: fullName,
      firstName: first,
      lastName: last,
      gender: sex,
      cnic: id,
      dateOfBirth: born.toISOString().slice(0, 10),
      phone: mobile,
      email: mail,
      city: home.city,
      province: home.province,
      address: addr.full,
      postalCode: addr.postalCode,
      landline: phoneLine,
      iban: account.iban,
      bank: account.bank,
      ntn: id,
    };
    if (district !== undefined) result.district = district;
    return result;
  }

  function business(opts: BusinessOptions = {}): Business {
    const home =
      opts.city !== undefined || opts.province !== undefined
        ? homeCity(opts)
        : pick(CITIES);
    const addr = addressParts({ city: home.city });
    const uanEntry = uanAreaCodes().find((entry) =>
      entry.cities.some((name) => name === home.city),
    );
    const account = ibanDetails({ bank: opts.bank });
    return {
      name: company({ city: home.city }),
      ntn: ntn({ type: 'business' }),
      strn: strn(),
      city: home.city,
      province: home.province,
      address: addr.full,
      postalCode: addr.postalCode,
      phone: phone(),
      landline: landlineNear(home.city, home.province),
      uan: uanEntry ? uanOn(uanEntry) : null,
      iban: account.iban,
      bank: account.bank,
    };
  }

  return {
    seed(value: number | string) {
      source = seededRandom(value);
    },
    random,
    int,
    float,
    bool,
    pick,
    digits,
    many,
    gender,
    cnic,
    phone,
    landline,
    uan,
    iban,
    ibanDetails,
    ntn,
    strn,
    firstName,
    lastName,
    name,
    city,
    address,
    addressParts,
    company,
    email,
    amount,
    date,
    dob,
    raastQr,
    person,
    business,
  };
}

export { PROVINCES };
