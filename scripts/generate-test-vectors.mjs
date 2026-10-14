#!/usr/bin/env node
/**
 * Generates language-neutral test vectors from the built TypeScript library,
 * so ports (python/) can check they give identical results.
 *
 *   npm run build && node scripts/generate-test-vectors.mjs
 *
 * 1. Copies data/*.json into python/src/pakdatakit/data/ (byte-identical).
 * 2. Runs dist/index.js over a broad set of inputs and writes
 *    test-vectors/<module>.json as
 *    [{ "fn", "args", "kwargs", "expected", "throws", "error"? }].
 *
 * Conventions:
 * - `fn` is the TypeScript export name; `kwargs` holds the option-object keys
 *   (camelCase). Functions in OPTIONS_ONLY take `kwargs` as their only argument.
 * - Dates are `{ "$date": "YYYY-MM-DD" }` or `{ "$date": "YYYY-MM-DDTHH:mm:ss" }`
 *   in local time, read and written as local calendar dates.
 * - Non-JSON numbers are `{ "$num": "NaN" | "Infinity" | "-Infinity" }`.
 * - Nothing depends on the current time: functions that read "now" get a
 *   fixed `now`, and the process runs in UTC.
 */

import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'UTC';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = await import(new URL('../dist/index.js', import.meta.url).href);

// ---------------------------------------------------------------------------
// 1. Data sync
// ---------------------------------------------------------------------------

const dataDir = join(root, 'data');
const pyDataDir = join(root, 'python', 'src', 'pakdatakit', 'data');
mkdirSync(pyDataDir, { recursive: true });
const dataFiles = readdirSync(dataDir).filter((name) => name.endsWith('.json'));
for (const name of dataFiles) {
  copyFileSync(join(dataDir, name), join(pyDataDir, name));
}
const readData = (name) =>
  JSON.parse(readFileSync(join(dataDir, name), 'utf8'));
const cities = readData('cities.json');
const districts = readData('districts.json');
const postal = readData('postal-codes.json');
const networks = readData('networks.json');
const banks = readData('banks.json');
const areaCodes = readData('area-codes.json');

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

const RealDate = globalThis.Date;
const OPTIONS_ONLY = new Set([
  'createRaastP2PQr',
  'createMerchantQr',
  'formatAddress',
]);

/** A date argument: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm[:ss]' (local time). */
const D = (text) => ({ $date: text });
const NUM = (text) => ({ $num: text });

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if ('$date' in value) {
      const [date, time = '00:00:00'] = value.$date.split('T');
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm, ss = 0] = time.split(':').map(Number);
      const result = new RealDate(2000, m - 1, d, hh, mm, ss);
      result.setFullYear(y);
      return result;
    }
    if ('$num' in value) return Number(value.$num);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, decode(v)]),
    );
  }
  return value;
}

const pad = (n, width = 2) => String(n).padStart(width, '0');

function encode(value) {
  if (value instanceof RealDate) {
    const date = `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    const midnight =
      value.getHours() === 0 &&
      value.getMinutes() === 0 &&
      value.getSeconds() === 0;
    return {
      $date: midnight
        ? date
        : `${date}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
    };
  }
  if (typeof value === 'number' && !Number.isFinite(value))
    return NUM(String(value));
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = encode(v);
    }
    return out;
  }
  return value;
}

/** Runs `fn` with `new Date()` returning `now`. */
function withClock(now, fn) {
  if (now === undefined) return fn();
  const fixed = decode(now).getTime();
  class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length === 0 ? [fixed] : args));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FixedDate;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

const vectors = new Map();

/** Records one call: `call(module, fn, args, kwargs)`. */
function call(module, fn, args = [], kwargs = undefined) {
  const f = lib[fn];
  if (typeof f !== 'function') throw new Error(`Unknown export ${fn}`);
  const jsArgs = decode(args);
  let invoke;
  if (OPTIONS_ONLY.has(fn)) {
    invoke = () => f(decode(kwargs ?? {}));
  } else if (kwargs !== undefined) {
    invoke = () => f(...jsArgs, decode(kwargs));
  } else {
    invoke = () => f(...jsArgs);
  }
  const vector = { fn, args: encode(args), kwargs: encode(kwargs ?? {}) };
  try {
    const result = withClock(
      fn === 'createRaastP2PQr' ? kwargs?.now : undefined,
      invoke,
    );
    vector.expected = result === undefined ? null : encode(result);
    vector.throws = false;
  } catch (error) {
    vector.expected = null;
    vector.throws = true;
    vector.error = error?.name ?? 'Error';
  }
  if (!vectors.has(module)) vectors.set(module, []);
  vectors.get(module).push(vector);
  return vector.expected;
}

const each = (module, fns, inputs) => {
  for (const input of inputs) for (const fn of fns) call(module, fn, [input]);
};

const unique = (values) => [...new Set(values)];

// ---------------------------------------------------------------------------
// 2. Inputs
// ---------------------------------------------------------------------------

// CNIC ----------------------------------------------------------------------
const cnics = [
  '35202-1234567-1',
  '3520212345671',
  '35202 1234567 1',
  '35202.1234567.1',
  '35202–1234567–1',
  '35202—1234567—1',
  '35202‐1234567‐1',
  '35202‑1234567‑1',
  '35202‒1234567‒1',
  '35202-1234567 1',
  '35202-12345671',
  '352021234567-1',
  '  35202-1234567-1  ',
  ' 35202-1234567-2﻿',
  '\t3520212345672\n',
  '35202\n1234567\n1',
  '۳۵۲۰۲-۱۲۳۴۵۶۷-۱',
  '٣٥٢٠٢١٢٣٤٥٦٧٢',
  '۳۵۲۰۲-1234567-۴',
  '05202-1234567-1',
  '95202-1234567-1',
  '35202-1234567-12',
  '3520-1234567-1',
  '352021234567',
  '35202123456712',
  'abcde-fghijkl-m',
  '',
  ' ',
  '35202_1234567_1',
  '35202--1234567--1',
  '35202/1234567/1',
  '３５２０２１２３４５６７１',
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((p) => [
    `${p}1101-1234567-${p}`,
    `${p}110112345670`,
  ]),
];
each('cnic', ['validateCNIC', 'getCNICInfo'], cnics);

// Phone, networks, WhatsApp ------------------------------------------------------
const phones = unique([
  '03001234567',
  '0300-1234567',
  '0300 123 4567',
  '0300.123.4567',
  '0300/1234567',
  '(0300) 1234567',
  '+923001234567',
  '+92 300 1234567',
  '+92-300-1234567',
  '+92 (0) 300 1234567',
  '+920300 1234567',
  '00923001234567',
  '0092 300 1234567',
  '923001234567',
  '3001234567',
  '۰۳۰۰۱۲۳۴۵۶۷',
  '٠٣٠٠١٢٣٤٥٦٧',
  '۰۳۰۰-۱۲۳۴۵۶۷',
  '03601234567',
  '03901234567',
  '0300123456',
  '030012345678',
  '92300123456',
  '9203001234567',
  '+44 7911 123456',
  '',
  'abc',
  '+',
  '0300 1234567 ',
  ' 0300 1234567',
  '0300—1234567',
  '+92 3001234567',
  '92 0300 1234567',
  '00 92 300 1234567',
  '+0092 300 1234567',
  '0423001234567',
  '04235761234',
  ...networks.flatMap(({ prefix }) => [
    `${prefix}1234567`,
    `+92${prefix.slice(1)}7654321`,
  ]),
  ...Array.from({ length: 100 }, (_, i) => `03${pad(i)}5550000`),
]);
each('phone', ['validatePhone', 'formatPhone', 'analyzePhone'], phones);
each('networks', ['getNetwork'], phones);
for (const phone of [
  '03001234567',
  '+92 345 1234567',
  '3211234567',
  'invalid',
  '',
]) {
  call('whatsapp', 'createWhatsAppLink', [phone]);
  for (const message of [
    '',
    'Hello',
    'Assalam o Alaikum! کیا حال ہے؟',
    '100% & more = fun?',
    "a+b/c#d'e(f)*g~h!i",
    'line1\nline2',
    'emoji 😀',
    'ünïcödé',
  ]) {
    call('whatsapp', 'createWhatsAppLink', [phone, message]);
  }
}

// IBAN ----------------------------------------------------------------------
function ibanFor(bank, account) {
  const bban = `${bank}${account}`;
  const numeric = `${bban}PK00`.replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let rem = 0;
  for (const digit of numeric) rem = (rem * 10 + Number(digit)) % 97;
  return `PK${pad(98 - rem)}${bban}`;
}
const ibans = unique([
  'PK36SCBL0000001123456702',
  'PK36 SCBL 0000 0011 2345 6702',
  'pk36scbl0000001123456702',
  'PK36-SCBL-0000-0011-2345-6702',
  ' PK36SCBL0000001123456702 ',
  'PK37SCBL0000001123456702',
  'PK36SCBL000000112345670',
  'PK36SCBL00000011234567022',
  'GB29NWBK60161331926819',
  '',
  'PK',
  'PK36SCB10000001123456702',
  'PK36scbl0000001123456702',
  'PK36SCBL000000112345670A',
  'PK36.SCBL.0000.0011.2345.6702',
  'PK36/SCBL/0000/0011/2345/6702',
  'PK٣٦SCBL0000001123456702',
  ibanFor('ZZZZ', '0000001123456702'),
  ibanFor('MEZN', '00AB0012345678CD'),
  ...banks.flatMap(({ code }) => [
    ibanFor(code, '0000001123456702'),
    ibanFor(code, '1234567890123456'),
  ]),
]);
each('iban', ['validateIBAN', 'getBankFromIBAN'], ibans);
each(
  'iban',
  ['getBankInfo'],
  unique([
    ...ibans,
    ...banks.flatMap(({ code }) => [code, code.toLowerCase(), ` ${code} `]),
    'ZZZZ',
    'MEZ',
    'MEZN1',
    'ME ZN',
    'me-zn',
    'M3ZN',
    '',
    ' ',
    'PK36',
    'SCBL0000',
  ]),
);
call('iban', 'getBanks', []);

// Postal --------------------------------------------------------------------
const postalCodes = unique(postal.map((e) => e.postalCode));
const postalCities = unique(postal.map((e) => e.city));
each(
  'postal',
  ['getCityByPostalCode'],
  [
    ...postalCodes,
    ' 54000 ',
    '54 000',
    '5\t4\n000',
    '99999',
    '',
    ' ',
    'abc',
    '5400',
    '540000',
  ],
);
const cityVariants = (names) =>
  unique([
    ...names,
    ...names.map((n) => n.toLowerCase()),
    ...names.map((n) => `  ${n.toUpperCase().replace(/ /g, '   ')} `),
    '',
    ' ',
    'Atlantis',
    'lahore city',
  ]);
each(
  'postal',
  ['getPostalCode', 'getPostalCodes', 'getPostalAreas'],
  cityVariants(postalCities),
);
each(
  'postal',
  ['searchPostalCodes'],
  unique([
    'lah',
    'LAH',
    '54',
    '5',
    '7',
    'gpo',
    'model',
    'cantt',
    'town',
    'karachi',
    'z',
    '',
    ' ',
    '  44 ',
    'sector',
    'city',
    '000',
    'abc123',
    ...'abcdefghijklmnopqrstuvwxyz'.split(''),
    ...postalCities,
    ...postal.filter((e) => e.area).map((e) => e.area),
  ]),
);

// Geography -----------------------------------------------------------------
const cityNames = unique(cities.map((e) => e.city));
const districtNames = unique(districts.map((e) => e.district));
const provinces = unique([
  ...cities.map((e) => e.province),
  ...districts.map((e) => e.province),
]);
const queries = unique([
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  'dera',
  'abad',
  'khan',
  'pur',
  'kot',
  'ghazi',
  'DERA  GHAZI',
  'west',
  'east',
  'upper',
  'lower',
  'south',
  'north',
  'central',
  'city',
  '-',
  ' ',
  '',
  'zz',
  'i',
  'an',
  'ar',
  'al',
]);
each('geo', ['getProvince'], cityVariants(cityNames));
each('geo', ['searchCities', 'searchDistricts'], queries);
each(
  'geo',
  ['getDistrictProvince'],
  unique([
    ...cityVariants(districtNames),
    'Quetta',
    'south waziristan',
    'Dera Bugti',
    'upper dera bugti',
    'Upper  Dera   Bugti',
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty',
    'valueOf',
    'Lahore',
  ]),
);
each(
  'geo',
  ['getDistrictsByProvince'],
  unique([
    ...provinces,
    ...provinces.map((p) => p.toLowerCase()),
    'punjab ',
    ' SINDH',
    'KPK',
    '',
    'Atlantis',
  ]),
);

// Address -------------------------------------------------------------------
const addresses = [
  'House 12, Street 5, Model Town, Lahore 54000',
  'House 12, Street 5, Model Town Lahore 54000',
  '12 Model Town Lahore',
  'Flat 3, Block B, Gulshan-e-Iqbal, Karachi, Sindh 75300',
  'Plot 44000, Sector F-7, Islamabad',
  'House 54000 Street 2 Karachi',
  'P.O. Box 54000, Lahore',
  'PO Box 75500 Karachi',
  'Shop # 74200, Saddar, Karachi',
  'Office no. 12345, Blue Area, Islamabad 44000',
  'Street 46000, Rawalpindi',
  'H.No. 12345 Peshawar 25000',
  'Mall Road, Lahore, Sindh',
  'Main Bazaar, Dera Ghazi Khan, Punjab',
  'Main Bazaar Dera Ghazi Khan Punjab',
  'Village Chak 5, Tehsil Jaranwala, Faisalabad',
  'Near Masjid, Quetta, Balochistan 87300',
  'University Road, Peshawar, Khyber Pakhtunkhwa',
  'Gilgit-Baltistan',
  'Skardu, Gilgit-Baltistan',
  'Muzaffarabad Azad Jammu and Kashmir',
  'Some Street, 54000',
  'Some Street 75500',
  'Unknown Place, Nowhere',
  '',
  '   ',
  ',,,',
  'Lahore',
  'lahore',
  '  house   12 ,  street 5 ,   LAHORE  ',
  'House 12/54000, Lahore',
  '54000-12, Lahore',
  '12-54000 Lahore',
  'A54000 Lahore',
  '54000A Lahore',
  '09999 Karachi',
  'Street 5, 44000, 54000',
  'Sector G-9/4, Islamabad Capital Territory 44090',
  'Hyderabad, Sindh',
  'Hyderabad, Punjab',
  'Chiniot, Punjab',
  'Mohalla Islampura, Jhelum',
  'Main Road, Lower Dir',
  'Near Bus Stand, Upper Dir, Khyber Pakhtunkhwa',
  'Kot Addu, Muzaffargarh, Punjab',
  'Clifton Block 5 Karachi Sindh 75600',
  '#54000 Lahore',
  'No 54000 Lahore',
  'Suite 54000, Islamabad',
  'box 75500, karachi',
  'Ghazi Road, Lahore',
  'Dera Ismail Khan',
  'Quetta West, Balochistan',
  ...cityNames.slice(0, 200).map((c, i) => `House ${i + 1}, Main Road, ${c}`),
  ...districtNames.slice(0, 200).map((d, i) => `Street ${i + 1} ${d}`),
];
const parsedAddresses = [];
for (const address of addresses) {
  parsedAddresses.push(call('address', 'parseAddress', [address]));
}
for (const parsed of parsedAddresses) {
  if (parsed && typeof parsed === 'object')
    call('address', 'formatAddress', [], parsed);
}
for (const parts of [
  {},
  { raw: 'raw text' },
  { street: 'House 1', city: 'Lahore' },
  { city: '', district: 'Kasur' },
  { district: 'Kasur', province: 'Punjab' },
  { postalCode: '54000' },
  { street: '', raw: 'x' },
  {
    street: 'A',
    area: 'B',
    city: 'C',
    district: 'D',
    province: 'E',
    postalCode: 'F',
  },
  { city: null, district: 'Okara' },
  { raw: '', street: null },
]) {
  call('address', 'formatAddress', [], parts);
}

// Text ----------------------------------------------------------------------
const texts = [
  'kia haal hai',
  'Kia baat hai',
  'KIA',
  'kia',
  'ap kaise ho',
  'Ap kr lo',
  'AP ker do',
  'mujhay nhi pata',
  'Shukria!',
  'shukria, ap ka',
  'hy na',
  'assalamu alaikum',
  'Assalam o Alaikum dost',
  'ASSALAM O ALAIKUM',
  'apka',
  'kiaa',
  'map',
  'kia-kia',
  'kia_kia',
  'ápap',
  'ap1 ap',
  '1ap',
  'kia haal',
  '  extra   spaces  ',
  '\tTabs\tand\nnewlines\n',
  '',
  ' ',
  'Price ۱۲۳ rupees',
  'Mixed ٤٥٦ and 789',
  'Café',
  'é è',
  'ﬁ ligature',
  'Kr',
  'kR',
  'Hy',
  'hY',
  'Nhi',
  'NHI',
  'Mujhay',
  'ShUkRiA',
  'main men mein',
  '0300-1234567',
  'کیا حال ہے',
  '﻿ap﻿',
  'ap kr',
  'ap\u0085kr',
  'ap\u001fkr',
];
each(
  'text',
  ['normalizeText', 'normalizeRomanUrdu', 'toUrduDigits', 'toEnglishDigits'],
  texts,
);

// Hijri ---------------------------------------------------------------------
const gregorianDates = [];
for (let year = 2019; year <= 2028; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    for (const day of [1, 10, 20, 28])
      gregorianDates.push(`${year}-${pad(month)}-${pad(day)}`);
  }
}
gregorianDates.push(
  '1900-01-01',
  '1948-01-01',
  '2000-02-29',
  '1999-12-31',
  '2024-02-29',
  '2100-03-01',
  '0622-07-16',
  '0622-07-19',
  '1600-01-01',
  '9999-12-31',
  '2025-03-01',
  '2025-03-30',
  '2025-03-31',
  '2026-02-18',
  '2026-02-19',
  '2026-03-19',
  '2026-03-20',
);
for (const date of gregorianDates) {
  call('hijri', 'toHijri', [D(date)]);
  call('hijri', 'formatHijri', [D(date)]);
  call('hijri', 'isRamadan', [D(date)]);
}
for (const date of [
  '2025-03-01',
  '2025-03-30',
  '2026-02-18',
  '2024-07-07',
  '2023-12-31',
]) {
  for (const offset of [-2, -1, 0, 1, 2, 30, 0.5, NUM('NaN')]) {
    call('hijri', 'toHijri', [D(date)], { offset });
    call('hijri', 'formatHijri', [D(date)], { offset });
    call('hijri', 'isRamadan', [D(date)], { offset });
  }
  call('hijri', 'toHijri', [D(`${date}T23:59:59`)]);
}
for (let year = 1440; year <= 1451; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    for (const day of [1, 15, 29, 30])
      call('hijri', 'fromHijri', [{ year, month, day }]);
  }
}
for (const offset of [-1, 1, 3, 1.5]) {
  call('hijri', 'fromHijri', [{ year: 1447, month: 9, day: 1 }], { offset });
}
for (const bad of [
  { year: 1447, month: 13, day: 1 },
  { year: 1447, month: 0, day: 1 },
  { year: 1447, month: 1, day: 31 },
  { year: 1447, month: 1, day: 0 },
  { year: 0, month: 1, day: 1 },
  { year: 1447.5, month: 1, day: 1 },
  { year: 1, month: 1, day: 1 },
  { year: 100, month: 6, day: 15 },
]) {
  call('hijri', 'fromHijri', [bad]);
}
each(
  'hijri',
  ['getHijriMonthName'],
  [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1.5, 12.0, NUM('NaN')],
);

// Holidays ------------------------------------------------------------------
const holidayYears = [
  1948, 1999, 2000, 2014, 2015, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028,
  2029, 2030, 2035, 2050, 2100, 2500, 9999,
];
for (let year = 2020; year <= 2027; year += 1) holidayYears.push(year);
for (const year of unique(holidayYears)) {
  call('holidays', 'getPakistanHolidays', [year]);
  call('holidays', 'getPakistanHolidays', [year], {
    includeChristianHolidays: true,
  });
}
for (const year of [2026, 2027, 2028, 2030]) {
  for (const hijriOffset of [-1, 1, 2])
    call('holidays', 'getPakistanHolidays', [year], { hijriOffset });
}
for (const [year, options] of [
  [
    2027,
    {
      announced: { 'eid-ul-fitr': ['2027-03-10', '2027-03-11', '2027-03-12'] },
    },
  ],
  [2025, { announced: { ashura: [] } }],
  [
    2025,
    {
      announced: { 'eid-ul-adha': ['2025-06-07'] },
      includeChristianHolidays: true,
    },
  ],
  [
    2030,
    { announced: { 'eid-milad-un-nabi': ['2030-07-15'] }, hijriOffset: -1 },
  ],
  [2030, { announced: { 'eid-ul-fitr': ['2030/02/05'] } }],
  [2030, { announced: { 'eid-ul-fitr': ['2030-2-5'] } }],
  [2025, { hijriOffset: 0.5 }],
  [2031, { hijriOffset: 0.5 }],
  [1947, {}],
  [10000, {}],
  [2025.5, {}],
  [NUM('NaN'), {}],
]) {
  call('holidays', 'getPakistanHolidays', [year], options);
}
const holidayDates = [
  '2025-02-05',
  '2025-03-23',
  '2025-03-31',
  '2025-04-01',
  '2025-04-02',
  '2025-04-03',
  '2025-05-01',
  '2025-05-28',
  '2025-08-14',
  '2025-11-09',
  '2025-12-25',
  '2025-12-26',
  '2025-01-01',
  '2025-07-05',
  '2025-07-06',
  '2025-09-05',
  '2026-03-21',
  '2026-05-27',
  '2027-03-10',
  '2020-11-09',
  '2023-05-28',
  '2024-05-28',
  '2030-01-01',
];
for (const date of holidayDates) {
  for (const fn of ['getHolidaysOn', 'isPakistanHoliday']) {
    call('holidays', fn, [date]);
    call('holidays', fn, [D(date)]);
    call('holidays', fn, [date], { includeChristianHolidays: true });
  }
}
for (const bad of ['2025-1-1', '25-01-01', 'today', '', '1900-01-01']) {
  call('holidays', 'getHolidaysOn', [bad]);
  call('holidays', 'isPakistanHoliday', [bad]);
}

// Format --------------------------------------------------------------------
const amounts = [
  0,
  -0,
  0.4,
  0.5,
  1,
  1.5,
  2.5,
  -0.4,
  -0.5,
  -1.5,
  -2.5,
  99.5,
  999.5,
  1000,
  99999,
  99999.5,
  100000,
  150000,
  250000.75,
  999999,
  2500000,
  9999999,
  9999999.99,
  10000000,
  12345678.9,
  99949.99,
  99950,
  994999,
  995000,
  9949999,
  9950000,
  99999999,
  123456789.123,
  1e9,
  1e12,
  1e15,
  2 ** 53,
  1e21,
  2 ** 70,
  1e300,
  -150000,
  -9999999,
  -10000000,
  -12345678.9,
  0.005,
  1.005e7,
  1234.5678,
  5e-324,
  4999.5,
  100500,
  10050000,
  NUM('NaN'),
  NUM('Infinity'),
  NUM('-Infinity'),
  ...Array.from(
    { length: 60 },
    (_, i) => Math.round(i ** 4.3 * 37.17 * 100) / 100,
  ),
];
each('format', ['formatPKR', 'formatLakh'], amounts);

// Words ---------------------------------------------------------------------
const integers = unique([
  ...Array.from({ length: 121 }, (_, i) => i),
  150,
  199,
  200,
  999,
  1000,
  1001,
  1100,
  9999,
  10000,
  12345,
  99999,
  100000,
  100001,
  125000,
  999999,
  1000000,
  1234567,
  9999999,
  10000000,
  12345678,
  99999999,
  100000000,
  999999999,
  1000000000,
  12345678901,
  100000000000,
  123456789012345,
  2 ** 53 - 1,
  -1,
  -125000,
  -(2 ** 53 - 1),
  ...Array.from({ length: 16 }, (_, k) => 10 ** k),
  ...Array.from({ length: 16 }, (_, k) => 10 ** k - 1),
]);
for (const n of integers) {
  call('words', 'numberToWords', [n]);
  call('words', 'numberToWords', [n], { language: 'ur' });
}
for (const n of [2 ** 53, 1.5, -0.5, NUM('NaN'), NUM('Infinity'), 1e21]) {
  call('words', 'numberToWords', [n]);
}
call('words', 'numberToWords', [100], { language: 'fr' });
call('words', 'numberToWords', [5], { language: 'fr' });
call('words', 'numberToWords', [5], { language: 'EN' });
call('words', 'numberToWords', [5], { language: '' });
call('words', 'numberToWords', [5], { language: null });
call('words', 'numberToWords', [1.5], { language: 'fr' });
call('words', 'amountInWords', [100], { language: 'fr' });
call('words', 'amountInWords', [100], { language: 'fr', cheque: true });
call('words', 'amountInWords', [-1], { language: 'fr' });
call('words', 'amountInWords', [100], { language: null });
const rupeeAmounts = [
  0,
  0.01,
  0.005,
  0.015,
  0.1,
  0.5,
  0.99,
  0.994,
  0.995,
  1,
  1.01,
  1.5,
  2,
  2.675,
  10.1,
  99.99,
  100,
  101.25,
  1000,
  125000,
  125000.5,
  1000000.75,
  12345678.91,
  1e15,
  9e15 / 100,
  9e15,
  1.005,
  1.115,
  8.345,
  1234567.895,
  -1,
  -0.01,
  NUM('NaN'),
  NUM('Infinity'),
];
for (const amount of rupeeAmounts) {
  call('words', 'amountInWords', [amount]);
  call('words', 'amountInWords', [amount], { cheque: true });
  call('words', 'amountInWords', [amount], { language: 'ur' });
  call('words', 'amountInWords', [amount], { language: 'ur', cheque: true });
}

// Tax -----------------------------------------------------------------------
each(
  'tax',
  ['analyzeNTN', 'validateNTN', 'validateSTRN'],
  [
    '1234567',
    '1234567-8',
    '1234567 8',
    '12345678',
    '1234567–8',
    '1234567—8',
    '1234567.8',
    '1234567-89',
    '123456',
    '35202-1234567-1',
    '3520212345671',
    '۱۲۳۴۵۶۷-۸',
    ' 1234567 ',
    '1234567-',
    '-1234567',
    '1234567--8',
    'A234567',
    '',
    ' ',
    '1234567890123',
    '12-34-567-890-123',
    '1234 5678 90123',
    '1234567890123 ',
    '123456789012',
    '12345678901234',
    '05202-1234567-1',
    '3277876543210',
    '32.77.876.543.210',
    '(1234567890123)',
    '1234/5678/90123',
  ],
);

// Numbers -------------------------------------------------------------------
const landlines = unique([
  '021-111-825-888',
  '021 111 825 888',
  '+9221111825888',
  '042 35761234',
  '042-35761234',
  '+924235761234',
  '00924235761234',
  '924235761234',
  '4235761234',
  '051-2345678',
  '051 23456789',
  '0800-12345',
  '0800 12345678',
  '080012345',
  '0900-12345',
  '0900 123456',
  '0122-123456',
  '111-825-888',
  '111825888',
  '111 825 8888',
  '0300-1234567',
  '+923001234567',
  '+44 20 7946 0958',
  '',
  'abc',
  '021',
  '0211234567',
  '02112345678',
  '021123456789',
  '0581-1234567',
  '05811234567',
  '0582612345',
  '+92 21 111 825 888',
  '+9321111825888',
  '91-5701234',
  '091 5701234',
  '0915701234',
  '0992 123456',
  '0992-1234567',
  '0233 123456',
  '0244 1234567',
  '0453 123456',
  '0222-111-000-111',
  '0412-1234567',
  '061-111-222-333',
  '0800 123',
  '0123456789',
  '+920800 12345',
  '۰۴۲۳۵۷۶۱۲۳۴',
  ...areaCodes.flatMap(({ code }) => [
    `0${code}2345678`.slice(0, 11),
    `0${code}-111-222-333`,
    `0${code}234567`,
  ]),
]);
each(
  'numbers',
  ['analyzeNumber', 'getNumberType', 'validateLandline'],
  landlines,
);
each(
  'numbers',
  ['getAreaCode'],
  unique([
    ...areaCodes.flatMap((e) => e.cities),
    ...areaCodes.flatMap((e) => e.cities.map((c) => c.toLowerCase())),
    ' LAHORE ',
    'Atlantis',
    '',
    ' ',
  ]),
);

// Raast ---------------------------------------------------------------------
const IBAN = 'PK36SCBL0000001123456702';
const NOW = D('2026-10-14T12:00:00');
const p2pOptions = [
  { iban: IBAN },
  { iban: 'pk36 scbl 0000 0011 2345 6702' },
  { iban: IBAN, scheme: '30' },
  { iban: IBAN, bankName: 'Standard Chartered' },
  { iban: IBAN, bankName: '' },
  { iban: IBAN, particulars: 'Rent October' },
  { iban: IBAN, particulars: 'کرایہ اکتوبر' },
  { iban: IBAN, amount: 1500, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 1500.5, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 100, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 0.01, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 0.125, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 1.005, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 9999999999, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 10000000000, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 9999999.99, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 99999999.5, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 1e21, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 1e22, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 1e-7, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 0.001, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: 123456.789, expiresAt: D('2026-11-13T23:59:00') },
  {
    iban: IBAN,
    amount: 1500,
    expiresAt: D('2026-01-02T03:04:00'),
    bankName: 'Meezan Bank',
    particulars: 'Invoice 42',
  },
  { iban: IBAN, amount: 1500, expiresIn: '30m', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: '12h', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: '7d', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: '1.5h', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: 90000, now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: 59999, now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: '0m', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: '5s', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: '-5m', now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: 0, now: NOW },
  { iban: IBAN, amount: 1500, expiresIn: -1, now: NOW },
  {
    iban: IBAN,
    amount: 1500,
    expiresIn: '1d',
    expiresAt: D('2026-11-13T23:59:00'),
    now: NOW,
  },
  { iban: IBAN, expiresIn: '1d', now: NOW },
  { iban: IBAN, amount: 1500 },
  { iban: IBAN, amount: 0, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: -5, expiresAt: D('2026-11-13T23:59:00') },
  { iban: IBAN, amount: NUM('NaN'), expiresAt: D('2026-11-13T23:59:00') },
  { iban: 'PK00XXXX' },
  { iban: 'PK37SCBL0000001123456702' },
  { iban: IBAN, bankName: 'x'.repeat(25) },
  { iban: IBAN, bankName: 'x'.repeat(26) },
  { iban: IBAN, particulars: 'x'.repeat(30) },
  { iban: IBAN, particulars: 'x'.repeat(31) },
];
const payloads = [];
for (const options of p2pOptions) {
  const payload = call('raast', 'createRaastP2PQr', [], options);
  if (typeof payload === 'string') payloads.push(payload);
}
const merchantAccount = { fields: { '00': 'A000000736', '01': IBAN } };
const merchantOptions = [
  {
    merchantAccount,
    merchantName: 'Aziz General Store',
    city: 'Karachi',
    mcc: '5411',
  },
  { merchantAccount, merchantName: 'Aziz General Store', city: 'Karachi' },
  {
    merchantAccount: { tag: '29', fields: { '01': IBAN, '00': 'A000000736' } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount: {
      tag: '26',
      fields: { 10: 'ten', '00': 'zero', 99: 'ninety-nine', '05': 'five' },
    },
    merchantName: 'Order',
    city: 'Lahore',
  },
  {
    merchantAccount,
    merchantName: 'K-Electric',
    city: 'Karachi',
    amount: 4250.5,
    billNumber: 'INV-1001',
    dueDate: D('2026-11-25'),
    amountAfterDueDate: 4500,
  },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', amount: 100 },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    amount: 100,
    dynamic: false,
  },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', dynamic: true },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', amount: 0.125 },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    amount: 9999999999.99,
  },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    amount: 99999999999.99,
  },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', amount: 1e21 },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', amount: 1e-7 },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    amount: 10,
    dueDate: D('2026-11-25'),
    amountAfterDueDate: 1e21,
  },
  {
    merchantAccount: { fields: { 99: 'z', 10: 'y', '05': 'x', '00': 'w' } },
    merchantName: 'Order',
    city: 'Lahore',
  },
  {
    merchantAccount: { fields: { '00': 'x', ab: 'y' } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    mobileNumber: '03001234567',
    reference: 'REF-9',
  },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    billNumber: '',
    mobileNumber: '',
    reference: '',
  },
  { merchantAccount, merchantName: 'دکان', city: 'لاہور' },
  { merchantAccount, merchantName: 'x'.repeat(25), city: 'y'.repeat(15) },
  { merchantAccount, merchantName: 'x'.repeat(26), city: 'Karachi' },
  { merchantAccount, merchantName: 'Shop', city: 'y'.repeat(16) },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', mcc: '541' },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', mcc: 'ABCD' },
  {
    merchantAccount: { tag: '25', fields: { '00': 'x' } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount: { tag: '52', fields: { '00': 'x' } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount: { tag: '51', fields: { '00': 'x' } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  { merchantAccount: { fields: {} }, merchantName: 'Shop', city: 'Lahore' },
  {
    merchantAccount: { fields: { 1: 'x' } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount: { fields: { '00': 'x'.repeat(100) } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount: { fields: { '00': 'x'.repeat(95) } },
    merchantName: 'Shop',
    city: 'Lahore',
  },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    dueDate: D('2026-11-25'),
  },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    amountAfterDueDate: 10,
  },
  { merchantAccount, merchantName: 'Shop', city: 'Lahore', amount: -1 },
  {
    merchantAccount,
    merchantName: 'Shop',
    city: 'Lahore',
    amount: 10,
    dueDate: D('2026-11-25'),
    amountAfterDueDate: 0,
  },
  {
    merchantAccount: {
      fields: {
        '00': 'a'.repeat(90),
        '01': 'b'.repeat(90),
        '02': 'c'.repeat(90),
        '03': 'd'.repeat(90),
        '04': 'e'.repeat(90),
      },
    },
    merchantName: 'Shop',
    city: 'Lahore',
  },
];
for (const options of merchantOptions) {
  const payload = call('raast', 'createMerchantQr', [], options);
  if (typeof payload === 'string') payloads.push(payload);
}

const SBP_SAMPLE =
  '00020101021202164000123456789012041653451234567890121516634512345678901227420010A0000007360124PK73FAYS35553900000000005204599953035865802PK5916AZIZGeneralStore6007KARACHI62890117234567854321234560211032400000000316AZIZGeneralStore0513123876543212307124567890987656304' +
  '5376';
const withP2pCrc = (fields) => {
  const body = `0002020102${fields}1004`;
  const crc = (text) => {
    let c = 0xffff;
    for (const byte of new TextEncoder().encode(text)) {
      c ^= byte << 8;
      for (let i = 0; i < 8; i += 1)
        c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
    }
    return c.toString(16).toUpperCase().padStart(4, '0');
  };
  return body + crc(body);
};
const firstPayload = payloads[0];
const parseInputs = unique([
  ...payloads,
  SBP_SAMPLE,
  SBP_SAMPLE.slice(0, -4) + '0000',
  SBP_SAMPLE.slice(0, -4) + '5376'.toLowerCase(),
  `  ${SBP_SAMPLE}\n`,
  SBP_SAMPLE.replace('AZIZGeneralStore6007', 'AZIZGeneralStorx6007'),
  firstPayload.slice(0, -4) + firstPayload.slice(-4).toLowerCase(),
  firstPayload.slice(0, -1),
  firstPayload + '00',
  firstPayload.replace('PK36', 'PK37'),
  withP2pCrc('11020200'),
  withP2pCrc('120202000424PK36SCBL0000001123456702'),
  withP2pCrc('120202000424PK36SCBL000000112345670205041500'),
  withP2pCrc('110202000424PK36SCBL000000112345670205041500'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712131120262359'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712141020261230'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712141020261200'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712141020261159'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712141020261300'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712141020261301'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712991399992599'),
  withP2pCrc('120202000424PK36SCBL0000001123456702050415000712010100501200'),
  withP2pCrc('120202000424PK36SCBL000000112345670205041500071013112026'),
  withP2pCrc('120202000424PK37SCBL000000112345670205000712131120262359'),
  withP2pCrc('120202000424PK36SCBL00000011234567020503abc0712131120262359'),
  withP2pCrc('120202000424PK36SCBL00000011234567020504 1e30712131120262359'),
  withP2pCrc('120202000424PK36SCBL00000011234567020504 0x10712131120262359'),
  withP2pCrc(
    '120202000424PK36SCBL000000112345670205080x1F.5000712131120262359',
  ),
  withP2pCrc(
    '120202000424PK36SCBL00000011234567020508Infinity0712131120262359',
  ),
  withP2pCrc('120202000424XX36SCBL0000001123456702'),
  withP2pCrc('11020200040812345678'),
  // Amount fields: only plain digits with optional decimals are numbers.
  ...[
    '1e3',
    '0x1',
    '1.',
    '.5',
    '01500',
    '1500.5',
    '1500.505',
    '-5',
    '+5',
    '1,500',
    '٥',
  ].map((a) =>
    withP2pCrc(`110202000424PK36SCBL000000112345670205${pad(a.length)}${a}`),
  ),
  withP2pCrc('110202000424PK36SCBL00000011234567020500'),
  // Expiry: only real local dates and times.
  ...[
    '310220261200',
    '290220241200',
    '290220251200',
    '290221001200',
    '290220001200',
    '311120261200',
    '301120261200',
    '131320261200',
    '010020261200',
    '001120261200',
    '131120262400',
    '131120262359',
    '131120262360',
    '131120260000',
    '010100001200',
    '290200001200',
    '010100501200',
    '311299991159',
    '1311202623',
    '13112026235a',
  ].map((e) =>
    withP2pCrc(
      `120202000424PK36SCBL0000001123456702050415000712${e}`.replace(
        '0712' + e,
        '07' + pad(e.length) + e,
      ),
    ),
  ),
  ...['1e3', '', '100', '100.5', '0x10'].map(
    (a) =>
      '000201010212' +
      '5204000053035865802PK5904Shop6006Lahore' +
      '54' +
      pad(a.length) +
      a +
      '6304ABCD',
  ),
  ...['1e3', '4500.00', ' 45', ''].map((a) => {
    const add = '0108INV-1001' + '500825112026' + '51' + pad(a.length) + a;
    return (
      '000201010212' +
      '5204000053035865802PK5904Shop6006Lahore' +
      '62' +
      pad(add.length) +
      add +
      '6304ABCD'
    );
  }),
  '000201010211' + '5204000053035865802PK5904Shop6006Lahore' + '6304ABCD',
  '0002030102116304ABCD',
  '',
  'hello',
  '00',
  '0002',
  '00020',
  '000201',
  '0099' + 'x'.repeat(10),
  'https://example.com/pay?x=1',
  '۰۰۰۲۰۲',
]);
const validateOptions = [
  undefined,
  { now: NOW },
  { now: D('2026-11-13T22:59:00') },
  { now: D('2026-11-13T23:00:00') },
  { now: D('2026-11-13T23:58:00') },
  { now: D('2026-11-13T23:59:00') },
  { now: D('2026-11-14T00:00:00') },
  { now: D('2026-10-14T11:00:00'), expiresSoonMs: 7_200_000 },
  { now: D('2026-10-14T12:00:00'), expiresSoonMs: 0 },
  { now: D('2030-01-01T00:00:00') },
];
for (const payload of parseInputs) {
  call('raast', 'parseRaastQr', [payload]);
  for (const options of validateOptions) {
    // Without `now` the result depends on the clock, so always pass one.
    call(
      'raast',
      'validateRaastQr',
      [payload],
      options ?? { now: D('2026-01-01T00:00:00') },
    );
  }
}

// Input ---------------------------------------------------------------------
const typing = (text) =>
  Array.from({ length: [...text].length + 1 }, (_, i) =>
    [...text].slice(0, i).join(''),
  );
const cnicInputs = unique([
  ...cnics,
  ...typing('35202-1234567-1'),
  ...typing('3520212345671234'),
  ...typing('۳۵۲۰۲۱۲۳۴۵۶۷۱'),
  '05202',
  '9',
  '35202-12',
  'abc',
  '35202-123a',
  '35 202 123 456 71',
  '352021234567x',
  '+35202',
]);
each('input', ['formatCNICInput', 'checkCNICInput'], cnicInputs);
const phoneInputs = unique([
  ...phones,
  ...typing('03001234567'),
  ...typing('0300-1234567'),
  ...typing('+92 300 1234567'),
  ...typing('00923001234567'),
  ...typing('923001234567'),
  ...typing('3001234567'),
  ...typing('+920300 1234567'),
  ...typing('۰۳۴۵۱۲۳۴۵۶۷'),
  ...typing('03601234567'),
  '+',
  '+9',
  '+92',
  '+93',
  '+923',
  '009',
  '0093',
  '9',
  '92',
  '93',
  '0',
  '00',
  '000',
  '0360',
  '03601',
  '+92 0300 1234567',
  '+44',
  'abc',
  '0300 12345678',
  '0300-1234567-',
  '++92',
  '+92+300',
  ' ',
  '()',
  '0300 1234 567 8',
  '٠٣٠٠',
  '+92 (0) 300',
  '0092 0300 1234567',
  '920',
  '9203',
  '+920',
  '4',
  '04',
]);
each('input', ['formatPhoneInput', 'checkPhoneInput'], phoneInputs);
const ibanInputs = unique([
  ...ibans,
  ...typing('PK36 SCBL 0000 0011 2345 6702'),
  ...typing('pk36scbl0000001123456702'),
  ...typing('GB29NWBK60161331926819'),
  ...typing('PK3XSCBL'),
  ...typing('PK36SC1L'),
  'PK36 SCBL 0000 0011 2345 6702 9',
  'PK36-SCBL-0000',
  'PK36.SCBL',
  'P K 3 6',
  'pk',
  'p',
  'k',
  '3',
  'PK36SCBL000000112345670',
  'PK36SCBL0000001123456703',
  'ß',
  'PK36SCBLÄ',
  'PK36 SCBL',
]);
each('input', ['formatIBANInput', 'checkIBANInput'], ibanInputs);

// Data version --------------------------------------------------------------
vectors.set('data-version', [
  {
    fn: 'dataVersion',
    args: [],
    kwargs: {},
    expected: lib.dataVersion,
    throws: false,
    constant: true,
  },
]);

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const outDir = join(root, 'test-vectors');
mkdirSync(outDir, { recursive: true });
let total = 0;
for (const [module, list] of [...vectors.entries()].sort(([a], [b]) =>
  a < b ? -1 : 1,
)) {
  // One vector per line keeps diffs readable when behaviour changes.
  const body = list.map((vector) => JSON.stringify(vector)).join(',\n');
  writeFileSync(join(outDir, `${module}.json`), `[\n${body}\n]\n`);
  total += list.length;
  console.log(`${module.padEnd(14)} ${list.length}`);
}
console.log(
  `Copied ${dataFiles.length} data files; wrote ${total} vectors to test-vectors/`,
);
