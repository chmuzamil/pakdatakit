---
title: Install for Angular
description: Install pakdatakit-angular for CNIC, phone and IBAN input directives, pipes, form validators and ready-made checkout and KYC forms.
---

```bash
npm install pakdatakit-angular pakdatakit
```

```html
<!-- imports: PakCnicInputDirective; validate with PakValidators.cnic -->
<input pakCnicInput [formControl]="cnic" />
```

It includes directives that format as you type, the `pakCnic`, `pakPhone`, `pakIban` and `pakPkr` pipes, and `PakValidators`. Angular 17 to 22.

Package: [npm](https://www.npmjs.com/package/pakdatakit-angular)
