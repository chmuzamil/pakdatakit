import {
  defineComponent,
  h,
  nextTick,
  watch,
  type PropType,
  type VNode,
} from 'vue';
import {
  isRequiredField,
  type PakFormField,
  type PakFormKind,
  type PakFormValues,
} from './core.js';
import type { PakFormLocale, PakFormText } from './text.js';
import { usePakForm, type UsePakFormResult } from './usePakForm.js';

const AUTOCOMPLETE: Partial<Record<PakFormField, string>> = {
  name: 'name',
  address: 'street-address',
  city: 'address-level2',
  postalCode: 'postal-code',
};

const PLACEHOLDER: Partial<Record<PakFormField, keyof PakFormText>> = {
  mobile: 'mobilePlaceholder',
  cnic: 'cnicPlaceholder',
  city: 'cityPlaceholder',
  address: 'addressPlaceholder',
  landmark: 'landmarkPlaceholder',
  postalCode: 'postalCodePlaceholder',
};

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function select(
  form: UsePakFormResult,
  field: PakFormField,
  options: { value: string; label: string }[],
): VNode {
  const current = form.values[field];
  return h(
    'select',
    {
      ...form.fieldAttrs(field),
      class: 'pak-form__select',
      value: current,
      disabled: options.length === 0 && !current ? true : undefined,
      onChange: (event: Event) => form.setField(field, inputValue(event)),
      onBlur: () => form.touch(field),
    },
    [
      h(
        'option',
        { value: '', selected: current === '' },
        form.text.value.selectPlaceholder,
      ),
      ...options.map((option) =>
        h(
          'option',
          { value: option.value, selected: option.value === current },
          option.label,
        ),
      ),
    ],
  );
}

function control(form: UsePakFormResult, field: PakFormField): VNode | VNode[] {
  const text = form.text.value;
  const placeholderKey = PLACEHOLDER[field];
  const common = {
    ...form.fieldAttrs(field),
    placeholder: placeholderKey ? text[placeholderKey] : undefined,
    onBlur: () => form.touch(field),
  };
  const toOptions = (list: string[]) =>
    list.map((value) => ({ value, label: value }));
  switch (field) {
    case 'mobile':
      return h('input', {
        ...form.mobileProps.value,
        ...common,
        class: 'pak-form__input',
      });
    case 'cnic':
      return h('input', {
        ...form.cnicProps.value,
        ...common,
        class: 'pak-form__input',
      });
    case 'province':
      return select(form, field, form.provinces.value);
    case 'district':
      return select(form, field, toOptions(form.districts.value));
    case 'tehsil':
      return select(form, field, toOptions(form.tehsils.value));
    case 'address':
      return h('textarea', {
        ...common,
        class: 'pak-form__textarea',
        rows: 2,
        autocomplete: AUTOCOMPLETE.address,
        value: form.values.address,
        onInput: (event: Event) => form.setField('address', inputValue(event)),
      });
    case 'city':
      return [
        h('input', {
          ...common,
          class: 'pak-form__input',
          type: 'text',
          list: form.id('cities'),
          autocomplete: AUTOCOMPLETE.city,
          value: form.values.city,
          onInput: (event: Event) => form.setField('city', inputValue(event)),
        }),
        h(
          'datalist',
          { id: form.id('cities') },
          form.cities.value.map((city) => h('option', { value: city })),
        ),
      ];
    default:
      return h('input', {
        ...common,
        class: 'pak-form__input',
        type: 'text',
        autocomplete: AUTOCOMPLETE[field],
        inputmode: field === 'postalCode' ? 'numeric' : undefined,
        maxlength: field === 'postalCode' ? 5 : undefined,
        value: form.values[field],
        onInput: (event: Event) => form.setField(field, inputValue(event)),
      });
  }
}

function hintRegion(form: UsePakFormResult, field: PakFormField): VNode | null {
  if (field !== 'address' && field !== 'mobile' && field !== 'postalCode')
    return null;
  if (form.hints.value === null) return null;
  return h(
    'div',
    {
      id: form.id(field, 'hint'),
      class: 'pak-form__hint',
      'aria-live': 'polite',
    },
    form.hints.value[field].map((message) => h('p', message)),
  );
}

function createPakForm(kind: PakFormKind, name: string) {
  return defineComponent({
    name,
    props: {
      /** Values for `v-model`. */
      modelValue: {
        type: Object as PropType<Partial<PakFormValues>>,
        default: undefined,
      },
      /** `'en'` (default) or `'ur'`. */
      locale: { type: String as PropType<PakFormLocale>, default: 'en' },
      /** Overrides for any label, placeholder, error or hint text. */
      labels: {
        type: Object as PropType<Partial<PakFormText>>,
        default: undefined,
      },
      /** Show the optional tehsil select. */
      tehsil: { type: Boolean, default: false },
      /** Show address and phone hints (loads the post office data on demand). */
      hints: { type: Boolean, default: false },
      /** Prefix for element ids. */
      idPrefix: { type: String, default: undefined },
    },
    emits: {
      'update:modelValue': (values: PakFormValues) =>
        typeof values === 'object',
      submit: (values: PakFormValues) => typeof values === 'object',
    },
    setup(props, { emit, slots, expose }) {
      const form = usePakForm(kind, {
        initialValues: props.modelValue,
        locale: () => props.locale,
        labels: () => props.labels,
        tehsil: () => props.tehsil,
        hints: () => props.hints,
        idPrefix: props.idPrefix,
        onChange: (values) => emit('update:modelValue', values),
        onSubmit: (values) => emit('submit', values),
      });
      watch(
        () => props.modelValue,
        (values) => {
          if (values) form.setValues(values);
        },
        { deep: true },
      );
      expose({ validate: form.validate, reset: form.reset });

      function onSubmit(event: Event): void {
        form.handleSubmit(event);
        if (!form.submitFailed.value) return;
        const first = form.fields.value.find(
          (field) => form.allErrors.value[field],
        );
        if (first) {
          void nextTick(() => document.getElementById(form.id(first))?.focus());
        }
      }

      return () => {
        const text = form.text.value;
        const errors = form.errors.value;
        const summaryFields = form.fields.value.filter(
          (field) => errors[field],
        );
        return h(
          'form',
          {
            class: ['pak-form', `pak-form--${kind}`],
            novalidate: true,
            lang: form.locale.value,
            dir: form.locale.value === 'ur' ? 'rtl' : 'ltr',
            onSubmit,
          },
          [
            form.submitFailed.value && summaryFields.length > 0
              ? h(
                  'div',
                  {
                    id: form.id('summary'),
                    class: 'pak-form__summary',
                    role: 'alert',
                  },
                  [
                    h('p', text.errorSummary),
                    h(
                      'ul',
                      summaryFields.map((field) =>
                        h(
                          'li',
                          h('a', { href: `#${form.id(field)}` }, errors[field]),
                        ),
                      ),
                    ),
                  ],
                )
              : null,
            ...form.fields.value.map((field) =>
              h(
                'div',
                { class: ['pak-form__field', `pak-form__field--${field}`] },
                [
                  h(
                    'label',
                    { for: form.id(field), class: 'pak-form__label' },
                    [
                      text[field],
                      isRequiredField(field)
                        ? null
                        : h(
                            'span',
                            { class: 'pak-form__optional' },
                            ` ${text.optional}`,
                          ),
                    ],
                  ),
                  control(form, field),
                  errors[field]
                    ? h(
                        'p',
                        {
                          id: form.id(field, 'error'),
                          class: 'pak-form__error',
                        },
                        errors[field],
                      )
                    : null,
                  hintRegion(form, field),
                ],
              ),
            ),
            slots.default?.(),
            slots.submit
              ? slots.submit({ text: text.submit })
              : h(
                  'button',
                  { type: 'submit', class: 'pak-form__submit' },
                  text.submit,
                ),
          ],
        );
      };
    },
  });
}

/**
 * Unstyled checkout form: name, mobile, province → district → (tehsil) →
 * city, address, nearby place and postal code. `v-model` and `@submit`.
 *
 * @example
 * <PakCheckoutForm v-model="order" locale="ur" @submit="save" />
 */
export const PakCheckoutForm = createPakForm('checkout', 'PakCheckoutForm');

/** Unstyled KYC form: the checkout fields plus the CNIC. */
export const PakKycForm = createPakForm('kyc', 'PakKycForm');
