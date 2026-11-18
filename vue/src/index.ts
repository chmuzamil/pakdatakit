import type { App } from 'vue';
import { vPakInput } from './directive.js';

export {
  useCnic,
  useIban,
  usePhone,
  type UseCnicOptions,
  type UseCnicResult,
  type UseIbanOptions,
  type UseIbanResult,
  type UsePhoneOptions,
  type UsePhoneResult,
} from './composables.js';
export type {
  MaskedInputOptions,
  MaskedInputProps,
  MaskedInputResult,
} from './useMaskedInput.js';
export { vPakInput, type PakInputKind } from './directive.js';
export { PakCheckoutForm, PakKycForm } from './forms/PakForm.js';
export {
  usePakForm,
  useCheckoutForm,
  useKycForm,
  type PakFieldAttrs,
  type UsePakFormOptions,
  type UsePakFormResult,
} from './forms/usePakForm.js';
export {
  PAK_PROVINCES,
  citySuggestions,
  districtOptions,
  emptyPakFormValues,
  loadPakHintEngine,
  pakFormHints,
  tehsilOptions,
  validatePakField,
  validatePakForm,
  withField,
  type PakFormErrors,
  type PakFormField,
  type PakFormHints,
  type PakFormKind,
  type PakFormValues,
  type PakHintEngine,
  type PakProvince,
} from './forms/core.js';
export {
  PAK_FORM_TEXT,
  formText,
  type PakFormLocale,
  type PakFormText,
} from './forms/text.js';
export type { InputState } from 'pakdatakit/input';
export type { CNICInfo } from 'pakdatakit/cnic';
export type { PhoneAnalysis } from 'pakdatakit/phone';

/**
 * Vue plugin that registers the `v-pak-input` directive globally:
 * `app.use(PakDataKit)`.
 */
export const PakDataKit = {
  install(app: App): void {
    app.directive('pak-input', vPakInput);
  },
};
