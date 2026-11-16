import { getCNICInfo, type CNICInfo } from 'pakdatakit/cnic';
import { getBankFromIBAN } from 'pakdatakit/iban';
import {
  checkCNICInput,
  checkIBANInput,
  checkPhoneInput,
  formatCNICInput,
  formatIBANInput,
  formatPhoneInput,
} from 'pakdatakit/input';
import { analyzePhone, type PhoneAnalysis } from 'pakdatakit/phone';
import { isAlphanumeric, isDigit } from './caret.js';
import {
  useMaskedInput,
  type MaskConfig,
  type MaskedInputOptions,
  type MaskedInputResult,
} from './useMaskedInput.js';

/** @internal */
export const CNIC: MaskConfig<CNICInfo> = {
  format: formatCNICInput,
  check: checkCNICInput,
  info: getCNICInfo,
  isSignificant: isDigit,
  type: 'text',
  inputmode: 'numeric',
  autocomplete: 'off',
  autocapitalize: 'off',
};

/** @internal */
export const PHONE: MaskConfig<PhoneAnalysis> = {
  format: formatPhoneInput,
  check: checkPhoneInput,
  info: (value) => {
    const analysis = analyzePhone(value);
    return analysis.valid ? analysis : null;
  },
  isSignificant: isDigit,
  type: 'tel',
  inputmode: 'tel',
  autocomplete: 'tel',
  autocapitalize: 'off',
};

/** @internal */
export const IBAN: MaskConfig<string> = {
  format: formatIBANInput,
  check: checkIBANInput,
  info: getBankFromIBAN,
  isSignificant: isAlphanumeric,
  type: 'text',
  inputmode: 'text',
  autocomplete: 'off',
  autocapitalize: 'characters',
};

/** Options for {@link useCnic}. */
export type UseCnicOptions = MaskedInputOptions<CNICInfo>;
/** Result of {@link useCnic}. `info` is the decoded province and gender. */
export type UseCnicResult = MaskedInputResult<CNICInfo>;
/** Options for {@link usePhone}. */
export type UsePhoneOptions = MaskedInputOptions<PhoneAnalysis>;
/** Result of {@link usePhone}. `info` is the `analyzePhone` result. */
export type UsePhoneResult = MaskedInputResult<PhoneAnalysis>;
/** Options for {@link useIban}. */
export type UseIbanOptions = MaskedInputOptions<string>;
/** Result of {@link useIban}. `info` is the bank name. */
export type UseIbanResult = MaskedInputResult<string>;

/**
 * CNIC field logic for your own input: formats as `35202-1234567-1` while
 * typing and reports the `InputState` and, once valid, the province and
 * gender encoded in the CNIC.
 *
 * @example
 * const cnic = useCnic();
 * // <input v-bind="cnic.inputProps.value" />
 */
export function useCnic(options: UseCnicOptions = {}): UseCnicResult {
  return useMaskedInput(CNIC, options);
}

/**
 * Mobile number field logic: formats as `0300-1234567` (or `+92 300 1234567`
 * when the user starts with the country code) and reports the `analyzePhone`
 * result, including the network, once the number is valid.
 */
export function usePhone(options: UsePhoneOptions = {}): UsePhoneResult {
  return useMaskedInput(PHONE, options);
}

/**
 * IBAN field logic: formats as `PK36 SCBL 0000 0011 2345 6702` and reports
 * the bank name once the IBAN is valid (`null` if the bank code is unknown).
 */
export function useIban(options: UseIbanOptions = {}): UseIbanResult {
  return useMaskedInput(IBAN, options);
}
