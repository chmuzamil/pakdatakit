# Security policy

## Supported versions

Security fixes are released for the latest minor version of each package.
Older versions do not get fixes; upgrade within the same major version (no
breaking changes). A package not yet on its registry is listed with the
version in this repository and is supported from its first release.

| Package                                                                   | Registry  | Language          | Supported | On the registry |
| ------------------------------------------------------------------------- | --------- | ----------------- | --------- | --------------- |
| `pakdatakit`                                                              | npm       | TypeScript, JS    | 2.5.x     | yes             |
| `pakdatakit`                                                              | PyPI      | Python 3.9+       | 2.5.x     | yes             |
| `pakdatakit`                                                              | pub.dev   | Dart              | 2.5.x     | yes             |
| `PakDataKit`, `PakDataKit.DataAnnotations`, `PakDataKit.FluentValidation` | NuGet     | .NET 8+           | 2.5.x     | yes             |
| `chmuzamil/pakdatakit`                                                    | Packagist | PHP 8.2+, Laravel | 2.5.x     | yes             |
| `pakdatakit-react`                                                        | npm       | React             | 0.2.x     | yes             |
| `pakdatakit-faker`                                                        | npm       | TypeScript, JS    | 0.2.x     | yes             |
| `pakdatakit-vue`                                                          | npm       | Vue 3             | 0.1.x     | yes             |
| `pakdatakit-angular`                                                      | npm       | Angular 17 to 22  | 0.1.x     | yes             |
| `pakdatakit_flutter`                                                      | pub.dev   | Flutter           | 0.2.x     | yes             |
| `pakdatakit-pay`                                                          | npm       | TypeScript, JS    | 0.1.x     | yes             |

All ports of `pakdatakit` share one version number and give the same results
(see [test-vectors/](test-vectors/README.md)), so a security fix is released
in every port at once, with the same version.

## Reporting a vulnerability

Please report security problems privately through
[GitHub security advisories](https://github.com/chmuzamil/pakdatakit/security/advisories/new),
not in a public issue. Say which package and version you used. Include a
minimal example using made-up data, never a real CNIC, IBAN, passport or
phone number.

You can expect a reply within a week. Once a fix is released, the advisory is
published with credit to you unless you prefer otherwise.

## Scope

`pakdatakit-pay` computes and checks payment gateway hashes. A flaw that lets
a forged or replayed gateway response pass `verifyJazzCashResponse` is in
scope. Never include a real Integrity Salt, merchant ID or password in a
report.

PakDataKit validates and formats data; it does not store or send it anywhere.
This applies to every port. Issues we especially want to hear about:

- Inputs that make a function hang or use excessive memory (for example,
  regular-expression backtracking), in any port.
- Validation that accepts data it should reject in a way that could be abused,
  such as a tampered Raast QR code that `validateRaastQr` reports as valid.
- A port that gives a different, less safe answer than the TypeScript library
  for the same input.
- Form components (React, Vue, Angular, Flutter) that let input bypass the
  validation they claim to apply.
- Problems in a published package or the release pipeline (GitHub Actions,
  npm provenance, PyPI and pub.dev trusted publishing, the PHP mirror).

## Verifying a release

Releases are published only by the GitHub Actions workflows in this
repository, never from someone's computer (except the first version of a new
package; see [RELEASING.md](RELEASING.md)):

- **npm**: every version has a provenance statement linking it to the commit
  and workflow run (`npm audit signatures`, or the "Provenance" section on
  npmjs.com).
- **PyPI**: published by trusted publishing from `release-python.yml`; the
  release page shows the workflow and its attestations.
- **pub.dev**: published from `release-dart.yml` and `release-flutter.yml`;
  the package page shows it was published by GitHub Actions.
- **Packagist**: reads the read-only mirror `chmuzamil/pakdatakit-php`, which
  only `split-php.yml` writes to.
