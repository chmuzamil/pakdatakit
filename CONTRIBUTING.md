# Contributing to PakDataKit

Thank you for your interest in contributing to PakDataKit!

## Development Setup

1. Fork and clone the repository
2. Install dependencies:

```bash
npm install
```

3. Run the test suite:

```bash
npm test
```

4. Build the library:

```bash
npm run build
```

5. Lint and type-check:

```bash
npm run lint
npm run typecheck
```

## Pull Request Guidelines

- Keep changes focused and minimal
- Add or update tests for any behavior change
- Ensure `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` all pass
- Add JSDoc comments for new public API functions
- Do not add runtime dependencies unless discussed in an issue first

## Adding Utilities

New public utilities must be:

1. Implemented in `src/<module>.ts`
2. Exported from `src/index.ts` only (no deep imports for consumers)
3. Covered by tests in `tests/<module>.test.ts`
4. Documented in `README.md`

## Data File Contributions

### `data/networks.json`

Schema:

```json
{ "prefix": "0300", "network": "Jazz" }
```

- `prefix` must be a 4-digit string starting with `0`
- `network` must be one of: `Jazz`, `Zong`, `Telenor`, `Ufone`

### `data/districts.json`

Schema:

```json
{ "district": "Lahore", "province": "Punjab" }
```

- Use official district names (160 districts across all provinces/territories)
- Regenerate with `npm run generate:data`

### `data/banks.json`

Schema:

```json
{ "code": "SCBL", "name": "Standard Chartered Bank" }
```

- `code` must be a 4-letter bank identifier from the Pakistani IBAN
- `name` is the full bank name

### `data/postal-codes.json`

Schema:

```json
{ "city": "Multan", "postalCode": "60000" }
```

- Use official city names and postal codes

### `data/cities.json`

Schema:

```json
{ "city": "Multan", "province": "Punjab" }
```

- Use official city names
- Province must match Pakistan's administrative divisions

## Courier status lists

`mapCourierStatus` is experimental. It maps only statuses a courier has documented: PostEx's merchant API guide and one Leopards status. TCS, M&P, Trax and BlueEx return `null` because no public list exists. To add or correct a courier's statuses, open an issue or a pull request that includes:

- **Evidence.** One of these:
  - A link to the courier's official documentation (API guide, developer portal, help or FAQ page), with the document version and the date you retrieved it.
  - If the list is only shown inside the courier's merchant portal or API sandbox, a screenshot or export of the status list itself (the names, IDs or codes and their descriptions), with the portal page and the date.
- **The exact strings.** Copy each status as the courier returns it (name, numeric ID or code), and say which `CourierStatus` value you think it maps to and why.
- **No customer data.** Never include tracking numbers, consignee names, phone numbers, addresses, order IDs, CNICs, API keys or tokens. Crop or redact screenshots before you attach them; a status list alone is enough.

Maintainers check the evidence before anything is mapped. Statuses that only appear in third-party plugins, blog posts or observed API traffic are not accepted. Each change records its source and date in [DATA.md](DATA.md#couriers) and the courier's entry in [scripts/data-refresh.md](scripts/data-refresh.md), and the shared test vectors and every port's courier table are updated together. Adding a status never changes an existing mapping without a CHANGELOG note, because users may store these values.

## Code Style

- TypeScript strict mode — no `any`
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)

## Questions

Open an issue for bugs, feature requests, or questions before starting large changes.
