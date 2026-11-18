# pakdatakit-react

React inputs and hooks for Pakistani **CNIC**, **mobile numbers** and **IBANs** that format as you type, ready-made **checkout and KYC forms** (English and Urdu), plus a **Raast payment QR** component. Built on [pakdatakit](https://github.com/chmuzamil/pakdatakit).

- Formats as the user types (`35202-1234567-1`, `0300-1234567`, `PK36 SCBL 0000 0011 2345 6702`) without making the caret jump
- Reports whether the value is `empty`, `incomplete`, `valid` or `invalid`, plus details once valid (province and gender, mobile network, bank name)
- Controlled or uncontrolled, forwards refs, accepts every native `<input>` prop
- Unstyled: bring your own `className`
- Accessible: `aria-invalid` when the value cannot become valid, sensible `inputMode` and `autoComplete`, your `aria-describedby` is passed through
- Hooks for your own input components (MUI, Chakra, shadcn/ui, ...)
- `<RaastQR>` renders a scannable SVG with no `dangerouslySetInnerHTML`
- ESM and CommonJS, TypeScript types, tree-shakeable, about 3 KB gzipped (plus `pakdatakit` and `qrcode`)

## Install

```bash
npm install pakdatakit-react
```

Requires React 18 or later. `pakdatakit` and `qrcode` are installed with it.

## Inputs

```tsx
import { CNICInput, IBANInput, PhoneInput } from 'pakdatakit-react';

<CNICInput
  name="cnic"
  className="input"
  onValueChange={(value, state, info) => {
    // value: '35202-1234567-1'
    // state: 'empty' | 'incomplete' | 'valid' | 'invalid'
    // info:  { digits, formatted, province: 'Punjab', gender: 'male' } once valid, otherwise null
  }}
/>

<PhoneInput
  onValueChange={(value, state, info) => {
    // value: '0300-1234567' (or '+92 300 1234567' if the user starts with +92)
    // info:  { valid: true, formatted: '+923001234567', network: 'Jazz' } once valid
  }}
/>

<IBANInput
  onValueChange={(value, state, bank) => {
    // value: 'PK36 SCBL 0000 0011 2345 6702'
    // bank:  'Standard Chartered Bank (Pakistan) Limited' once valid
  }}
/>
```

### Controlled

```tsx
function CNICField() {
  const [cnic, setCnic] = useState('');
  const [state, setState] = useState<InputState>('empty');

  return (
    <>
      <label htmlFor="cnic">CNIC</label>
      <CNICInput
        id="cnic"
        value={cnic}
        onValueChange={(value, nextState) => {
          setCnic(value);
          setState(nextState);
        }}
        aria-describedby="cnic-error"
      />
      {state === 'invalid' && <p id="cnic-error">This is not a valid CNIC.</p>}
    </>
  );
}
```

Without `value` the input is uncontrolled; use `defaultValue` for an initial value. Any value you pass is formatted before it is shown.

Every native prop (`name`, `id`, `placeholder`, `required`, `disabled`, `onBlur`, `onChange`, `className`, `style`, `aria-*`, ...) is passed to the `<input>`, and `ref` points at it. Defaults you can override:

| Component    | `type` | `inputMode` | `autoComplete` |
| ------------ | ------ | ----------- | -------------- |
| `CNICInput`  | `text` | `numeric`   | `off`          |
| `PhoneInput` | `tel`  | `tel`       | `tel`          |
| `IBANInput`  | `text` | `text`      | `off`          |

`aria-invalid="true"` is set while the state is `invalid` (what has been typed cannot become valid). An `incomplete` value is not marked invalid, so you can decide when to show "required" or "too short" errors, for example on blur or submit.

### Caret behaviour

The caret stays after the same character it was after before formatting, so typing or deleting in the middle of a value works as expected. Backspace right after a separator deletes the digit before it rather than the separator (which formatting would put back), and pasting `35202 1234567 1` gives `35202-1234567-1`.

## Hooks

Use the hooks to give the same behaviour to your own input components:

```tsx
import { useCNICInput } from 'pakdatakit-react';
import { TextField } from '@mui/material';

function CNICField() {
  const cnic = useCNICInput({ onValueChange: (value, state, info) => {} });

  return (
    <TextField
      label="CNIC"
      inputProps={cnic.inputProps}
      error={cnic.state === 'invalid'}
      helperText={cnic.info ? `Registered in ${cnic.info.province}` : ' '}
    />
  );
}
```

`useCNICInput`, `usePhoneInput` and `useIBANInput` take `{ value?, defaultValue?, onValueChange? }` and return:

| Field        | Description                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`      | Formatted value                                                                                                                               |
| `state`      | `'empty' \| 'incomplete' \| 'valid' \| 'invalid'`                                                                                             |
| `info`       | `CNICInfo`, `PhoneAnalysis` or bank name once valid, otherwise `null`                                                                         |
| `setValue`   | Formats and sets the value, e.g. to fill it from saved data                                                                                   |
| `inputProps` | `{ value, onChange, type, inputMode, autoComplete, autoCorrect, autoCapitalize, spellCheck, 'aria-invalid' }` to spread on a native `<input>` |

The `onChange` in `inputProps` must receive the change event of a real `<input>` element, which is what component libraries pass on.

## Checkout and KYC forms

Ready-made, unstyled forms for a delivery address (`PakCheckoutForm`) and for know-your-customer checks (`PakKycForm`, which adds a required CNIC). Requires pakdatakit 2.4.0 or later.

```tsx
import { PakCheckoutForm, PakKycForm } from 'pakdatakit-react';

<PakCheckoutForm onSubmit={(values) => saveOrder(values)} />

<PakKycForm tehsil onSubmit={(values) => verify(values.cnic)} />
```

`onSubmit` is only called when the form is valid, with trimmed values:

```ts
{
  fullName: 'Ayesha Khan',
  mobile: '0321-4567890',
  province: 'Punjab',
  district: 'Lahore',
  tehsil: '',            // filled only with the `tehsil` prop
  city: 'Lahore',
  address: 'House 12, Street 4, Gulberg III',
  landmark: 'Liberty Market',
  postalCode: '54660',
  cnic: '35202-1234567-1', // PakKycForm only
}
```

- **Fields**: full name, mobile number (`PhoneInput`), CNIC (`CNICInput`, KYC only), province, district, tehsil (optional, `tehsil` prop), city, address, nearby place (optional) and postal code (optional, 5 digits).
- **Cascading location**: districts come from `getDistrictsByProvince` and tehsils from `getTehsils`. pakdatakit has no official city-to-district mapping, so the city is a text field with `<datalist>` suggestions from `searchCities`, limited to the chosen province. Changing the province clears district, tehsil and city; changing the district clears the tehsil.
- **Validation**: mobile with `validatePhone` (mobile numbers only), CNIC with `validateCNIC`, name, address and city required (whitespace does not count). Errors show after a field loses focus or on submit.
- **Accessible**: every control has a `<label for>`, the selects are native `<select>`s, required fields have `required` and `aria-required`, errors are linked with `aria-describedby` and `aria-invalid`, and a failed submit shows an error summary (`role="alert"`) and focuses the first invalid field. It all works with the keyboard.
- **Unstyled**: no CSS. Every element has a `pak-form__*` class (`pak-form`, `pak-form__field`, `pak-form__label`, `pak-form__input`, `pak-form__select`, `pak-form__error`, `pak-form__error-summary`, `pak-form__hints`, `pak-form__submit`, ...), field wrappers have `data-field` and `data-invalid`, and you can add your own with `className` and `classNames={{ field: 'mb-4', input: 'input', ... }}`.
- **Controlled or not**: pass `values` and `onChange`, or `defaultValues`. `onInvalid(errors)` is called when a submit is blocked. Anything you pass as `children` is rendered before the submit button.

### Urdu

```tsx
<PakKycForm
  locale="ur"
  labels={{ submit: 'تصدیق کریں' }}
  onSubmit={(values) => verify(values)}
/>
```

`locale="ur"` switches every label, placeholder, error and hint to Urdu (نام، موبائل نمبر، صوبہ، ضلع، شہر، پتہ ...) and sets `dir="rtl"` and `lang="ur"` on the form. The mobile, CNIC and postal code inputs stay left to right. Values are kept as typed. Override any text with `labels`; the built-in texts are in `PAK_FORM_LABELS`.

### Delivery hints

```tsx
<PakCheckoutForm hints onSubmit={saveOrder} />
```

With `hints`, the form shows non-blocking suggestions in an `aria-live="polite"` region: how complete the address is (`scoreAddress` of the address, nearby place, city and postal code) and which parts are missing, warning signs in the mobile number (`phoneRiskSignals`: landline, repeated or sequential digits, sample numbers), and a postal code that belongs to a different city. Hints never block submit.

Hints need the post office directory, about 32 kB gzipped. It is loaded with a dynamic `import()` of `pakdatakit/quality` and `pakdatakit/postal` only when `hints` is turned on, so bundlers put it in a separate chunk and the form without hints does not include it. Use `usePakHints({ enabled, address, landmark, city, postalCode, mobile })` to show the same hints in your own markup.

### With react-hook-form

`pakRules` has a `{ required, validate }` rule for each field, in the shape `register` accepts (`createPakRules({ locale: 'ur', labels })` for Urdu or your own messages). `useLocationOptions` gives the province, district, tehsil and city choices, and `applyLocationChange` the clearing rules.

```tsx
import { useForm } from 'react-hook-form';
import { PhoneInput, pakRules, useLocationOptions } from 'pakdatakit-react';

function Checkout() {
  const { register, watch, setValue, handleSubmit, formState } = useForm({
    defaultValues: {
      fullName: '',
      mobile: '',
      province: '',
      district: '',
      city: '',
    },
  });
  const { provinces, districts, cities } = useLocationOptions({
    province: watch('province'),
    district: watch('district'),
    cityQuery: watch('city'),
  });
  const province = register('province', pakRules.province);

  return (
    <form onSubmit={handleSubmit(save)} noValidate>
      <label htmlFor="name">Full name</label>
      <input id="name" {...register('fullName', pakRules.fullName)} />
      {formState.errors.fullName?.message}

      <label htmlFor="mobile">Mobile number</label>
      <PhoneInput
        id="mobile"
        value={watch('mobile')}
        onValueChange={(value) =>
          setValue('mobile', value, { shouldValidate: true })
        }
      />
      <input type="hidden" {...register('mobile', pakRules.mobile)} />

      <label htmlFor="province">Province</label>
      <select
        id="province"
        {...province}
        onChange={(event) => {
          void province.onChange(event);
          setValue('district', '');
          setValue('city', '');
        }}
      >
        <option value="">Choose a province</option>
        {provinces.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>

      <label htmlFor="district">District</label>
      <select id="district" {...register('district', pakRules.district)}>
        <option value="">Choose a district</option>
        {districts.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>

      <label htmlFor="city">City</label>
      <input id="city" list="cities" {...register('city', pakRules.city)} />
      <datalist id="cities">
        {cities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <button type="submit">Submit</button>
    </form>
  );
}
```

`validatePakField(field, value)` and `validatePakForm(values, 'checkout' | 'kyc')` run the same checks without a form library.

## Raast QR

```tsx
import { RaastQR } from 'pakdatakit-react';

// Static QR: the payer types the amount
<RaastQR iban="PK36SCBL0000001123456702" />

// Fixed amount: needs an expiry
<RaastQR
  iban="PK36 SCBL 0000 0011 2345 6702"
  amount={1500}
  expiresIn="1d"
  particulars="Invoice 42"
  size={240}
  title="Pay Ali Traders PKR 1,500 with Raast"
  onPayload={(payload) => console.log(payload)}
  fallback={<p>Enter a valid IBAN to show the QR code.</p>}
/>
```

The payload comes from `createRaastP2PQr` in pakdatakit, in the format banking apps, Easypaisa and JazzCash scan.

| Prop                                | Description                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `iban`                              | Payee's Pakistani IBAN (spaces and dashes allowed)                                              |
| `amount`                            | Amount in PKR. Needs `expiresIn` or `expiresAt`                                                 |
| `expiresIn`                         | Milliseconds, or `'30m'`, `'12h'`, `'7d'`                                                       |
| `expiresAt`                         | `Date` when a QR with an amount stops working                                                   |
| `particulars`, `bankName`, `scheme` | Passed to `createRaastP2PQr`                                                                    |
| `size`                              | Width and height (default `256`)                                                                |
| `level`                             | Error correction: `'L'`, `'M'` (default), `'Q'`, `'H'`                                          |
| `margin`                            | Quiet zone in modules (default `4`)                                                             |
| `fgColor`, `bgColor`                | Colours (default `#000` on `#fff`; `bgColor="transparent"` draws no background)                 |
| `title`                             | Accessible name (default `'Raast payment QR code'`); the SVG has `role="img"`                   |
| `fallback`                          | Rendered when no QR can be made (invalid IBAN, amount without expiry, ...); defaults to nothing |
| `onPayload(payload)`                | Called with the payload whenever it changes                                                     |
| `onPayloadError(error)`             | Called with the `RangeError` when no QR can be made                                             |

Other SVG props (`className`, `style`, `aria-describedby`, ...) and `ref` go to the `<svg>`. With `expiresIn` the expiry is worked out when the QR is first rendered and stays the same until one of the payment props changes.

## Server components

The package is marked `'use client'`, so you can import it from a Next.js server component; the inputs and QR render on the client. They also render on the server with `renderToString`.

## License

MIT
