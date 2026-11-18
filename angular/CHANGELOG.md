# Changelog

## 0.1.0

First release.

- Standalone directives `pakCnicInput`, `pakPhoneInput` and `pakIbanInput`:
  format as you type, keep the caret in place, and work with `formControl`,
  `formControlName` and `ngModel`.
- Standalone pipes `pakCnic`, `pakPhone`, `pakIban` and `pakPkr`.
- `PakValidators` for reactive forms: `cnic`, `phone`, `iban`, `ntn`, `strn`,
  `landline`, `passport` and `vehiclePlate`.
- `PakCheckoutFormComponent` (`pak-checkout-form`) and `PakKycFormComponent`
  (`pak-kyc-form`): standalone, unstyled, accessible checkout and KYC forms
  on reactive forms, with `locale`, `labels`, `tehsil`, `hints` and `value`
  inputs and `submitted` / `valueChange` outputs. Validation from
  pakdatakit, masked mobile and CNIC inputs, a province → district →
  (tehsil) cascade with city suggestions, English and Urdu text, and
  optional address and phone hints that load `pakdatakit/quality` and the
  post office directory on demand.
- `PakLocationService` for the location cascade, `PakValidators.postalCode`,
  `pakRequiredTrimmed`, and the helpers behind the forms
  (`validatePakForm`, `citySuggestions`, `PAK_PROVINCES`, `formText`).
- Requires Angular 17 to 22 and `pakdatakit` 2.4.0 or later (the form hints
  use the quality functions added in 2.4.0). Tested in CI on
  Angular 17, 18, 19 and 22.
