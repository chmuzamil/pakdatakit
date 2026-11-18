import type { AddressPart, PhoneRiskFlag } from 'pakdatakit/quality';

/** Form language. `'ur'` also sets `dir="rtl"` and `lang="ur"` on the form. */
export type PakFormLocale = 'en' | 'ur';

/**
 * Every piece of text the checkout and KYC forms show: labels, select
 * placeholders, error messages and hint messages. Override any of them with
 * the `labels` prop (or the `labels` option of `createPakRules`).
 */
export interface PakFormLabels {
  fullName: string;
  mobile: string;
  cnic: string;
  province: string;
  district: string;
  tehsil: string;
  city: string;
  address: string;
  landmark: string;
  postalCode: string;
  /** Added after the label of an optional field. */
  optional: string;
  submit: string;

  mobilePlaceholder: string;
  cnicPlaceholder: string;
  cityPlaceholder: string;
  postalCodePlaceholder: string;
  chooseProvince: string;
  chooseDistrict: string;
  chooseTehsil: string;

  fullNameRequired: string;
  mobileRequired: string;
  mobileInvalid: string;
  cnicRequired: string;
  cnicInvalid: string;
  provinceRequired: string;
  districtRequired: string;
  cityRequired: string;
  addressRequired: string;
  postalCodeInvalid: string;
  /** Heading of the error summary shown after a failed submit. */
  errorSummary: string;

  /** Heading of the hints list. */
  hints: string;
  hintsLoading: string;
  addressScore: (score: number) => string;
  addressMissing: (parts: string[]) => string;
  addressParts: Record<AddressPart, string>;
  phoneFlags: Record<PhoneRiskFlag, string>;
  postalCodeCity: (postalCode: string, city: string) => string;
}

/** Overrides for {@link PakFormLabels}; `addressParts` and `phoneFlags` may be partial. */
export type PakFormLabelOverrides = Partial<
  Omit<PakFormLabels, 'addressParts' | 'phoneFlags'>
> & {
  addressParts?: Partial<Record<AddressPart, string>>;
  phoneFlags?: Partial<Record<PhoneRiskFlag, string>>;
};

const EN: PakFormLabels = {
  fullName: 'Full name',
  mobile: 'Mobile number',
  cnic: 'CNIC number',
  province: 'Province',
  district: 'District',
  tehsil: 'Tehsil',
  city: 'City',
  address: 'Address',
  landmark: 'Nearby place',
  postalCode: 'Postal code',
  optional: '(optional)',
  submit: 'Submit',

  mobilePlaceholder: '0300-1234567',
  cnicPlaceholder: '35202-1234567-1',
  cityPlaceholder: 'Start typing your city',
  postalCodePlaceholder: '54000',
  chooseProvince: 'Choose a province',
  chooseDistrict: 'Choose a district',
  chooseTehsil: 'Choose a tehsil',

  fullNameRequired: 'Enter your full name.',
  mobileRequired: 'Enter your mobile number.',
  mobileInvalid: 'Enter a valid Pakistani mobile number, like 0300-1234567.',
  cnicRequired: 'Enter your CNIC number.',
  cnicInvalid: 'Enter a valid CNIC number, like 35202-1234567-1.',
  provinceRequired: 'Choose a province.',
  districtRequired: 'Choose a district.',
  cityRequired: 'Enter your city.',
  addressRequired: 'Enter your address.',
  postalCodeInvalid: 'A postal code has 5 digits.',
  errorSummary: 'Please fix the following:',

  hints: 'Suggestions',
  hintsLoading: 'Loading suggestions…',
  addressScore: (score) => `Address completeness: ${score} out of 100.`,
  addressMissing: (parts) => `To help the rider, add: ${parts.join(', ')}.`,
  addressParts: {
    city: 'city',
    houseNumber: 'house number',
    street: 'street',
    area: 'area',
    postalCode: 'postal code',
    landmark: 'a nearby place',
  },
  phoneFlags: {
    invalid: 'This does not look like a Pakistani phone number.',
    landline: 'This is a landline. Couriers cannot send it an SMS.',
    'not-mobile': 'This is not a mobile number.',
    'repeated-digits': 'The number repeats the same digits. Please check it.',
    'sequential-digits':
      'The number is a sequence like 1234567. Please check it.',
    'test-number': 'This looks like a sample number. Please check it.',
  },
  postalCodeCity: (postalCode, city) =>
    `Postal code ${postalCode} is for ${city}. Please check the city or the postal code.`,
};

const UR: PakFormLabels = {
  fullName: 'نام',
  mobile: 'موبائل نمبر',
  cnic: 'شناختی کارڈ نمبر',
  province: 'صوبہ',
  district: 'ضلع',
  tehsil: 'تحصیل',
  city: 'شہر',
  address: 'پتہ',
  landmark: 'قریبی جگہ',
  postalCode: 'پوسٹل کوڈ',
  optional: '(اختیاری)',
  submit: 'جمع کریں',

  mobilePlaceholder: '0300-1234567',
  cnicPlaceholder: '35202-1234567-1',
  cityPlaceholder: 'اپنے شہر کا نام لکھنا شروع کریں',
  postalCodePlaceholder: '54000',
  chooseProvince: 'صوبہ منتخب کریں',
  chooseDistrict: 'ضلع منتخب کریں',
  chooseTehsil: 'تحصیل منتخب کریں',

  fullNameRequired: 'اپنا نام لکھیں۔',
  mobileRequired: 'اپنا موبائل نمبر لکھیں۔',
  mobileInvalid: 'درست پاکستانی موبائل نمبر لکھیں، جیسے 0300-1234567۔',
  cnicRequired: 'اپنا شناختی کارڈ نمبر لکھیں۔',
  cnicInvalid: 'درست شناختی کارڈ نمبر لکھیں، جیسے 35202-1234567-1۔',
  provinceRequired: 'صوبہ منتخب کریں۔',
  districtRequired: 'ضلع منتخب کریں۔',
  cityRequired: 'اپنا شہر لکھیں۔',
  addressRequired: 'اپنا پتہ لکھیں۔',
  postalCodeInvalid: 'پوسٹل کوڈ پانچ ہندسوں کا ہوتا ہے۔',
  errorSummary: 'براہ کرم یہ درست کریں:',

  hints: 'تجاویز',
  hintsLoading: 'تجاویز لوڈ ہو رہی ہیں…',
  addressScore: (score) => `پتہ کتنا مکمل ہے: 100 میں سے ${score}۔`,
  addressMissing: (parts) =>
    `رائیڈر کی آسانی کے لیے یہ شامل کریں: ${parts.join('، ')}۔`,
  addressParts: {
    city: 'شہر',
    houseNumber: 'مکان نمبر',
    street: 'گلی',
    area: 'علاقہ',
    postalCode: 'پوسٹل کوڈ',
    landmark: 'قریبی جگہ',
  },
  phoneFlags: {
    invalid: 'یہ پاکستانی فون نمبر نہیں لگتا۔',
    landline: 'یہ لینڈ لائن نمبر ہے، اس پر SMS نہیں جا سکتا۔',
    'not-mobile': 'یہ موبائل نمبر نہیں ہے۔',
    'repeated-digits': 'نمبر میں ایک ہی ہندسے بار بار ہیں، براہ کرم دیکھ لیں۔',
    'sequential-digits': 'نمبر 1234567 جیسی ترتیب ہے، براہ کرم دیکھ لیں۔',
    'test-number': 'یہ نمونے کا نمبر لگتا ہے، براہ کرم دیکھ لیں۔',
  },
  postalCodeCity: (postalCode, city) =>
    `پوسٹل کوڈ ${postalCode} ${city} کا ہے۔ شہر یا پوسٹل کوڈ دیکھ لیں۔`,
};

/** The built-in English and Urdu texts. */
export const PAK_FORM_LABELS: Readonly<Record<PakFormLocale, PakFormLabels>> = {
  en: EN,
  ur: UR,
};

/** Built-in texts for `locale` with `overrides` applied. */
export function resolveLabels(
  locale: PakFormLocale = 'en',
  overrides?: PakFormLabelOverrides,
): PakFormLabels {
  const base = PAK_FORM_LABELS[locale] ?? EN;
  if (!overrides) return base;
  const { addressParts, phoneFlags, ...rest } = overrides;
  const merged: PakFormLabels = { ...base };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined)
      (merged as unknown as Record<string, unknown>)[key] = value;
  }
  merged.addressParts = { ...base.addressParts, ...definedOnly(addressParts) };
  merged.phoneFlags = { ...base.phoneFlags, ...definedOnly(phoneFlags) };
  return merged;
}

function definedOnly<T extends object>(value: T | undefined): Partial<T> {
  const out: Partial<T> = {};
  if (!value) return out;
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined) (out as Record<string, unknown>)[key] = v;
  }
  return out;
}
