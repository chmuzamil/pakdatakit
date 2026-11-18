/** Language of the form's labels, placeholders, errors and hints. */
export type PakFormLocale = 'en' | 'ur';

/**
 * Every piece of text the forms show. Pass a partial object as `labels` to
 * override any of them. `{score}` and `{city}` are replaced in the hint texts.
 */
export interface PakFormText {
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
  submit: string;
  optional: string;
  listSeparator: string;
  selectPlaceholder: string;
  mobilePlaceholder: string;
  cnicPlaceholder: string;
  cityPlaceholder: string;
  addressPlaceholder: string;
  landmarkPlaceholder: string;
  postalCodePlaceholder: string;
  errorSummary: string;
  nameRequired: string;
  mobileRequired: string;
  mobileInvalid: string;
  cnicRequired: string;
  cnicInvalid: string;
  provinceRequired: string;
  districtRequired: string;
  cityRequired: string;
  addressRequired: string;
  postalCodeInvalid: string;
  hintAddressScore: string;
  hintAddressMissing: string;
  hintPostalMismatch: string;
  partCity: string;
  partHouseNumber: string;
  partStreet: string;
  partArea: string;
  partPostalCode: string;
  partLandmark: string;
  riskInvalid: string;
  riskLandline: string;
  riskNotMobile: string;
  riskRepeatedDigits: string;
  riskSequentialDigits: string;
  riskTestNumber: string;
  provincePunjab: string;
  provinceSindh: string;
  provinceKhyberPakhtunkhwa: string;
  provinceBalochistan: string;
  provinceIslamabadCapitalTerritory: string;
  provinceGilgitBaltistan: string;
  provinceAzadJammuAndKashmir: string;
}

const EN: PakFormText = {
  name: 'Full name',
  mobile: 'Mobile number',
  cnic: 'CNIC number',
  province: 'Province',
  district: 'District',
  tehsil: 'Tehsil',
  city: 'City',
  address: 'Address',
  landmark: 'Nearby place',
  postalCode: 'Postal code',
  submit: 'Submit',
  optional: '(optional)',
  listSeparator: ', ',
  selectPlaceholder: 'Select…',
  mobilePlaceholder: '0300-1234567',
  cnicPlaceholder: '35202-1234567-1',
  cityPlaceholder: 'Start typing a city',
  addressPlaceholder: 'House, street, area',
  landmarkPlaceholder: 'e.g. near Liberty Market',
  postalCodePlaceholder: '54000',
  errorSummary: 'Please fix the following:',
  nameRequired: 'Enter your full name',
  mobileRequired: 'Enter your mobile number',
  mobileInvalid: 'Enter a valid mobile number, like 0300-1234567',
  cnicRequired: 'Enter your CNIC number',
  cnicInvalid: 'Enter a valid CNIC number, like 35202-1234567-1',
  provinceRequired: 'Select a province',
  districtRequired: 'Select a district',
  cityRequired: 'Enter your city',
  addressRequired: 'Enter your address',
  postalCodeInvalid: 'A postal code has 5 digits',
  hintAddressScore: 'Address completeness: {score}/100',
  hintAddressMissing: 'You could add:',
  hintPostalMismatch: 'This postal code belongs to {city}',
  partCity: 'city',
  partHouseNumber: 'house number',
  partStreet: 'street',
  partArea: 'area',
  partPostalCode: 'postal code',
  partLandmark: 'a nearby place',
  riskInvalid: 'This does not look like a Pakistani number',
  riskLandline: 'This is a landline; couriers cannot send it an SMS',
  riskNotMobile: 'This is not a mobile number',
  riskRepeatedDigits: 'The number repeats the same digits',
  riskSequentialDigits: 'The number is a simple sequence',
  riskTestNumber: 'This looks like a test number',
  provincePunjab: 'Punjab',
  provinceSindh: 'Sindh',
  provinceKhyberPakhtunkhwa: 'Khyber Pakhtunkhwa',
  provinceBalochistan: 'Balochistan',
  provinceIslamabadCapitalTerritory: 'Islamabad Capital Territory',
  provinceGilgitBaltistan: 'Gilgit-Baltistan',
  provinceAzadJammuAndKashmir: 'Azad Jammu and Kashmir',
};

const UR: PakFormText = {
  name: 'نام',
  mobile: 'موبائل نمبر',
  cnic: 'شناختی کارڈ نمبر',
  province: 'صوبہ',
  district: 'ضلع',
  tehsil: 'تحصیل',
  city: 'شہر',
  address: 'پتہ',
  landmark: 'قریبی جگہ',
  postalCode: 'پوسٹل کوڈ',
  submit: 'جمع کریں',
  optional: '(اختیاری)',
  listSeparator: '، ',
  selectPlaceholder: 'منتخب کریں…',
  mobilePlaceholder: '0300-1234567',
  cnicPlaceholder: '35202-1234567-1',
  cityPlaceholder: 'شہر کا نام لکھیں',
  addressPlaceholder: 'مکان، گلی، علاقہ',
  landmarkPlaceholder: 'مثلاً لبرٹی مارکیٹ کے قریب',
  postalCodePlaceholder: '54000',
  errorSummary: 'براہِ کرم یہ درست کریں:',
  nameRequired: 'اپنا نام لکھیں',
  mobileRequired: 'اپنا موبائل نمبر لکھیں',
  mobileInvalid: 'درست موبائل نمبر لکھیں، جیسے 0300-1234567',
  cnicRequired: 'اپنا شناختی کارڈ نمبر لکھیں',
  cnicInvalid: 'درست شناختی کارڈ نمبر لکھیں، جیسے 35202-1234567-1',
  provinceRequired: 'صوبہ منتخب کریں',
  districtRequired: 'ضلع منتخب کریں',
  cityRequired: 'اپنا شہر لکھیں',
  addressRequired: 'اپنا پتہ لکھیں',
  postalCodeInvalid: 'پوسٹل کوڈ پانچ ہندسوں کا ہوتا ہے',
  hintAddressScore: 'پتہ کتنا مکمل ہے: {score}/100',
  hintAddressMissing: 'آپ یہ بھی لکھ سکتے ہیں:',
  hintPostalMismatch: 'یہ پوسٹل کوڈ {city} کا ہے',
  partCity: 'شہر',
  partHouseNumber: 'مکان نمبر',
  partStreet: 'گلی',
  partArea: 'علاقہ',
  partPostalCode: 'پوسٹل کوڈ',
  partLandmark: 'قریبی جگہ',
  riskInvalid: 'یہ پاکستانی نمبر نہیں لگتا',
  riskLandline: 'یہ لینڈ لائن نمبر ہے، اس پر SMS نہیں جا سکتا',
  riskNotMobile: 'یہ موبائل نمبر نہیں ہے',
  riskRepeatedDigits: 'نمبر میں ایک ہی ہندسے بار بار ہیں',
  riskSequentialDigits: 'نمبر سیدھی ترتیب میں ہے',
  riskTestNumber: 'یہ آزمائشی نمبر لگتا ہے',
  provincePunjab: 'پنجاب',
  provinceSindh: 'سندھ',
  provinceKhyberPakhtunkhwa: 'خیبر پختونخوا',
  provinceBalochistan: 'بلوچستان',
  provinceIslamabadCapitalTerritory: 'اسلام آباد',
  provinceGilgitBaltistan: 'گلگت بلتستان',
  provinceAzadJammuAndKashmir: 'آزاد جموں و کشمیر',
};

/** Built-in English and Urdu text. */
export const PAK_FORM_TEXT: Readonly<
  Record<PakFormLocale, Readonly<PakFormText>>
> = {
  en: EN,
  ur: UR,
};

/** Text for a locale with the app's overrides applied. */
export function formText(
  locale: PakFormLocale = 'en',
  labels: Partial<PakFormText> = {},
): PakFormText {
  const base = PAK_FORM_TEXT[locale] ?? EN;
  const merged = { ...base };
  for (const [key, value] of Object.entries(labels)) {
    if (typeof value === 'string') merged[key as keyof PakFormText] = value;
  }
  return merged;
}

/** Replaces `{name}` placeholders in a message. */
export function fill(
  message: string,
  values: Record<string, string | number>,
): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
