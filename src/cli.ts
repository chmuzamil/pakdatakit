#!/usr/bin/env node
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
} from './index.js';

const [, , command, ...args] = process.argv;
const input = args.join(' ').trim();

function printUsage(): void {
  console.log(`pakdatakit — Pakistani developer utilities

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
  hijri [iso-date]           Convert date to Hijri (default: today)
  normalize-urdu <text>      Normalize Roman Urdu text
  help                       Show this help message
`);
}

function run(): void {
  if (!command || command === 'help' || command === '--help') {
    printUsage();
    return;
  }

  if (input.length === 0 && command !== 'hijri') {
    console.error(`Error: missing input for "${command}"`);
    process.exit(1);
  }

  switch (command) {
    case 'validate-cnic':
      console.log(validateCNIC(input));
      break;
    case 'validate-phone':
      console.log(validatePhone(input));
      break;
    case 'analyze-phone':
      console.log(JSON.stringify(analyzePhone(input), null, 2));
      break;
    case 'validate-iban':
      console.log(validateIBAN(input));
      break;
    case 'bank-from-iban':
      console.log(getBankFromIBAN(input) ?? 'Unknown');
      break;
    case 'province':
      console.log(getProvince(input) ?? 'Not found');
      break;
    case 'postal-code':
      console.log(getPostalCode(input) ?? 'Not found');
      break;
    case 'city-from-postal':
      console.log(getCityByPostalCode(input) ?? 'Not found');
      break;
    case 'parse-address':
      console.log(JSON.stringify(parseAddress(input), null, 2));
      break;
    case 'format-pkr':
      console.log(formatPKR(Number(input)));
      break;
    case 'format-lakh':
      console.log(formatLakh(Number(input)));
      break;
    case 'hijri': {
      const date = input.length > 0 ? new Date(input) : new Date();
      console.log(formatHijri(date));
      console.log(JSON.stringify(toHijri(date), null, 2));
      break;
    }
    case 'normalize-urdu':
      console.log(normalizeRomanUrdu(input));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

run();
