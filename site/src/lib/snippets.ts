/**
 * Renders a docs example (site/examples/<module>.json) as code in each of the
 * five ports. The examples' results are checked in every port by
 * `npm run test:ports` (they are replayed from test-vectors/docs-examples.json),
 * so the result comments shown here can't drift from what the libraries return.
 */

export type Lang = 'ts' | 'py' | 'dart' | 'cs' | 'php';

export const LANGS: { id: Lang; label: string; code: string }[] = [
  { id: 'ts', label: 'TypeScript', code: 'ts' },
  { id: 'py', label: 'Python', code: 'python' },
  { id: 'dart', label: 'Dart', code: 'dart' },
  { id: 'cs', label: 'C#', code: 'csharp' },
  { id: 'php', label: 'PHP', code: 'php' },
];

export interface Example {
  id: string;
  title: string;
  fn: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  expected: unknown;
}

/** Writes one call in a language, for functions the general rules don't fit. */
type Render = (args: unknown[], kwargs: Record<string, unknown>) => string;

interface Api {
  /** Python name, when it isn't the TypeScript name in snake_case. */
  py?: string;
  /** Class.Method in .NET. */
  cs: string;
  /** Class::method in PHP. */
  php: string;
  /** .NET options type for kwargs, if the function takes options. */
  csOptions?: string;
  /** The options object is the only argument (TS, PHP). */
  optionsOnly?: boolean;
  /** Per-language overrides of the whole call expression. */
  render?: Partial<Record<Lang, Render>>;
  /**
   * The enum the result is in Dart and .NET (TypeScript, Python and PHP
   * return the string). `dartOnly`: .NET returns the string too.
   */
  returns?: { type: string; dartOnly?: boolean };
}

const INPUT_STATE = { returns: { type: 'InputState' } };

const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Hijri offset: an option in TS, Python and Dart; a positional int in C# and PHP. */
const hijriOffset = (cs: string, php: string) => ({
  // .NET takes a DateOnly here.
  cs: (a: unknown[], k: Record<string, unknown>) =>
    `${cs}(${[
      ...a.map((v) =>
        isDate(v)
          ? `new DateOnly(${v.$date.slice(0, 10).split('-').map(Number).join(', ')})`
          : lit('cs', v),
      ),
      ...(k.offset !== undefined ? [String(k.offset)] : []),
    ].join(', ')})`,
  php: (a: unknown[], k: Record<string, unknown>) =>
    `${php}(${[...a.map((v) => lit('php', v)), ...(k.offset !== undefined ? [String(k.offset)] : [])].join(', ')})`,
});

/** Words: language (and cheque) are positional in PHP; an enum in Dart and C#. */
const words = (cs: string, php: string, cheque: boolean) => ({
  cs: (a: unknown[], k: Record<string, unknown>) =>
    `${cs}(${[
      lit('cs', a[0]),
      ...(k.language || k.cheque !== undefined
        ? [`WordsLanguage.${pascal(String(k.language ?? 'en'))}`]
        : []),
      ...(cheque && k.cheque !== undefined ? [`cheque: ${k.cheque}`] : []),
    ].join(', ')})`,
  php: (a: unknown[], k: Record<string, unknown>) =>
    `${php}(${[
      lit('php', a[0]),
      ...(k.language || k.cheque !== undefined
        ? [`'${k.language ?? 'en'}'`]
        : []),
      ...(cheque && k.cheque !== undefined ? [`cheque: ${k.cheque}`] : []),
    ].join(', ')})`,
});

/** Holiday options: a HolidayOptions object in .NET. */
const holidayCs =
  (cs: string): Render =>
  (a, k) => {
    const kw = Object.entries(k);
    const opts = kw.length
      ? `, new HolidayOptions { ${kw.map(([key, v]) => `${pascal(key)} = ${lit('cs', v)}`).join(', ')} }`
      : '';
    return `${cs}(${a.map((v) => lit('cs', v)).join(', ')}${opts})`;
  };

/** A Hijri date argument. */
const hijriArg: Partial<Record<Lang, Render>> = {
  dart: (a) => {
    const h = a[0] as { year: number; month: number; day: number };
    return `fromHijri(HijriDate(year: ${h.year}, month: ${h.month}, day: ${h.day}))`;
  },
  cs: (a) => {
    const h = a[0] as { year: number; month: number; day: number };
    return `Hijri.FromHijri(new HijriDate(${h.year}, ${h.month}, ${h.day}))`;
  },
  php: (a) => {
    const h = a[0] as { year: number; month: number; day: number };
    return `Hijri::fromHijri(new HijriDate(${h.year}, ${h.month}, ${h.day}))`;
  },
};

/** wrapBidi's direction: an enum in Dart and .NET. */
const bidi: Partial<Record<Lang, Render>> = {
  dart: (a) =>
    `wrapBidi(${[lit('dart', a[0]), ...(a.length > 1 ? [`BidiDirection.${a[1]}`] : [])].join(', ')})`,
  cs: (a) =>
    `Text.WrapBidi(${[lit('cs', a[0]), ...(a.length > 1 ? [`BidiDirection.${pascal(String(a[1]))}`] : [])].join(', ')})`,
};

/** Names of every function used in the examples, per port. */
export const API: Record<string, Api> = {
  // cnic
  validateCNIC: { cs: 'Cnic.Validate', php: 'Cnic::validate' },
  getCNICInfo: { cs: 'Cnic.GetInfo', php: 'Cnic::getInfo' },
  findCNICs: { py: 'find_cnics', cs: 'Cnic.FindAll', php: 'Cnic::findAll' },
  maskCNICs: { py: 'mask_cnics', cs: 'Cnic.Mask', php: 'Cnic::mask' },
  // phone, networks, numbers, whatsapp
  validatePhone: { cs: 'Phone.Validate', php: 'Phone::validate' },
  formatPhone: { cs: 'Phone.Format', php: 'Phone::format' },
  analyzePhone: { cs: 'Phone.Analyze', php: 'Phone::analyze' },
  getNetwork: {
    cs: 'Networks.GetNetwork',
    php: 'Networks::getNetwork',
    returns: { type: 'NetworkName', dartOnly: true },
  },
  analyzeNumber: { cs: 'Numbers.Analyze', php: 'Numbers::analyze' },
  getNumberType: {
    cs: 'Numbers.GetNumberType',
    php: 'Numbers::getNumberType',
    returns: { type: 'NumberType' },
  },
  validateLandline: {
    cs: 'Numbers.ValidateLandline',
    php: 'Numbers::validateLandline',
    // .NET and PHP take `services` as a parameter, not an options object.
    render: {
      cs: (a, k) =>
        `Numbers.ValidateLandline(${[lit('cs', a[0]), ...('services' in k ? [`services: ${lit('cs', k.services)}`] : [])].join(', ')})`,
      php: (a, k) =>
        `Numbers::validateLandline(${[lit('php', a[0]), ...('services' in k ? [`services: ${lit('php', k.services)}`] : [])].join(', ')})`,
    },
  },
  getAreaCode: { cs: 'Numbers.GetAreaCode', php: 'Numbers::getAreaCode' },
  createWhatsAppLink: {
    py: 'create_whatsapp_link',
    cs: 'WhatsApp.CreateLink',
    php: 'WhatsApp::createLink',
  },
  // iban
  validateIBAN: { cs: 'Iban.Validate', php: 'Iban::validate' },
  getBankFromIBAN: { cs: 'Iban.GetBank', php: 'Iban::getBank' },
  getBankInfo: { cs: 'Iban.GetBankInfo', php: 'Iban::getBankInfo' },
  getBanks: { cs: 'Iban.GetBanks', php: 'Iban::getBanks' },
  // salestax, incometax
  getSalesTaxRate: {
    cs: 'SalesTax.GetRate',
    php: 'SalesTax::getRate',
    csOptions: 'SalesTaxRateQuery',
    optionsOnly: true,
  },
  calculateSalesTax: {
    cs: 'SalesTax.Calculate',
    php: 'SalesTax::calculate',
    csOptions: 'SalesTaxOptions',
  },
  splitInclusive: {
    cs: 'SalesTax.SplitInclusive',
    php: 'SalesTax::splitInclusive',
  },
  calculateSalaryTax: {
    cs: 'IncomeTax.CalculateSalaryTax',
    php: 'IncomeTax::calculateSalary',
    csOptions: 'SalaryTaxOptions',
  },
  calculateMonthlySalaryTax: {
    cs: 'IncomeTax.CalculateMonthlySalaryTax',
    php: 'IncomeTax::calculateMonthlySalary',
    csOptions: 'SalaryTaxOptions',
  },
  getTaxYear: { cs: 'IncomeTax.GetTaxYear', php: 'IncomeTax::getTaxYear' },
  getSalaryTaxSlabs: {
    cs: 'IncomeTax.GetSalaryTaxSlabs',
    php: 'IncomeTax::getSalarySlabs',
  },
  getSalaryTaxYears: {
    cs: 'IncomeTax.GetSalaryTaxYears',
    php: 'IncomeTax::getSalaryYears',
  },
  // postal
  getPostalCode: { cs: 'Postal.GetCode', php: 'Postal::getCode' },
  getCityByPostalCode: { cs: 'Postal.GetCity', php: 'Postal::getCity' },
  getPostalCodes: { cs: 'Postal.GetCodes', php: 'Postal::getCodes' },
  getPostalAreas: { cs: 'Postal.GetAreas', php: 'Postal::getAreas' },
  searchPostalCodes: { cs: 'Postal.Search', php: 'Postal::search' },
  getPostOffice: { cs: 'Postal.GetPostOffice', php: 'Postal::getPostOffice' },
  searchPostOffices: {
    cs: 'Postal.SearchPostOffices',
    php: 'Postal::searchPostOffices',
  },
  // raast
  createRaastP2PQr: {
    py: 'create_raast_p2p_qr',
    cs: 'RaastQr.CreateP2P',
    php: 'RaastQr::createP2P',
    csOptions: 'RaastP2POptions',
    optionsOnly: true,
  },
  parseRaastQr: { cs: 'RaastQr.Parse', php: 'RaastQr::parse' },
  // tax (NTN/STRN), passport, vehicle
  analyzeNTN: { cs: 'Tax.AnalyzeNtn', php: 'Tax::analyzeNtn' },
  validateNTN: { cs: 'Tax.ValidateNtn', php: 'Tax::validateNtn' },
  validateSTRN: { cs: 'Tax.ValidateStrn', php: 'Tax::validateStrn' },
  validatePassport: { cs: 'Passport.Validate', php: 'Passport::validate' },
  validateVehiclePlate: {
    cs: 'VehiclePlate.Validate',
    php: 'VehiclePlate::validate',
  },
  parseVehiclePlate: { cs: 'VehiclePlate.Parse', php: 'VehiclePlate::parse' },
  // bills
  parseElectricityRef: {
    cs: 'Bills.ParseElectricityRef',
    php: 'Bills::parseElectricityRef',
  },
  validateElectricityRef: {
    cs: 'Bills.ValidateElectricityRef',
    php: 'Bills::validateElectricityRef',
  },
  validateGasConsumerNumber: {
    cs: 'Bills.ValidateGasConsumerNumber',
    php: 'Bills::validateGasConsumerNumber',
    render: {
      cs: (a) =>
        `Bills.ValidateGasConsumerNumber(${lit('cs', a[0])}, GasCompany.${pascal(String(a[1]).toLowerCase())})`,
    },
  },
  // quality, courier
  scoreAddress: { cs: 'Quality.ScoreAddress', php: 'Quality::scoreAddress' },
  phoneRiskSignals: {
    cs: 'Quality.PhoneRiskSignals',
    php: 'Quality::phoneRiskSignals',
    returns: { type: 'PhoneRiskFlag' },
  },
  mapCourierStatus: {
    cs: 'Courier.MapStatus',
    php: 'Courier::mapStatus',
    returns: { type: 'CourierStatus' },
  },
  normalizeCityForCourier: {
    cs: 'Courier.NormalizeCity',
    php: 'Courier::normalizeCity',
  },
  // fbr-invoice
  buildFbrInvoice: { cs: 'FbrInvoice.Build', php: 'FbrInvoice::build' },
  validateFbrInvoice: {
    cs: 'FbrInvoice.Validate',
    php: 'FbrInvoice::validate',
    render: {
      cs: (a, k) =>
        `FbrInvoice.Validate(${[lit('cs', a[0]), ...(k.today ? [`today: ${lit('cs', k.today)}`] : [])].join(', ')})`,
    },
  },
  expectedSalesTax: {
    cs: 'FbrInvoice.ExpectedSalesTax',
    php: 'FbrInvoice::expectedSalesTax',
  },
  // geo
  getProvince: { cs: 'Geo.GetProvince', php: 'Geo::getProvince' },
  searchCities: { cs: 'Geo.SearchCities', php: 'Geo::searchCities' },
  getDistrictProvince: {
    cs: 'Geo.GetDistrictProvince',
    php: 'Geo::getDistrictProvince',
  },
  searchDistricts: { cs: 'Geo.SearchDistricts', php: 'Geo::searchDistricts' },
  getDistrictsByProvince: {
    cs: 'Geo.GetDistrictsByProvince',
    php: 'Geo::getDistrictsByProvince',
  },
  getDivisions: { cs: 'Geo.GetDivisions', php: 'Geo::getDivisions' },
  getDivisionOfDistrict: {
    cs: 'Geo.GetDivisionOfDistrict',
    php: 'Geo::getDivisionOfDistrict',
  },
  getTehsils: { cs: 'Geo.GetTehsils', php: 'Geo::getTehsils' },
  getTehsilDistrict: {
    cs: 'Geo.GetTehsilDistrict',
    php: 'Geo::getTehsilDistrict',
  },
  // address
  parseAddress: { cs: 'Address.Parse', php: 'Address::parse' },
  formatAddress: {
    cs: 'Address.Format',
    php: 'Address::format',
    csOptions: 'ParsedAddress',
    optionsOnly: true,
  },
  // text
  normalizeText: { cs: 'Text.Normalize', php: 'Text::normalize' },
  normalizeRomanUrdu: {
    cs: 'Text.NormalizeRomanUrdu',
    php: 'Text::normalizeRomanUrdu',
  },
  romanUrduKey: { cs: 'Text.RomanUrduKey', php: 'Text::romanUrduKey' },
  toUrduDigits: { cs: 'Text.ToUrduDigits', php: 'Text::toUrduDigits' },
  toEnglishDigits: { cs: 'Text.ToEnglishDigits', php: 'Text::toEnglishDigits' },
  slugify: {
    cs: 'Text.Slugify',
    php: 'Text::slugify',
    csOptions: 'SlugifyOptions',
  },
  compareUrdu: { cs: 'Text.CompareUrdu', php: 'Text::compareUrdu' },
  isRTL: { cs: 'Text.IsRtl', php: 'Text::isRtl' },
  wrapBidi: { cs: 'Text.WrapBidi', php: 'Text::wrapBidi', render: bidi },
  // words, format
  numberToWords: {
    cs: 'Words.NumberToWords',
    php: 'Words::numberToWords',
    render: words('Words.NumberToWords', 'Words::numberToWords', false),
  },
  amountInWords: {
    cs: 'Words.AmountInWords',
    php: 'Words::amountInWords',
    render: words('Words.AmountInWords', 'Words::amountInWords', true),
  },
  formatPKR: { cs: 'Currency.FormatPkr', php: 'Currency::formatPkr' },
  formatLakh: { cs: 'Currency.FormatLakh', php: 'Currency::formatLakh' },
  parseAmount: { cs: 'Currency.ParseAmount', php: 'Currency::parseAmount' },
  formatAmountInput: {
    cs: 'Currency.FormatAmountInput',
    php: 'Currency::formatAmountInput',
  },
  // hijri, holidays
  toHijri: {
    cs: 'Hijri.ToHijri',
    php: 'Hijri::toHijri',
    render: hijriOffset('Hijri.ToHijri', 'Hijri::toHijri'),
  },
  fromHijri: {
    cs: 'Hijri.FromHijri',
    php: 'Hijri::fromHijri',
    render: hijriArg,
  },
  formatHijri: {
    cs: 'Hijri.Format',
    php: 'Hijri::format',
    render: hijriOffset('Hijri.Format', 'Hijri::format'),
  },
  isRamadan: {
    cs: 'Hijri.IsRamadan',
    php: 'Hijri::isRamadan',
    render: hijriOffset('Hijri.IsRamadan', 'Hijri::isRamadan'),
  },
  getHijriMonthName: { cs: 'Hijri.GetMonthName', php: 'Hijri::getMonthName' },
  getPakistanHolidays: {
    cs: 'Holidays.GetHolidays',
    php: 'Holidays::getHolidays',
    render: { cs: holidayCs('Holidays.GetHolidays') },
  },
  getHolidaysOn: {
    cs: 'Holidays.GetHolidaysOn',
    php: 'Holidays::getHolidaysOn',
    render: { cs: holidayCs('Holidays.GetHolidaysOn') },
  },
  isPakistanHoliday: {
    cs: 'Holidays.IsHoliday',
    php: 'Holidays::isHoliday',
    render: { cs: holidayCs('Holidays.IsHoliday') },
  },
  // input
  formatCNICInput: { cs: 'Input.FormatCnic', php: 'Input::formatCnic' },
  checkCNICInput: {
    cs: 'Input.CheckCnic',
    php: 'Input::checkCnic',
    ...INPUT_STATE,
  },
  formatPhoneInput: { cs: 'Input.FormatPhone', php: 'Input::formatPhone' },
  checkPhoneInput: {
    cs: 'Input.CheckPhone',
    php: 'Input::checkPhone',
    ...INPUT_STATE,
  },
  formatIBANInput: { cs: 'Input.FormatIban', php: 'Input::formatIban' },
  checkIBANInput: {
    cs: 'Input.CheckIban',
    php: 'Input::checkIban',
    ...INPUT_STATE,
  },
};

/** The Python name: the TypeScript name in snake_case, as the Python port names it. */
export function pyName(fn: string): string {
  const api = API[fn];
  if (api?.py) return api.py;
  return fn
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/** The Dart name: the same as TypeScript. */
const dartName = (fn: string) => fn;

const isDate = (v: unknown): v is { $date: string } =>
  !!v && typeof v === 'object' && '$date' in (v as object);

/** Enum-valued options and the type that holds them in Dart and .NET. */
const ENUMS: Record<string, string> = {
  kind: 'SalesTaxKind',
  script: 'SlugScript',
  language: 'WordsLanguage',
};

/** A literal in the given language. */
function lit(lang: Lang, v: unknown, key?: string, indent = ''): string {
  if (isDate(v)) {
    const [d, t = '00:00:00'] = v.$date.split('T');
    const [y, m, day] = d.split('-').map(Number);
    const [hh, mm] = t.split(':').map(Number);
    switch (lang) {
      case 'ts':
        return `new Date(${y}, ${m - 1}, ${day}, ${hh}, ${mm})`;
      case 'py':
        return `datetime(${y}, ${m}, ${day}, ${hh}, ${mm})`;
      case 'dart':
        return `DateTime(${y}, ${m}, ${day}, ${hh}, ${mm})`;
      case 'cs':
        return `new DateTime(${y}, ${m}, ${day}, ${hh}, ${mm}, 0)`;
      case 'php':
        return `new DateTimeImmutable('${v.$date.replace('T', ' ')}')`;
    }
  }
  if (key && ENUMS[key] && typeof v === 'string') {
    if (lang === 'dart') return `${ENUMS[key]}.${v}`;
    if (lang === 'cs') return `${ENUMS[key]}.${pascal(v)}`;
  }
  if (v === null)
    return { ts: 'null', py: 'None', dart: 'null', cs: 'null', php: 'null' }[
      lang
    ];
  if (typeof v === 'boolean')
    return lang === 'py' ? (v ? 'True' : 'False') : String(v);
  if (typeof v === 'number') {
    // Group large amounts (5_000_000) where the language allows it; leave years alone.
    const grouped = Number.isInteger(v) && Math.abs(v) >= 10000;
    return grouped && (lang === 'py' || lang === 'php')
      ? String(v).replace(/(\d)(?=(\d{3})+$)/g, '$1_')
      : String(v);
  }
  if (typeof v === 'string') {
    if (lang === 'cs' || (lang === 'dart' && /'/.test(v)))
      return JSON.stringify(v);
    return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (typeof v === 'object') return structure(lang, v as object, indent);
  return JSON.stringify(v);
}

/**
 * An object or list argument (an FBR invoice, a Hijri date), written out on
 * several lines in the language's own literal syntax. In .NET the library
 * takes JSON (a JsonNode), so it is parsed from a raw string literal.
 */
function structure(lang: Lang, v: object, indent: string): string {
  if (lang === 'cs') {
    const json = JSON.stringify(v, null, 2)
      .split('\n')
      .map((line) => `${indent}  ${line}`)
      .join('\n');
    return `JsonNode.Parse("""\n${json}\n${indent}  """)`;
  }
  const inner = `${indent}  `;
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const items = v.map((x) => `${inner}${lit(lang, x, undefined, inner)}`);
    return `[\n${items.join(',\n')},\n${indent}]`;
  }
  const entries = Object.entries(v);
  if (!entries.length) return lang === 'php' ? '[]' : '{}';
  const items = entries.map(([k, x]) => {
    const val = lit(lang, x, undefined, inner);
    if (lang === 'php') return `${inner}'${k}' => ${val}`;
    if (lang === 'py' || lang === 'dart') return `${inner}'${k}': ${val}`;
    return `${inner}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${val}`;
  });
  const [open, close] = lang === 'php' ? ['[', ']'] : ['{', '}'];
  return `${open}\n${items.join(',\n')},\n${indent}${close}`;
}

/** The call expression for an example. */
export function call(lang: Lang, ex: Example): string {
  const api = API[ex.fn];
  if (!api) throw new Error(`site/src/lib/snippets.ts: add ${ex.fn} to API`);
  const custom = api.render?.[lang];
  if (custom) return custom(ex.args ?? [], ex.kwargs ?? {});
  const args = (ex.args ?? []).map((a) => lit(lang, a));
  const kw = Object.entries(ex.kwargs ?? {});
  switch (lang) {
    case 'ts': {
      const opts = kw.length
        ? `{ ${kw.map(([k, v]) => `${k}: ${lit('ts', v, k)}`).join(', ')} }`
        : '';
      return `${ex.fn}(${[...args, ...(opts ? [opts] : [])].join(', ')})`;
    }
    case 'py':
      return `${pyName(ex.fn)}(${[...args, ...kw.map(([k, v]) => `${pyName(k)}=${lit('py', v, k)}`)].join(', ')})`;
    case 'dart':
      return `${dartName(ex.fn)}(${[...args, ...kw.map(([k, v]) => `${k}: ${lit('dart', v, k)}`)].join(', ')})`;
    case 'cs': {
      if (!kw.length) return `${api.cs}(${args.join(', ')})`;
      if (!api.csOptions)
        throw new Error(
          `site/src/lib/snippets.ts: ${ex.fn} needs csOptions or a C# render`,
        );
      const props = kw.map(([k, v]) => {
        if (k === 'date' && typeof v === 'string')
          return `Date = ${lit('cs', v)}`;
        return `${pascal(k)} = ${lit('cs', v, k)}`;
      });
      return `${api.cs}(${[...args, `new ${api.csOptions} { ${props.join(', ')} }`].join(', ')})`;
    }
    case 'php': {
      const arr = kw.length
        ? `[${kw.map(([k, v]) => `'${k}' => ${lit('php', v, k)}`).join(', ')}]`
        : '';
      return `${api.php}(${[...args, ...(arr ? [arr] : [])].join(', ')})`;
    }
  }
}

/** An object result on one line, as the language would write a literal. */
function inline(lang: Lang, value: object): string {
  if (Array.isArray(value)) {
    const items = value.map((v) =>
      v !== null && typeof v === 'object' && !isDate(v)
        ? inline(lang, v)
        : lit(lang, v),
    );
    return `[${items.join(', ')}]`;
  }
  const entries = Object.entries(value).map(([k, v]) => {
    const val =
      v !== null && typeof v === 'object' && !isDate(v)
        ? inline(lang, v)
        : lit(lang, v);
    if (lang === 'py' || lang === 'dart') return `'${k}': ${val}`;
    if (lang === 'php') return `'${k}' => ${val}`;
    return `${k}: ${val}`;
  });
  if (lang === 'php') return `[${entries.join(', ')}]`;
  if (lang === 'py' || lang === 'dart') return `{${entries.join(', ')}}`;
  return `{ ${entries.join(', ')} }`;
}

/** An enum member's name: 'out-for-delivery' is outForDelivery in Dart, OutForDelivery in .NET. */
function enumMember(lang: Lang, value: string): string {
  const words = value
    .split(/[-\s]+/)
    .map((w) => (w === w.toUpperCase() ? w.toLowerCase() : w));
  const camel = words
    .map((w, i) => (i ? pascal(w) : w.charAt(0).toLowerCase() + w.slice(1)))
    .join('');
  return lang === 'cs' ? pascal(camel) : camel;
}

/** An object's keys in snake_case, all the way down. */
function snakeKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(snakeKeys);
  if (v === null || typeof v !== 'object' || isDate(v)) return v;
  return Object.fromEntries(
    Object.entries(v).map(([k, x]) => [pyName(k), snakeKeys(x)]),
  );
}

/** A short list of plain values fits on one line. */
const shortList = (v: unknown) =>
  Array.isArray(v) &&
  v.every((x) => x === null || typeof x !== 'object') &&
  JSON.stringify(v).length <= 64;

/**
 * The stated result as a comment, in the language's own literal style.
 * `compact` puts an object on one line (the home page demo).
 */
export function resultComment(
  lang: Lang,
  value: unknown,
  compact = false,
  fn?: string,
): string {
  const c = lang === 'py' ? '#' : '//';
  const returns = fn ? API[fn]?.returns : undefined;
  if (
    returns &&
    (lang === 'dart' || (lang === 'cs' && !returns.dartOnly)) &&
    (typeof value === 'string' || Array.isArray(value))
  ) {
    const member = (v: string) => `${returns.type}.${enumMember(lang, v)}`;
    return `${c} → ${typeof value === 'string' ? member(value) : `[${value.map((v) => member(String(v))).join(', ')}]`}`;
  }
  if (isDate(value)) return `${c} → ${value.$date.slice(0, 10)} (a date)`;
  if (value === null || typeof value !== 'object') {
    return `${c} → ${lit(lang, value)}`;
  }
  // The Python port's fields are snake_case (postal_code, christians_only).
  if (lang === 'py') value = snakeKeys(value);
  if (compact || shortList(value)) return `${c} → ${inline(lang, value)}`;
  const json = JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? `${c} → ${line}` : `${c}   ${line}`))
    .join('\n');
  return lang === 'py'
    ? json
        .replace(/\btrue\b/g, 'True')
        .replace(/\bfalse\b/g, 'False')
        .replace(/\bnull\b/g, 'None')
    : json;
}

/** Import / using lines for a set of examples. */
export function header(lang: Lang, examples: Example[]): string {
  const fns = [...new Set(examples.map((e) => e.fn))];
  const values = examples.flatMap((e) => [
    ...(e.args ?? []),
    ...Object.values(e.kwargs ?? {}),
  ]);
  const needsDate = values.some(isDate);
  const needsJson = values.some(
    (v) => v !== null && typeof v === 'object' && !isDate(v),
  );
  switch (lang) {
    case 'ts':
      return `import { ${fns.join(', ')} } from 'pakdatakit';`;
    case 'py':
      return [
        ...(needsDate ? ['from datetime import datetime'] : []),
        `from pakdatakit import ${fns.map(pyName).join(', ')}`,
      ].join('\n');
    case 'dart':
      return `import 'package:pakdatakit/pakdatakit.dart';`;
    case 'cs':
      return [
        ...(needsJson && fns.some((f) => API[f].cs.startsWith('FbrInvoice.'))
          ? ['using System.Text.Json.Nodes;']
          : []),
        'using PakDataKit;',
      ].join('\n');
    case 'php': {
      const classes = [
        ...new Set(fns.map((f) => API[f].php.split('::')[0])),
        ...(fns.includes('fromHijri') ? ['HijriDate'] : []),
      ].sort();
      return classes.map((c) => `use PakDataKit\\${c};`).join('\n');
    }
  }
}

/** A whole snippet: imports, then each example with its result. */
export function snippet(
  lang: Lang,
  examples: Example[],
  compact = false,
): string {
  const body = examples
    .map((ex) => {
      const expr = call(lang, ex);
      const stmt = lang === 'py' ? expr : `${expr};`;
      return `${stmt}\n${resultComment(lang, ex.expected, compact, ex.fn)}`;
    })
    .join('\n\n');
  return `${header(lang, examples)}\n\n${body}`;
}
