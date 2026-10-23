import {
  forwardRef,
  type ChangeEvent,
  type ForwardRefExoticComponent,
  type InputHTMLAttributes,
  type RefAttributes,
} from 'react';
import type { CNICInfo } from 'pakdatakit/cnic';
import type { InputState } from 'pakdatakit/input';
import type { PhoneAnalysis } from 'pakdatakit/phone';
import { useCNICInput, useIBANInput, usePhoneInput } from './hooks.js';
import type {
  MaskedInputOptions,
  MaskedInputResult,
} from './useMaskedInput.js';

/**
 * Props of the input components: every native `<input>` prop, plus `value`
 * or `defaultValue` and `onValueChange`.
 */
export interface MaskedInputComponentProps<Info> extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue'
> {
  /** Controlled value. Pass back the value received in `onValueChange`. */
  value?: string | undefined;
  /** Initial value when uncontrolled. */
  defaultValue?: string | undefined;
  /**
   * Called with the formatted value whenever it changes, its state, and
   * details once it is valid (otherwise `null`).
   */
  onValueChange?:
    ((value: string, state: InputState, info: Info | null) => void) | undefined;
}

export type CNICInputProps = MaskedInputComponentProps<CNICInfo>;
export type PhoneInputProps = MaskedInputComponentProps<PhoneAnalysis>;
export type IBANInputProps = MaskedInputComponentProps<string>;

function createInput<Info>(
  useInput: (options: MaskedInputOptions<Info>) => MaskedInputResult<Info>,
  displayName: string,
): ForwardRefExoticComponent<
  MaskedInputComponentProps<Info> & RefAttributes<HTMLInputElement>
> {
  const Component = forwardRef<
    HTMLInputElement,
    MaskedInputComponentProps<Info>
  >(function MaskedInput(props, ref) {
    const { value, defaultValue, onValueChange, onChange, ...rest } = props;
    const { inputProps } = useInput({ value, defaultValue, onValueChange });
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      inputProps.onChange(event);
      onChange?.(event);
    };
    return (
      <input
        {...inputProps}
        {...rest}
        ref={ref}
        value={inputProps.value}
        onChange={handleChange}
        aria-invalid={rest['aria-invalid'] ?? inputProps['aria-invalid']}
      />
    );
  });
  Component.displayName = displayName;
  return Component;
}

/**
 * CNIC input that formats as `35202-1234567-1` while typing.
 *
 * @example
 * <CNICInput onValueChange={(value, state, info) => console.log(state, info?.province)} />
 */
export const CNICInput = createInput(useCNICInput, 'CNICInput');

/** Pakistani mobile number input that formats as `0300-1234567` or `+92 300 1234567`. */
export const PhoneInput = createInput(usePhoneInput, 'PhoneInput');

/** Pakistani IBAN input that formats as `PK36 SCBL 0000 0011 2345 6702`. */
export const IBANInput = createInput(useIBANInput, 'IBANInput');
