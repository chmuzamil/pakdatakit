/// Flutter widgets for Pakistani data, built on `package:pakdatakit`:
///
/// - [CnicInputFormatter], [PhoneInputFormatter] and [IbanInputFormatter]
///   format as you type and keep the caret in place.
/// - [PakValidators] for `TextFormField.validator`.
/// - [CnicField], [PhoneField] and [IbanField]: ready form fields.
/// - [RaastQr]: a Raast payment QR code for an IBAN.
///
/// ```dart
/// import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';
///
/// CnicField(decoration: const InputDecoration(labelText: 'CNIC'));
/// RaastQr(iban: 'PK36SCBL0000001123456702');
/// ```
///
/// [InputState], [CNICInfo], [PhoneAnalysis] and [BankInfo] are re-exported
/// from `package:pakdatakit`; import that package for everything else.
library;

export 'package:pakdatakit/pakdatakit.dart'
    show BankInfo, CNICInfo, InputState, PhoneAnalysis;

export 'src/fields.dart';
export 'src/formatters.dart';
export 'src/raast_qr.dart'
    show RaastQr, RaastQrErrorBuilder, RaastQrErrorCorrection;
export 'src/validators.dart';
