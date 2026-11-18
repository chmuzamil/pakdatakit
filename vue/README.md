# pakdatakit-vue

Vue 3 composables and a directive for Pakistani **CNIC**, **mobile numbers** and **IBANs** that format as you type. Built on [pakdatakit](https://github.com/chmuzamil/pakdatakit), with the same behaviour as [pakdatakit-react](https://github.com/chmuzamil/pakdatakit/tree/main/react).

- Formats as the user types (`35202-1234567-1`, `0300-1234567`, `PK36 SCBL 0000 0011 2345 6702`) without making the caret jump
- Reports whether the value is `empty`, `incomplete`, `valid` or `invalid`, plus details once valid (province and gender, mobile network, bank name)
- Composables for your own input components, or a one-line directive for a plain `<input>`
- Works with `v-model`
- Ready-made, unstyled **checkout and KYC forms** in English or Urdu, with the province → district → city cascade
- Unstyled and accessible: `aria-invalid` when the value cannot become valid, sensible `inputmode` and `autocomplete`
- ESM and CommonJS, TypeScript types, tree-shakeable

## Install

```bash
npm install pakdatakit-vue pakdatakit
```

Requires Vue 3.3 or later and `pakdatakit` 2.4 or later (both are peer dependencies).

## Directive

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { vPakInput } from 'pakdatakit-vue';

const cnic = ref('');
const phone = ref('');
const iban = ref('');
</script>

<template>
  <input v-model="cnic" v-pak-input:cnic />
  <input v-model="phone" v-pak-input:phone />
  <input v-model="iban" v-pak-input="'iban'" />
</template>
```

The model always holds the formatted value. The directive also formats a value set from outside, sets `inputmode`, `autocomplete`, `autocapitalize` and `spellcheck` (unless you set them yourself), and sets `aria-invalid="true"` once the value cannot become valid.

To register it for the whole app:

```ts
import { createApp } from 'vue';
import { PakDataKit } from 'pakdatakit-vue';

createApp(App).use(PakDataKit).mount('#app');
```

## Composables

Use `useCnic`, `usePhone` and `useIban` when you need the state and details, or to drive your own input component.

```vue
<script setup lang="ts">
import { useCnic } from 'pakdatakit-vue';

const cnic = useCnic({
  onValueChange(value, state, info) {
    // value: '35202-1234567-1'
    // state: 'empty' | 'incomplete' | 'valid' | 'invalid'
    // info:  { digits, formatted, province: 'Punjab', gender: 'male' } once valid, otherwise null
  },
});
</script>

<template>
  <input v-bind="cnic.inputProps.value" />
  <p v-if="cnic.state.value === 'invalid'">That is not a CNIC.</p>
  <p v-if="cnic.info.value">Registered in {{ cnic.info.value.province }}</p>
</template>
```

Each composable returns:

| Property     | Type                        | Description                                                         |
| ------------ | --------------------------- | ------------------------------------------------------------------- |
| `value`      | `ComputedRef<string>`       | Formatted value to display                                          |
| `state`      | `ComputedRef<InputState>`   | `empty`, `incomplete`, `valid` or `invalid`                         |
| `info`       | `ComputedRef<Info \| null>` | Details once valid: `CNICInfo`, `PhoneAnalysis`, or the bank name   |
| `setValue`   | `(value: string) => void`   | Formats and sets the value                                          |
| `inputProps` | `ComputedRef<object>`       | Attributes and the `onInput` listener to `v-bind` on your `<input>` |

Options:

| Option          | Description                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| `value`         | Controlled value: a ref, a getter or a string. Update it from `onValueChange`.          |
| `defaultValue`  | Initial value when uncontrolled. It is formatted before it is shown.                    |
| `onValueChange` | Called with the formatted value, its state and details (`null` unless valid) on change. |

Controlled, with your own ref:

```ts
const value = ref('');
const phone = usePhone({
  value,
  onValueChange: (next) => (value.value = next),
});
```

## Checkout and KYC forms

`PakCheckoutForm` asks for full name, mobile number, province, district,
city, address, a nearby place (optional) and postal code (optional).
`PakKycForm` adds the CNIC. Both are unstyled: plain `<form>`, `<label>`,
`<input>` and native `<select>` elements with `pak-form__*` class names for
your CSS.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PakCheckoutForm, type PakFormValues } from 'pakdatakit-vue';

const order = ref<Partial<PakFormValues>>({});
function save(values: PakFormValues) {
  // values are trimmed; mobile is formatted as 0300-1234567
}
</script>

<template>
  <PakCheckoutForm v-model="order" @submit="save" />
</template>
```

- **Validation** uses pakdatakit: `validatePhone` (mobile numbers only),
  `validateCNIC`, a 5-digit postal code, and required name, address,
  province, district and city. Errors show after a field is left or on
  submit, in a `role="alert"` summary and next to each field
  (`aria-invalid`, `aria-describedby`). The first invalid field gets focus.
- **Mobile and CNIC** format as you type, using `usePhone` and `useCnic`.
- **Location**: the district list follows the province
  (`getDistrictsByProvince`), and the optional tehsil list (`tehsil` prop)
  follows the district (`getTehsils`). The data has no city-to-district
  mapping, so the city is a text input with suggestions (`<datalist>`) from
  the chosen province. Changing the province clears district, tehsil and
  city; changing the district clears the tehsil.
- **Props**: `locale` (`'en'` or `'ur'`), `labels` (override any text),
  `tehsil`, `hints`, `idPrefix`. Slots: `default` (before the button) and
  `submit` (replace the button). `validate()` and `reset()` are exposed.

### In Urdu

```vue
<PakKycForm
  v-model="customer"
  locale="ur"
  :labels="{ submit: 'آگے بڑھیں' }"
  @submit="verify"
/>
```

Every label, placeholder, error and hint is in Urdu, and the form gets
`dir="rtl"` and `lang="ur"`. What the user types is kept as typed.

### Hints

```vue
<PakCheckoutForm v-model="order" hints @submit="save" />
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

`usePakForm(kind, options)` (or `useCheckoutForm` / `useKycForm`) gives
you the same logic for your own template: `values`, `setField` (with the
cascade), `districts`, `tehsils`, `cities`, `errors`, `hints`, `text`,
`fieldAttrs(field)` (id, `required`, ARIA attributes), `mobileProps`,
`cnicProps` and `handleSubmit`. The pure helpers (`validatePakForm`,
`withField`, `citySuggestions`, `PAK_PROVINCES`, `formText`) are exported too.

## Differences from pakdatakit-react

- Composables are named `useCnic`, `usePhone` and `useIban`, and return refs (`cnic.state.value`).
- There are no ready-made input components: bind `inputProps` on your own `<input>`, or use `v-pak-input`. The checkout and KYC forms are components.
- There is no Raast QR component yet.

## License

MIT
