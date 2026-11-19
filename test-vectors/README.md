# Shared test vectors

Every port of pakdatakit (TypeScript, Python, Dart, .NET and PHP) must give
the same answer for the same input. These files pin that down: each one lists
calls to the TypeScript library and the results it returned, and every other
port replays them and fails on any difference.

## Count

<!-- vectors:count -->

33,289 vectors in 27 files:

- `address.json`: 870
- `bills.json`: 354
- `cnic.json`: 96
- `courier.json`: 1,670
- `data-version.json`: 1
- `docs-examples.json`: 89
- `fbr-invoice.json`: 158
- `format.json`: 1,040
- `geo.json`: 4,583
- `hijri.json`: 2,222
- `holidays.json`: 214
- `iban.json`: 514
- `incometax.json`: 1,181
- `input.json`: 1,302
- `networks.json`: 242
- `numbers.json`: 1,380
- `passport.json`: 35
- `phone.json`: 726
- `postal.json`: 5,145
- `quality.json`: 1,130
- `raast.json`: 1,369
- `salestax.json`: 1,986
- `tax.json`: 90
- `text.json`: 6,279
- `vehicle.json`: 90
- `whatsapp.json`: 45
- `words.json`: 478

<!-- /vectors:count -->

This section is rewritten by the generator, so it is always current.

## Format

Each `<module>.json` is a JSON array with one vector per line (so a change in
behaviour shows up as a one-line diff):

```text
{"fn":"validateCNIC","args":["35202-1234567-1"],"kwargs":{},"expected":true,"throws":false}
```

| Field      | Meaning                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `fn`       | The TypeScript export name. Ports map it to their own naming (`validate_cnic` in Python, `Cnic.Validate` in .NET, and so on).                  |
| `args`     | Positional arguments.                                                                                                                          |
| `kwargs`   | The keys of the options object, in camelCase. For `createRaastP2PQr`, `createMerchantQr` and `formatAddress` this object is the only argument. |
| `expected` | The return value, as JSON. Absent properties (`undefined`) are left out.                                                                       |
| `throws`   | `true` if the call throws. `expected` is then `null`.                                                                                          |
| `error`    | When `throws` is `true`: the error's name (currently always `RangeError`). Ports raise their own idiomatic error type.                         |
| `constant` | `true` for a value rather than a function (only `dataVersion`).                                                                                |

Two values have no plain JSON form and are wrapped:

- **Dates** are `{ "$date": "YYYY-MM-DD" }` or
  `{ "$date": "YYYY-MM-DDTHH:mm:ss" }`, a calendar date and time with no
  time zone.
- **Non-finite numbers** are `{ "$num": "NaN" }`, `{ "$num": "Infinity" }`
  or `{ "$num": "-Infinity" }`.

Nothing depends on when the vectors are generated or replayed: functions that
read the current date are given a fixed `now`, and the generator runs in UTC.

## How they are generated

`scripts/generate-test-vectors.mjs` imports the built library
(`dist/index.js`), calls each function over a broad set of inputs (valid,
invalid, edge cases and every entry of the datasets) and writes the results.
It also copies `data/*.json` into the Python package byte for byte.

```bash
npm run build
node scripts/generate-test-vectors.mjs
```

The TypeScript library is the reference, so its own tests (`npm test`) do not
replay these files. CI regenerates them and fails if they differ from the
committed copy, so a behaviour change must be committed together with its
vectors.

## Who consumes them

| Port                         | Test file                                      | How                                                                                                     |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Python (`pakdatakit`)        | `python/tests/test_vectors.py`                 | pytest, one test per vector; `fn` and option keys are converted to snake_case.                          |
| Dart (`pakdatakit`)          | `dart/test/vectors_test.dart`                  | `package:test`, one test per vector in a group per module, through `dart/test/src/vector_harness.dart`. |
| .NET (`PakDataKit`)          | `dotnet/tests/PakDataKit.Tests/VectorTests.cs` | xUnit, one test per module; finds `test-vectors/` by walking up from the test binary.                   |
| PHP (`chmuzamil/pakdatakit`) | `php/tests/VectorTest.php`                     | PHPUnit, one test per module. CI runs it without the `intl` extension.                                  |

`pakdatakit-faker` does not replay them; it checks its own output with the
TypeScript validators. The React, Vue, Angular and Flutter packages call a
port (TypeScript or Dart) and test their own components.

## Run every port

```bash
npm run test:ports
```

This builds the library, regenerates the vectors and every port's generated
data, then runs the TypeScript, Python, Dart, .NET and PHP suites. A port whose
toolchain is not installed is skipped with a warning; add `-- --strict` to
fail instead. It needs:

- Node 20 or newer (always);
- Python: [uv](https://docs.astral.sh/uv/), or `python` with pytest installed;
- Dart: `dart` (3.4 or newer);
- .NET: `dotnet` (SDK 8 or newer);
- PHP: `php` 8.2 or newer and `composer`.

To run one port, pass its name: `npm run test:ports -- python dart`.

## Licence

These files are part of pakdatakit and are released under the
[MIT licence](../LICENSE), like the rest of the repository. You may use them
to test another implementation; keep the copyright notice (see
[NOTICE](../NOTICE)).
