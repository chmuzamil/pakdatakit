import citiesData from '../data/cities.json';
import { lazy, normalizeKey } from './internal/normalize.js';

/** Couriers that {@link mapCourierStatus} knows about. */
export type Courier = 'TCS' | 'Leopards' | 'PostEx' | 'M&P' | 'Trax' | 'BlueEx';

/** A courier's status in one vocabulary, from order to delivery or return. */
export type CourierStatus =
  | 'pending'
  | 'booked'
  | 'picked-up'
  | 'in-transit'
  | 'out-for-delivery'
  | 'attempted'
  | 'under-review'
  | 'delivered'
  | 'returning'
  | 'returned'
  | 'cancelled';

/**
 * Status values each courier documents publicly, by normalised key
 * (lower case, single spaces, straight apostrophes). Only documented values
 * are listed (see DATA.md); anything else maps to `null`.
 *
 * - PostEx: "Merchant API Integration Guide" M- v4.1.9, order status IDs
 *   (§3.15) and tracking history codes (§3.8).
 * - Leopards: "Returned to Shipper", from its e-commerce FAQ.
 * - TCS, M&P, Trax and BlueEx publish no status list outside their merchant
 *   portals, so nothing is mapped for them.
 */
const STATUSES: Readonly<
  Record<Courier, Readonly<Record<string, CourierStatus>>>
> = {
  PostEx: {
    // Order status IDs and names (§3.15).
    '1': 'pending',
    unbooked: 'pending',
    '2': 'booked',
    booked: 'booked',
    '3': 'in-transit',
    'postex warehouse': 'in-transit',
    '4': 'out-for-delivery',
    'out for delivery': 'out-for-delivery',
    '5': 'delivered',
    delivered: 'delivered',
    '6': 'returned',
    returned: 'returned',
    '7': 'cancelled',
    'un-assigned by me': 'cancelled',
    '8': 'cancelled',
    expired: 'cancelled',
    '9': 'under-review',
    'delivery under review': 'under-review',
    '15': 'picked-up',
    'picked by postex': 'picked-up',
    '16': 'returning',
    'out for return': 'returning',
    '17': 'attempted',
    attempted: 'attempted',
    '18': 'in-transit',
    'en-route to postex warehouse': 'in-transit',
    // Tracking history codes and messages (§3.8).
    '0001': 'booked',
    "at merchant's warehouse": 'booked',
    '0002': 'returned',
    '0003': 'in-transit',
    'at postex warehouse': 'in-transit',
    '0004': 'in-transit',
    'package on root': 'in-transit',
    'package on route': 'in-transit',
    '0005': 'delivered',
    '0006': 'returned',
    '0007': 'returned',
    '0008': 'under-review',
    '0013': 'attempted',
  },
  Leopards: {
    'returned to shipper': 'returned',
  },
  TCS: {},
  'M&P': {},
  Trax: {},
  BlueEx: {},
};

/** Accepted spellings of each courier's name. */
const COURIER_NAMES: Readonly<Record<string, Courier>> = {
  tcs: 'TCS',
  leopards: 'Leopards',
  'leopards courier': 'Leopards',
  lcs: 'Leopards',
  postex: 'PostEx',
  'm&p': 'M&P',
  mnp: 'M&P',
  'm and p': 'M&P',
  'muller & phipps': 'M&P',
  'muller and phipps': 'M&P',
  trax: 'Trax',
  blueex: 'BlueEx',
  'blue ex': 'BlueEx',
  'blue-ex': 'BlueEx',
};

const statusKey = (text: string): string =>
  normalizeKey(text.replace(/[‘’`]/g, "'"));

/**
 * Maps a courier's own status (its name, numeric ID or code, as the courier
 * documents it) to a {@link CourierStatus}.
 *
 * Matching ignores case and extra spaces. PostEx's "Attempt Made: <reason>"
 * history messages map to `attempted`.
 *
 * Only statuses the courier documents publicly are mapped: PostEx's API
 * guide and one Leopards status. TCS, M&P, Trax and BlueEx publish no list,
 * so they always return `null`, as does any status not in the list. No API
 * is called.
 *
 * @param courier - `TCS`, `Leopards`, `PostEx`, `M&P`, `Trax` or `BlueEx`
 *   (case-insensitive; `LCS`, `MnP` and `Blue Ex` are accepted)
 * @param raw - The status as the courier returned it
 * @returns The status, or `null`. Never throws.
 */
export function mapCourierStatus(
  courier: string,
  raw: string | number,
): CourierStatus | null {
  if (typeof courier !== 'string') return null;
  const courierKey = statusKey(courier);
  if (!Object.prototype.hasOwnProperty.call(COURIER_NAMES, courierKey)) {
    return null;
  }
  const name = COURIER_NAMES[courierKey] as Courier;
  let key: string;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 0) return null;
    key = String(raw);
  } else if (typeof raw === 'string') {
    key = statusKey(raw);
  } else {
    return null;
  }
  const table = STATUSES[name];
  if (Object.prototype.hasOwnProperty.call(table, key)) {
    return table[key] as CourierStatus;
  }
  if (name === 'PostEx' && /^attempt made\b/.test(key)) return 'attempted';
  return null;
}

/**
 * Short forms and old names of cities, as people and courier forms write
 * them: airport and dialling-style codes, Roman Urdu spellings, the former
 * name Lyallpur, and Urdu script.
 */
const CITY_ALIASES: Readonly<Record<string, string>> = {
  lhr: 'Lahore',
  lhe: 'Lahore',
  lahor: 'Lahore',
  لاہور: 'Lahore',
  khi: 'Karachi',
  krachi: 'Karachi',
  کراچی: 'Karachi',
  pindi: 'Rawalpindi',
  rwp: 'Rawalpindi',
  'rawal pindi': 'Rawalpindi',
  راولپنڈی: 'Rawalpindi',
  isb: 'Islamabad',
  isl: 'Islamabad',
  'اسلام آباد': 'Islamabad',
  lyallpur: 'Faisalabad',
  lyp: 'Faisalabad',
  fsd: 'Faisalabad',
  'faisal abad': 'Faisalabad',
  'فیصل آباد': 'Faisalabad',
  mux: 'Multan',
  mtn: 'Multan',
  ملتان: 'Multan',
  pew: 'Peshawar',
  psh: 'Peshawar',
  پشاور: 'Peshawar',
  uet: 'Quetta',
  qta: 'Quetta',
  کوئٹہ: 'Quetta',
  hyd: 'Hyderabad',
  حیدرآباد: 'Hyderabad',
  'حیدر آباد': 'Hyderabad',
  skt: 'Sialkot',
  سیالکوٹ: 'Sialkot',
  grw: 'Gujranwala',
  گوجرانوالہ: 'Gujranwala',
  dgk: 'Dera Ghazi Khan',
  'dg khan': 'Dera Ghazi Khan',
  'd g khan': 'Dera Ghazi Khan',
  dik: 'Dera Ismail Khan',
  'di khan': 'Dera Ismail Khan',
  'd i khan': 'Dera Ismail Khan',
  ryk: 'Rahim Yar Khan',
  bwp: 'Bahawalpur',
  sgd: 'Sargodha',
  mzd: 'Muzaffarabad',
};

const cityByKey = /* @__PURE__ */ lazy(() => {
  const map = new Map<string, string>();
  for (const { city } of citiesData as Array<{ city: string }>) {
    map.set(normalizeKey(city), city);
  }
  return map;
});

/** Lower case, with dots and commas removed and spaces collapsed. */
const cityKey = (text: string): string =>
  normalizeKey(text.replace(/[.,]/g, ' '));

/**
 * Maps the way a customer or a courier writes a city to the city's name in
 * pakdatakit's city list, so orders can be matched against a courier's
 * service list.
 *
 * Accepts the exact name in any case, short forms (`LHR`, `Khi`, `Pindi`,
 * `Isb`, `FSD`), the old name Lyallpur, a trailing "city", and the main
 * cities in Urdu script.
 *
 * @example
 * normalizeCityForCourier('LHR'); // "Lahore"
 * normalizeCityForCourier('lyallpur'); // "Faisalabad"
 * normalizeCityForCourier('Karachi City'); // "Karachi"
 * normalizeCityForCourier('Atlantis'); // null
 *
 * @returns A city from the city list, or `null`. Never throws.
 */
export function normalizeCityForCourier(input: string): string | null {
  if (typeof input !== 'string') return null;
  let key = cityKey(input);
  if (key.length === 0) return null;
  for (let pass = 0; pass < 2; pass += 1) {
    const city =
      cityByKey().get(key) ??
      (Object.prototype.hasOwnProperty.call(CITY_ALIASES, key)
        ? CITY_ALIASES[key]
        : undefined);
    if (city !== undefined) return city;
    if (!key.endsWith(' city')) break;
    key = key.slice(0, -' city'.length).trim();
  }
  return null;
}
