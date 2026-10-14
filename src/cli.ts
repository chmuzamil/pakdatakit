#!/usr/bin/env node
import { version } from '../package.json';
import {
  analyzePhone,
  formatHijri,
  formatLakh,
  formatPKR,
  getBankFromIBAN,
  getCityByPostalCode,
  getPostalCode,
  getProvince,
  normalizeRomanUrdu,
  parseAddress,
  toHijri,
  validateCNIC,
  validateIBAN,
  validatePhone,
} from 'pakdatakit';

/** Exit codes: 0 = valid/found, 1 = invalid/not found, 2 = usage error. */
const EXIT_OK = 0;
const EXIT_NEGATIVE = 1;
const EXIT_USAGE = 2;

const [, , command, ...args] = process.argv;
const input = args.join(' ').trim();

function printUsage(): void {
  console.log(`pakdatakit ${version} — Pakistani developer utilities

Usage:
  pakdatakit <command> [input]

Commands:
  validate-cnic <cnic>       Validate a CNIC number
  validate-phone <phone>     Validate a mobile number
  analyze-phone <phone>      Analyze phone (format + network)
  validate-iban <iban>       Validate a Pakistani IBAN
  bank-from-iban <iban>      Get bank name from IBAN
  province <city>            Get province for a city
  postal-code <city>         Get postal code for a city
  city-from-postal <code>    Get city from postal code
  parse-address <address>    Parse a Pakistani address
  format-pkr <amount>        Format PKR amount
  format-lakh <amount>       Format in Lakh/Crore
  hijri [yyyy-mm-dd]         Convert date to Hijri (default: today)
  normalize-urdu <text>      Normalize Roman Urdu text
  help, --help               Show this help message
  --version                  Show the version

Exit status is 0 when the input is valid or found, 1 when it is invalid or
not found, and 2 for usage errors.
`);
}

function usageError(message: string): number {
  console.error(`Error: ${message}`);
  return EXIT_USAGE;
}

function printBoolean(result: boolean): number {
  console.log(result);
  return result ? EXIT_OK : EXIT_NEGATIVE;
}

function printLookup(result: string | null): number {
  console.log(result ?? 'Not found');
  return result === null ? EXIT_NEGATIVE : EXIT_OK;
}

function parseAmount(value: string): number | null {
  const amount = Number(value.replace(/,/g, ''));
  return value.length > 0 && Number.isFinite(amount) ? amount : null;
}

/** Parses `yyyy-mm-dd` as a local calendar date. */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 ? date : null;
}

function run(): number {
  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    printUsage();
    return EXIT_OK;
  }

  if (command === '--version' || command === '-v') {
    console.log(version);
    return EXIT_OK;
  }

  if (input.length === 0 && command !== 'hijri') {
    return usageError(`missing input for "${command}"`);
  }

  switch (command) {
    case 'validate-cnic':
      return printBoolean(validateCNIC(input));
    case 'validate-phone':
      return printBoolean(validatePhone(input));
    case 'analyze-phone': {
      const analysis = analyzePhone(input);
      console.log(JSON.stringify(analysis, null, 2));
      return analysis.valid ? EXIT_OK : EXIT_NEGATIVE;
    }
    case 'validate-iban':
      return printBoolean(validateIBAN(input));
    case 'bank-from-iban':
      return printLookup(getBankFromIBAN(input));
    case 'province':
      return printLookup(getProvince(input));
    case 'postal-code':
      return printLookup(getPostalCode(input));
    case 'city-from-postal':
      return printLookup(getCityByPostalCode(input));
    case 'parse-address':
      console.log(JSON.stringify(parseAddress(input), null, 2));
      return EXIT_OK;
    case 'format-pkr':
    case 'format-lakh': {
      const amount = parseAmount(input);
      if (amount === null) {
        return usageError(`"${input}" is not a number`);
      }
      console.log(
        command === 'format-pkr' ? formatPKR(amount) : formatLakh(amount),
      );
      return EXIT_OK;
    }
    case 'hijri': {
      const date = input.length > 0 ? parseLocalDate(input) : new Date();
      if (date === null) {
        return usageError(
          `"${input}" is not a valid date (expected yyyy-mm-dd)`,
        );
      }
      console.log(formatHijri(date));
      console.log(JSON.stringify(toHijri(date), null, 2));
      return EXIT_OK;
    }
    case 'normalize-urdu':
      console.log(normalizeRomanUrdu(input));
      return EXIT_OK;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      return EXIT_USAGE;
  }
}

process.exitCode = run();
