import { validateCNIC } from 'pakdatakit/cnic';
import { validatePhone } from 'pakdatakit/phone';
import {
  resolveLabels,
  type PakFormLabelOverrides,
  type PakFormLabels,
  type PakFormLocale,
} from './labels.js';

/** Values of `PakCheckoutForm`. Every value is a string; empty when not given. */
export interface PakCheckoutValues {
  fullName: string;
  mobile: string;
  province: string;
  district: string;
  /** Empty unless the form shows the tehsil field. */
  tehsil: string;
  city: string;
  address: string;
  landmark: string;
  postalCode: string;
}

/** Values of `PakKycForm`: the checkout values plus the CNIC. */
export interface PakKycValues extends PakCheckoutValues {
  cnic: string;
}

/** Name of a form field. */
export type PakFormField = keyof PakKycValues;

/** Which form: `'checkout'` or `'kyc'` (adds a required CNIC). */
export type PakFormKind = 'checkout' | 'kyc';

/** Error message for each invalid field. */
export type PakFormErrors = Partial<Record<PakFormField, string>>;

/** Empty checkout values. */
export const EMPTY_CHECKOUT_VALUES: Readonly<PakCheckoutValues> = {
  fullName: '',
  mobile: '',
  province: '',
  district: '',
  tehsil: '',
  city: '',
  address: '',
  landmark: '',
  postalCode: '',
};

/** Empty KYC values. */
export const EMPTY_KYC_VALUES: Readonly<PakKycValues> = {
  ...EMPTY_CHECKOUT_VALUES,
  cnic: '',
};

/** The 7 province and territory names used in pakdatakit's data. */
export const PAK_PROVINCES: readonly string[] = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
];

const POSTAL_CODE = /^\d{5}$/;

/**
 * Checks one field and returns its error message, or `null` when it is fine.
 * Text is trimmed first. `landmark`, `tehsil` and `postalCode` are optional.
 */
export function validatePakField(
  field: PakFormField,
  value: string | null | undefined,
  labels: PakFormLabels = resolveLabels('en'),
): string | null {
  const text = (value ?? '').trim();
  switch (field) {
    case 'fullName':
      return text ? null : labels.fullNameRequired;
    case 'mobile':
      if (!text) return labels.mobileRequired;
      return validatePhone(text) ? null : labels.mobileInvalid;
    case 'cnic':
      if (!text) return labels.cnicRequired;
      return validateCNIC(text) ? null : labels.cnicInvalid;
    case 'province':
      return text ? null : labels.provinceRequired;
    case 'district':
      return text ? null : labels.districtRequired;
    case 'city':
      return text ? null : labels.cityRequired;
    case 'address':
      return text ? null : labels.addressRequired;
    case 'postalCode':
      return !text || POSTAL_CODE.test(text) ? null : labels.postalCodeInvalid;
    case 'tehsil':
    case 'landmark':
      return null;
  }
}

/** Fields a form of `kind` shows, in order. */
export function pakFormFields(
  kind: PakFormKind,
  tehsil = false,
): PakFormField[] {
  const fields: PakFormField[] = ['fullName', 'mobile'];
  if (kind === 'kyc') fields.push('cnic');
  fields.push('province', 'district');
  if (tehsil) fields.push('tehsil');
  fields.push('city', 'address', 'landmark', 'postalCode');
  return fields;
}

/** Options for {@link validatePakForm} and {@link createPakRules}. */
export interface PakValidationOptions {
  locale?: PakFormLocale | undefined;
  labels?: PakFormLabelOverrides | undefined;
}

/** Validates every field of a form of `kind`. Returns `{}` when all are fine. */
export function validatePakForm(
  values: Partial<PakKycValues>,
  kind: PakFormKind,
  options: PakValidationOptions & { tehsil?: boolean | undefined } = {},
): PakFormErrors {
  const labels = resolveLabels(options.locale, options.labels);
  const errors: PakFormErrors = {};
  for (const field of pakFormFields(kind, options.tehsil)) {
    const error = validatePakField(field, values[field], labels);
    if (error) errors[field] = error;
  }
  return errors;
}

/** Trims every value (masked CNIC and mobile values are kept as formatted). */
export function trimPakValues<T extends PakCheckoutValues>(values: T): T {
  const out = { ...values };
  for (const key of Object.keys(out) as (keyof T)[]) {
    const value = out[key];
    if (typeof value === 'string') out[key] = value.trim() as T[keyof T];
  }
  return out;
}

/**
 * A field rule in the shape react-hook-form's `register` accepts:
 * `register('cnic', pakRules.cnic)`.
 */
export interface PakFieldRule {
  /** Message when empty, or `false` for an optional field. */
  required: string | false;
  /** Returns `true` or the error message. Also catches whitespace-only values. */
  validate: (value: unknown) => true | string;
}

/** {@link PakFieldRule} for each field. */
export type PakRules = Record<PakFormField, PakFieldRule>;

/**
 * Field rules for react-hook-form (or any library that takes a
 * `{ required, validate }` rule), in the chosen language.
 *
 * @example
 * const rules = createPakRules({ locale: 'ur' });
 * <input {...register('mobile', rules.mobile)} />
 */
export function createPakRules(options: PakValidationOptions = {}): PakRules {
  const labels = resolveLabels(options.locale, options.labels);
  const required: Record<PakFormField, string | false> = {
    fullName: labels.fullNameRequired,
    mobile: labels.mobileRequired,
    cnic: labels.cnicRequired,
    province: labels.provinceRequired,
    district: labels.districtRequired,
    tehsil: false,
    city: labels.cityRequired,
    address: labels.addressRequired,
    landmark: false,
    postalCode: false,
  };
  const rules = {} as PakRules;
  for (const field of Object.keys(required) as PakFormField[]) {
    rules[field] = {
      required: required[field],
      validate: (value) =>
        validatePakField(
          field,
          typeof value === 'string'
            ? value
            : value == null
              ? ''
              : String(value),
          labels,
        ) ?? true,
    };
  }
  return rules;
}

/** English field rules for react-hook-form: `register('cnic', pakRules.cnic)`. */
export const pakRules: PakRules = /* @__PURE__ */ createPakRules();
