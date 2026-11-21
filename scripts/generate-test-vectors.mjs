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
  existsSync,
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
const postOffices = readData('post-offices.json');
const networks = readData('networks.json');
const banks = readData('banks.json');
const areaCodes = readData('area-codes.json');
const divisions = readData('divisions.json');
const tehsils = readData('tehsils.json');

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

const RealDate = globalThis.Date;
const OPTIONS_ONLY = new Set([
  'createRaastP2PQr',
  'createMerchantQr',
  'formatAddress',
  'getSalesTaxRate',
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
  '\u00a035202-1234567-2\ufeff',
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

// CNICs in free text (findCNICs, maskCNICs). Offsets are UTF-16 code units in
// TypeScript, so every text here stays in the Basic Multilingual Plane, where
// they equal the code point offsets the Python and PHP ports return.
{
  const texts = [
    'CNIC: 35202-1234567-1, phone 0300-1234567',
    'My CNIC is 35202-1234567-1',
    '3520212345671',
    'ids 3520212345671 and 61101-7654321-2.',
    '35202 1234567-1',
    '35202.1234567 1',
    '35202-1234567 1 and 35202 1234567-1',
    '35202' + '\u2013' + '1234567' + '\u2014' + '1',
    '%%URDU%%-1234567-%%ONE%%',
    '%%URDU%%1234567%%ONE%%',
    '1235202-1234567-1',
    '35202-1234567-12',
    '05202-1234567-1',
    '95202-1234567-1',
    '35202-123456-1',
    '35202_1234567_1',
    '35202--1234567-1',
    'x35202-1234567-1y',
    '(35202-1234567-1)',
    'order 4520112345678 shipped',
    '35202-1234567-1\n42101-7654321-8',
    '',
    'no numbers here',
    '0300-1234567 or 042-35761234',
    'Account: 1234567890123',
    '۰۳۵۲۰۲-1234567-1',
    '\u00a035202-1234567-1\u00a0',
  ].map((t) =>
    t
      .replace('%%URDU%%', '\u06F3\u06F5\u06F2\u06F0\u06F2')
      .replace('%%ONE%%', '\u0661'),
  );
  for (const text of texts) {
    call('cnic', 'findCNICs', [text]);
    call('cnic', 'maskCNICs', [text]);
    call('cnic', 'maskCNICs', [text], { mask: '*' });
  }
  call('cnic', 'maskCNICs', ['35202-1234567-1'], { mask: '' });
  call('cnic', 'maskCNICs', ['35202-1234567-1'], { mask: '##' });
  for (const value of [null, 42, undefined]) {
    call('cnic', 'findCNICs', [value]);
    call('cnic', 'maskCNICs', [value]);
  }
}

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
  '\u00a00300\u20021234567',
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
// Every code in Pakistan Post's directory: those of listed cities return the
// city, the rest (towns and villages) return null.
const postalCodes = unique([
  ...postal.map((e) => e.postalCode),
  ...postOffices.map((o) => o.code),
]);
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
// Post offices: every fifth code (plus edge cases) and a set of searches.
each(
  'postal',
  ['getPostOffice'],
  [
    ...postOffices.filter((_, index) => index % 5 === 0).map((o) => o.code),
    '48330',
    ' 48330 ',
    '48 330',
    '54000',
    '99999',
    '',
    ' ',
    'abc',
    '4833',
    '483300',
  ],
);
each(
  'postal',
  ['searchPostOffices'],
  unique([
    'dulmial',
    'DULMIAL',
    'Gulberg',
    'model town',
    'chak 9',
    'gpo',
    'cantt',
    'karachi',
    'thatta',
    'kalri',
    'jamshoro',
    '483',
    '4833',
    '48330',
    ' 48330 ',
    '1',
    'zz',
    'qq',
    '',
    ' ',
    'abc123',
    'D.I Khan',
    'Islamabad G-9',
    'Muzaffarabad',
    'Skardu',
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
// Divisions and tehsils (2023 census)
const protoKeys = [
  'constructor',
  'toString',
  '__proto__',
  'hasOwnProperty',
  'valueOf',
];
const formerDistricts = ['Quetta', 'south waziristan', 'Dera Bugti'];
const newDistricts = [
  'Murree',
  'Talagang',
  'Quetta East',
  'Bar Swat',
  'Hub',
  'Gilgit',
  'Muzaffarabad',
  'Islamabad',
];
call('geo', 'getDivisions', []);
each(
  'geo',
  ['getDivisions'],
  unique([
    ...provinces,
    ...provinces.map((p) => p.toLowerCase()),
    'punjab ',
    ' SINDH',
    'KPK',
    '',
    ' ',
    'Atlantis',
    ...protoKeys,
  ]),
);
each(
  'geo',
  ['getDivisionOfDistrict', 'getTehsils'],
  unique([
    ...cityVariants(districtNames),
    ...formerDistricts,
    ...newDistricts,
    ...divisions.map((d) => d.division),
    'Upper  Dera   Bugti',
    'Lahore City',
    ...protoKeys,
  ]),
);
const tehsilNames = unique(tehsils.map((t) => t.tehsil));
each(
  'geo',
  ['getTehsilDistrict'],
  unique([...cityVariants(tehsilNames), ...districtNames, ...protoKeys]),
);
// Names shared by tehsils in different districts, with and without a province.
const sharedTehsils = tehsilNames.filter(
  (name) =>
    new Set(
      tehsils.filter((t) => t.tehsil === name).map((t) => t.censusDistrict),
    ).size > 1,
);
for (const name of [...sharedTehsils, 'Gojra', 'Murree', 'Atlantis', '']) {
  for (const province of [
    ...provinces,
    'punjab',
    ' SINDH ',
    'KPK',
    '',
    'Atlantis',
  ]) {
    call('geo', 'getTehsilDistrict', [name, province]);
    call('geo', 'getTehsilDistrict', [name.toUpperCase(), province]);
  }
}
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
  'kia\u00a0haal',
  '  extra   spaces  ',
  '\tTabs\tand\nnewlines\n',
  '',
  ' ',
  'Price ۱۲۳ rupees',
  'Mixed ٤٥٦ and 789',
  'Cafe\u0301',
  'e\u0301 e\u0300',
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
  '\ufeffap\ufeff',
  'ap\u2028kr',
  'ap\u0085kr',
  'ap\u001fkr',
];
each(
  'text',
  ['normalizeText', 'normalizeRomanUrdu', 'toUrduDigits', 'toEnglishDigits'],
  texts,
);

// romanUrduKey: every spelling in data/sources/roman-urdu-names.json, plus
// multi-word names, accents, case, digits and non-Latin text.
{
  const { groups } = JSON.parse(
    readFileSync(
      join(root, 'data', 'sources', 'roman-urdu-names.json'),
      'utf8',
    ),
  );
  for (const name of unique(groups.flat()))
    call('text', 'romanUrduKey', [name]);
  for (const text of [
    'Muhammad Rehman',
    'Chaudhry Muhammad Ali',
    'MUHAMMAD',
    'muhammad',
    'José',
    'Zoë Khan',
    'Ali123Raza',
    "O'Brien",
    'Abd-ul-Rehman',
    'Rizwan  Ahmed',
    '  ',
    '',
    'لاہور',
    'Ali لاہور Khan',
    'x',
    'Xavier',
    'Shah',
    'Sheikh',
    'Aa',
    'yy',
    'Wwaqas',
    'Cheema',
    'Saeed',
    'Ehsan',
  ]) {
    call('text', 'romanUrduKey', [text]);
  }
  for (const value of [null, 42]) call('text', 'romanUrduKey', [value]);
}

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

// Amounts as typed (parseAmount, formatAmountInput) ---------------------------
// Every accepted form, rounding at the paisa, the Rs. 50 trillion limit, Urdu
// and Arabic-Indic digits (also mixed with 0-9), whitespace, and rejections.
{
  const ch = (...codes) => String.fromCharCode(...codes);
  // 0-9 written in Urdu (U+06F0…) or Arabic-Indic (U+0660…) digits.
  const urdu = (s) => s.replace(/[0-9]/g, (d) => ch(0x06f0 + Number(d)));
  const arabic = (s) => s.replace(/[0-9]/g, (d) => ch(0x0660 + Number(d)));
  const NBSP = ch(0xa0);
  const NNBSP = ch(0x202f);
  const RUPEE = ch(0x20a8); // ₨
  const HAZAR = ch(0x06c1, 0x0632, 0x0627, 0x0631); // ہزار
  const LAKH = ch(0x0644, 0x0627, 0x06a9, 0x06be); // لاکھ
  const CRORE = ch(0x06a9, 0x0631, 0x0648, 0x0691); // کروڑ
  const AR_DECIMAL = ch(0x066b); // ٫
  const AR_GROUP = ch(0x066c); // ٬

  const plain = [
    '0',
    '00',
    '0.0',
    '0.00',
    '1',
    '7',
    '10',
    '99',
    '100',
    '500',
    '999',
    '1000',
    '1500',
    '9999',
    '10000',
    '12500',
    '99999',
    '100000',
    '150000',
    '999999',
    '1000000',
    '2500000',
    '9999999',
    '10000000',
    '12345678',
    '123456789',
    '1234567890',
    '007',
    '0500',
  ];
  const grouped = [
    '1,000',
    '9,999',
    '10,000',
    '99,999',
    '150,000',
    '999,999',
    '1,000,000',
    '12,345,678',
    '1,234,567,890',
    '1,00,000',
    '1,50,000',
    '10,00,000',
    '12,34,567',
    '1,23,45,678',
    '99,99,99,999',
    '1,000.50',
    '1,50,000.75',
    '12,34,567.89',
    '1,234,567.891',
  ];
  const decimals = [
    '0.5',
    '.5',
    '.05',
    '.005',
    '5.',
    '5.0',
    '5.5',
    '5.50',
    '5.05',
    '5.005',
    '5.004',
    '5.0049',
    '5.0050',
    '5.0051',
    '1.005',
    '1.015',
    '1.025',
    '2.675',
    '0.125',
    '0.135',
    '0.995',
    '0.994',
    '0.999',
    '9.995',
    '999.995',
    '99999.999',
    '1234.5678',
    '0.001',
    '0.004',
    '0.0049999',
    '1.1',
    '1.10',
    '1.123456789',
  ];
  const currencies = [
    'Rs',
    'Rs.',
    'rs',
    'RS',
    'rs.',
    'RS.',
    'PKR',
    'pkr',
    'Pkr',
    RUPEE,
  ];
  const withCurrency = currencies.flatMap((c) => [
    `${c} 500`,
    `${c}500`,
    `500 ${c}`,
    `500${c}`,
    `${c} 1,50,000/-`,
    `${c}. 5`.replace('..', '.'),
  ]);
  const slash = [
    '500/-',
    '500 /-',
    '1,50,000/-',
    'Rs. 5,000/-',
    '5 lakh/-',
    'Rs 2.5k /-',
  ];
  const units = [
    'k',
    'K',
    'thousand',
    'Thousand',
    'thousands',
    'hazar',
    'Hazar',
    HAZAR,
    'lakh',
    'Lakh',
    'LAKH',
    'lakhs',
    'lac',
    'lacs',
    'Lac',
    LAKH,
    'crore',
    'Crore',
    'crores',
    'cr',
    'Cr',
    'CR',
    CRORE,
  ];
  const withUnits = units.flatMap((u) => [
    `1 ${u}`,
    `1.5${u}`,
    `2.25 ${u}`,
    `.5 ${u}`,
  ]);
  const unitMixes = [
    '10k',
    '15.5k',
    '150k',
    '1,500k',
    '1.5 lakh',
    '2.25cr',
    '2.5 crore',
    '1,000 crore',
    '12,50,000 lakh',
    '1.123456 lakh',
    '0.0000001 crore',
    '0.000001 lakh',
    '0.0001k',
    '0.0005k',
    '0.00049k',
    'Rs 1.5 lakh',
    'Rs. 2.25 Cr',
    'PKR 10k',
    `${RUPEE} 5 ${LAKH}`,
    `1.5 ${LAKH} PKR`,
    '3 lakh rs',
    '3 lakh Rs./-',
  ];
  const scripts = [
    urdu('150000'),
    urdu('1,50,000'),
    urdu('1.5'),
    arabic('150000'),
    arabic('12,500'),
    `${urdu('1')}50,000`,
    `1${arabic('5')}0`,
    `${urdu('2')}.${arabic('5')} ${LAKH}`,
    `${urdu('5')} ${HAZAR}`,
    `${urdu('2')} ${CRORE}`,
    `Rs ${urdu('500')}`,
    `${urdu('500')} PKR/-`,
    `${arabic('150')}${AR_DECIMAL}${arabic('5')}`,
    `${arabic('1')}${AR_GROUP}${arabic('500')}`,
    `1${AR_GROUP}500${AR_DECIMAL}25`,
    `${urdu('1')}.${urdu('005')}`,
  ];
  const spacing = [
    '  700  ',
    '\t700\t',
    '\n700\n',
    ` 700${NBSP}`,
    `${NBSP}700`,
    `Rs${NBSP}500`,
    `Rs${NNBSP}500`,
    `1.5${NBSP}lakh`,
    `500 ${NNBSP}PKR`,
    ' Rs .5 ',
    'Rs  500',
    '1.5   lakh',
    '\r\n 2 cr \r\n',
  ];
  const limit = [
    '49,999,999,999,999.99',
    '49999999999999.995',
    '50,000,000,000,000',
    '50000000000000.00',
    '50000000000000.004',
    '50000000000000.005',
    '50000000000000.01',
    '50,00,000 crore',
    '5000000.0000001 crore',
    '5000001 crore',
    '500 lakh crore',
    '99999999999999999999',
    '1'.padEnd(40, '0'),
    '0.'.padEnd(40, '0') + '1',
    '1e5',
    '1E3',
  ];
  const rejected = [
    '',
    ' ',
    '.',
    ',',
    '/-',
    'Rs',
    'Rs.',
    'PKR',
    RUPEE,
    'k',
    'lakh',
    'lacs',
    'crore',
    'Rs /-',
    '-500',
    '- 500',
    '-0',
    '+500',
    '−500',
    '(500)',
    '500-',
    '5-10k',
    '5 - 10k',
    '5k-10k',
    '500 to 600',
    '500 600',
    '500,600 700',
    '1.5.5',
    '1..5',
    '1,,000',
    '1,000,',
    ',1000',
    '1,000,00',
    '1,00',
    '1,50',
    '1,5000',
    '15,00',
    '1,500,00',
    '12,345,67',
    '123,45,678',
    '1,23,4567',
    '1.500,00',
    '1.000.000',
    '1 000',
    `1${NBSP}000`,
    '1_000',
    "1'000",
    '500 rupees',
    'Rs 500 rupees',
    'rupees 500',
    '500 Rs PKR',
    'Rs 500 PKR',
    'PKR Rs 500',
    'Rs Rs 500',
    '5kk',
    '5 k k',
    '5 lakh crore',
    '1 lakh 50 thousand',
    '5 crs',
    '5 lakhh',
    '5 l',
    '5m',
    '5 million',
    '5 billion',
    '5b',
    '5 arab',
    'five',
    'five hundred',
    '5 hundred',
    'abc',
    'Rs abc',
    '500abc',
    'abc500',
    '500 /- Rs',
    '500/-/-',
    '500/',
    '500-/',
    '500 -',
    '$500',
    '500$',
    'USD 500',
    '500 USD',
    '€500',
    'Rs:500',
    'Rs-500',
    'Rs. -500',
    '0x1F',
    '0b101',
    'Infinity',
    'NaN',
    '1/2',
    '50%',
    '#500',
    '500.00.00',
    '..5',
    '5..',
    '.5.',
    'k5',
    'lakh 5',
    '5 ' + RUPEE + ' ' + RUPEE,
    '5 rs.rs',
    '1,5 lakh',
    '1,50 lakh',
  ];

  const inputs = unique([
    ...plain,
    ...grouped,
    ...decimals,
    ...withCurrency,
    ...slash,
    ...withUnits,
    ...unitMixes,
    ...scripts,
    ...spacing,
    ...limit,
    ...rejected,
  ]);
  each('format', ['parseAmount', 'formatAmountInput'], inputs);
}

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

// Passport (synthetic numbers only) ------------------------------------------
each(
  'passport',
  ['validatePassport'],
  [
    'AB1234567',
    'XY0000001',
    'ZZ9999999',
    'ab1234567',
    'Ab1234567',
    '  AB1234567  ',
    '\tAB1234567\n',
    '\u00a0AB1234567\u00a0',
    'AB 1234567',
    'AB-1234567',
    'AB–1234567',
    'AB—1234567',
    'AB‐1234567',
    'AB - 1234567',
    'A B1234567',
    'AB12 34567',
    'AB\t1234567',
    'AB.1234567',
    'AB/1234567',
    'AB۱۲۳۴۵۶۷',
    'AB١٢٣٤٥٦٧',
    'A12345678',
    'ABC123456',
    'AB123456',
    'AB12345678',
    '1234567AB',
    'AB1234567<',
    'AB1234567X',
    'ÄB1234567',
    'ＡＢ1234567',
    'AB１２３４５６７',
    '',
    ' ',
    'AB',
    '1234567',
  ],
);

// Vehicle plates (synthetic numbers only) ------------------------------------
each(
  'vehicle',
  ['validateVehiclePlate', 'parseVehiclePlate'],
  [
    'LEA-1234',
    'ABC-123',
    'ABC 123',
    'ABC123',
    'AB-123',
    'A-1',
    'A1',
    'ABCD-001',
    'ABCD-0001',
    'abc-123',
    'Lea 1234',
    '  ABC-123  ',
    '\tABC-123\n',
    '\u00a0ABC-123\u00a0',
    'ABC–123',
    'ABC—123',
    'ABC‐123',
    'ABC-۱۲۳',
    'ABC-١٢٣',
    'LEA-1234-19',
    'LEA 1234 19',
    'LEA-1234/06',
    'LEA 1234 / 06',
    'LEA-1234 - 19',
    'LEA-1234--19',
    'LEA-1234 /  19',
    'LEA-1234-2019',
    'LEA-1234-1',
    'LEA-123419',
    'ABC-12345',
    'ABC-12345-19',
    'ABCDE-123',
    'ABC--123',
    'ABC - 123',
    'ABC.123',
    'ABC/123',
    '123-ABC',
    'ABC',
    '123',
    'ICT ABC-123',
    'ABC-123 ICT',
    'ÄBC-123',
    'ＡＢＣ-123',
    '',
    ' ',
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

// validateLandline with services: UAN, toll-free and premium (PTA's plan).
{
  const serviceNumbers = unique([
    ...landlines,
    '0800-1234',
    '0800 123456',
    '0800-78686',
    '+92 800 78686',
    '0900-1234',
    '0900 12345',
    '0900-1234567',
    '111-111-111',
    '021-111-111-111',
    '051 111 222 333',
    '0122 123456',
  ]);
  for (const number of serviceNumbers) {
    call('numbers', 'validateLandline', [number], { services: true });
    call('numbers', 'validateLandline', [number], { services: false });
    call('numbers', 'analyzeNumber', [number]);
  }
  call('numbers', 'validateLandline', [null], { services: true });
  call('numbers', 'validateLandline', [42], { services: true });
}

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
  'PK36\u00a0SCBL',
]);
each('input', ['formatIBANInput', 'checkIBANInput'], ibanInputs);

// Quality (COD) -------------------------------------------------------------
const qualityAddresses = unique([
  ...addresses,
  'House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660',
  'Makan 5, gali 3, masjid ke samne, Multan',
  'H 5 nazd Jamia Masjid, Multan',
  'مکان 5، گلی 3، مسجد کے سامنے، Multan',
  'مکان نمبر ۱۲، گلی ۴، بلاک بی، نزد جامع مسجد، Lahore',
  'Flat 2, opp. Civil Hospital, Karachi',
  'Flat 2, opp Civil Hospital, Karachi 75500',
  'Plot 7, Phase 2, Hayatabad, behind KTH, Peshawar',
  'House 1, Lahore 54999',
  'House 1, Street 2, Lahore 75500',
  'qareeb Data Darbar, Lahore',
  'Shop 4 Saddar Bazaar Rawalpindi 46000',
  '12b Model Town, 4th street, Lahore',
  'Lahore 54660',
  'near',
  'NEAR THE PARK',
  ...postOffices
    .filter((_, i) => i % 40 === 0)
    .map((o, i) => `House ${i + 1}, Street ${i + 2}, ${o.office} ${o.code}`),
]);
each('quality', ['scoreAddress'], qualityAddresses);
each(
  'quality',
  ['phoneRiskSignals'],
  unique([
    ...phones,
    ...landlines,
    '03000000000',
    '03001111112',
    '03001234567',
    '03217654321',
    '03123456789',
    '03002345678',
    '03009876543',
    '0301-2945716',
    '+92 333 5820147',
    '۰۳۰۰۱۲۳۴۵۶۷',
    '0800-12345',
    '021-111-825-888',
    '111-825-888',
  ]),
);

// Sales tax ------------------------------------------------------------------
// Every case passes a date, so nothing depends on when vectors are made.
const taxDates = [
  '2019-06-30',
  '2019-07-01',
  '2022-06-30',
  '2022-07-01',
  '2023-02-22',
  '2023-02-23',
  '2024-06-30',
  '2024-07-01',
  '2026-11-18',
  '2099-12-31',
  '2024-02-29',
  '2023-02-29',
  '2026-13-01',
  '2026-1-1',
  ' 2026-11-18 ',
  '',
  'today',
];
const taxProvinces = [
  undefined,
  'Punjab',
  'punjab',
  'Sindh',
  'SINDH',
  'Khyber Pakhtunkhwa',
  'KP',
  'kpk',
  'Balochistan',
  'Baluchistan',
  'Islamabad Capital Territory',
  'ICT',
  'Islamabad',
  'Azad Jammu and Kashmir',
  'AJK',
  'Gilgit-Baltistan',
  'GB',
  'Lahore',
  '',
  'constructor',
];
for (const kind of ['goods', 'services', 'food']) {
  for (const province of taxProvinces) {
    for (const date of taxDates) {
      call('salestax', 'getSalesTaxRate', [], {
        kind,
        ...(province === undefined ? {} : { province }),
        date,
      });
    }
  }
}
const taxAmounts = [
  0,
  0.01,
  0.25,
  1,
  1.005,
  1.004,
  0.125,
  99.99,
  100,
  1000,
  1234,
  1180,
  1150,
  123456789.99,
  1e-7,
  1e12,
  1e12 + 1,
  -1,
  -0.01,
  NUM('NaN'),
  NUM('Infinity'),
];
const taxRates = [
  0,
  1,
  1.43,
  5,
  13,
  15,
  16,
  17,
  18,
  19.5,
  100,
  100.01,
  -1,
  16.666,
  0.001,
  NUM('NaN'),
];
for (const amount of taxAmounts) {
  for (const rate of taxRates) {
    call('salestax', 'calculateSalesTax', [amount], { rate });
    call('salestax', 'splitInclusive', [amount, rate]);
  }
  for (const options of [
    { province: 'Punjab', date: '2026-11-18' },
    { province: 'Sindh', date: '2024-06-30' },
    { province: 'Sindh', date: '2026-11-18', inclusive: true },
    { province: 'ICT', date: '2022-06-30', inclusive: true },
    { kind: 'goods', date: '2022-01-01' },
    { kind: 'goods', date: '2026-11-18', inclusive: true },
    { kind: 'goods', province: 'AJK', date: '2026-11-18' },
    { kind: 'services', date: '2026-11-18' },
    { province: 'Mars', date: '2026-11-18' },
    { province: 'Punjab', date: '2019-01-01' },
    { rate: 18, province: 'Punjab', date: '2026-11-18' },
    { rate: 18, inclusive: true },
    { rate: 18, inclusive: false },
    {},
  ]) {
    call('salestax', 'calculateSalesTax', [amount], options);
  }
}

// Bills ----------------------------------------------------------------------
const billInputs = unique([
  '01141111234567',
  '01 14111 1234567',
  '01-14111-1234567',
  '01.14111.1234567',
  '02 12624 0045901 R',
  '02126240045901R',
  '02126240045901r',
  '02126240045901 u',
  '02126240045901 X',
  '02126240045901UR',
  '۰۱۱۴۱۱۱۱۲۳۴۵۶۷',
  '٠١١٤١١١١٢٣٤٥٦٧',
  '1234567890',
  '12345678901',
  '1234567890R',
  '0400012345678',
  '0400-0123-45678',
  '0500012345678',
  '0400112345678',
  '040001234567',
  '123',
  '123456789',
  '123456789012',
  '012345678901234',
  'abcdefghijklmn',
  '0114111123456X',
  '  01141111234567  ',
  '01141111234567\n',
  '',
  ' ',
  '+921141111234567',
  '0114111123456٧',
  'Ⅰ234567890',
]);
each('bills', ['parseElectricityRef', 'validateElectricityRef'], billInputs);
for (const input of unique([
  ...billInputs,
  '12345678901',
  '1234567890',
  '1234 5678 90',
  '1234-5678-901',
  '۱۲۳۴۵۶۷۸۹۰',
])) {
  for (const company of [
    'SNGPL',
    'SSGC',
    'sngpl',
    'ssgc',
    'OGDCL',
    '',
    '__proto__',
    'constructor',
  ]) {
    call('bills', 'validateGasConsumerNumber', [input, company]);
  }
}

// Courier -------------------------------------------------------------------
const courierNames = [
  'TCS',
  'tcs',
  'Leopards',
  'LCS',
  'leopards courier',
  'PostEx',
  'postex',
  'POSTEX',
  'M&P',
  'MnP',
  'm and p',
  'Muller & Phipps',
  'Trax',
  'BlueEx',
  'Blue Ex',
  'blue-ex',
  'DHL',
  '',
  'constructor',
  '__proto__',
];
const courierStatuses = [
  'Unbooked',
  'UnBooked',
  'Booked',
  'PostEx WareHouse',
  'Out For Delivery',
  'out  for   delivery',
  'Delivered',
  'DELIVERED',
  'Returned',
  'Un-Assigned By Me',
  'Expired',
  'Delivery Under Review',
  'Picked By PostEx',
  'Out For Return',
  'Attempted',
  'En-Route to PostEx warehouse',
  "At Merchant's Warehouse",
  'At Merchant’s Warehouse',
  'At PostEx Warehouse',
  'Package on Root',
  'Package on Route',
  'Attempt Made: Customer not available',
  'attempt made',
  'Attempt Made:',
  'attempt madex',
  'Returned to Shipper',
  'returned  to shipper',
  '0001',
  '0002',
  '0005',
  '0008',
  '0009',
  '0013',
  '1',
  '9',
  '10',
  '15',
  '18',
  '19',
  'teleported',
  '',
  ' ',
  'constructor',
  'hasOwnProperty',
  1,
  2,
  5,
  9,
  10,
  12,
  15,
  18,
  0,
  -1,
  1.5,
  NUM('NaN'),
];
for (const courier of courierNames) {
  for (const status of courierStatuses) {
    call('courier', 'mapCourierStatus', [courier, status]);
  }
}
each(
  'courier',
  ['normalizeCityForCourier'],
  unique([
    ...cityNames,
    ...cityNames.map((c) => c.toUpperCase()),
    ...cityNames.slice(0, 40).map((c) => `${c} City`),
    'LHR',
    'lhe',
    'Lahor',
    'Khi',
    'KHI',
    'Krachi',
    'Pindi',
    'RWP',
    'Rawal Pindi',
    'Isb',
    'ISL',
    'Lyallpur',
    'LYP',
    'FSD',
    'Faisal Abad',
    'MUX',
    'Mtn',
    'PEW',
    'Psh',
    'UET',
    'Qta',
    'Hyd',
    'SKT',
    'GRW',
    'DGK',
    'D.G. Khan',
    'D.G.Khan',
    'DG Khan',
    'DIK',
    'D.I. Khan',
    'DI Khan',
    'RYK',
    'BWP',
    'SGD',
    'MZD',
    'لاہور',
    'کراچی',
    'راولپنڈی',
    'اسلام آباد',
    'فیصل آباد',
    'ملتان',
    'پشاور',
    'کوئٹہ',
    'حیدرآباد',
    'حیدر آباد',
    'سیالکوٹ',
    'گوجرانوالہ',
    '  karachi  ',
    'Karachi City',
    'Karachi city city',
    'lhr city',
    'Karachi, ',
    'Lahore.',
    'city',
    ' city',
    'Atlantis',
    '',
    ' ',
    'constructor',
    '__proto__',
    'toString',
  ]),
);

// FBR Digital Invoicing -----------------------------------------------------
const fbrLine = (overrides = {}) => ({
  hsCode: '0101.2100',
  productDescription: 'Horses',
  rate: '18%',
  uoM: 'Numbers, pieces, units',
  quantity: 1,
  valueSalesExcludingST: 1000,
  saleType: 'Goods at standard rate (default)',
  ...overrides,
});
const fbrInput = (overrides = {}, lines = [fbrLine()]) => ({
  invoiceType: 'Sale Invoice',
  invoiceDate: '2025-04-21',
  sellerNTNCNIC: '1234567',
  sellerBusinessName: 'Example Traders',
  sellerProvince: 'Sindh',
  sellerAddress: 'Karachi',
  buyerNTNCNIC: '7654321',
  buyerBusinessName: 'Example Buyer',
  buyerProvince: 'Punjab',
  buyerAddress: 'Lahore',
  buyerRegistrationType: 'Registered',
  items: lines,
  ...overrides,
});
const fbrInputs = [
  fbrInput(),
  fbrInput({ scenarioId: 'SN001' }),
  fbrInput({}, [
    fbrLine(),
    fbrLine({ quantity: 2, valueSalesExcludingST: 1234 }),
  ]),
  fbrInput({}, [
    fbrLine({
      rate: 'Rs.3',
      quantity: 12,
      sroScheduleNo: 'EIGHTH SCHEDULE Table 1',
      sroItemSerialNo: '82',
    }),
  ]),
  fbrInput({}, [
    fbrLine({
      rate: 'Rs.200',
      quantity: 123,
      sroScheduleNo: '6th Schd Table I',
      sroItemSerialNo: '1',
    }),
  ]),
  fbrInput({}, [fbrLine({ rate: 'rs 2.5', quantity: 1.2345 })]),
  fbrInput({}, [
    fbrLine({
      saleType: '3rd Schedule Goods',
      valueSalesExcludingST: 0,
      fixedNotifiedValueOrRetailPrice: 1000,
    }),
  ]),
  fbrInput({}, [
    fbrLine({
      saleType: '3rd schedule goods',
      fixedNotifiedValueOrRetailPrice: 100,
    }),
  ]),
  fbrInput({}, [
    fbrLine({
      rate: '1.43%',
      valueSalesExcludingST: 100,
      sroScheduleNo: '297(I)/2023-Table-I',
      sroItemSerialNo: '1',
    }),
  ]),
  fbrInput({}, [
    fbrLine({
      rate: 'Exempt',
      sroScheduleNo: 'SIXTH SCHEDULE',
      sroItemSerialNo: '100',
    }),
  ]),
  fbrInput({}, [
    fbrLine({ rate: '18% along with rupees 60 per kilogram', uoM: 'KG' }),
  ]),
  fbrInput({}, [
    fbrLine({
      salesTaxApplicable: 7,
      salesTaxWithheldAtSource: 7,
      totalValues: 1007,
      furtherTax: 40,
      extraTax: 0,
      fedPayable: 0,
      discount: 10,
    }),
  ]),
  fbrInput({}, [fbrLine({ valueSalesExcludingST: 0.25 })]),
  fbrInput({}, [fbrLine({ valueSalesExcludingST: 1.005 })]),
  fbrInput({}, [fbrLine({ valueSalesExcludingST: 999999.99 })]),
  fbrInput({}, [
    fbrLine({
      rate: '0%',
      sroScheduleNo: 'FIFTH SCHEDULE',
      sroItemSerialNo: '1',
    }),
  ]),
  fbrInput({}, [
    fbrLine({
      rate: '25%',
      sroScheduleNo: 'NINTH SCHEDULE',
      sroItemSerialNo: '1',
    }),
  ]),
  fbrInput({ buyerNTNCNIC: undefined, buyerRegistrationType: 'Unregistered' }),
  fbrInput({
    invoiceRefNo: '7327556DI1744111990654',
    invoiceType: 'Debit Note',
  }),
  fbrInput({}, []),
  null,
  'invoice',
  fbrInput({ items: 'x' }),
  fbrInput({}, [null]),
  fbrInput({}, [fbrLine({ quantity: NUM('NaN') })]),
];
for (const input of fbrInputs) {
  call('fbr-invoice', 'buildFbrInvoice', [input]);
}
for (const item of [
  fbrLine(),
  fbrLine({ rate: '17%' }),
  fbrLine({ rate: ' 18% ' }),
  fbrLine({ rate: '18 %' }),
  fbrLine({ rate: '100%' }),
  fbrLine({ rate: '101%' }),
  fbrLine({ rate: '16.666%' }),
  fbrLine({ rate: 'Rs.3', quantity: 12 }),
  fbrLine({ rate: 'Rs 3', quantity: 12 }),
  fbrLine({ rate: 'RS.3', quantity: 0.0001 }),
  fbrLine({ rate: 'Rs.0.005', quantity: 1 }),
  fbrLine({ rate: 'Rs.3' }),
  fbrLine({ rate: 'Exempt' }),
  fbrLine({ rate: '' }),
  fbrLine({
    saleType: '3rd Schedule Goods',
    fixedNotifiedValueOrRetailPrice: 100,
  }),
  fbrLine({
    saleType: '3rd  Schedule  GOODS',
    fixedNotifiedValueOrRetailPrice: 100,
  }),
  fbrLine({ saleType: '3rd Schedule Goods' }),
  fbrLine({ valueSalesExcludingST: NUM('Infinity') }),
  fbrLine({ valueSalesExcludingST: -5 }),
  fbrLine({ quantity: NUM('NaN'), rate: 'Rs.3' }),
  { rate: 5 },
  null,
]) {
  call('fbr-invoice', 'expectedSalesTax', [item]);
}

// Built invoices, then mutated one field at a time, through the validator.
const fbrBase = lib.buildFbrInvoice(fbrInput()).invoice;
const fbrWith = (mutate) => {
  const copy = JSON.parse(JSON.stringify(fbrBase));
  mutate(copy);
  return copy;
};
const fbrInvoices = [
  fbrBase,
  ...fbrInputs
    .map((input) => lib.buildFbrInvoice(input))
    .filter((built) => built !== null)
    .map((built) => JSON.parse(JSON.stringify(built.invoice))),
  fbrWith((i) => (i.invoiceType = 'Sales Invoice')),
  fbrWith((i) => (i.invoiceType = '')),
  fbrWith((i) => delete i.invoiceType),
  fbrWith((i) => (i.invoiceType = 'Debit Note')),
  fbrWith((i) => {
    i.invoiceType = 'Debit Note';
    i.invoiceRefNo = '7327556DI1744111990654';
  }),
  fbrWith((i) => (i.invoiceRefNo = '3520212345671DI1744111990654')),
  fbrWith((i) => (i.invoiceRefNo = '7327556-1744111990654')),
  fbrWith((i) => (i.invoiceRefNo = ' 7327556DI1744111990654 ')),
  fbrWith((i) => (i.invoiceDate = '21-04-2025')),
  fbrWith((i) => (i.invoiceDate = '2025-02-30')),
  fbrWith((i) => (i.invoiceDate = '2024-02-29')),
  fbrWith((i) => (i.invoiceDate = '2027-01-01')),
  fbrWith((i) => (i.invoiceDate = '')),
  fbrWith((i) => (i.invoiceDate = 20250421)),
  fbrWith((i) => (i.sellerNTNCNIC = '12345-6789012-3')),
  fbrWith((i) => (i.sellerNTNCNIC = '3520212345671')),
  fbrWith((i) => (i.sellerNTNCNIC = '123456789')),
  fbrWith((i) => (i.sellerNTNCNIC = 1234567)),
  fbrWith((i) => (i.sellerBusinessName = '  ')),
  fbrWith((i) => (i.sellerProvince = '')),
  fbrWith((i) => (i.sellerAddress = '')),
  fbrWith((i) => (i.buyerRegistrationType = 'registered')),
  fbrWith((i) => (i.buyerRegistrationType = '')),
  fbrWith((i) => (i.buyerNTNCNIC = '')),
  fbrWith((i) => {
    i.buyerNTNCNIC = '';
    i.buyerRegistrationType = 'Unregistered';
  }),
  fbrWith((i) => {
    i.buyerNTNCNIC = '12';
    i.buyerRegistrationType = 'Unregistered';
  }),
  fbrWith((i) => (i.buyerNTNCNIC = '1234567')),
  fbrWith((i) => (i.buyerBusinessName = '')),
  fbrWith((i) => (i.buyerProvince = ' ')),
  fbrWith((i) => (i.buyerAddress = '')),
  fbrWith((i) => (i.scenarioId = 'SN028')),
  fbrWith((i) => (i.scenarioId = 'SN029')),
  fbrWith((i) => (i.scenarioId = 'SN000')),
  fbrWith((i) => (i.scenarioId = '')),
  fbrWith((i) => (i.scenarioId = 1)),
  fbrWith((i) => (i.items = [])),
  fbrWith((i) => delete i.items),
  fbrWith((i) => (i.items = [null, 'x'])),
  fbrWith((i) => (i.items[0].hsCode = '')),
  fbrWith((i) => delete i.items[0].productDescription),
  fbrWith((i) => (i.items[0].productDescription = '')),
  fbrWith((i) => (i.items[0].rate = '')),
  fbrWith((i) => (i.items[0].uoM = '')),
  fbrWith((i) => (i.items[0].saleType = '')),
  fbrWith((i) => delete i.items[0].quantity),
  fbrWith((i) => delete i.items[0].valueSalesExcludingST),
  fbrWith((i) => delete i.items[0].salesTaxApplicable),
  fbrWith((i) => delete i.items[0].salesTaxWithheldAtSource),
  fbrWith((i) => delete i.items[0].totalValues),
  fbrWith((i) => delete i.items[0].fixedNotifiedValueOrRetailPrice),
  fbrWith((i) => (i.items[0].quantity = 1.23456)),
  fbrWith((i) => (i.items[0].quantity = 1.2345)),
  fbrWith((i) => (i.items[0].valueSalesExcludingST = 1000.001)),
  fbrWith((i) => (i.items[0].valueSalesExcludingST = '1000')),
  fbrWith((i) => (i.items[0].valueSalesExcludingST = -1)),
  fbrWith((i) => (i.items[0].discount = -1)),
  fbrWith((i) => (i.items[0].discount = '')),
  fbrWith((i) => (i.items[0].discount = 'ten')),
  fbrWith((i) => (i.items[0].furtherTax = 1.234)),
  fbrWith((i) => (i.items[0].salesTaxWithheldAtSource = '')),
  fbrWith((i) => (i.items[0].rate = '17%')),
  fbrWith((i) => {
    i.items[0].rate = '17%';
    i.items[0].sroScheduleNo = 'EIGHTH SCHEDULE Table 1';
  }),
  fbrWith((i) => {
    i.items[0].rate = '17%';
    i.items[0].sroScheduleNo = 'EIGHTH SCHEDULE Table 1';
    i.items[0].sroItemSerialNo = '82';
    i.items[0].salesTaxApplicable = 170;
  }),
  fbrWith((i) => (i.items[0].salesTaxApplicable = 180.01)),
  fbrWith((i) => (i.items[0].salesTaxApplicable = 179.99)),
  fbrWith((i) => (i.items[0].salesTaxApplicable = 180.02)),
  fbrWith((i) => (i.items[0].salesTaxApplicable = 0)),
  fbrWith((i) => {
    i.items[0].saleType = '3rd Schedule Goods';
    i.items[0].fixedNotifiedValueOrRetailPrice = 0;
  }),
  fbrWith((i) => {
    i.items[0].saleType = '3rd Schedule Goods';
    i.items[0].fixedNotifiedValueOrRetailPrice = 1000;
  }),
  fbrWith((i) => {
    i.items[0].saleType = 'Goods at Reduced Rate';
    i.items[0].extraTax = 0;
  }),
  fbrWith((i) => {
    i.items[0].saleType = 'goods at reduced rate';
    i.items[0].extraTax = '';
  }),
  fbrWith((i) => {
    i.items[0].rate = 'Rs.3';
    i.items[0].quantity = 12;
    i.items[0].salesTaxApplicable = 36;
    i.items[0].sroScheduleNo = 'X';
    i.items[0].sroItemSerialNo = '1';
  }),
  fbrWith((i) => {
    i.items[0].rate = 'Rs.3';
    i.items[0].quantity = 12;
    i.items[0].salesTaxApplicable = 30;
  }),
  fbrWith((i) => (i.items[0].sroScheduleNo = 'X')),
];
for (const invoice of fbrInvoices) {
  call('fbr-invoice', 'validateFbrInvoice', [invoice]);
}
for (const today of [
  '2026-11-18',
  '2025-04-21',
  '2025-04-20',
  'bad',
  '2025-02-30',
]) {
  call('fbr-invoice', 'validateFbrInvoice', [fbrBase], { today });
  call(
    'fbr-invoice',
    'validateFbrInvoice',
    [fbrWith((i) => (i.invoiceDate = '2027-01-01'))],
    { today },
  );
}
for (const value of [null, 1, 'x', [], {}]) {
  call('fbr-invoice', 'validateFbrInvoice', [value]);
}

// Urdu text: slugs, sorting, direction ----------------------------------------
{
  const slugInputs = unique([
    ...texts,
    'Lahore Fort, 2024',
    'لاہور قلعہ',
    'لاہور Fort',
    'کراچی ۲۰۲۴',
    'Café Ünïon — ÀÉ',
    'ŒUVRE ÆON × ÷ Þorn straße',
    'كتاب يوم ى',
    'م\u064fح\u064eم\u064e\u0651د',
    'پاکستان\u200cزندہ\u200dباد',
    'خوش آمدید!!!',
    '---a---',
    '  Ünited   Kingdom ',
    'Rs. 1,500/-',
    'ٱل\u0652ح\u064eم\u0652د\u064f',
    'ﷲ ﻻ',
    'naïve résumé',
    'ğüşçö',
    '😀 emoji 😀',
    'مـــرحبا',
    '\u2067سلام\u2069 world',
    'A1-B2_C3',
    '١٢٣ ۴۵۶',
  ]);
  for (const input of slugInputs) {
    call('text', 'slugify', [input]);
    for (const script of ['any', 'latin', 'urdu', 'cyrillic']) {
      call('text', 'slugify', [input], { script });
    }
  }
  for (const input of [null, 42, true]) call('text', 'slugify', [input]);

  // Every pair from a word list that exercises the CLDR rules: digraphs with
  // ھ, hamza variants, آ, diacritics, digits, punctuation, Arabic look-alikes,
  // Latin case, prefixes and empty strings.
  const words = [
    '',
    ' ',
    'ا',
    'آ',
    'اب',
    'آم',
    'أب',
    'آب',
    'آ',
    'ب',
    'باغ',
    'بھائی',
    'بھ',
    'بہن',
    'ب\u064eت',
    'ب\u0650ت',
    'بت',
    'ب\u0651ت',
    'پ',
    'پھل',
    'تھا',
    'ٹھیک',
    'جھیل',
    'چھت',
    'دھوپ',
    'ڈھول',
    'رھ',
    'ڑھ',
    'کتاب',
    'كتاب',
    'کھانا',
    'گھر',
    'لھ',
    'مھ',
    'نھ',
    'ںھ',
    'وطن',
    'ؤ',
    'وھ',
    'ہم',
    'ۂ',
    'ھ',
    'ۃ',
    'ء',
    'یہ',
    'يہ',
    'ئ',
    'یھ',
    'ے',
    'ۓ',
    'ه',
    'ة',
    '۱',
    '1',
    '١',
    '۲',
    '10',
    '2',
    '،',
    '۔',
    'a',
    'A',
    'b',
    'Zebra',
    'zebra',
    'پاکستان',
    'پاک',
    'لاہور',
    'لاھور',
    'کراچی',
    'ک',
    'گ',
    'ے ا',
    'اے',
    'ـا',
    'ا\u200cب',
  ];
  for (const a of unique(words))
    for (const b of unique(words)) call('text', 'compareUrdu', [a, b]);
  for (const [a, b] of [
    [null, ''],
    ['ا', null],
    [1, 'ا'],
    [null, null],
  ]) {
    call('text', 'compareUrdu', [a, b]);
  }

  const bidiInputs = [
    '',
    ' ',
    'سلام',
    '123 سلام',
    'Order نمبر',
    'نمبر Order',
    '۱۲۳',
    '123',
    '!!! hello',
    '- مرحبا',
    'שלום',
    'ހ\u07acލ\u07af',
    '\u2067abc\u2069',
    '😀 سلام',
    'Ünited',
    '١٢٣ abc',
    'ﻻ',
    'PDK-1042',
  ];
  for (const input of bidiInputs) {
    call('text', 'isRTL', [input]);
    call('text', 'wrapBidi', [input]);
    for (const dir of ['auto', 'rtl', 'ltr', 'up']) {
      call('text', 'wrapBidi', [input, dir]);
    }
  }
  for (const input of [null, 7, {}]) {
    call('text', 'isRTL', [input]);
    call('text', 'wrapBidi', [input]);
  }
}

// Income tax ----------------------------------------------------------------
{
  const years = lib.getSalaryTaxYears();
  const incomes = [0, 0.01, 1, 599_999.99, 600_000, 600_000.01, 1_000_000];
  for (const y of years) {
    for (const slab of lib.getSalaryTaxSlabs(y).slabs) {
      incomes.push(slab.over, slab.over + 0.01, slab.over + 1);
      if (slab.upTo !== null) incomes.push(slab.upTo - 0.01, slab.upTo);
    }
  }
  incomes.push(
    1_234_567.89,
    1_800_000,
    2_400_000,
    3_456_789.5,
    5_000_000,
    12_345_678.91,
    99_999_999.99,
    250_000_000,
    1e12,
    1.005,
    2_000_000.005,
    0.004,
    0.005,
  );
  const invalid = [-1, -0.01, 1e12 + 1, NUM('NaN'), NUM('Infinity'), '100000'];
  for (const y of [...years, 2019, 2028, 2026.5]) {
    call('incometax', 'getSalaryTaxSlabs', [y]);
    for (const income of unique(incomes)) {
      call('incometax', 'calculateSalaryTax', [income], { taxYear: y });
    }
    for (const income of invalid) {
      call('incometax', 'calculateSalaryTax', [income], { taxYear: y });
    }
    for (const monthly of [
      0, 50_000, 100_000, 150_000, 183_333.33, 250_000, 1_000_000, 0.01,
    ]) {
      call('incometax', 'calculateMonthlySalaryTax', [monthly], { taxYear: y });
    }
  }
  call('incometax', 'getSalaryTaxYears', []);
  for (const date of [
    '2019-07-01',
    '2020-06-30',
    '2025-06-30',
    '2025-07-01',
    '2026-11-18',
    '2026-02-29',
    'x',
  ]) {
    call('incometax', 'getTaxYear', [date]);
    call('incometax', 'calculateSalaryTax', [1_500_000], { date });
  }
  for (const date of [D('2025-07-01T00:00:00'), D('2025-06-30T23:59:59')]) {
    call('incometax', 'getTaxYear', [date]);
  }
  // taxYear wins over date.
  call('incometax', 'calculateSalaryTax', [1_500_000], {
    taxYear: 2024,
    date: '2026-01-01',
  });
  for (const options of [
    { taxYear: '2026' },
    { taxYear: null, date: '2023-01-01' },
  ]) {
    call('incometax', 'calculateSalaryTax', [1_500_000], options);
  }
  for (const value of [null, 'x', true]) {
    call('incometax', 'calculateSalaryTax', [value], { taxYear: 2026 });
    call('incometax', 'calculateMonthlySalaryTax', [value], { taxYear: 2026 });
  }
}

// Income tax with the section 4AB surcharge (includeSurcharge).
{
  const incomes = [
    0, 600_000, 5_000_000, 9_999_999.99, 10_000_000, 10_000_000.01, 10_000_001,
    12_000_000, 15_000_000, 22_000_000, 50_000_000, 75_000_000, 123_456_789.12,
    1e12,
  ];
  for (const y of [...lib.getSalaryTaxYears(), 2028]) {
    for (const income of incomes) {
      call('incometax', 'calculateSalaryTax', [income], {
        taxYear: y,
        includeSurcharge: true,
      });
      call('incometax', 'calculateSalaryTax', [income], {
        taxYear: y,
        includeSurcharge: false,
      });
    }
    for (const monthly of [833_333.33, 833_333.34, 1_000_000, 2_500_000]) {
      call('incometax', 'calculateMonthlySalaryTax', [monthly], {
        taxYear: y,
        includeSurcharge: true,
      });
    }
  }
}

// Docs examples (site/examples/*.json) -----------------------------------------
// Every code example on pakdatakit.dev comes from these files. Each stated
// result is checked against the library here, and the examples are written as
// docs-examples.json, so every port replays them too (npm run test:ports).
// PDK_FILL_EXAMPLES=1 fills in `expected` for examples that don't state one.
{
  const examplesDir = join(root, 'site', 'examples');
  const files = existsSync(examplesDir)
    ? readdirSync(examplesDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
    : [];
  for (const file of files) {
    const path = join(examplesDir, file);
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    let filled = false;
    for (const example of doc.examples) {
      const got = call(
        'docs-examples',
        example.fn,
        example.args ?? [],
        example.kwargs,
      );
      if (!('expected' in example) && process.env.PDK_FILL_EXAMPLES === '1') {
        example.expected = got;
        filled = true;
      } else if (JSON.stringify(got) !== JSON.stringify(example.expected)) {
        throw new Error(
          `site/examples/${file} (${example.id}): ${example.fn} returns ${JSON.stringify(got)}, but the example states ${JSON.stringify(example.expected)}`,
        );
      }
    }
    if (filled) writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  }
}

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

// Keep the count in test-vectors/README.md current.
const readmePath = join(outDir, 'README.md');
const n = (value) => value.toLocaleString('en-US');
const countBlock = [
  '<!-- vectors:count -->',
  '',
  `${n(total)} vectors in ${vectors.size} files:`,
  '',
  ...[...vectors.keys()]
    .sort()
    .map((module) => `- \`${module}.json\`: ${n(vectors.get(module).length)}`),
  '',
  '<!-- /vectors:count -->',
].join('\n');
const readme = readFileSync(readmePath, 'utf8');
writeFileSync(
  readmePath,
  readme.replace(
    /<!-- vectors:count -->[\s\S]*<!-- \/vectors:count -->/,
    countBlock,
  ),
);

console.log(
  `Copied ${dataFiles.length} data files; wrote ${total} vectors to test-vectors/`,
);
