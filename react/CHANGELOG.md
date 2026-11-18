# Changelog

## 0.2.0 (unreleased)

Requires pakdatakit 2.4.0 (for `pakdatakit/quality`).

### Added

- `PakCheckoutForm` and `PakKycForm`: unstyled checkout and KYC forms with
  full name, mobile number, province, district, optional tehsil (`tehsil`
  prop), city with suggestions from the chosen province, address, nearby
  place and postal code; `PakKycForm` adds a required CNIC. The mobile and
  CNIC fields reuse `PhoneInput` and `CNICInput`.
- Accessible markup: real `<label for>`, native `<select>`s, `required` and
  `aria-required`, `aria-invalid` and `aria-describedby` on errors, an error
  summary with `role="alert"` whose links move focus to the field, and focus
  on the first invalid field after a blocked submit.
- `locale="ur"`: Urdu labels, placeholders, errors and hints, with
  `dir="rtl"` and `lang="ur"` on the form. Any text can be replaced with the
  `labels` prop.
- Controlled (`values` / `onChange`) or uncontrolled (`defaultValues`) use,
  `onSubmit(values)` with trimmed values, `onInvalid(errors)`, `className`
  and per-element `classNames`.
- Optional delivery hints (`hints` prop, `usePakHints`): address
  completeness from `scoreAddress`, warning signs from `phoneRiskSignals`,
  and a postal code that belongs to another city. They never block submit,
  are announced with `aria-live="polite"`, and load `pakdatakit/quality`
  and the post office directory with a dynamic `import()` only when turned
  on, so the base form bundle stays small.
- For react-hook-form and other form libraries: `pakRules` and
  `createPakRules({ locale, labels })` (`register('cnic', pakRules.cnic)`),
  `validatePakField`, `validatePakForm`, `useLocationOptions`,
  `applyLocationChange` and `suggestCities`.

### Changed

- `CNICInput`, `PhoneInput` and `IBANInput` are marked as pure, so bundlers
  drop the ones you do not use.

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
