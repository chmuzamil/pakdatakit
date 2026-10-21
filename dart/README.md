# PakDataKit for Dart and Flutter

Utilities for Pakistani data: CNIC, mobile numbers and networks, WhatsApp
links, IBAN and banks, postal codes, cities and districts, address parsing,
Roman Urdu, Hijri dates, public holidays, rupee formatting, amounts in words,
NTN/STRN, landlines, Raast QR codes, and form-field helpers that format as the
user types.

This is the Dart port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **the same 12,000+ test
vectors** generated from the TypeScript library (also used by the Python
port), so all three give identical results.

- Pure Dart, **no dependencies**
- Works on **every platform**: Flutter (Android, iOS, web, desktop), the Dart
  VM and server, and Dart compiled to JavaScript. No `dart:io`; the data is
  embedded in the package.
- Null-safe, immutable result classes with value equality and `toJson()`

## Install

```sh
dart pub add pakdatakit
# or, in a Flutter app
flutter pub add pakdatakit
```

## Examples

```dart
import 'package:pakdatakit/pakdatakit.dart';

validateCNIC('35202-1234567-1');             // true
getCNICInfo('35202-1234567-1');
// CNICInfo{digits: 3520212345671, formatted: 35202-1234567-1, province: Punjab, gender: male}

formatPhone('0300 1234567');                 // '+923001234567'
getNetwork('0345-1234567');                  // NetworkName.telenor
createWhatsAppLink('03001234567', 'Salam!'); // 'https://wa.me/923001234567?text=Salam!'

validateIBAN('PK36 SCBL 0000 0011 2345 6702'); // true
getBankFromIBAN('PK36SCBL0000001123456702');   // 'Standard Chartered Bank (Pakistan) Limited'
getBankInfo('MEZN')?.type;                     // BankType.islamic

getProvince('Lahore');                       // 'Punjab'
parseAddress('House 12, Street 5, Model Town Lahore 54000').postalCode; // '54000'

formatPKR(150000);                           // 'Rs. 150,000'
formatLakh(2500000);                         // '25 Lakh'
amountInWords(125000, cheque: true);         // 'Rupees One Lakh Twenty-Five Thousand Only'
numberToWords(125000, language: WordsLanguage.ur); // 'ایک لاکھ پچیس ہزار'

formatHijri(DateTime(2026, 3, 3));           // '14 Ramadan 1447'
isPakistanHoliday(DateTime(2025, 8, 14));    // true
getPakistanHolidays(2026).first;             // Holiday{id: kashmir-day, ...}

final payload = createRaastP2PQr(
  iban: 'PK36SCBL0000001123456702',
  amount: 1500,
  expiresIn: '1d', // or const Duration(days: 1)
);
validateRaastQr(payload).valid;              // true

formatCNICInput('3520212');                  // '35202-12'
checkPhoneInput('0300 12');                  // InputState.incomplete
```

Each module can also be imported on its own, mirroring the npm entry points:

```dart
import 'package:pakdatakit/cnic.dart';
import 'package:pakdatakit/raast.dart';
```

Available: `address`, `cnic`, `format`, `geo`, `hijri`, `holidays`, `iban`,
`input`, `networks`, `numbers`, `phone`, `postal`, `raast`, `tax`, `text`,
`whatsapp` and `words`.

## API

Every function of the npm package is available under the same name
(`validateCNIC`, `createRaastP2PQr`, …). See the
[API reference](https://chmuzamil.github.io/pakdatakit/) for what each one does.
In Dart:

- **Options objects are named parameters**: `{ expiresIn: '1d' }` →
  `expiresIn: '1d'`, `{ language: 'ur' }` → `language: WordsLanguage.ur`.
- **Results are immutable classes** with `const` constructors, `==` /
  `hashCode`, `toString()` and `toJson()`, which gives the same JSON (keys and
  values) as the npm package.
- **Closed sets of strings are enums** (`InputState`, `NetworkName`,
  `NumberType`, `BankType`, `NTNType`, `HolidayId`, `RaastQrError`, …), each
  with a `.value` holding the npm string, e.g. `NumberType.tollFree.value ==
  'toll-free'`.
- **`null` where the npm package returns `null`**.
- **An `ArgumentError` where the npm package throws a `RangeError`**, e.g.
  `formatPKR(double.nan)` or a Raast QR with an amount but no expiry.
- **Dates are local `DateTime`s**; only the calendar date (or, for Raast
  expiry, the local time) is used. `getHolidaysOn` and `isPakistanHoliday`
  take a `DateTime` or a `'YYYY-MM-DD'` string.
- Whole-number options are `int` (Hijri `offset`, `hijriOffset`, years);
  amounts are `num`.
- `ParsedRaastQr.isDynamic` and `createMerchantQr(isDynamic: …)` are called
  `dynamic` in the npm package (`dynamic` is a built-in Dart type); `toJson()` still
  uses `dynamic`.
- `createRaastP2PQr` takes an optional `now` (the time `expiresIn` counts
  from), and `expiresIn` also accepts a `Duration`.

`dataVersion` gives the date the datasets were last checked against their
sources; see [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md)
for where each dataset comes from.

## Same results as the npm package

The datasets in `lib/src/data/` are generated from the repository's shared
`data/*.json`, and the package is tested against the shared
[`test-vectors/`](https://github.com/chmuzamil/pakdatakit/tree/main/test-vectors),
produced by running the TypeScript library over 12,080 inputs. The tests pass
both on the Dart VM and compiled to JavaScript.

JavaScript behaviours that differ in Dart are reproduced exactly: whitespace
and `trim`, full Unicode case mapping (`ß` → `SS`), NFC normalization,
`Math.round`, number-to-string conversion, `toFixed`, `localeCompare`
ordering and stable sorting.

## Development

From `dart/`:

```sh
dart pub get
dart test
```

The files in `lib/src/data/` are generated; don't edit them by hand. From the
repository root:

```sh
node scripts/generate-dart-data.mjs
```

## License

MIT
