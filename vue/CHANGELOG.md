# Changelog

## 0.1.1

Published by the release workflow with npm provenance (0.1.0 was published
by hand, without provenance). No API changes.

### Changed

- Requires `pakdatakit` `^2.5.0`. 0.1.0 declared `^2.4.0`, a version that was never published (2.5.0 was the next release); any 2.5 version already satisfied it.
- Development dependencies updated (jsdom 31, tsup 9, Vitest 5.1).

## 0.1.0

First release.

- `useCnic`, `usePhone` and `useIban` composables: format as you type, keep
  the caret in place when separators are added or removed, and report
  `empty` / `incomplete` / `valid` / `invalid` with the decoded details. Same
  behaviour as the `pakdatakit-react` hooks.
- `v-pak-input` directive for a plain `<input>`, with or without `v-model`,
  and a `PakDataKit` plugin that registers it globally.
- `PakCheckoutForm` and `PakKycForm`: unstyled, accessible checkout and KYC
  forms with `v-model` and `@submit`, validation from pakdatakit, masked
  mobile and CNIC inputs, a province → district → (tehsil) cascade with city
  suggestions, English and Urdu text (`locale`, `labels`), and optional
  address and phone hints that load `pakdatakit/quality` and the post office
  directory on demand.
- `usePakForm`, `useCheckoutForm` and `useKycForm` composables, and the
  helpers behind the forms (`validatePakForm`, `withField`,
  `citySuggestions`, `PAK_PROVINCES`, `formText`, `PAK_FORM_TEXT`).
- Requires Vue 3.3 or later and `pakdatakit` 2.4.0 or later (the hints use
  the quality functions added in 2.4.0).
