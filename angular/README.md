# pakdatakit-angular

Angular directives, pipes and form validators for Pakistani **CNIC**, **mobile numbers**, **IBANs** and more. Built on [pakdatakit](https://github.com/chmuzamil/pakdatakit).

- **Directives** that format as the user types (`35202-1234567-1`, `0300-1234567`, `PK36 SCBL 0000 0011 2345 6702`) without making the caret jump
- **Pipes** to display CNICs, mobile numbers, IBANs and rupee amounts
- **Validators** for reactive forms: CNIC, mobile, IBAN, NTN, STRN, landline, passport and vehicle plate
- Everything is standalone: import only what you use
- Works with `formControl`, `formControlName` and `ngModel`
- Ready-made, unstyled **checkout and KYC forms** in English or Urdu, with the province → district → city cascade
- Accessible: `aria-invalid` when the value cannot become valid, sensible `inputmode` and `autocomplete`

## Install

```bash
npm install pakdatakit-angular pakdatakit
```

Requires Angular 17 to 22 (`@angular/core` and `@angular/forms`) and `pakdatakit` 2.4 or later. All three are peer dependencies.

CI runs the tests and the build on Angular 17, 18, 19 and 22. The package is built with Angular 17 in partial-compilation mode, so one build works on all of them. Angular 20 and 21 are inside the supported range but are not in the CI matrix.

## Input directives

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  PakCnicInputDirective,
  PakIbanInputDirective,
  PakPhoneInputDirective,
  PakValidators,
} from 'pakdatakit-angular';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PakCnicInputDirective,
    PakPhoneInputDirective,
    PakIbanInputDirective,
  ],
  template: `
    <input pakCnicInput [formControl]="cnic" />
    <input pakPhoneInput [formControl]="phone" />
    <input pakIbanInput [formControl]="iban" #ibanInput="pakInput" />
    <p>{{ ibanInput.info }}</p>
  `,
})
export class CustomerForm {
  cnic = new FormControl('', [Validators.required, PakValidators.cnic]);
  phone = new FormControl('', [PakValidators.phone]);
  iban = new FormControl('', [PakValidators.iban]);
}
```

The control always holds the formatted value. A value set on the control (`setValue`, `patchValue`, the initial value) is formatted before it is shown.

Each directive:

- sets `inputmode`, `autocomplete`, `autocapitalize` and `spellcheck`, unless you set them yourself;
- sets `aria-invalid="true"` once the value cannot become valid;
- emits `(pakChange)` with `{ value, state, info }` after every change;
- is exported as `pakInput`, with `state` (`'empty' | 'incomplete' | 'valid' | 'invalid'`) and `info` (province and gender for a CNIC, the network for a mobile number, the bank name for an IBAN; `null` unless valid).

They also work with `[(ngModel)]`, and on a plain `<input>` with no forms directive.

## Pipes

```html
{{ customer.cnic | pakCnic }}
<!-- 35202-1234567-1 -->
{{ customer.phone | pakPhone }}
<!-- 0300-1234567 -->
{{ customer.phone | pakPhone: 'international' }}
<!-- +92 300 1234567 -->
{{ customer.phone | pakPhone: 'e164' }}
<!-- +923001234567 -->
{{ account.iban | pakIban }}
<!-- PK36 SCBL 0000 0011 2345 6702 -->
{{ order.total | pakPkr }}
<!-- Rs. 150,000 -->
{{ property.price | pakPkr: 'lakh' }}
<!-- 25 Lakh -->
```

Import `PakCnicPipe`, `PakPhonePipe`, `PakIbanPipe` and `PakPkrPipe`. A value that is not valid is shown unchanged; `null` and `undefined` give an empty string. `pakPkr` gives an empty string for anything that is not a finite number.

## Validators

```ts
import { PakValidators } from 'pakdatakit-angular';

new FormGroup({
  cnic: new FormControl('', [Validators.required, PakValidators.cnic]),
  ntn: new FormControl('', [PakValidators.ntn]),
  plate: new FormControl('', [PakValidators.vehiclePlate]),
});
```

| Validator                    | Error key         |
| ---------------------------- | ----------------- |
| `PakValidators.cnic`         | `pakCnic`         |
| `PakValidators.phone`        | `pakPhone`        |
| `PakValidators.iban`         | `pakIban`         |
| `PakValidators.ntn`          | `pakNtn`          |
| `PakValidators.strn`         | `pakStrn`         |
| `PakValidators.landline`     | `pakLandline`     |
| `PakValidators.passport`     | `pakPassport`     |
| `PakValidators.vehiclePlate` | `pakVehiclePlate` |
| `PakValidators.postalCode`   | `pakPostalCode`   |

Like Angular's own validators, they pass empty values; add `Validators.required` for mandatory fields. Values that are not strings are invalid. NTN, STRN, passport and vehicle plate checks are format-only; see [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md). `pakRequiredTrimmed` is a required check that also treats a value of only spaces as empty (error key `pakRequired`).

## Checkout and KYC forms

`PakCheckoutFormComponent` (`<pak-checkout-form>`) asks for full name,
mobile number, province, district, city, address, a nearby place (optional)
and postal code (optional). `PakKycFormComponent` (`<pak-kyc-form>`) adds the
CNIC. Both are standalone components built on reactive forms. They are
unstyled: plain `<form>`, `<label>`, `<input>` and native `<select>`
elements with `pak-form__*` class names for your CSS.

```ts
import { Component } from '@angular/core';
import {
  PakCheckoutFormComponent,
  type PakFormValues,
} from 'pakdatakit-angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [PakCheckoutFormComponent],
  template: `<pak-checkout-form (submitted)="save($event)" />`,
})
export class CheckoutComponent {
  save(values: PakFormValues) {
    // values are trimmed; mobile is formatted as 0300-1234567
  }
}
```

- **Validation** uses pakdatakit through `PakValidators.phone` (mobile
  numbers only), `PakValidators.cnic` and `PakValidators.postalCode`
  (5 digits), plus `pakRequiredTrimmed` for name, address, province,
  district and city. Errors show after a field is left or on submit, in a
  `role="alert"` summary and next to each field (`aria-invalid`,
  `aria-describedby`). The first invalid field gets focus.
- **Mobile and CNIC** format as you type, with `pakPhoneInput` and
  `pakCnicInput`.
- **Location**: the district list follows the province
  (`getDistrictsByProvince`), and the optional tehsil list (`[tehsil]="true"`)
  follows the district (`getTehsils`). The data has no city-to-district
  mapping, so the city is a text input with suggestions (`<datalist>`) from
  the chosen province. Changing the province clears district, tehsil and
  city; changing the district clears the tehsil.
- **Inputs**: `locale` (`'en'` or `'ur'`), `labels` (override any text),
  `tehsil`, `hints`, `idPrefix` and `value` (with `(valueChange)`, so
  `[(value)]` works). **Outputs**: `submitted` and `valueChange`. The
  `form` property is the `FormGroup`; content you project goes before the
  submit button.
- The components use `OnPush` change detection and mark themselves for
  check after async work (loading hints), so they also suit zoneless apps.

### In Urdu

```html
<pak-kyc-form
  locale="ur"
  [labels]="{ submit: 'آگے بڑھیں' }"
  (submitted)="verify($event)"
/>
```

Every label, placeholder, error and hint is in Urdu, and the form gets
`dir="rtl"` and `lang="ur"`. What the user types is kept as typed.

### Hints

```html
<pak-checkout-form [hints]="true" (submitted)="save($event)" />
```

With `hints`, the form shows how complete the address is
(`scoreAddress`), what a rider would still need, warnings about the mobile
number (`phoneRiskSignals`: landline, test number, repeated digits …) and a
note when the postal code belongs to another city. Hints never block submit
and are announced politely (`aria-live="polite"`).

Hints load `pakdatakit/quality` and the post office directory (about 32 kB
gzipped) with a dynamic `import()` only when `hints` is turned on. Without
hints, your bundle does not include the postal data.

### Your own markup

`PakLocationService` gives you the cascade for your own form:
`provinces`, `districts(province)`, `tehsils(district)`,
`cities(query, province)` and `withField(values, field, value)`. The pure
helpers (`validatePakForm`, `citySuggestions`, `PAK_PROVINCES`,
`formText`, `loadPakHintEngine`, `pakFormHints`) are exported too.

## License

MIT
