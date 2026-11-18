import {
  computed,
  reactive,
  ref,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { useCnic, usePhone } from '../composables.js';
import type { MaskedInputProps } from '../useMaskedInput.js';
import {
  citySuggestions,
  districtOptions,
  emptyPakFormValues,
  isRequiredField,
  loadPakHintEngine,
  pakFormFields,
  pakFormHints,
  PAK_PROVINCES,
  provinceLabel,
  submittedValues,
  tehsilOptions,
  validatePakForm,
  withField,
  type PakFormErrors,
  type PakFormField,
  type PakFormHints,
  type PakFormKind,
  type PakFormValues,
  type PakHintEngine,
} from './core.js';
import { formText, type PakFormLocale, type PakFormText } from './text.js';

/** Options for {@link usePakForm}. */
export interface UsePakFormOptions {
  /** Initial values. */
  initialValues?: Partial<PakFormValues> | undefined;
  /** `'en'` (default) or `'ur'`. */
  locale?: MaybeRefOrGetter<PakFormLocale | undefined>;
  /** Overrides for any label, placeholder, error or hint text. */
  labels?: MaybeRefOrGetter<Partial<PakFormText> | undefined>;
  /** Show the optional tehsil select (default `false`). */
  tehsil?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * Show address and phone hints (default `false`). Turning this on loads
   * `pakdatakit/quality` and the post office directory on demand.
   */
  hints?: MaybeRefOrGetter<boolean | undefined>;
  /** Prefix for element ids (default: a unique `pak-form-N`). */
  idPrefix?: string | undefined;
  /** Called with every change of the values (for `v-model`). */
  onChange?: ((values: PakFormValues) => void) | undefined;
  /** Called with trimmed values when a valid form is submitted. */
  onSubmit?: ((values: PakFormValues) => void) | undefined;
}

/** Attributes for a field's `<input>` or `<select>`. */
export interface PakFieldAttrs {
  id: string;
  name: string;
  required: boolean | undefined;
  'aria-required': 'true' | undefined;
  'aria-invalid': 'true' | undefined;
  'aria-describedby': string | undefined;
}

/** Result of {@link usePakForm}. */
export interface UsePakFormResult {
  kind: PakFormKind;
  /** Current values (read-only; change them with `setField`). */
  values: Readonly<PakFormValues>;
  /** Text in the current locale, with overrides. */
  text: ComputedRef<PakFormText>;
  locale: ComputedRef<PakFormLocale>;
  /** Fields shown, in order. */
  fields: ComputedRef<PakFormField[]>;
  provinces: ComputedRef<{ value: string; label: string }[]>;
  districts: ComputedRef<string[]>;
  tehsils: ComputedRef<string[]>;
  cities: ComputedRef<string[]>;
  /** Errors of fields the user has left or that failed on submit. */
  errors: ComputedRef<PakFormErrors>;
  /** Every current error, shown or not. */
  allErrors: ComputedRef<PakFormErrors>;
  /** Whether a submit was tried with errors (show the error summary). */
  submitFailed: Ref<boolean>;
  /** Hints by field, or `null` while off or loading. */
  hints: ComputedRef<PakFormHints | null>;
  /** Sets a field, applying the province → district → tehsil/city cascade. */
  setField: (field: PakFormField, value: string) => void;
  /** Replaces the values (e.g. from `v-model`). */
  setValues: (values: Partial<PakFormValues>) => void;
  /** Marks a field as visited so its error shows. */
  touch: (field: PakFormField) => void;
  /** Validates everything and shows all errors. Returns `true` if valid. */
  validate: () => boolean;
  /** Form `submit` handler: prevents the default, validates and submits. */
  handleSubmit: (event?: Event) => void;
  /** Resets values, errors and visited state. */
  reset: (values?: Partial<PakFormValues>) => void;
  /** Element id for a field, and for its error and hint. */
  id: (
    field: PakFormField | 'summary' | 'cities',
    part?: 'error' | 'hint',
  ) => string;
  /** Accessibility and identity attributes for a field's control. */
  fieldAttrs: (field: PakFormField) => PakFieldAttrs;
  /** Masked-input props for the mobile field (formats as you type). */
  mobileProps: ComputedRef<MaskedInputProps>;
  /** Masked-input props for the CNIC field (formats as you type). */
  cnicProps: ComputedRef<MaskedInputProps>;
}

let counter = 0;

/**
 * Logic of the checkout and KYC forms for your own markup: values with the
 * location cascade, validation from pakdatakit, English/Urdu text, ids and
 * ARIA attributes, and optional lazy hints.
 *
 * @example
 * const form = usePakForm('kyc', { onSubmit: (values) => save(values) });
 */
export function usePakForm(
  kind: PakFormKind,
  options: UsePakFormOptions = {},
): UsePakFormResult {
  const prefix = options.idPrefix ?? `pak-form-${++counter}`;
  const values = reactive<PakFormValues>({
    ...emptyPakFormValues(),
    ...options.initialValues,
  });
  const touched = reactive(new Set<PakFormField>());
  const submitFailed = ref(false);

  const locale = computed<PakFormLocale>(() =>
    toValue(options.locale) === 'ur' ? 'ur' : 'en',
  );
  const text = computed(() =>
    formText(locale.value, toValue(options.labels) ?? {}),
  );
  const showTehsil = computed(() => toValue(options.tehsil) === true);
  const fields = computed(() => pakFormFields(kind, showTehsil.value));

  const provinces = computed(() =>
    PAK_PROVINCES.map((value) => ({
      value,
      label: provinceLabel(value, text.value),
    })),
  );
  const districts = computed(() => districtOptions(values.province));
  const tehsils = computed(() => tehsilOptions(values.district));
  const cities = computed(() => citySuggestions(values.city, values.province));

  const allErrors = computed(() =>
    validatePakForm(kind, values, text.value, showTehsil.value),
  );
  const errors = computed(() => {
    const shown: PakFormErrors = {};
    for (const [field, error] of Object.entries(allErrors.value)) {
      if (submitFailed.value || touched.has(field as PakFormField)) {
        shown[field as PakFormField] = error;
      }
    }
    return shown;
  });

  const engine = shallowRef<PakHintEngine | null>(null);
  watch(
    () => toValue(options.hints) === true,
    (on) => {
      if (!on || engine.value) return;
      loadPakHintEngine().then(
        (loaded) => {
          engine.value = loaded;
        },
        () => {
          // Hints are optional; the form works without them.
        },
      );
    },
    { immediate: true },
  );
  const hints = computed(() =>
    toValue(options.hints) === true && engine.value
      ? pakFormHints(engine.value, values, text.value)
      : null,
  );

  function emit(): void {
    options.onChange?.({ ...values });
  }

  function setField(field: PakFormField, value: string): void {
    const next = withField(values, field, value);
    let changed = false;
    for (const key of Object.keys(next) as PakFormField[]) {
      if (values[key] !== next[key]) {
        values[key] = next[key];
        changed = true;
      }
    }
    if (changed) emit();
  }

  function setValues(next: Partial<PakFormValues>): void {
    let changed = false;
    for (const [key, value] of Object.entries(next) as [
      PakFormField,
      string,
    ][]) {
      if (typeof value === 'string' && values[key] !== value) {
        values[key] = value;
        changed = true;
      }
    }
    if (changed) emit();
  }

  function touch(field: PakFormField): void {
    touched.add(field);
  }

  function validate(): boolean {
    const valid = Object.keys(allErrors.value).length === 0;
    submitFailed.value = !valid;
    return valid;
  }

  function handleSubmit(event?: Event): void {
    event?.preventDefault();
    if (validate()) {
      options.onSubmit?.(submittedValues(kind, values, showTehsil.value));
    }
  }

  function reset(next: Partial<PakFormValues> = {}): void {
    Object.assign(values, emptyPakFormValues(), next);
    touched.clear();
    submitFailed.value = false;
    emit();
  }

  function id(
    field: PakFormField | 'summary' | 'cities',
    part?: 'error' | 'hint',
  ): string {
    return part ? `${prefix}-${field}-${part}` : `${prefix}-${field}`;
  }

  function fieldAttrs(field: PakFormField): PakFieldAttrs {
    const required = isRequiredField(field);
    const error = errors.value[field];
    const hinted =
      hints.value !== null &&
      (field === 'address' || field === 'mobile' || field === 'postalCode');
    const describedBy = [
      error ? id(field, 'error') : '',
      hinted ? id(field, 'hint') : '',
    ]
      .filter(Boolean)
      .join(' ');
    return {
      id: id(field),
      name: field,
      required: required || undefined,
      'aria-required': required ? 'true' : undefined,
      'aria-invalid': error ? 'true' : undefined,
      'aria-describedby': describedBy || undefined,
    };
  }

  const phone = usePhone({
    value: () => values.mobile,
    onValueChange: (value) => setField('mobile', value),
  });
  const cnic = useCnic({
    value: () => values.cnic,
    onValueChange: (value) => setField('cnic', value),
  });

  // Values passed in are shown formatted, as the masked inputs would show them.
  if (values.mobile) values.mobile = phone.value.value;
  if (values.cnic) values.cnic = cnic.value.value;

  return {
    kind,
    values,
    text,
    locale,
    fields,
    provinces,
    districts,
    tehsils,
    cities,
    errors,
    allErrors,
    submitFailed,
    hints,
    setField,
    setValues,
    touch,
    validate,
    handleSubmit,
    reset,
    id,
    fieldAttrs,
    mobileProps: phone.inputProps,
    cnicProps: cnic.inputProps,
  };
}

/** {@link usePakForm} for the checkout form. */
export function useCheckoutForm(
  options: UsePakFormOptions = {},
): UsePakFormResult {
  return usePakForm('checkout', options);
}

/** {@link usePakForm} for the KYC form (adds the CNIC). */
export function useKycForm(options: UsePakFormOptions = {}): UsePakFormResult {
  return usePakForm('kyc', options);
}
