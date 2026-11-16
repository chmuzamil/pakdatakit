# Changelog

## 0.1.0

First release.

- `useCnic`, `usePhone` and `useIban` composables: format as you type, keep
  the caret in place when separators are added or removed, and report
  `empty` / `incomplete` / `valid` / `invalid` with the decoded details. Same
  behaviour as the `pakdatakit-react` hooks.
- `v-pak-input` directive for a plain `<input>`, with or without `v-model`,
  and a `PakDataKit` plugin that registers it globally.
- Requires Vue 3.3 or later and `pakdatakit` 2.3 or later.
