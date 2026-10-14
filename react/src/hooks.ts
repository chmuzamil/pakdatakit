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

const CNIC: MaskConfig<CNICInfo> = {
  format: formatCNICInput,
  check: checkCNICInput,
  info: getCNICInfo,
  isSignificant: isDigit,
  type: 'text',
  inputMode: 'numeric',
  autoComplete: 'off',
  autoCapitalize: 'off',
};

const PHONE: MaskConfig<PhoneAnalysis> = {
  format: formatPhoneInput,
  check: checkPhoneInput,
  info: (value) => {
    const analysis = analyzePhone(value);
    return analysis.valid ? analysis : null;
  },
  isSignificant: isDigit,
  type: 'tel',
  inputMode: 'tel',
  autoComplete: 'tel',
  autoCapitalize: 'off',
};

const IBAN: MaskConfig<string> = {
  format: formatIBANInput,
  check: checkIBANInput,
  info: getBankFromIBAN,
  isSignificant: isAlphanumeric,
  type: 'text',
  inputMode: 'text',
  autoComplete: 'off',
  autoCapitalize: 'characters',
};

/** Options for {@link useCNICInput}. */
export type UseCNICInputOptions = MaskedInputOptions<CNICInfo>;
/** Result of {@link useCNICInput}. `info` is the decoded province and gender. */
export type UseCNICInputResult = MaskedInputResult<CNICInfo>;
/** Options for {@link usePhoneInput}. */
export type UsePhoneInputOptions = MaskedInputOptions<PhoneAnalysis>;
/** Result of {@link usePhoneInput}. `info` is the `analyzePhone` result. */
export type UsePhoneInputResult = MaskedInputResult<PhoneAnalysis>;
/** Options for {@link useIBANInput}. */
export type UseIBANInputOptions = MaskedInputOptions<string>;
/** Result of {@link useIBANInput}. `info` is the bank name. */
export type UseIBANInputResult = MaskedInputResult<string>;

/**
 * CNIC field logic for your own input component: formats as `35202-1234567-1`
 * while typing and reports the `InputState` and, once valid, the province
 * and gender encoded in the CNIC.
 *
 * @example
 * const cnic = useCNICInput();
 * return <MyTextField {...cnic.inputProps} error={cnic.state === 'invalid'} />;
 */
export function useCNICInput(
  options: UseCNICInputOptions = {},
): UseCNICInputResult {
  return useMaskedInput(CNIC, options);
}

/**
 * Mobile number field logic: formats as `0300-1234567` (or `+92 300 1234567`
 * when the user starts with the country code) and reports the `analyzePhone`
 * result, including the network, once the number is valid.
 */
export function usePhoneInput(
  options: UsePhoneInputOptions = {},
): UsePhoneInputResult {
  return useMaskedInput(PHONE, options);
}

/**
 * IBAN field logic: formats as `PK36 SCBL 0000 0011 2345 6702` and reports
 * the bank name once the IBAN is valid (`null` if the bank code is unknown).
 */
export function useIBANInput(
  options: UseIBANInputOptions = {},
): UseIBANInputResult {
  return useMaskedInput(IBAN, options);
}
