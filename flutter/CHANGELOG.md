# Changelog

## 0.1.0

Initial release, built on [`pakdatakit`](https://pub.dev/packages/pakdatakit)
2.2.0.

- `CnicInputFormatter`, `PhoneInputFormatter` and `IbanInputFormatter`:
  format as you type (`35202-1234567-1`, `0300-1234567`,
  `PK36 SCBL 0000 0011 2345 6702`), keeping the caret after the same
  character. Backspace or Delete next to a separator removes the neighbouring
  character; pasted text and Urdu digits are handled.
- `PakValidators.cnic`, `.phone`, `.iban`, `.ntn`, `.strn` and `.landline`
  for `TextFormField.validator`, with replaceable English messages.
- `CnicField`, `PhoneField` and `IbanField`: form fields with the right
  formatter and keyboard, an `onStateChanged` callback with details once the
  value is valid, and errors shown only once the value is invalid (or the form
  is validated).
- `RaastQr`: a Raast person-to-person payment QR code for an IBAN, painted
  with `CustomPaint` from the `createRaastP2PQr` payload.
