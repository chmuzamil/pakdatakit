# PakDataKit for PHP and Laravel

Utilities for Pakistani data: CNIC, mobile numbers and networks, landlines,
IBAN and banks, NTN/STRN, passport and vehicle numbers, electricity and gas
bill numbers, postal codes, cities and districts, WhatsApp links, rupee
formatting, amounts in words, Roman Urdu, Hijri dates, public holidays, address
parsing, as-you-type form helpers and Raast QR codes. Includes a Laravel bridge: validation rules, rule objects and
Eloquent casts, with English and Urdu messages.

This is the PHP port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 25,000+ test
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

Phone::format('0300 1234567');                // '+923001234567'
Networks::getNetwork('0300 1234567');         // 'Jazz'
Numbers::validateLandline('042-35761234');    // true

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
Words::amountInWords(125000, cheque: true);   // 'Rupees One Lakh Twenty-Five Thousand Only'

Hijri::format(new DateTimeImmutable('2026-03-04'));   // '15 Ramadan 1447'
Holidays::isHoliday('2026-08-14');                    // true

$payload = RaastQr::createP2P([
    'iban' => 'PK36SCBL0000001123456702',
    'amount' => 1500,
    'expiresIn' => '1d',
]);
RaastQr::validate($payload)->valid;           // true
```

Results are small read-only objects with the same property names as the npm
package; call `->toArray()` for an array.

### API map

| npm                                                    | PHP                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `validateCNIC`, `getCNICInfo`                          | `Cnic::validate`, `Cnic::getInfo`                                          |
| `validatePhone`, `formatPhone`, `analyzePhone`         | `Phone::validate`, `Phone::format`, `Phone::analyze`                       |
| `getNetwork`                                           | `Networks::getNetwork`                                                     |
| `analyzeNumber`, `validateLandline`, `getAreaCode`     | `Numbers::analyze`, `Numbers::validateLandline`, `Numbers::getAreaCode`    |
| `validateIBAN`, `getBankFromIBAN`, `getBankInfo`       | `Iban::validate`, `Iban::getBank`, `Iban::getBankInfo`, `Iban::getBanks`   |
| `analyzeNTN`, `validateNTN`, `validateSTRN`            | `Tax::analyzeNtn`, `Tax::validateNtn`, `Tax::validateStrn`                 |
| `validatePassport`                                     | `Passport::validate`                                                       |
| `parseVehiclePlate`, `validateVehiclePlate`            | `VehiclePlate::parse`, `VehiclePlate::validate`                            |
| `parseElectricityRef`, `validateElectricityRef`        | `Bills::parseElectricityRef`, `Bills::validateElectricityRef`              |
| `validateGasConsumerNumber`                            | `Bills::validateGasConsumerNumber`                                         |
| `getCityByPostalCode`, `getPostalCode`, …              | `Postal::getCity`, `Postal::getCode`, `Postal::getCodes`, `Postal::search` |
| `getPostOffice`, `searchPostOffices`                   | `Postal::getPostOffice`, `Postal::searchPostOffices`                       |
| `getProvince`, `searchCities`, `searchDistricts`, …    | `Geo::getProvince`, `Geo::searchCities`, `Geo::searchDistricts`, …         |
| `getDivisions`, `getDivisionOfDistrict`                | `Geo::getDivisions`, `Geo::getDivisionOfDistrict`                          |
| `getTehsils`, `getTehsilDistrict`                      | `Geo::getTehsils`, `Geo::getTehsilDistrict`                                |
| `createWhatsAppLink`                                   | `WhatsApp::createLink`                                                     |
| `formatPKR`, `formatLakh`                              | `Currency::formatPkr`, `Currency::formatLakh`                              |
| `numberToWords`, `amountInWords`                       | `Words::numberToWords`, `Words::amountInWords`                             |
| `normalizeText`, `normalizeRomanUrdu`, `toUrduDigits`  | `Text::normalize`, `Text::normalizeRomanUrdu`, `Text::toUrduDigits`        |
| `toHijri`, `fromHijri`, `formatHijri`, `isRamadan`     | `Hijri::toHijri`, `Hijri::fromHijri`, `Hijri::format`, `Hijri::isRamadan`  |
| `getPakistanHolidays`, `getHolidaysOn`, …              | `Holidays::getHolidays`, `Holidays::getHolidaysOn`, `Holidays::isHoliday`  |
| `parseAddress`, `formatAddress`                        | `Address::parse`, `Address::format`                                        |
| `scoreAddress`, `phoneRiskSignals`, `ADDRESS_WEIGHTS`  | `Quality::scoreAddress`, `Quality::phoneRiskSignals`, …                    |
| `formatCNICInput`, `checkCNICInput`, …                 | `Input::formatCnic`, `Input::checkCnic`, `Input::formatPhone`, …           |
| `createRaastP2PQr`, `createMerchantQr`, `parseRaastQr` | `RaastQr::createP2P`, `RaastQr::createMerchant`, `RaastQr::parse`          |
| `validateRaastQr`                                      | `RaastQr::validate`                                                        |
| `getSalesTaxRate`, `calculateSalesTax`                 | `SalesTax::getRate`, `SalesTax::calculate`                                 |
| `splitInclusive`                                       | `SalesTax::splitInclusive`                                                 |
| `buildFbrInvoice`, `validateFbrInvoice`                | `FbrInvoice::build`, `FbrInvoice::validate`                                |
| `expectedSalesTax`, `FBR_DI_SPEC_VERSION`              | `FbrInvoice::expectedSalesTax`, `FbrInvoice::SPEC_VERSION`                 |
| `mapCourierStatus`, `normalizeCityForCourier`          | `Courier::mapStatus`, `Courier::normalizeCity`                             |
| `dataVersion`                                          | `PakData::version()`                                                       |

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

Rules: `pk_cnic`, `pk_phone`, `pk_iban`, `pk_ntn`, `pk_strn`, `pk_landline`,
`pk_passport`, `pk_vehicle_plate`, `pk_electricity_ref` (an electricity bill
reference number, customer ID or K-Electric account number) and
`pk_cod_phone` (a mobile number a courier can call: no
`Quality::phoneRiskSignals()` flags). As with Laravel's own rules, empty values are skipped unless the field is `required`. Values
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
`Rules\ElectricityRef` and `Rules\CodPhone`.

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
