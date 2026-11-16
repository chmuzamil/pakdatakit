# pakdatakit-vue

Vue 3 composables and a directive for Pakistani **CNIC**, **mobile numbers** and **IBANs** that format as you type. Built on [pakdatakit](https://github.com/chmuzamil/pakdatakit), with the same behaviour as [pakdatakit-react](https://github.com/chmuzamil/pakdatakit/tree/main/react).

- Formats as the user types (`35202-1234567-1`, `0300-1234567`, `PK36 SCBL 0000 0011 2345 6702`) without making the caret jump
- Reports whether the value is `empty`, `incomplete`, `valid` or `invalid`, plus details once valid (province and gender, mobile network, bank name)
- Composables for your own input components, or a one-line directive for a plain `<input>`
- Works with `v-model`
- Unstyled and accessible: `aria-invalid` when the value cannot become valid, sensible `inputmode` and `autocomplete`
- ESM and CommonJS, TypeScript types, tree-shakeable

## Install

```bash
npm install pakdatakit-vue pakdatakit
```

Requires Vue 3.3 or later and `pakdatakit` 2.3 or later (both are peer dependencies).

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

## Differences from pakdatakit-react

- Composables are named `useCnic`, `usePhone` and `useIban`, and return refs (`cnic.state.value`).
- There are no ready-made input components: bind `inputProps` on your own `<input>`, or use `v-pak-input`.
- There is no Raast QR component yet.

## License

MIT
