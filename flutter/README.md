# pakdatakit_flutter

Flutter widgets for Pakistani data, built on
[`pakdatakit`](https://pub.dev/packages/pakdatakit):

- **Input formatters** for CNIC, mobile numbers and IBANs that format as you
  type and keep the caret where it belongs.
- **Form validators** for CNIC, mobile, IBAN, NTN, STRN and landline numbers.
- **Ready form fields**: `CnicField`, `PhoneField` and `IbanField`.
- **`RaastQr`**: a Raast payment QR code for an IBAN that banking apps such as
  Easypaisa and JazzCash can scan.

Pure Dart and Flutter: no platform code, works on Android, iOS, web and
desktop.

## Install

```bash
flutter pub add pakdatakit_flutter
```

```dart
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';
```

For everything else (postal codes, address parsing, Hijri dates, amounts in
words …) use [`pakdatakit`](https://pub.dev/packages/pakdatakit) directly.

## Form fields

`CnicField`, `PhoneField` and `IbanField` are `TextFormField`s with the right
formatter, keyboard and validation:

```dart
final formKey = GlobalKey<FormState>();

Form(
  key: formKey,
  child: Column(
    children: [
      CnicField(
        decoration: const InputDecoration(labelText: 'CNIC'),
        onStateChanged: (state, info) {
          // state: InputState.empty / incomplete / valid / invalid
          // info: CNICInfo (province, gender) once valid
        },
      ),
      PhoneField(
        decoration: const InputDecoration(labelText: 'Mobile number'),
        onStateChanged: (state, info) => print(info?.network), // Jazz, Zong …
      ),
      IbanField(
        decoration: const InputDecoration(labelText: 'IBAN'),
        onStateChanged: (state, info) => print(info?.name), // bank name
      ),
      FilledButton(
        onPressed: () => formKey.currentState!.validate(),
        child: const Text('Submit'),
      ),
    ],
  ),
);
```

| Field        | Formats as                      | Keyboard                | `info` once valid |
| ------------ | ------------------------------- | ----------------------- | ----------------- |
| `CnicField`  | `35202-1234567-1`               | number                  | `CNICInfo`        |
| `PhoneField` | `0300-1234567`, `+92 300 1234567` | phone (with autofill) | `PhoneAnalysis`   |
| `IbanField`  | `PK36 SCBL 0000 0011 2345 6702` | text, uppercase         | `BankInfo`        |

While the user types, an error appears only once the value is **invalid**
(it cannot become valid by typing more, e.g. a CNIC starting with `0` or an
unallocated `03XX` prefix), not while it is merely incomplete. Once the form
is validated, for example on submit, incomplete and empty required values are
reported too.

Options include `controller`, `initialValue`, `decoration`, `required`,
`invalidMessage`, `requiredMessage`, an extra `validator`, `onChanged`,
`onSaved`, `onFieldSubmitted`, `autovalidateMode`, `focusNode`,
`textInputAction`, `enabled`, `readOnly` and `inputFormatters`.

## Input formatters

Use the formatters on any `TextField`:

```dart
TextField(
  keyboardType: TextInputType.number,
  inputFormatters: [CnicInputFormatter()],
)

TextField(
  keyboardType: TextInputType.phone,
  inputFormatters: [PhoneInputFormatter()],
)

TextField(
  textCapitalization: TextCapitalization.characters,
  inputFormatters: [IbanInputFormatter()],
)
```

- The caret stays after the same digit or letter when dashes or spaces are
  inserted or removed, including when typing in the middle.
- Backspace right after a separator (or Delete right before one) removes the
  neighbouring digit, instead of the separator coming straight back.
- Pasted text is cleaned up: `CNIC: 35202 1234567 1` becomes
  `35202-1234567-1`.
- Urdu (`۰۱۲۳…`) and Arabic-Indic digits are converted to `0–9`.
- IBANs are uppercased; input stops at 13 CNIC digits and 24 IBAN characters.

## Validators

For any `TextFormField`:

```dart
TextFormField(validator: PakValidators.cnic())
TextFormField(validator: PakValidators.phone(required: false))
TextFormField(validator: PakValidators.iban(message: 'Invalid IBAN'))
TextFormField(validator: PakValidators.ntn())
TextFormField(validator: PakValidators.strn())
TextFormField(validator: PakValidators.landline(requiredMessage: 'Required'))
```

Each returns `null` for a valid value and an error message otherwise. An
empty value is an error only when `required` is `true` (the default).

## Raast QR code

```dart
// Static QR: the payer types the amount.
RaastQr(iban: 'PK36SCBL0000001123456702')

// Fixed amount: needs an expiry, which banking apps require.
RaastQr(
  iban: 'PK36 SCBL 0000 0011 2345 6702',
  amount: 1500,
  expiresIn: '1d',            // or a Duration, or expiresAt: DateTime(...)
  particulars: 'Invoice 42',
  size: 240,
  errorCorrectionLevel: RaastQrErrorCorrection.medium,
  errorBuilder: (context, error) => const Text('Invalid IBAN'),
  onPayload: (payload) => print(payload),
)
```

The payload is exactly the string returned by `createRaastP2PQr` from
`pakdatakit`, and the code is painted with `CustomPaint` (via the pure-Dart
[`qr`](https://pub.dev/packages/qr) package), so no images or plugins are
involved. You can also change `color`, `backgroundColor`, `quietZone` and
`semanticLabel`.

## Links

- [Documentation](https://chmuzamil.github.io/pakdatakit/)
- [Source and issues](https://github.com/chmuzamil/pakdatakit)
- Also available for TypeScript/JavaScript (`pakdatakit` and
  `pakdatakit-react` on npm) and Python (`pakdatakit` on PyPI).

## License

MIT
