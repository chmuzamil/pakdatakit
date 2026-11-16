import {
  computed,
  ref,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import type { InputState } from 'pakdatakit/input';
import { reformat } from './caret.js';

/** Options shared by `useCnic`, `usePhone` and `useIban`. */
export interface MaskedInputOptions<Info> {
  /**
   * Controlled value: a ref, getter or plain string. Update it with the value
   * received in `onValueChange`.
   */
  value?: MaybeRefOrGetter<string | undefined>;
  /** Initial value when uncontrolled. It is formatted before it is shown. */
  defaultValue?: string | undefined;
  /**
   * Called with the formatted value whenever it changes, its `InputState`,
   * and details (`info`) once the value is valid (otherwise `null`).
   */
  onValueChange?:
    ((value: string, state: InputState, info: Info | null) => void) | undefined;
}

/** Attributes and listener to bind on an `<input>` with `v-bind`. */
export interface MaskedInputProps {
  value: string;
  onInput: (event: Event) => void;
  type: string;
  inputmode: string;
  autocomplete: string;
  autocorrect: string;
  autocapitalize: string;
  spellcheck: boolean;
  'aria-invalid': true | undefined;
}

/** Result of `useCnic`, `usePhone` and `useIban`. */
export interface MaskedInputResult<Info> {
  /** Formatted value to display. */
  value: ComputedRef<string>;
  /** Whether the value is empty, incomplete, valid or invalid. */
  state: ComputedRef<InputState>;
  /** Details about the value when it is valid, otherwise `null`. */
  info: ComputedRef<Info | null>;
  /** Formats and sets the value (calls `onValueChange` if it changed). */
  setValue: (value: string) => void;
  /**
   * Bind on your input: `<input v-bind="cnic.inputProps.value" />`. Keeps the
   * caret in place while formatting.
   */
  inputProps: ComputedRef<MaskedInputProps>;
}

/** @internal */
export interface MaskConfig<Info> {
  format: (value: string) => string;
  check: (value: string) => InputState;
  info: (value: string) => Info | null;
  isSignificant: (ch: string) => boolean;
  type: string;
  inputmode: string;
  autocomplete: string;
  autocapitalize: string;
}

/** @internal Shared implementation of the input composables. */
export function useMaskedInput<Info>(
  config: MaskConfig<Info>,
  options: MaskedInputOptions<Info>,
): MaskedInputResult<Info> {
  const inner = ref(config.format(options.defaultValue ?? ''));
  const controlledValue = (): string | undefined =>
    options.value === undefined ? undefined : toValue(options.value);

  const value = computed(() => {
    const controlled = controlledValue();
    return controlled === undefined ? inner.value : config.format(controlled);
  });
  const state = computed(() => config.check(value.value));
  const info = computed(() =>
    state.value === 'valid' ? config.info(value.value) : null,
  );

  function commit(next: string): void {
    if (next === value.value) return;
    if (controlledValue() === undefined) inner.value = next;
    const nextState = config.check(next);
    options.onValueChange?.(
      next,
      nextState,
      nextState === 'valid' ? config.info(next) : null,
    );
  }

  function setValue(next: string): void {
    commit(config.format(next));
  }

  function onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const inputType = (event as Partial<InputEvent>).inputType;
    const result = reformat(
      raw,
      input.selectionStart ?? raw.length,
      value.value,
      config.format,
      config.isSignificant,
      typeof inputType === 'string' ? inputType : undefined,
    );
    // Write the formatted value straight away so the caret can be placed now;
    // Vue then renders the same value and leaves the caret alone.
    if (input.value !== result.value) input.value = result.value;
    if (input.ownerDocument.activeElement === input) {
      try {
        input.setSelectionRange(result.caret, result.caret);
      } catch {
        // Some input types (e.g. email, number) do not support selection.
      }
    }
    commit(result.value);
    // A controlled parent that ignores the change keeps its value on screen.
    if (input.value !== value.value) input.value = value.value;
  }

  const inputProps = computed<MaskedInputProps>(() => ({
    value: value.value,
    onInput,
    type: config.type,
    inputmode: config.inputmode,
    autocomplete: config.autocomplete,
    autocorrect: 'off',
    autocapitalize: config.autocapitalize,
    spellcheck: false,
    'aria-invalid': state.value === 'invalid' ? true : undefined,
  }));

  return { value, state, info, setValue, inputProps };
}
