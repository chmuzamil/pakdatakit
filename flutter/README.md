# pakdatakit_flutter

Flutter widgets for Pakistani data, built on
[`pakdatakit`](https://pub.dev/packages/pakdatakit):

- **Input formatters** for CNIC, mobile numbers and IBANs that format as you
  type and keep the caret where it belongs.
- **Form validators** for CNIC, mobile, IBAN, NTN, STRN and landline numbers.
- **Ready form fields**: `CnicField`, `PhoneField` and `IbanField`.
- **Checkout and KYC forms**: `PakCheckoutForm` and `PakKycForm`, with a
  province → district → city cascade, Urdu labels and optional address and
  phone hints.
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

## Checkout and KYC forms

`PakCheckoutForm` asks for a full name, mobile number, province, district,
city, address, nearby place (optional) and postal code (optional).
`PakKycForm` adds a required CNIC. Both are a plain `Form` of Material fields
with no styling of their own:

```dart
PakCheckoutForm(
  onSubmitted: (PakFormValues values) {
    // values.fullName, values.mobile ('0300-1234567'), values.province,
    // values.district, values.city, values.address, values.landmark,
    // values.postalCode; values.toMap() for JSON.
  },
)
```

- The mobile number and CNIC are a `PhoneField` and a `CnicField`, so they
  format as you type and validate with `validatePhone` (mobile numbers only)
  and `validateCNIC`. Name, address and city are required and trimmed; a
  postal code, if given, must have 5 digits.
- Province, district and the optional tehsil (`showTehsil: true`) are
  `DropdownButtonFormField`s from `getDistrictsByProvince` and `getTehsils`.
  The data has no city-to-district mapping, so the city is free text with
  `Autocomplete` suggestions from `searchCities`, limited to the chosen
  province. Changing the province clears the district, tehsil and city;
  changing the district clears the tehsil. `PakLocation` has the same
  cascade for your own markup.
- Every field has a label, errors are shown under the fields, and a failed
  submit adds a summary in a live region. Each field has a
  `Key('pakForm.<field>')`. Restyle fields with `decorate` and replace the
  button with `submitBuilder`.

### Urdu

`locale: PakFormLocale.ur` switches every label, placeholder, error and hint
to Urdu and lays the form out right to left. Typed values are kept as they
are. Override any text with `labels` (keys in `PakFormLabels`):

```dart
PakKycForm(
  locale: PakFormLocale.ur,
  labels: const {'fullName': 'پورا نام', 'submit': 'تصدیق کریں'},
  onSubmitted: (values) => verify(values.cnic!),
)
```

### Hints

`hints: true` shows non-blocking suggestions in a polite live region: how
complete the address is (`scoreAddress` on the address, nearby place, city
and postal code) and what it is missing, risk signals for the mobile number
(`phoneRiskSignals`: repeated digits, test numbers …), and a postal code that
belongs to another city (`getCityByPostalCode`). They never block submit.

```dart
PakCheckoutForm(hints: true, onSubmitted: placeOrder)
```

Hints need the post office directory (about 32 kB gzipped as JSON), so it is
loaded on demand. `PakFormHints.compute` imports `pakdatakit`'s quality and
postal libraries with `deferred as` and calls `loadLibrary()` the first time
hints are computed. On the web, dart2js puts that code and data in a separate
file that is downloaded only then; a form without hints never references
it (the package's bundle test checks this: about 53 kB gzipped in the
deferred part, outside the main bundle). On Android, iOS and desktop a
deferred import loads at once and unused code is tree-shaken anyway, so it
costs nothing. A Dart package cannot load a JSON file lazily on mobile
without assets, which is why a deferred import is used rather than a data
file.

To compute hints yourself (on a server, or with your own rules), pass a
`hintsLoader`:

```dart
PakCheckoutForm(
  hints: true,
  hintsLoader: (values) async => PakFormHints(
    phoneFlags: await api.phoneFlags(values.mobile),
  ),
)
```

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

- [Documentation](https://pakdatakit.dev/docs/)
- [Source and issues](https://github.com/chmuzamil/pakdatakit)
- Also available for TypeScript/JavaScript (`pakdatakit` and
  `pakdatakit-react` on npm) and Python (`pakdatakit` on PyPI).

## License

MIT
