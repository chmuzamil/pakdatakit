# Security policy

## Supported versions

Security fixes are released for the latest minor version of `pakdatakit` on
npm, and of `pakdatakit` on PyPI and `pakdatakit-react` once they are published.

## Reporting a vulnerability

Please report security problems privately through
[GitHub security advisories](https://github.com/chmuzamil/pakdatakit/security/advisories/new),
not in a public issue. Include a minimal example using made-up data, never a
real CNIC, IBAN or phone number.

You can expect a reply within a week. Once a fix is released, the advisory is
published with credit to you unless you prefer otherwise.

## Scope

PakDataKit validates and formats data; it does not store or send it anywhere.
Issues we especially want to hear about:

- Inputs that make a function hang or use excessive memory (for example,
  regular-expression backtracking).
- Validation that accepts data it should reject in a way that could be abused,
  such as a tampered Raast QR code that `validateRaastQr` reports as valid.
- Problems in the published package or the release pipeline (npm provenance,
  GitHub Actions).

Releases are published only by the GitHub Actions release workflow, with npm
provenance, so you can verify that a version was built from this repository.
