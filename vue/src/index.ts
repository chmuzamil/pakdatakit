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
