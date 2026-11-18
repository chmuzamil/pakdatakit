# Changelog

## 0.2.0

- `PakCheckoutForm` and `PakKycForm`: ready checkout and KYC forms (full
  name, mobile number, province, district, optional tehsil, city with
  suggestions, address, nearby place, postal code, and a CNIC in the KYC
  form), built from `Form`, `TextFormField`, `DropdownButtonFormField` and
  `Autocomplete`, with `onSubmitted(PakFormValues)`, `onChanged`,
  `initialValues`, `decorate` and `submitBuilder`.
- Cascading province → district → tehsil and city suggestions limited to the
  province, from `pakdatakit`'s geo library; also available as `PakLocation`.
- Urdu: `locale: PakFormLocale.ur` switches labels, placeholders, errors and
  hints to Urdu and lays the form out right to left; `labels` overrides any
  text (`PakFormLabels`).
- Optional, non-blocking hints (`hints: true`): address completeness from
  `scoreAddress`, mobile number risk signals from `phoneRiskSignals` and a
  postal code from another city, in a polite live region. `PakFormHints`
  loads the quality library with a deferred import, so the post office
  directory is only loaded once hints are on (a separate file on the web);
  `hintsLoader` replaces it.
- `PakValidators.passport()` and `PakValidators.vehiclePlate()`, using
  `validatePassport` and `validateVehiclePlate` from `pakdatakit` 2.3.0.
- Requires `pakdatakit` ^2.4.0 (for `scoreAddress` and `phoneRiskSignals`).

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
