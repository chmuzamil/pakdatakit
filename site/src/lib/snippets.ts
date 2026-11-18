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

interface Api {
  py: string;
  dart: string;
  /** Class.Method in .NET. */
  cs: string;
  /** Class::method in PHP. */
  php: string;
  /** .NET options type for kwargs, if the function takes options. */
  csOptions?: string;
  /** The options object is the only argument (TS, PHP). */
  optionsOnly?: boolean;
}

/** Names of every function used in the examples, per port. */
export const API: Record<string, Api> = {
  validateCNIC: { py: 'validate_cnic', dart: 'validateCNIC', cs: 'Cnic.Validate', php: 'Cnic::validate' },
  getCNICInfo: { py: 'get_cnic_info', dart: 'getCNICInfo', cs: 'Cnic.GetInfo', php: 'Cnic::getInfo' },
  validatePhone: { py: 'validate_phone', dart: 'validatePhone', cs: 'Phone.Validate', php: 'Phone::validate' },
  formatPhone: { py: 'format_phone', dart: 'formatPhone', cs: 'Phone.Format', php: 'Phone::format' },
  analyzePhone: { py: 'analyze_phone', dart: 'analyzePhone', cs: 'Phone.Analyze', php: 'Phone::analyze' },
  getNetwork: { py: 'get_network', dart: 'getNetwork', cs: 'Networks.GetNetwork', php: 'Networks::getNetwork' },
  validateIBAN: { py: 'validate_iban', dart: 'validateIBAN', cs: 'Iban.Validate', php: 'Iban::validate' },
  getBankFromIBAN: { py: 'get_bank_from_iban', dart: 'getBankFromIBAN', cs: 'Iban.GetBank', php: 'Iban::getBank' },
  getBankInfo: { py: 'get_bank_info', dart: 'getBankInfo', cs: 'Iban.GetBankInfo', php: 'Iban::getBankInfo' },
  getSalesTaxRate: {
    py: 'get_sales_tax_rate',
    dart: 'getSalesTaxRate',
    cs: 'SalesTax.GetRate',
    php: 'SalesTax::getRate',
    csOptions: 'SalesTaxRateQuery',
    optionsOnly: true,
  },
  calculateSalesTax: {
    py: 'calculate_sales_tax',
    dart: 'calculateSalesTax',
    cs: 'SalesTax.Calculate',
    php: 'SalesTax::calculate',
    csOptions: 'SalesTaxOptions',
  },
  splitInclusive: { py: 'split_inclusive', dart: 'splitInclusive', cs: 'SalesTax.SplitInclusive', php: 'SalesTax::splitInclusive' },
  calculateSalaryTax: {
    py: 'calculate_salary_tax',
    dart: 'calculateSalaryTax',
    cs: 'IncomeTax.CalculateSalaryTax',
    php: 'IncomeTax::calculateSalary',
    csOptions: 'SalaryTaxOptions',
  },
  calculateMonthlySalaryTax: {
    py: 'calculate_monthly_salary_tax',
    dart: 'calculateMonthlySalaryTax',
    cs: 'IncomeTax.CalculateMonthlySalaryTax',
    php: 'IncomeTax::calculateMonthlySalary',
    csOptions: 'SalaryTaxOptions',
  },
  getTaxYear: { py: 'get_tax_year', dart: 'getTaxYear', cs: 'IncomeTax.GetTaxYear', php: 'IncomeTax::getTaxYear' },
  getPostalCode: { py: 'get_postal_code', dart: 'getPostalCode', cs: 'Postal.GetCode', php: 'Postal::getCode' },
  getCityByPostalCode: { py: 'get_city_by_postal_code', dart: 'getCityByPostalCode', cs: 'Postal.GetCity', php: 'Postal::getCity' },
  getPostOffice: { py: 'get_post_office', dart: 'getPostOffice', cs: 'Postal.GetPostOffice', php: 'Postal::getPostOffice' },
  createRaastP2PQr: {
    py: 'create_raast_p2p_qr',
    dart: 'createRaastP2PQr',
    cs: 'RaastQr.CreateP2P',
    php: 'RaastQr::createP2P',
    csOptions: 'RaastP2POptions',
    optionsOnly: true,
  },
};

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const pascal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const isDate = (v: unknown): v is { $date: string } =>
  !!v && typeof v === 'object' && '$date' in (v as object);

/** A literal in the given language. */
function lit(lang: Lang, v: unknown, key?: string): string {
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
  if (key === 'kind' && typeof v === 'string') {
    if (lang === 'dart') return `SalesTaxKind.${v}`;
    if (lang === 'cs') return `SalesTaxKind.${pascal(v)}`;
  }
  if (v === null) return { ts: 'null', py: 'None', dart: 'null', cs: 'null', php: 'null' }[lang];
  if (typeof v === 'boolean') return lang === 'py' ? (v ? 'True' : 'False') : String(v);
  if (typeof v === 'number') {
    // Group large amounts (5_000_000) where the language allows it; leave years alone.
    const grouped = Number.isInteger(v) && Math.abs(v) >= 10000;
    return grouped && (lang === 'py' || lang === 'php') ? String(v).replace(/(\d)(?=(\d{3})+$)/g, '$1_') : String(v);
  }
  if (typeof v === 'string') {
    if (lang === 'cs' || lang === 'dart' && /'/.test(v)) return JSON.stringify(v);
    return lang === 'py' || lang === 'php' || lang === 'dart' || lang === 'ts' ? `'${v.replace(/'/g, "\\'")}'` : JSON.stringify(v);
  }
  return JSON.stringify(v);
}

/** The call expression for an example. */
export function call(lang: Lang, ex: Example): string {
  const api = API[ex.fn];
  if (!api) throw new Error(`site/src/lib/snippets.ts: add ${ex.fn} to API`);
  const args = (ex.args ?? []).map((a) => lit(lang, a));
  const kw = Object.entries(ex.kwargs ?? {});
  switch (lang) {
    case 'ts': {
      const opts = kw.length ? `{ ${kw.map(([k, v]) => `${k}: ${lit('ts', v, k)}`).join(', ')} }` : '';
      return `${ex.fn}(${[...args, ...(opts ? [opts] : [])].join(', ')})`;
    }
    case 'py':
      return `${api.py}(${[...args, ...kw.map(([k, v]) => `${snake(k)}=${lit('py', v, k)}`)].join(', ')})`;
    case 'dart':
      return `${api.dart}(${[...args, ...kw.map(([k, v]) => `${k}: ${lit('dart', v, k)}`)].join(', ')})`;
    case 'cs': {
      if (!kw.length) return `${api.cs}(${args.join(', ')})`;
      const props = kw.map(([k, v]) => {
        if (k === 'date' && typeof v === 'string') return `Date = ${lit('cs', v)}`;
        return `${pascal(k)} = ${lit('cs', v, k)}`;
      });
      return `${api.cs}(${[...args, `new ${api.csOptions} { ${props.join(', ')} }`].join(', ')})`;
    }
    case 'php': {
      const arr = kw.length ? `[${kw.map(([k, v]) => `'${k}' => ${lit('php', v, k)}`).join(', ')}]` : '';
      return `${api.php}(${[...args, ...(arr ? [arr] : [])].join(', ')})`;
    }
  }
}

/** The stated result as a comment, in the language's own literal style. */
export function resultComment(lang: Lang, value: unknown): string {
  const c = lang === 'py' ? '#' : '//';
  if (value === null || typeof value !== 'object') {
    return `${c} → ${lit(lang, value)}`;
  }
  const json = JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? `${c} → ${line}` : `${c}   ${line}`))
    .join('\n');
  return lang === 'py'
    ? json.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None')
    : json;
}

/** Import / using lines for a set of examples. */
export function header(lang: Lang, examples: Example[]): string {
  const fns = [...new Set(examples.map((e) => e.fn))];
  const needsDate = examples.some((e) => Object.values(e.kwargs ?? {}).some(isDate));
  switch (lang) {
    case 'ts':
      return `import { ${fns.join(', ')} } from 'pakdatakit';`;
    case 'py':
      return [
        ...(needsDate ? ['from datetime import datetime'] : []),
        `from pakdatakit import ${fns.map((f) => API[f].py).join(', ')}`,
      ].join('\n');
    case 'dart':
      return `import 'package:pakdatakit/pakdatakit.dart';`;
    case 'cs':
      return 'using PakDataKit;';
    case 'php': {
      const classes = [...new Set(fns.map((f) => API[f].php.split('::')[0]))].sort();
      return classes.map((c) => `use PakDataKit\\${c};`).join('\n');
    }
  }
}

/** A whole snippet: imports, then each example with its result. */
export function snippet(lang: Lang, examples: Example[]): string {
  const body = examples
    .map((ex) => {
      const expr = call(lang, ex);
      const stmt = lang === 'py' ? expr : `${expr};`;
      return `${stmt}\n${resultComment(lang, ex.expected)}`;
    })
    .join('\n\n');
  return `${header(lang, examples)}\n\n${body}`;
}
