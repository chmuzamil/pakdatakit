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

## Code Style

- TypeScript strict mode — no `any`
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)

## Questions

Open an issue for bugs, feature requests, or questions before starting large changes.
