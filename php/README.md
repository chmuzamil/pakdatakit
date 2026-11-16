# PakDataKit for PHP and Laravel

Utilities for Pakistani data: CNIC, mobile numbers and networks, landlines,
IBAN and banks, NTN/STRN, passport and vehicle numbers, postal codes, cities
and districts, WhatsApp links, rupee formatting, amounts in words, Roman Urdu,
Hijri dates, public holidays, address parsing, as-you-type form helpers and
Raast QR codes. Includes a Laravel bridge: validation rules, rule objects and
Eloquent casts, with English and Urdu messages.

This is the PHP port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 12,000+ test
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
| `getCityByPostalCode`, `getPostalCode`, …              | `Postal::getCity`, `Postal::getCode`, `Postal::getCodes`, `Postal::search` |
| `getProvince`, `searchCities`, `searchDistricts`, …    | `Geo::getProvince`, `Geo::searchCities`, `Geo::searchDistricts`, …         |
| `createWhatsAppLink`                                   | `WhatsApp::createLink`                                                     |
| `formatPKR`, `formatLakh`                              | `Currency::formatPkr`, `Currency::formatLakh`                              |
| `numberToWords`, `amountInWords`                       | `Words::numberToWords`, `Words::amountInWords`                             |
| `normalizeText`, `normalizeRomanUrdu`, `toUrduDigits`  | `Text::normalize`, `Text::normalizeRomanUrdu`, `Text::toUrduDigits`        |
| `toHijri`, `fromHijri`, `formatHijri`, `isRamadan`     | `Hijri::toHijri`, `Hijri::fromHijri`, `Hijri::format`, `Hijri::isRamadan`  |
| `getPakistanHolidays`, `getHolidaysOn`, …              | `Holidays::getHolidays`, `Holidays::getHolidaysOn`, `Holidays::isHoliday`  |
| `parseAddress`, `formatAddress`                        | `Address::parse`, `Address::format`                                        |
| `formatCNICInput`, `checkCNICInput`, …                 | `Input::formatCnic`, `Input::checkCnic`, `Input::formatPhone`, …           |
| `createRaastP2PQr`, `createMerchantQr`, `parseRaastQr` | `RaastQr::createP2P`, `RaastQr::createMerchant`, `RaastQr::parse`          |
| `validateRaastQr`                                      | `RaastQr::validate`                                                        |
| `dataVersion`                                          | `PakData::version()`                                                       |

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
`pk_passport` and `pk_vehicle_plate`. As with Laravel's own rules, empty
values are skipped unless the field is `required`. Values that are not strings
fail.

The same checks are available as rule objects:

```php
use PakDataKit\Laravel\Rules;

$request->validate([
    'cnic' => ['required', new Rules\Cnic()],
    'plate' => [new Rules\VehiclePlate()],
]);
```

`Rules\Cnic`, `Rules\Phone`, `Rules\Iban`, `Rules\Ntn`, `Rules\Strn`,
`Rules\Landline`, `Rules\Passport` and `Rules\VehiclePlate`.

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
