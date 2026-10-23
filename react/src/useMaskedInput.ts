import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type HTMLInputTypeAttribute,
} from 'react';
import type { InputState } from 'pakdatakit/input';
import { reformat } from './caret.js';

// useLayoutEffect warns during server rendering in React 18.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Options shared by `useCNICInput`, `usePhoneInput` and `useIBANInput`. */
export interface MaskedInputOptions<Info> {
  /** Controlled value. Pass back the value received in `onValueChange`. */
  value?: string | undefined;
  /** Initial value when uncontrolled. It is formatted before it is shown. */
  defaultValue?: string | undefined;
  /**
   * Called with the formatted value whenever it changes, its `InputState`,
   * and details (`info`) once the value is valid (otherwise `null`).
   */
  onValueChange?:
    ((value: string, state: InputState, info: Info | null) => void) | undefined;
}

/** Props to spread on an `<input>` (or a component that renders one). */
export interface MaskedInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type: HTMLInputTypeAttribute;
  inputMode: HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete: string;
  autoCorrect: string;
  autoCapitalize: string;
  spellCheck: boolean;
  'aria-invalid': true | undefined;
}

/** Result of `useCNICInput`, `usePhoneInput` and `useIBANInput`. */
export interface MaskedInputResult<Info> {
  /** Formatted value to display. */
  value: string;
  /** Whether the value is empty, incomplete, valid or invalid. */
  state: InputState;
  /** Details about the value when it is valid, otherwise `null`. */
  info: Info | null;
  /** Formats and sets the value (calls `onValueChange` if it changed). */
  setValue: (value: string) => void;
  /** Props to spread on your input. Keeps the caret in place while formatting. */
  inputProps: MaskedInputProps;
}

/** @internal */
export interface MaskConfig<Info> {
  format: (value: string) => string;
  check: (value: string) => InputState;
  info: (value: string) => Info | null;
  isSignificant: (ch: string) => boolean;
  type: HTMLInputTypeAttribute;
  inputMode: HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete: string;
  autoCapitalize: string;
}

/** @internal Shared implementation of the input hooks. */
export function useMaskedInput<Info>(
  config: MaskConfig<Info>,
  options: MaskedInputOptions<Info>,
): MaskedInputResult<Info> {
  const controlled = options.value !== undefined;
  const [inner, setInner] = useState(() =>
    config.format(options.defaultValue ?? ''),
  );
  const value = controlled ? config.format(options.value ?? '') : inner;
  const state = config.check(value);
  const info = useMemo(
    () => (state === 'valid' ? config.info(value) : null),
    [config, state, value],
  );

  // Latest value and callback, read by the stable handlers below.
  const latest = useRef({
    value,
    controlled,
    onValueChange: options.onValueChange,
  });
  useIsomorphicLayoutEffect(() => {
    latest.current = {
      value,
      controlled,
      onValueChange: options.onValueChange,
    };
  });

  const commit = useCallback(
    (next: string) => {
      const current = latest.current;
      if (next === current.value) return;
      if (!current.controlled) setInner(next);
      current.value = next;
      const nextState = config.check(next);
      current.onValueChange?.(
        next,
        nextState,
        nextState === 'valid' ? config.info(next) : null,
      );
    },
    [config],
  );

  const setValue = useCallback(
    (next: string) => {
      commit(config.format(next));
    },
    [commit, config],
  );

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const raw = input.value;
      const native = event.nativeEvent as Partial<InputEvent>;
      const result = reformat(
        raw,
        input.selectionStart ?? raw.length,
        latest.current.value,
        config.format,
        config.isSignificant,
        typeof native.inputType === 'string' ? native.inputType : undefined,
      );
      // Write the formatted value straight away so the caret can be placed
      // now; React then renders the same value and leaves the caret alone.
      if (input.value !== result.value) input.value = result.value;
      if (input.ownerDocument.activeElement === input) {
        try {
          input.setSelectionRange(result.caret, result.caret);
        } catch {
          // Some input types (e.g. email, number) do not support selection.
        }
      }
      commit(result.value);
    },
    [commit, config],
  );

  return {
    value,
    state,
    info,
    setValue,
    inputProps: {
      value,
      onChange,
      type: config.type,
      inputMode: config.inputMode,
      autoComplete: config.autoComplete,
      autoCorrect: 'off',
      autoCapitalize: config.autoCapitalize,
      spellCheck: false,
      'aria-invalid': state === 'invalid' ? true : undefined,
    },
  };
}
