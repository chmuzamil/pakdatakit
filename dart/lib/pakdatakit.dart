/// Utilities for Pakistani data: CNIC, phone, IBAN, postal codes, address
/// parsing, Hijri dates, holidays, amounts in words and Raast QR codes.
///
/// A pure-Dart port of the `pakdatakit` npm package. It uses the same
/// datasets and gives identical results, checked against test vectors
/// generated from the TypeScript library.
///
/// ```dart
/// import 'package:pakdatakit/pakdatakit.dart';
///
/// validateCNIC('35202-1234567-1'); // true
/// formatPhone('0300 1234567');     // '+923001234567'
/// getBankFromIBAN('PK36SCBL0000001123456702');
/// ```
///
/// Each module is also available on its own, mirroring the npm entry points,
/// e.g. `package:pakdatakit/cnic.dart`.
library;

export 'src/address.dart';
export 'src/cnic.dart';
export 'src/data_version.dart';
export 'src/format.dart';
export 'src/geo.dart';
export 'src/hijri.dart';
export 'src/holidays.dart';
export 'src/iban.dart';
export 'src/input.dart';
export 'src/networks.dart';
export 'src/numbers.dart';
export 'src/phone.dart' hide getPhonePrefix, normalizePhoneDigits;
export 'src/postal.dart';
export 'src/raast.dart';
export 'src/tax.dart';
export 'src/text.dart';
export 'src/whatsapp.dart';
export 'src/words.dart';
