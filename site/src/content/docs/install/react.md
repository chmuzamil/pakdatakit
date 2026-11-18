---
title: Install for React
description: Install pakdatakit-react for CNIC, phone and IBAN inputs that format as you type, and a Raast QR component.
---

```bash
npm install pakdatakit-react pakdatakit
```

```tsx
import { CNICInput } from 'pakdatakit-react';

<CNICInput
  onValueChange={(value, state, info) => console.log(state, info?.province)}
/>;
```

It includes `CNICInput`, `PhoneInput` and `IBANInput` (or the `useCNICInput` hooks for your own components), ready-made checkout and KYC forms in English and Urdu, and `RaastQR`.

Package: [npm](https://www.npmjs.com/package/pakdatakit-react)
