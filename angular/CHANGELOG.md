# Changelog

## 0.1.0

First release.

- Standalone directives `pakCnicInput`, `pakPhoneInput` and `pakIbanInput`:
  format as you type, keep the caret in place, and work with `formControl`,
  `formControlName` and `ngModel`.
- Standalone pipes `pakCnic`, `pakPhone`, `pakIban` and `pakPkr`.
- `PakValidators` for reactive forms: `cnic`, `phone`, `iban`, `ntn`, `strn`,
  `landline`, `passport` and `vehiclePlate`.
- Requires Angular 17 to 22 and `pakdatakit` 2.3 or later. Tested in CI on
  Angular 17, 18, 19 and 22.
