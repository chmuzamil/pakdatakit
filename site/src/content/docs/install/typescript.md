---
title: Install for TypeScript and JavaScript
description: Install pakdatakit from npm for Node.js, browsers, Bun and Deno.
---

```bash
npm install pakdatakit
```

Works in Node.js 20+, browsers, Bun and Deno, with ESM (`import`) and CommonJS (`require`). TypeScript types are included, and there are no runtime dependencies.

```ts
import { validateCNIC } from 'pakdatakit';
// or one module, to keep bundles small:
import { calculateSalaryTax } from 'pakdatakit/incometax';
```

Every module is also a subpath: `pakdatakit/cnic`, `pakdatakit/phone`, `pakdatakit/iban`, `pakdatakit/salestax`, `pakdatakit/incometax`, `pakdatakit/postal` and so on. Form-library adapters live at `pakdatakit/zod`, `pakdatakit/valibot`, `pakdatakit/yup`, `pakdatakit/joi`, `pakdatakit/superstruct` and `pakdatakit/class-validator` (NestJS).

Package: [npm](https://www.npmjs.com/package/pakdatakit) · Next: [CNIC](/docs/cnic/)
