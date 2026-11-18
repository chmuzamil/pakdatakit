import { validateCNIC } from 'pakdatakit/cnic';
import {
  getDistrictsByProvince,
  getProvince,
  getTehsils,
  searchCities,
} from 'pakdatakit/geo';
import type { AddressPart, PhoneRiskFlag } from 'pakdatakit/quality';
import { validatePhone } from 'pakdatakit/phone';
import { fill, type PakFormText } from './text.js';

/** Which ready-made form: checkout (address) or KYC (address and CNIC). */
export type PakFormKind = 'checkout' | 'kyc';

/** Values of the checkout and KYC forms. `cnic` is used by the KYC form. */
export interface PakFormValues {
  name: string;
  mobile: string;
  cnic: string;
  province: string;
  district: string;
  tehsil: string;
  city: string;
  address: string;
  landmark: string;
  postalCode: string;
}

/** A field of the forms. */
export type PakFormField = keyof PakFormValues;

/** Validation errors by field (only fields with an error are present). */
export type PakFormErrors = Partial<Record<PakFormField, string>>;

/** The seven provinces and territories, as named in the pakdatakit data. */
export const PAK_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
] as const;

/** One of {@link PAK_PROVINCES}. */
export type PakProvince = (typeof PAK_PROVINCES)[number];

/** Empty form values. */
export function emptyPakFormValues(): PakFormValues {
  return {
    name: '',
    mobile: '',
    cnic: '',
    province: '',
    district: '',
    tehsil: '',
    city: '',
    address: '',
    landmark: '',
    postalCode: '',
  };
}

/** Fields shown by a form, in order. */
export function pakFormFields(
  kind: PakFormKind,
  tehsil: boolean,
): PakFormField[] {
  return [
    'name',
    'mobile',
    ...(kind === 'kyc' ? (['cnic'] as const) : []),
    'province',
    'district',
    ...(tehsil ? (['tehsil'] as const) : []),
    'city',
    'address',
    'landmark',
    'postalCode',
  ];
}

/** Whether a field must be filled in. */
export function isRequiredField(field: PakFormField): boolean {
  return field !== 'tehsil' && field !== 'landmark' && field !== 'postalCode';
}

/** Label of a province in the form's language (the value stays English). */
export function provinceLabel(province: string, text: PakFormText): string {
  const key =
    `province${province.replace(/[^A-Za-z]/g, '')}` as keyof PakFormText;
  return text[key] ?? province;
}

/** Districts of a province (empty until a province is chosen). */
export function districtOptions(province: string): string[] {
  return province ? getDistrictsByProvince(province) : [];
}

/** Tehsils of a district (empty until a district is chosen). */
export function tehsilOptions(district: string): string[] {
  return district ? getTehsils(district) : [];
}

/**
 * City suggestions for what the user typed, limited to the chosen province.
 * There is no official city-to-district mapping, so the city stays free text.
 */
export function citySuggestions(
  query: string,
  province: string,
  limit = 20,
): string[] {
  const q = query.trim();
  if (!q) return [];
  const matches = searchCities(q);
  return (
    province
      ? matches.filter((city) => getProvince(city) === province)
      : matches
  ).slice(0, limit);
}

/**
 * Values after a field change, applying the cascade: a new province clears
 * district, tehsil and city; a new district clears tehsil.
 */
export function withField(
  values: PakFormValues,
  field: PakFormField,
  value: string,
): PakFormValues {
  const next = { ...values, [field]: value };
  if (field === 'province' && value !== values.province) {
    next.district = '';
    next.tehsil = '';
    next.city = '';
  }
  if (field === 'district' && value !== values.district) next.tehsil = '';
  return next;
}

/** Validates one field. Returns the error message or `null`. */
export function validatePakField(
  field: PakFormField,
  values: PakFormValues,
  text: PakFormText,
): string | null {
  const value = values[field].trim();
  switch (field) {
    case 'name':
      return value ? null : text.nameRequired;
    case 'mobile':
      if (!value) return text.mobileRequired;
      return validatePhone(value) ? null : text.mobileInvalid;
    case 'cnic':
      if (!value) return text.cnicRequired;
      return validateCNIC(value) ? null : text.cnicInvalid;
    case 'province':
      return value ? null : text.provinceRequired;
    case 'district':
      return value ? null : text.districtRequired;
    case 'city':
      return value ? null : text.cityRequired;
    case 'address':
      return value ? null : text.addressRequired;
    case 'postalCode':
      return !value || /^\d{5}$/.test(value) ? null : text.postalCodeInvalid;
    default:
      return null;
  }
}

/** Validates every field of a form. An empty object means it is valid. */
export function validatePakForm(
  kind: PakFormKind,
  values: PakFormValues,
  text: PakFormText,
  tehsil = false,
): PakFormErrors {
  const errors: PakFormErrors = {};
  for (const field of pakFormFields(kind, tehsil)) {
    const error = validatePakField(field, values, text);
    if (error) errors[field] = error;
  }
  return errors;
}

/** Trimmed values to submit. `cnic` is left out of the checkout form. */
export function submittedValues(
  kind: PakFormKind,
  values: PakFormValues,
  tehsil = false,
): PakFormValues {
  const out = emptyPakFormValues();
  for (const field of pakFormFields(kind, tehsil))
    out[field] = values[field].trim();
  return out;
}

/** The functions hints need, loaded on demand. */
export interface PakHintEngine {
  scoreAddress: (input: string) => { score: number; missing: AddressPart[] };
  phoneRiskSignals: (input: string) => PhoneRiskFlag[];
  getCityByPostalCode: (postalCode: string) => string | null;
}

let engine: Promise<PakHintEngine> | null = null;

/**
 * Loads `pakdatakit/quality` and `pakdatakit/postal` (with the post office
 * directory, about 32 kB gzipped) the first time hints are turned on.
 */
export function loadPakHintEngine(): Promise<PakHintEngine> {
  engine ??= Promise.all([
    import('pakdatakit/quality'),
    import('pakdatakit/postal'),
  ]).then(([quality, postal]) => ({
    scoreAddress: quality.scoreAddress,
    phoneRiskSignals: quality.phoneRiskSignals,
    getCityByPostalCode: postal.getCityByPostalCode,
  }));
  engine.catch(() => {
    engine = null;
  });
  return engine;
}

/** Non-blocking hints, by field. */
export interface PakFormHints {
  /** Address completeness from 0 to 100, or `null` before an address is typed. */
  score: number | null;
  address: string[];
  mobile: string[];
  postalCode: string[];
}

const PART_TEXT: Record<AddressPart, keyof PakFormText> = {
  city: 'partCity',
  houseNumber: 'partHouseNumber',
  street: 'partStreet',
  area: 'partArea',
  postalCode: 'partPostalCode',
  landmark: 'partLandmark',
};

const RISK_TEXT: Record<PhoneRiskFlag, keyof PakFormText> = {
  invalid: 'riskInvalid',
  landline: 'riskLandline',
  'not-mobile': 'riskNotMobile',
  'repeated-digits': 'riskRepeatedDigits',
  'sequential-digits': 'riskSequentialDigits',
  'test-number': 'riskTestNumber',
};

/** Builds the hint messages for the current values. */
export function pakFormHints(
  hintEngine: PakHintEngine,
  values: PakFormValues,
  text: PakFormText,
): PakFormHints {
  const hints: PakFormHints = {
    score: null,
    address: [],
    mobile: [],
    postalCode: [],
  };
  const address = values.address.trim();
  if (address) {
    const landmark = values.landmark.trim();
    const parts = [
      address,
      landmark &&
        (/\b(near|opp)/i.test(landmark) ? landmark : `near ${landmark}`),
      values.city.trim(),
      values.postalCode.trim(),
    ].filter(Boolean);
    const result = hintEngine.scoreAddress(parts.join(', '));
    hints.score = result.score;
    hints.address.push(fill(text.hintAddressScore, { score: result.score }));
    if (result.missing.length > 0) {
      const missing = result.missing.map((part) => text[PART_TEXT[part]]);
      hints.address.push(
        `${text.hintAddressMissing} ${missing.join(text.listSeparator)}`,
      );
    }
  }
  const mobile = values.mobile.trim();
  if (mobile) {
    for (const flag of hintEngine.phoneRiskSignals(mobile)) {
      hints.mobile.push(text[RISK_TEXT[flag]]);
    }
  }
  const postalCode = values.postalCode.trim();
  const city = values.city.trim();
  if (city && /^\d{5}$/.test(postalCode)) {
    const postalCity = hintEngine.getCityByPostalCode(postalCode);
    if (postalCity && postalCity.toLowerCase() !== city.toLowerCase()) {
      hints.postalCode.push(
        fill(text.hintPostalMismatch, { city: postalCity }),
      );
    }
  }
  return hints;
}
