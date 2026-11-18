import {
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type FormHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { CNICInput, PhoneInput } from '../inputs.js';
import {
  resolveLabels,
  type PakFormLabelOverrides,
  type PakFormLabels,
  type PakFormLocale,
} from './labels.js';
import {
  applyLocationChange,
  useLocationOptions,
  type PakLocationValues,
} from './location.js';
import { usePakHints } from './hints.js';
import {
  EMPTY_KYC_VALUES,
  pakFormFields,
  trimPakValues,
  validatePakForm,
  type PakCheckoutValues,
  type PakFormErrors,
  type PakFormField,
  type PakFormKind,
  type PakKycValues,
} from './rules.js';

/** Elements you can add your own class names to. */
export type PakFormSlot =
  | 'form'
  | 'field'
  | 'label'
  | 'optional'
  | 'input'
  | 'select'
  | 'error'
  | 'errorSummary'
  | 'hints'
  | 'submit';

/** Props of `PakCheckoutForm` and `PakKycForm`. */
export interface PakFormProps<V extends PakCheckoutValues> extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'onChange' | 'onInvalid' | 'defaultValue' | 'children'
> {
  /** Controlled values. Pass back what you receive in `onChange`. */
  values?: V | undefined;
  /** Initial values when uncontrolled. */
  defaultValues?: Partial<V> | undefined;
  /** Called with all values whenever one changes. */
  onChange?: ((values: V) => void) | undefined;
  /** Called with the trimmed values when the form is submitted and valid. */
  onSubmit?: ((values: V) => void) | undefined;
  /** Called with the errors when a submit is blocked. */
  onInvalid?: ((errors: PakFormErrors) => void) | undefined;
  /** `'en'` (default) or `'ur'`, which also sets `dir="rtl"` and `lang="ur"`. */
  locale?: PakFormLocale | undefined;
  /** Replace any label, placeholder, error or hint text. */
  labels?: PakFormLabelOverrides | undefined;
  /**
   * Show non-blocking delivery hints. Loads `pakdatakit/quality` (with the
   * post office directory) on demand the first time it is `true`.
   */
  hints?: boolean | undefined;
  /** Show an optional tehsil select after the district (default `false`). */
  tehsil?: boolean | undefined;
  /** Extra class names for each element; `pak-form__*` classes are always set. */
  classNames?: Partial<Record<PakFormSlot, string>> | undefined;
  /** Prefix of element ids (default: from `useId`). */
  idPrefix?: string | undefined;
  /** Rendered after the fields, before the submit button. */
  children?: ReactNode;
}

const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(' ');

const LOCATION_FIELDS = new Set<PakFormField>([
  'province',
  'district',
  'tehsil',
  'city',
]);

const OPTIONAL = new Set<PakFormField>(['tehsil', 'landmark', 'postalCode']);

const AUTOCOMPLETE: Partial<Record<PakFormField, string>> = {
  fullName: 'name',
  province: 'address-level1',
  city: 'address-level2',
  address: 'street-address',
  postalCode: 'postal-code',
  landmark: 'off',
};

function PakForm<V extends PakCheckoutValues>(
  props: PakFormProps<V> & { kind: PakFormKind },
) {
  const {
    kind,
    values: controlledValues,
    defaultValues,
    onChange,
    onSubmit,
    onInvalid,
    locale = 'en',
    labels: labelOverrides,
    hints: hintsEnabled = false,
    tehsil: showTehsil = false,
    classNames = {},
    idPrefix,
    children,
    className,
    ...formProps
  } = props;

  const generatedId = useId();
  const prefix = idPrefix ?? `pak${generatedId.replace(/[^\w-]/g, '')}`;
  const id = (field: string) => `${prefix}-${field}`;
  const labels: PakFormLabels = useMemo(
    () => resolveLabels(locale, labelOverrides),
    [locale, labelOverrides],
  );

  const [inner, setInner] = useState<PakKycValues>(() => ({
    ...EMPTY_KYC_VALUES,
    ...(defaultValues as Partial<PakKycValues> | undefined),
  }));
  const values: PakKycValues = controlledValues
    ? { ...EMPTY_KYC_VALUES, ...(controlledValues as Partial<PakKycValues>) }
    : inner;
  const [touched, setTouched] = useState<Partial<Record<PakFormField, true>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fields = pakFormFields(kind, showTehsil);
  const errors = validatePakForm(values, kind, {
    locale,
    labels: labelOverrides,
    tehsil: showTehsil,
  });

  const output = (all: PakKycValues): V => {
    const out: Partial<PakKycValues> = { ...all };
    if (kind === 'checkout') delete out.cnic;
    if (!showTehsil) out.tehsil = '';
    return out as unknown as V;
  };

  const update = (next: PakKycValues) => {
    if (!controlledValues) setInner(next);
    onChange?.(output(next));
  };

  const setField = (field: PakFormField, value: string) => {
    if (values[field] === value) return;
    update(
      LOCATION_FIELDS.has(field)
        ? applyLocationChange(values, field as keyof PakLocationValues, value)
        : { ...values, [field]: value },
    );
  };

  const markTouched = (event: FocusEvent<HTMLElement>) => {
    const field = event.currentTarget.dataset.pakField as
      PakFormField | undefined;
    if (field && !touched[field]) setTouched({ ...touched, [field]: true });
  };

  const location = useLocationOptions({
    province: values.province,
    district: values.district,
    cityQuery: values.city,
    tehsil: showTehsil,
  });

  const hints = usePakHints({
    enabled: hintsEnabled,
    address: values.address,
    landmark: values.landmark,
    city: values.city,
    postalCode: values.postalCode,
    mobile: values.mobile,
    labels,
  });

  const focusField = (field: PakFormField) => {
    formRef.current?.ownerDocument.getElementById(id(field))?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const invalid = fields.filter((field) => errors[field]);
    const first = invalid[0];
    if (first) {
      focusField(first);
      onInvalid?.(errors);
      return;
    }
    onSubmit?.(output(trimPakValues(values)));
  };

  const errorFor = (field: PakFormField) =>
    (submitted || touched[field]) && errors[field] ? errors[field] : undefined;

  const visibleErrors = submitted
    ? fields.filter((field) => errors[field])
    : [];

  const fieldProps = (field: PakFormField) => {
    const error = errorFor(field);
    const required = !OPTIONAL.has(field);
    return {
      id: id(field),
      name: field,
      'data-pak-field': field,
      required,
      'aria-required': required,
      'aria-invalid': error ? true : false,
      'aria-describedby': error ? id(`${field}-error`) : undefined,
      onBlur: markTouched,
    };
  };

  const label = (field: PakFormField) => (
    <label
      htmlFor={id(field)}
      className={cx('pak-form__label', classNames.label)}
    >
      {labels[field]}
      {OPTIONAL.has(field) && (
        <>
          {' '}
          <span className={cx('pak-form__optional', classNames.optional)}>
            {labels.optional}
          </span>
        </>
      )}
    </label>
  );

  const inputClass = cx('pak-form__input', classNames.input);
  const selectClass = cx('pak-form__select', classNames.select);

  const control = (field: PakFormField): ReactNode => {
    const common = fieldProps(field);
    switch (field) {
      case 'mobile':
        return (
          <PhoneInput
            {...common}
            className={inputClass}
            dir="ltr"
            placeholder={labels.mobilePlaceholder}
            value={values.mobile}
            onValueChange={(value) => setField('mobile', value)}
          />
        );
      case 'cnic':
        return (
          <CNICInput
            {...common}
            className={inputClass}
            dir="ltr"
            placeholder={labels.cnicPlaceholder}
            value={values.cnic}
            onValueChange={(value) => setField('cnic', value)}
          />
        );
      case 'province':
      case 'district':
      case 'tehsil': {
        const options =
          field === 'province'
            ? location.provinces
            : field === 'district'
              ? location.districts
              : location.tehsils;
        const placeholder =
          field === 'province'
            ? labels.chooseProvince
            : field === 'district'
              ? labels.chooseDistrict
              : labels.chooseTehsil;
        const disabled =
          (field === 'district' && !values.province) ||
          (field === 'tehsil' && location.tehsils.length === 0);
        return (
          <select
            {...common}
            className={selectClass}
            autoComplete={AUTOCOMPLETE[field] ?? 'off'}
            disabled={disabled}
            value={values[field]}
            onChange={(event) => setField(field, event.currentTarget.value)}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }
      case 'city':
        return (
          <>
            <input
              {...common}
              type="text"
              className={inputClass}
              list={id('city-options')}
              autoComplete={AUTOCOMPLETE.city}
              placeholder={labels.cityPlaceholder}
              value={values.city}
              onChange={(event) => setField('city', event.currentTarget.value)}
            />
            <datalist id={id('city-options')}>
              {location.cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </>
        );
      case 'address':
        return (
          <textarea
            {...common}
            className={inputClass}
            autoComplete={AUTOCOMPLETE.address}
            rows={3}
            value={values.address}
            onChange={(event) => setField('address', event.currentTarget.value)}
          />
        );
      case 'postalCode':
        return (
          <input
            {...common}
            type="text"
            className={inputClass}
            dir="ltr"
            inputMode="numeric"
            maxLength={5}
            autoComplete={AUTOCOMPLETE.postalCode}
            placeholder={labels.postalCodePlaceholder}
            value={values.postalCode}
            onChange={(event) =>
              setField('postalCode', event.currentTarget.value)
            }
          />
        );
      case 'fullName':
      case 'landmark':
        return (
          <input
            {...common}
            type="text"
            className={inputClass}
            autoComplete={AUTOCOMPLETE[field]}
            value={values[field]}
            onChange={(event) => setField(field, event.currentTarget.value)}
          />
        );
    }
  };

  const summaryLink = (field: PakFormField) => (event: MouseEvent) => {
    event.preventDefault();
    focusField(field);
  };

  return (
    <form
      noValidate
      {...formProps}
      ref={formRef}
      lang={locale}
      dir={locale === 'ur' ? 'rtl' : 'ltr'}
      className={cx(
        'pak-form',
        `pak-form--${kind}`,
        className,
        classNames.form,
      )}
      onSubmit={handleSubmit}
    >
      <div
        role="alert"
        className={cx('pak-form__error-summary', classNames.errorSummary)}
      >
        {visibleErrors.length > 0 && (
          <>
            <p>{labels.errorSummary}</p>
            <ul>
              {visibleErrors.map((field) => (
                <li key={field}>
                  <a href={`#${id(field)}`} onClick={summaryLink(field)}>
                    {errors[field]}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {fields.map((field) => {
        const error = errorFor(field);
        return (
          <div
            key={field}
            className={cx('pak-form__field', classNames.field)}
            data-field={field}
            data-invalid={error ? '' : undefined}
          >
            {label(field)}
            {control(field)}
            {error && (
              <p
                id={id(`${field}-error`)}
                className={cx('pak-form__error', classNames.error)}
              >
                {error}
              </p>
            )}
          </div>
        );
      })}

      {hintsEnabled && (
        <div
          id={id('hints')}
          aria-live="polite"
          className={cx('pak-form__hints', classNames.hints)}
          data-status={hints.status}
        >
          {hints.status === 'loading' && <p>{labels.hintsLoading}</p>}
          {hints.messages.length > 0 && (
            <>
              <p>{labels.hints}</p>
              <ul>
                {hints.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {children}

      <button
        type="submit"
        className={cx('pak-form__submit', classNames.submit)}
      >
        {labels.submit}
      </button>
    </form>
  );
}

/**
 * Unstyled delivery address form: full name, mobile number, province,
 * district, optional tehsil, city (with suggestions), address, nearby place
 * and postal code. Validates with pakdatakit and calls `onSubmit` with the
 * trimmed values.
 *
 * @example
 * <PakCheckoutForm onSubmit={(values) => save(values)} />
 */
export function PakCheckoutForm(props: PakFormProps<PakCheckoutValues>) {
  return <PakForm<PakCheckoutValues> {...props} kind="checkout" />;
}

/**
 * {@link PakCheckoutForm} with a required CNIC number, for know-your-customer
 * checks.
 *
 * @example
 * <PakKycForm locale="ur" onSubmit={(values) => verify(values.cnic)} />
 */
export function PakKycForm(props: PakFormProps<PakKycValues>) {
  return <PakForm<PakKycValues> {...props} kind="kyc" />;
}
