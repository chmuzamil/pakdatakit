import type { ObjectDirective } from 'vue';
import { reformat } from './caret.js';
import { CNIC, IBAN, PHONE } from './composables.js';
import type { MaskConfig } from './useMaskedInput.js';

/** Kind of field `v-pak-input` formats. */
export type PakInputKind = 'cnic' | 'phone' | 'iban';

const CONFIGS: Record<PakInputKind, MaskConfig<unknown>> = {
  cnic: CNIC,
  phone: PHONE,
  iban: IBAN,
};

interface Binding {
  kind: PakInputKind;
  /** Value shown before the current edit. */
  previous: string;
  onInput: (event: Event) => void;
}

const bindings = new WeakMap<HTMLInputElement, Binding>();

function kindOf(arg: string | undefined, value: unknown): PakInputKind {
  const kind = arg ?? value;
  if (kind === 'cnic' || kind === 'phone' || kind === 'iban') return kind;
  throw new Error(
    `v-pak-input needs 'cnic', 'phone' or 'iban', received ${String(kind)}`,
  );
}

function setAttributes(input: HTMLInputElement, kind: PakInputKind): void {
  const config = CONFIGS[kind];
  const defaults: Record<string, string> = {
    inputmode: config.inputmode,
    autocomplete: config.autocomplete,
    autocorrect: 'off',
    autocapitalize: config.autocapitalize,
    spellcheck: 'false',
  };
  for (const [name, value] of Object.entries(defaults)) {
    if (!input.hasAttribute(name)) input.setAttribute(name, value);
  }
  if (!input.hasAttribute('type') && config.type !== 'text') {
    input.setAttribute('type', config.type);
  }
}

function setInvalid(input: HTMLInputElement, kind: PakInputKind): void {
  if (CONFIGS[kind].check(input.value) === 'invalid') {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

/** Formats a value set from outside (initial value, `v-model` update). */
function sync(input: HTMLInputElement, binding: Binding): void {
  const formatted = CONFIGS[binding.kind].format(input.value);
  if (formatted !== input.value) {
    input.value = formatted;
    binding.previous = formatted;
    // Tell v-model (and other listeners) about the formatted value.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  binding.previous = input.value;
  setInvalid(input, binding.kind);
}

/**
 * Formats a CNIC, mobile number or IBAN as the user types, on a plain
 * `<input>`, with or without `v-model`. The caret stays in place, and
 * `aria-invalid` is set once the value cannot become valid.
 *
 * @example
 * <input v-model="cnic" v-pak-input:cnic />
 * <input v-model="phone" v-pak-input="'phone'" />
 */
export const vPakInput: ObjectDirective<
  HTMLInputElement,
  PakInputKind | undefined
> = {
  created(input, { arg, value }) {
    const kind = kindOf(arg, value);
    const binding: Binding = {
      kind,
      previous: '',
      onInput(event) {
        const config = CONFIGS[binding.kind];
        const raw = input.value;
        const inputType = (event as Partial<InputEvent>).inputType;
        const result = reformat(
          raw,
          input.selectionStart ?? raw.length,
          binding.previous,
          config.format,
          config.isSignificant,
          typeof inputType === 'string' ? inputType : undefined,
        );
        if (input.value !== result.value) input.value = result.value;
        if (input.ownerDocument.activeElement === input) {
          try {
            input.setSelectionRange(result.caret, result.caret);
          } catch {
            // Some input types do not support selection.
          }
        }
        binding.previous = result.value;
        setInvalid(input, binding.kind);
      },
    };
    bindings.set(input, binding);
    // Capture, so the value is formatted before v-model's listener reads it.
    input.addEventListener('input', binding.onInput, { capture: true });
  },
  mounted(input) {
    const binding = bindings.get(input);
    if (!binding) return;
    setAttributes(input, binding.kind);
    sync(input, binding);
  },
  updated(input, { arg, value }) {
    const binding = bindings.get(input);
    if (!binding) return;
    binding.kind = kindOf(arg, value);
    sync(input, binding);
  },
  unmounted(input) {
    const binding = bindings.get(input);
    if (binding) {
      input.removeEventListener('input', binding.onInput, { capture: true });
    }
    bindings.delete(input);
  },
};
