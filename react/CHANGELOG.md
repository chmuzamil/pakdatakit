# Changelog

## 0.1.1

Maintenance release with no API changes.

- Published from GitHub Actions with npm provenance, so each release can be
  traced to the commit and workflow that built it.
- Development dependencies updated.

## 0.1.0

First release.

- `CNICInput`, `PhoneInput` and `IBANInput`: format as you type, keep the
  caret in place when separators are added or removed, and report
  `empty` / `incomplete` / `valid` / `invalid` with the decoded details.
- `useCNICInput`, `usePhoneInput` and `useIBANInput` hooks for your own input
  components.
- `RaastQR`: renders a Raast payment QR code as an SVG.
- Works with Next.js server components (`'use client'`), ESM and CommonJS.
