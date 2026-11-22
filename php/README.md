# PakDataKit for PHP and Laravel

Utilities for Pakistani data: CNIC, mobile numbers and networks, landlines,
IBAN and banks, NTN/STRN, passport and vehicle numbers, electricity and gas
bill numbers, postal codes, cities and districts, WhatsApp links, rupee
formatting, amounts in words, Roman Urdu, Hijri dates, public holidays, address
parsing, as-you-type form helpers and Raast QR codes. Includes a Laravel bridge: validation rules, rule objects and
Eloquent casts, with English and Urdu messages.

This is the PHP port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 32,000+ test
vectors** generated from the TypeScript library (also used by the Python, Dart
and .NET ports), so all of them give identical results.

- PHP 8.2+, **no dependencies** (only the `mbstring` extension)
- Does not need the `intl` extension, and results do not depend on the locale
- Works offline: the data ships with the package as PHP arrays
- Laravel 11 and 12: the service provider is discovered automatically

## Install

```sh
composer require chmuzamil/pakdatakit
```

## Examples

```php
use PakDataKit\{Cnic, Phone, Networks, Numbers, Iban, Tax, Passport, VehiclePlate};
use PakDataKit\{Postal, Geo, Currency, Words, Hijri, Holidays, RaastQr};

Cnic::validate('35202-1234567-1');            // true
Cnic::getInfo('35202-1234567-1');
// CnicInfo { digits: '3520212345671', formatted: '35202-1234567-1', province: 'Punjab', gender: 'male' }
Cnic::findAll('CNIC: 35202-1234567-1, phone 0300-1234567');
// [CnicMatch { raw: '35202-1234567-1', digits: '3520212345671', formatted: '35202-1234567-1', start: 6, end: 21 }]
Cnic::mask('My CNIC is 35202-1234567-1')->text;   // 'My CNIC is XXXXX-XXXXXXX-X'

Phone::format('0300 1234567');                // '+923001234567'
Networks::getNetwork('0300 1234567');         // 'Jazz'
Numbers::validateLandline('042-35761234');    // true
Numbers::validateLandline('021-111-123-456', services: true);  // true (UAN, toll-free, premium)

Iban::validate('PK36SCBL0000001123456702');   // true
Iban::getBank('PK36SCBL0000001123456702');    // 'Standard Chartered Bank (Pakistan) Limited'

Tax::validateNtn('0622438-9');                // true
Passport::validate('AB1234567');              // true
VehiclePlate::parse('lea 1234')->formatted;   // 'LEA-1234'

Postal::getCity('54000');                     // 'Lahore'
Postal::getPostOffice('48330')->office;       // 'Dulmial'
Geo::getProvince('Multan');                   // 'Punjab'

Currency::formatPkr(150000);                  // 'Rs. 150,000'
Currency::formatLakh(2500000);                // '25 Lakh'
Currency::parseAmount('Rs. 1,50,000/-');      // ParsedAmount { value: 150000.0, raw: 'Rs. 1,50,000/-' }
Currency::parseAmount('2.25cr')->value;       // 22500000.0
Currency::parseAmount('5-10k');               // null
Currency::formatAmountInput('1.5 lakh');      // 'Rs. 150,000'
Words::amountInWords(125000, cheque: true);   // 'Rupees One Lakh Twenty-Five Thousand Only'

Hijri::format(new DateTimeImmutable('2026-03-04'));   // '15 Ramadan 1447'
Holidays::isHoliday('2026-08-14');                    // true

$payload = RaastQr::createP2P([
    'iban' => 'PK36SCBL0000001123456702',
    'amount' => 1500,
    'expiresIn' => '1d',
]);
RaastQr::validate($payload)->valid;           // true
RaastQr::validate($payload)->kind;            // 'p2p' ('merchant', or null when not a Raast QR)
```

`RaastQr::validate()` treats a merchant QR that names no IBAN as valid, with
the warning `no-iban` (it pays through the merchant's own scheme, so the payee
can't be checked from the QR); a person-to-person QR with no IBAN is still an
error.

Results are small read-only objects with the same property names as the npm
package; call `->toArray()` for an array.

### API map

| npm                                                    | PHP                                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `validateCNIC`, `getCNICInfo`                          | `Cnic::validate`, `Cnic::getInfo`                                                 |
| `findCNICs`, `maskCNICs`                               | `Cnic::findAll`, `Cnic::mask`                                                     |
| `validatePhone`, `formatPhone`, `analyzePhone`         | `Phone::validate`, `Phone::format`, `Phone::analyze`                              |
| `getNetwork`                                           | `Networks::getNetwork`                                                            |
| `analyzeNumber`, `validateLandline`, `getAreaCode`     | `Numbers::analyze`, `Numbers::validateLandline`, `Numbers::getAreaCode`           |
| `validateIBAN`, `getBankFromIBAN`, `getBankInfo`       | `Iban::validate`, `Iban::getBank`, `Iban::getBankInfo`, `Iban::getBanks`          |
| `analyzeNTN`, `validateNTN`, `validateSTRN`            | `Tax::analyzeNtn`, `Tax::validateNtn`, `Tax::validateStrn`                        |
| `validatePassport`                                     | `Passport::validate`                                                              |
| `parseVehiclePlate`, `validateVehiclePlate`            | `VehiclePlate::parse`, `VehiclePlate::validate`                                   |
| `parseElectricityRef`, `validateElectricityRef`        | `Bills::parseElectricityRef`, `Bills::validateElectricityRef`                     |
| `validateGasConsumerNumber`                            | `Bills::validateGasConsumerNumber`                                                |
| `getCityByPostalCode`, `getPostalCode`, …              | `Postal::getCity`, `Postal::getCode`, `Postal::getCodes`, `Postal::search`        |
| `getPostOffice`, `searchPostOffices`                   | `Postal::getPostOffice`, `Postal::searchPostOffices`                              |
| `getProvince`, `searchCities`, `searchDistricts`, …    | `Geo::getProvince`, `Geo::searchCities`, `Geo::searchDistricts`, …                |
| `getDivisions`, `getDivisionOfDistrict`                | `Geo::getDivisions`, `Geo::getDivisionOfDistrict`                                 |
| `getTehsils`, `getTehsilDistrict`                      | `Geo::getTehsils`, `Geo::getTehsilDistrict`                                       |
| `createWhatsAppLink`                                   | `WhatsApp::createLink`                                                            |
| `formatPKR`, `formatLakh`                              | `Currency::formatPkr`, `Currency::formatLakh`                                     |
| `parseAmount`, `formatAmountInput`                     | `Currency::parseAmount`, `Currency::formatAmountInput`                            |
| `numberToWords`, `amountInWords`                       | `Words::numberToWords`, `Words::amountInWords`                                    |
| `normalizeText`, `normalizeRomanUrdu`, `toUrduDigits`  | `Text::normalize`, `Text::normalizeRomanUrdu`, `Text::toUrduDigits`               |
| `slugify`, `compareUrdu`                               | `Text::slugify`, `Text::compareUrdu`                                              |
| `romanUrduKey`                                         | `Text::romanUrduKey`                                                              |
| `isRTL`, `wrapBidi`                                    | `Text::isRtl`, `Text::wrapBidi`                                                   |
| `toHijri`, `fromHijri`, `formatHijri`, `isRamadan`     | `Hijri::toHijri`, `Hijri::fromHijri`, `Hijri::format`, `Hijri::isRamadan`         |
| `getPakistanHolidays`, `getHolidaysOn`, …              | `Holidays::getHolidays`, `Holidays::getHolidaysOn`, `Holidays::isHoliday`         |
| `parseAddress`, `formatAddress`                        | `Address::parse`, `Address::format`                                               |
| `scoreAddress`, `phoneRiskSignals`, `ADDRESS_WEIGHTS`  | `Quality::scoreAddress`, `Quality::phoneRiskSignals`, …                           |
| `formatCNICInput`, `checkCNICInput`, …                 | `Input::formatCnic`, `Input::checkCnic`, `Input::formatPhone`, …                  |
| `createRaastP2PQr`, `createMerchantQr`, `parseRaastQr` | `RaastQr::createP2P`, `RaastQr::createMerchant`, `RaastQr::parse`                 |
| `validateRaastQr`                                      | `RaastQr::validate`                                                               |
| `getSalesTaxRate`, `calculateSalesTax`                 | `SalesTax::getRate`, `SalesTax::calculate`                                        |
| `splitInclusive`                                       | `SalesTax::splitInclusive`                                                        |
| `calculateSalaryTax`, `calculateMonthlySalaryTax`      | `IncomeTax::calculateSalary`, `IncomeTax::calculateMonthlySalary`                 |
| `getSalaryTaxSlabs`, `getSalaryTaxYears`, `getTaxYear` | `IncomeTax::getSalarySlabs`, `IncomeTax::getSalaryYears`, `IncomeTax::getTaxYear` |
| `buildFbrInvoice`, `validateFbrInvoice`                | `FbrInvoice::build`, `FbrInvoice::validate`                                       |
| `expectedSalesTax`, `FBR_DI_SPEC_VERSION`              | `FbrInvoice::expectedSalesTax`, `FbrInvoice::SPEC_VERSION`                        |
| `mapCourierStatus`, `normalizeCityForCourier`          | `Courier::mapStatus`, `Courier::normalizeCity`                                    |
| `dataVersion`                                          | `PakData::version()`                                                              |

`Cnic::findAll()` finds CNICs in free text (a chat message, a note) and
`Cnic::mask()` masks their digits, for example before logging. Digits are
read in groups, and groups may be joined by spaces or tabs, or by one mark (a
hyphen or dash, a dot, a slash or an underscore) with any spaces around it:
`35202-1234567-1`, `35202  1234567  1`, `35202 - 1234567 - 1`,
`35202_1234567_1`, `352 0212 3456 71`, `35202/1234567/1`. A line break never
joins groups. A match is consecutive whole groups adding up to exactly 13
digits, starting with a province digit (1-8), so
`0300-1234567 35202-1234567-1` finds the CNIC; a group is never split, so 13
digits inside a longer unbroken number never match. Digits may be ASCII, Urdu
or Arabic-Indic. Any other 13 digits starting with 1-8 grouped this way match
too (table columns, a price list such as `8260 - 8048 - 2804 - 0`, a file
name such as `IMG_20261123_12345`), so expect more false positives than
`Cnic::validate()`. `start` and `end` count code points, so use `mb_substr()`. `Cnic::mask($text, '*')` takes the
mask string, and `Cnic::mask($text, replacement: '[CNIC removed]')` replaces
each whole CNIC instead; anything that is not a string gives `[]` or an empty
`MaskedText`.

`Numbers::validateLandline($phone, services: true)` also accepts UAN
(`021-111-123-456`, `111-123-456`), toll-free (`0800` and five or six digits) and
premium-rate (`0900` and five digits) numbers, as in PTA's numbering plan;
`Numbers::analyze()` tells them apart by `type`.

Divisions and tehsils come from the 2023 census (30 divisions, 591 tehsils).
Each tehsil is recorded under the district it was in at the census, so
`Geo::getTehsils('Rawalpindi')` still lists Murree and
`Geo::getTehsilDistrict()` returns the census district. Districts created
after the census have no division. `Geo::getDivisions()` with no argument
lists every division; `Geo::getTehsilDistrict($tehsil, $province)` takes an
optional province for names shared by several districts.

`BankInfo::$type` is one of `commercial`, `public-sector`, `islamic`,
`microfinance`, `digital`, `emi`, `foreign`, `specialized` or `central`.
`BankInfo::$active` is `false` for a bank that merged into another or is no
longer operating (SME Bank, `SMES`).

### Utility bills

```php
use PakDataKit\Bills;

Bills::parseElectricityRef('02-12624-0045901 R');
// ElectricityRef { type: 'reference', digits: '02126240045901', formatted: '02 12624 0045901 R', urbanRural: 'R', disco: null }
Bills::parseElectricityRef('0400012345678');
// ElectricityRef { type: 'k-electric', digits: '0400012345678', formatted: '0400012345678', urbanRural: null, disco: 'K-Electric' }
Bills::validateElectricityRef('12345');                       // false

Bills::validateGasConsumerNumber('12345678901', 'SNGPL');     // true (11 digits)
Bills::validateGasConsumerNumber('1234567890', Bills::SSGC);  // true (10 digits)
```

`Bills::parseElectricityRef()` reads the identifiers printed on electricity
bills, in the formats the utilities' own bill pages ask for. `type` is
`reference` (a DISCO reference number: 14 digits, optionally followed by `U`
or `R`), `customer-id` (a DISCO customer ID: 10 digits, 11 for LESCO) or
`k-electric` (a K-Electric account number: 13 digits starting `04000`), also
`Bills::REFERENCE`, `Bills::CUSTOMER_ID` and `Bills::K_ELECTRIC`. Spaces,
dashes and dots are ignored, and Urdu digits are accepted. `disco` is `null`
for DISCO bills: no official source maps the digits to a distribution
company. `Bills::validateGasConsumerNumber()` takes `SNGPL` or `SSGC` in any
case; any other company returns `false`. No utility publishes a check digit,
so only the format is checked; a well-formed number may still not exist. The
`pk_electricity_ref` Laravel rule uses `Bills::validateElectricityRef()`.

### Delivery quality

For cash on delivery and other courier use:

```php
use PakDataKit\Quality;

$result = Quality::scoreAddress('House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660');
$result->score;    // 100
$result->missing;  // []
Quality::scoreAddress('Lahore')->missing;
// ['houseNumber', 'street', 'area', 'postalCode', 'landmark']

Quality::phoneRiskSignals('0300 4829173');  // []
Quality::phoneRiskSignals('0300 1234567');  // ['sequential-digits', 'test-number']
Quality::phoneRiskSignals('042-35761234');  // ['landline']
```

`Quality::scoreAddress()` returns an `AddressScore` (`score` from 0 to 100,
`missing` parts, and `parsed`, the `Address::parse()` result with any extra
warnings). It looks for a city, a house, plot or flat number, a street, an
area, a postal code and a landmark (`near`, `opp`, `nazd`, `qareeb`, `سامنے`
…), weighted by `Quality::ADDRESS_WEIGHTS`. A known post office code scores in
full and an unknown one scores 5; a post office in another province than the
city takes off 15 and adds a warning. It is a heuristic: it says how much an
address tells a rider, not whether the address exists.

`Quality::phoneRiskSignals()` flags: `invalid`, `landline`, `not-mobile` (UAN,
toll-free and other service numbers), `repeated-digits` (the 7-digit subscriber
part uses at most two digits), `sequential-digits` (`1234567`, `7654321` …) and
`test-number` (`03XX-1234567`, `03XX-7654321`, `0312-3456789`). The
`pk_cod_phone` Laravel rule passes only when there are no flags.

### Urdu text: slugs, sorting and direction

```php
use PakDataKit\Text;

Text::slugify('Lahore Fort, 2024');                             // 'lahore-fort-2024'
Text::slugify('لاہور قلعہ');                                    // 'لاہور-قلعہ'
Text::slugify('لاہور Fort', ['script' => Text::SCRIPT_LATIN]);  // 'fort'
Text::slugify('کراچی ۲۰۲۴', ['script' => Text::SCRIPT_URDU]);   // 'کراچی-2024'

$words = ['ے', 'بھائی', 'آم', 'باغ', 'اب'];
usort($words, Text::compareUrdu(...));                          // ['اب', 'آم', 'باغ', 'بھائی', 'ے']

Text::isRtl('123 سلام');                                        // true
Text::isRtl('Order نمبر');                                      // false
'آرڈر ' . Text::wrapBidi('PDK-1042') . ' بھیج دیا گیا';
```

`Text::slugify()` keeps Urdu letters as they are (Urdu does not write short
vowels, so there is no single Roman spelling), drops diacritics, tatweel and
zero-width characters, turns ك ي ى into ک ی ی and Urdu digits into `0-9`, and
folds accented Latin-1 letters (`é` to `e`, `ß` to `ss`). `script` is `any`
(the default), `latin` or `urdu` (`Text::SCRIPT_*`).

`Text::compareUrdu()` sorts in the Unicode CLDR order for Urdu (CLDR 49):
ا آ ب بھ پ پھ ت تھ ٹ … ی یھ ے, where a letter joined with ھ is a letter of its
own. Punctuation comes first, then digits (one at a time, so `10` before `2`),
then Urdu letters, then other Arabic-script characters (the look-alikes ك ي ه)
and other scripts. It needs neither intl nor ICU, so the order is the same as
in the npm package and the other ports.

`Text::romanUrduKey()` gives a phonetic key for Roman Urdu, so that spellings
of one name match: `Mubeen` and `Mobeen`, `Muhammad` and `Mohammad`,
`Chaudhry` and `Chaudhary` (`Text::romanUrduKey('Muhammad Rehman')` is
`'muhmd rahmn'`). Compare keys; don't show them. Different names can share a
key (`Hamid` and `Hamad`), so a match means "probably the same". Accents are
removed as JavaScript's `normalize('NFKD')` does, without intl.

`Text::isRtl()` is true when the first letter is from a right-to-left script.
`Text::wrapBidi()` wraps text in Unicode directional isolates (FSI … PDI, or
RLI/LRI with `Text::BIDI_RTL` / `Text::BIDI_LTR`). All four take any value:
anything that is not a string gives `''`, `false` or is sorted as `''`.

### Sales tax

Standard sales tax rates with the dates they applied, from 1 July 2019:
federal sales tax on goods (FBR), and sales tax on services in Punjab (PRA),
Sindh (SRB), Khyber Pakhtunkhwa (KPRA), Balochistan (BRA) and Islamabad
Capital Territory (FBR). Each rate carries the law and the official document it
comes from. Reduced, higher and sector rates are not included.

```php
use PakDataKit\SalesTax;

SalesTax::getRate(['kind' => 'goods', 'date' => '2026-11-18']);
// SalesTaxRate { kind: 'goods', authority: 'FBR', province: null, rate: 18, from: '2023-02-23', to: null, law: '…', source: '…' }
SalesTax::getRate(['kind' => 'services', 'province' => 'Sindh', 'date' => '2024-06-30'])?->rate;  // 13
SalesTax::getRate(['kind' => 'services', 'province' => 'ICT'])?->rate;                            // 15 (today)

SalesTax::calculate(1000, ['rate' => 18]);
// SalesTaxAmounts { net: 1000.0, tax: 180.0, gross: 1180.0, rate: 18.0 }
SalesTax::calculate(1000, ['province' => 'Punjab']);                       // tax 160.0, gross 1160.0
SalesTax::calculate(1150, ['province' => 'Sindh', 'inclusive' => true]);   // net 1000.0, tax 150.0
SalesTax::splitInclusive(99.99, 18);                                       // net 84.74, tax 15.25
```

`SalesTax::getRate()` takes `kind` (`goods` or `services`, also
`SalesTax::GOODS` and `SalesTax::SERVICES`), `province` (the province names,
`KP`, `KPK`, `ICT` and `Islamabad`) and `date` (`YYYY-MM-DD` or a
`DateTimeInterface`, its own calendar date; today when left out). It returns
`null` for a date before 1 July 2019, an invalid date, an unknown province,
services without a province, or goods in Azad Jammu and Kashmir or
Gilgit-Baltistan.

`SalesTax::calculate()` takes a `rate`, or a `province` (and `kind`, default
`services`, and `date`) to use the standard rate, and `inclusive` when the
amount already includes the tax. Amounts are computed in whole paisa and
rounded half up, reading the number as written (`1.005` is Rs 1.01). For an
inclusive amount the value is rounded and the tax is the rest, so `net + tax`
always equals `gross`. Amounts from 0 to one trillion rupees and rates from 0
to 100 with at most two decimals are accepted; anything else, including a
string or boolean, returns `null`, never an exception.

### Income tax on salary

Income tax on a salaried individual's taxable income, from the salaried rate
table in the Income Tax Ordinance 2001 (First Schedule, Part I, Division I,
clause (2), which applies when salary is more than 75% of taxable income).
Tax years 2020 to 2027 are covered; a tax year runs from 1 July to 30 June and
is named after the June it ends in.

```php
use PakDataKit\IncomeTax;

IncomeTax::calculateSalary(1_800_000, ['taxYear' => 2026]);
// SalaryTax { tax: 72000.0, surcharge: 0.0, total: 72000.0, monthly: 6000.0, effectiveRate: 4.0,
//   slab: SalaryTaxSlab { over: 1200000, upTo: 2200000, fixed: 6000, rate: 11 }, taxYear: 2026 }

IncomeTax::calculateSalary(12_000_000, ['taxYear' => 2026, 'includeSurcharge' => true]);
// SalaryTax { tax: 3381000.0, surcharge: 304290.0, total: 3685290.0, monthly: 307107.5, … }

IncomeTax::calculateMonthlySalary(150_000, ['taxYear' => 2026])?->monthly;  // 6000.0
IncomeTax::getSalarySlabs(2027);       // SalaryTaxYear: the table, its law and FBR source
IncomeTax::getSalaryYears();           // [2020, 2021, …, 2027]
IncomeTax::getTaxYear('2025-07-01');   // 2026
```

Options are `taxYear` (an integer; it wins over `date`), `date`
(`YYYY-MM-DD` or a `DateTimeInterface`) and `includeSurcharge`; without
`taxYear` or `date`, today's tax year is used. A year that is not covered, a non-integer `taxYear`, an invalid date, or
an amount that is not a number from 0 to one trillion (strings and booleans
included) returns `null`, never an exception. Tax is computed in whole paisa
and rounded half up.

`'includeSurcharge' => true` adds the section 4AB surcharge: a percentage of
the whole tax once taxable income exceeds Rs 10 million (10% in tax year 2025,
9% for salaried individuals in 2026, none in 2027 or before 2025). It is off
by default in 2.x, so existing results do not change. `monthly` is `total / 12`
and `effectiveRate` is based on `total`. `SalaryTaxYear::$surcharge` gives each
year's rate, threshold, law and source (null before 2025). Tax credits,
exemptions, the separate rate for pensions, super tax and withholding
adjustments are not applied.

### FBR Digital Invoicing

A builder and an offline validator for the invoice JSON that FBR's Digital
Invoicing API accepts (`postinvoicedata` and `validateinvoicedata`),
following PRAL's "Technical Specification for DI API" version 1.12
(`FbrInvoice::SPEC_VERSION`) and PRAL's Error Message Guide. There is no HTTP
client and no token handling: send the invoice with your own code.

```php
use PakDataKit\FbrInvoice;

$built = FbrInvoice::build([
    'invoiceType' => 'Sale Invoice',
    'invoiceDate' => '2025-04-21',
    'sellerNTNCNIC' => '1234567',
    'sellerBusinessName' => 'Example Traders',
    'sellerProvince' => 'Sindh',
    'sellerAddress' => 'Karachi',
    'buyerNTNCNIC' => '7654321',
    'buyerBusinessName' => 'Example Buyer',
    'buyerProvince' => 'Punjab',
    'buyerAddress' => 'Lahore',
    'buyerRegistrationType' => 'Registered',
    'items' => [[
        'hsCode' => '0101.2100',
        'productDescription' => 'Horses',
        'rate' => '18%',
        'uoM' => 'Numbers, pieces, units',
        'quantity' => 2,
        'valueSalesExcludingST' => 1234,
        'saleType' => 'Goods at standard rate (default)',
    ]],
]);
$built['invoice']['items'][0]['salesTaxApplicable'];  // 222.12
$built['totals']['salesTaxApplicable'];               // 222.12
$json = json_encode($built['invoice']);               // the body to post

FbrInvoice::validate($built['invoice']);
// FbrInvoiceValidation { valid: true, errors: [] }
FbrInvoice::validate([...$built['invoice'], 'invoiceDate' => '21-04-2025'], ['today' => '2026-11-18'])->errors[0];
// FbrInvoiceError { code: '0005', field: 'invoiceDate', message: 'Invoice date must be in YYYY-MM-DD format' }
FbrInvoice::expectedSalesTax(['rate' => 'Rs.3', 'quantity' => 12]);  // 36.0
```

An invoice is an associative array with FBR's camelCase keys (as
`json_decode($json, true)` gives) or an object (as `json_decode($json)`
gives); `items` is a list. An empty PHP array counts as an empty list, not as
an object.

`FbrInvoice::build()` works out each line's `salesTaxApplicable` when it is
left out (with `SalesTax::calculate()`), sets `totalValues`,
`fixedNotifiedValueOrRetailPrice` and `salesTaxWithheldAtSource` to 0 and
`buyerNTNCNIC` and `invoiceRefNo` to `''` when missing, keeps every other key,
and returns `['invoice' => …, 'totals' => …]` with the column totals in rupees
(for your own records; FBR has no invoice totals). Rates of the form `N%` use
the value excluding sales tax (or the retail price for Third Schedule goods);
`Rs.N` rates use the quantity; other rates (`Exempt`, combined rates) get 0
unless you give the tax. It returns `null` if the input is not an object with
an `items` list of objects.

`FbrInvoice::validate()` returns every problem it can find without calling
FBR, as `FbrInvoiceError`s with FBR's error code (or `null` where the
specification gives none), the field (`items[0].rate`) and a message, in the
same order and words as the npm package. It checks required fields, formats
(date, NTN/CNIC, FBR invoice number, sandbox scenario), amounts (numbers, not
negative, at most 2 decimals, 4 for quantity), SRO rules and the sales tax
arithmetic (to within one paisa); pass `['today' => 'YYYY-MM-DD']` to also
reject future dates. It cannot check what needs FBR's reference APIs:
registration status, and whether a province, HS code, unit, rate, sale type or
SRO is in FBR's lists. A `valid` result means FBR's own validation is likely
to pass, not that it will.

### Couriers

Helpers for orders shipped with Pakistani couriers. There are no API clients:
nothing is sent anywhere.

```php
use PakDataKit\Courier;

Courier::mapStatus('PostEx', 'Out For Delivery');                       // 'out-for-delivery'
Courier::mapStatus('PostEx', 5);                                        // 'delivered'
Courier::mapStatus('PostEx', 'Attempt Made: Customer not available');  // 'attempted'
Courier::mapStatus('Leopards', 'Returned to Shipper');                  // 'returned'
Courier::mapStatus('TCS', 'Delivered');                                 // null

Courier::normalizeCity('LHR');           // 'Lahore'
Courier::normalizeCity('Pindi');         // 'Rawalpindi'
Courier::normalizeCity('lyallpur');      // 'Faisalabad'
Courier::normalizeCity('Karachi City');  // 'Karachi'
Courier::normalizeCity('لاہور');         // 'Lahore'
Courier::normalizeCity('Atlantis');      // null
```

**Experimental:** `Courier::mapStatus()` and its status values may change in a
minor release while more couriers' status lists are added (see
[CONTRIBUTING.md](https://github.com/chmuzamil/pakdatakit/blob/main/CONTRIBUTING.md#courier-status-lists)).

`Courier::mapStatus()` maps a courier's own status (name, numeric ID or code)
to one vocabulary: `pending`, `booked`, `picked-up`, `in-transit`,
`out-for-delivery`, `attempted`, `under-review`, `delivered`, `returning`,
`returned` or `cancelled` (also `Courier::PENDING` … `Courier::CANCELLED`).
The courier is `TCS`, `Leopards`, `PostEx`, `M&P`, `Trax` or `BlueEx` (also
`Courier::TCS` … `Courier::BLUEEX`), in any case; `LCS`, `MnP` and `Blue Ex`
are accepted. Matching ignores case and extra spaces. A numeric status may be
a string or a non-negative whole number (`5` and `5.0` are the same; `'0005'`
is a different code). Only statuses a courier documents publicly are mapped:
every order status and tracking code in PostEx's merchant API guide (v4.1.9),
and Leopards' "Returned to Shipper". TCS, M&P, Trax and BlueEx publish no
status list, so they return `null` for now, as does any unknown courier or
status, or a value that is not a string or number.

`Courier::normalizeCity()` maps how a customer or a courier writes a city to
its name in the city list, so orders can be matched against a courier's
service list: the name in any case, short forms (`LHR`, `Khi`, `Isb`, `FSD`),
the old name Lyallpur, a trailing "city", and the main cities in Urdu script.

## Laravel

The service provider is discovered automatically (Laravel 11 and 12).

### Validation rules

```php
$request->validate([
    'cnic' => 'required|pk_cnic',
    'phone' => 'nullable|pk_phone',
    'iban' => 'pk_iban',
]);
```

Rules: `pk_cnic`, `pk_phone`, `pk_iban`, `pk_ntn`, `pk_strn`, `pk_landline`
(`pk_landline:services` also accepts UAN, toll-free and premium numbers),
`pk_passport`, `pk_vehicle_plate`, `pk_electricity_ref` (an electricity bill
reference number, customer ID or K-Electric account number),
`pk_cod_phone` (a mobile number a courier can call: no
`Quality::phoneRiskSignals()` flags) and `pk_amount` (a rupee amount as
people type it, like `150,000`, `Rs. 1,50,000/-` or `1.5 lakh`:
`Currency::parseAmount()` reads it). As with Laravel's own rules, empty values are skipped unless the field is `required`. Values
that are not strings fail.

The same checks are available as rule objects:

```php
use PakDataKit\Laravel\Rules;

$request->validate([
    'cnic' => ['required', new Rules\Cnic()],
    'plate' => [new Rules\VehiclePlate()],
]);
```

`Rules\Cnic`, `Rules\Phone`, `Rules\Iban`, `Rules\Ntn`, `Rules\Strn`,
`Rules\Landline`, `Rules\Passport`, `Rules\VehiclePlate`,
`Rules\ElectricityRef`, `Rules\CodPhone` and `Rules\Amount`.
`new Rules\Landline(services: true)` is `pk_landline:services`.

### Messages

Messages come in English and Urdu and follow the application's locale:

```
The cnic field must be a valid CNIC.
cnic درست شناختی کارڈ نمبر (CNIC) ہونا چاہیے۔
```

To change them, add `pk_cnic` and the other keys to your own
`lang/xx/validation.php`, pass custom messages to the validator, or publish
the package's files:

```sh
php artisan vendor:publish --tag=pakdatakit-lang
```

### Eloquent casts

```php
use PakDataKit\Laravel\Casts\{CnicCast, IbanCast, PhoneCast};

class Customer extends Model
{
    protected $casts = [
        'cnic' => CnicCast::class,    // stored as 3520212345671, read as 35202-1234567-1
        'phone' => PhoneCast::class,  // stored and read as +923001234567
        'iban' => IbanCast::class,    // stored and read as PK36SCBL0000001123456702
    ];
}
```

A value that is not valid is stored and returned unchanged, so validate it
with the matching rule before saving.

## What throws and what doesn't

**No method throws for a string it is given to check.** That includes `null`,
empty or whitespace-only text, garbage, very long input and text that is not
valid UTF-8.

| Methods                                                                                                          | For input that isn't valid                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `validate*`, `is*` (e.g. `Cnic::validate`, `Holidays::isHoliday`)                                                | `false`                                                                                                |
| `parse`, `get*`, `analyze*` returning one value (e.g. `VehiclePlate::parse`, `Iban::getBank`, `Tax::analyzeNtn`) | `null`                                                                                                 |
| `SalesTax::getRate`, `SalesTax::calculate`, `SalesTax::splitInclusive` (any value, not only strings)             | `null`                                                                                                 |
| `FbrInvoice::build`, `FbrInvoice::expectedSalesTax` (any value)                                                  | `null`                                                                                                 |
| `FbrInvoice::validate` (any value)                                                                               | a result with `valid: false` and the errors                                                            |
| `search*`, `get*` returning a list (e.g. `Geo::searchCities`, `Holidays::getHolidaysOn`)                         | an empty array                                                                                         |
| `Phone::analyze`, `RaastQr::validate`, `Address::parse`, `Networks::getNetwork`                                  | a result that says so (`valid: false`, an error list, empty parts, `'Unknown'`), as in the npm package |
| `Input::format*`, `Input::check*`, `Text::*`                                                                     | the best formatting of what was typed; `'invalid'`                                                     |

A regular expression that fails (for example on text that is not UTF-8) is
treated as not matching.

**`InvalidArgumentException` is thrown only for arguments and options the npm
package rejects too:**

| Method                                          | Throws when                                                                                                         | Without throwing                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Currency::formatPkr`, `Currency::formatLakh`   | the amount is NaN or infinite                                                                                       | `Currency::tryFormatPkr`, `tryFormatLakh`     |
| `Words::numberToWords`, `Words::amountInWords`  | the number is not a safe integer; the amount is negative, not finite or too large; the language is not `en` or `ur` | `Words::tryNumberToWords`, `tryAmountInWords` |
| `Hijri::fromHijri`                              | the Hijri date is out of range                                                                                      | `Hijri::tryFromHijri`                         |
| `Holidays::getHolidays`                         | the year is outside 1948 to 9999, or an announced date in the options is not `YYYY-MM-DD`                           | `Holidays::tryGetHolidaysOn` (for a date)     |
| `RaastQr::createP2P`, `RaastQr::createMerchant` | the IBAN is invalid, a field is missing or too long, or an amount has no expiry                                     | `RaastQr::tryCreateP2P`, `tryCreateMerchant`  |

PHP's own `TypeError` still applies when an argument has the wrong type, for
example an array where a string is expected.

Two differences from the npm package, both to keep this contract:
`Holidays::getHolidaysOn()` and `isHoliday()` return an empty array and
`false` for text that is not a `YYYY-MM-DD` date (npm throws), and
`WhatsApp::createLink()` returns `null` for a message that is not valid UTF-8
(npm throws for an unpaired surrogate).

A fuzz test (`tests/FuzzTest.php`) feeds random and hostile strings to every
public method that takes a string and checks this contract.

## Notes

- **Format-only checks.** NADRA, FBR and DGIP publish no check-digit
  algorithms, so CNIC, NTN, STRN and passport numbers are checked for format
  only. Vehicle plates are checked against the shape the provinces share. See
  [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md).
- **Hijri dates** use the same tabular ("islamic-civil") algorithm as the npm
  package. Real dates in Pakistan follow moon sighting and can differ by a day
  or two; pass an `offset`.
- **Mobile networks** are the network a prefix was first allocated to. With
  number portability the current carrier can differ.
- **Text is UTF-8.** PHP strings cannot hold an unpaired UTF-16 surrogate, so
  such input arrives as invalid UTF-8 and is treated as not valid.
- **Merchant QR sub-field IDs** are array keys. PHP turns keys like `'10'`
  into integers, which is handled; `'00'` to `'09'` stay strings.

## Development

```sh
composer install
composer test        # runs the shared vectors in ../test-vectors/
```

The files in `data/` are generated from the repository's `data/*.json` and
from JavaScript's Unicode tables by `node scripts/generate-php-data.mjs`; CI
fails if they are out of date. Do not edit them by hand.

## License

MIT
