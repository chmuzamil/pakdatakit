/// The language of the checkout and KYC forms.
enum PakFormLocale {
  /// English, left to right.
  en,

  /// Urdu, right to left.
  ur,
}

/// Default labels, placeholders, errors and hint messages of the checkout and
/// KYC forms.
///
/// Field labels are keyed by `PakFormField.name` (`fullName`, `mobile`,
/// `province`, `district`, `tehsil`, `city`, `address`, `landmark`,
/// `postalCode`, `cnic`). Override any entry with the `labels` map of a
/// form. Messages may contain `{score}`, `{parts}`, `{code}` and `{city}`
/// placeholders.
abstract final class PakFormLabels {
  /// English defaults.
  static const Map<String, String> en = {
    // Field labels.
    'fullName': 'Full name',
    'mobile': 'Mobile number',
    'province': 'Province',
    'district': 'District',
    'tehsil': 'Tehsil',
    'city': 'City',
    'address': 'Address',
    'landmark': 'Nearby place',
    'postalCode': 'Postal code',
    'cnic': 'CNIC',
    'submit': 'Submit',
    'optional': '(optional)',
    // Placeholders.
    'mobilePlaceholder': '0300-1234567',
    'cnicPlaceholder': '35202-1234567-1',
    'provincePlaceholder': 'Select province',
    'districtPlaceholder': 'Select district',
    'tehsilPlaceholder': 'Select tehsil',
    'cityPlaceholder': 'Start typing a city',
    'addressPlaceholder': 'House, street, area',
    'landmarkPlaceholder': 'e.g. near Liberty Market',
    'postalCodePlaceholder': '54000',
    // Errors.
    'required': 'This field is required',
    'fullNameRequired': 'Enter your full name',
    'mobileInvalid': 'Enter a valid mobile number',
    'provinceRequired': 'Select a province',
    'districtRequired': 'Select a district',
    'cityRequired': 'Enter a city',
    'addressRequired': 'Enter your address',
    'postalCodeInvalid': 'A postal code has 5 digits',
    'cnicInvalid': 'Enter a valid CNIC',
    'errorSummary': 'Please correct the fields marked in red.',
    // Hints.
    'hintAddressScore': 'Address completeness: {score}/100',
    'hintMissing': 'You could add: {parts}',
    'hintPostalCode': 'Postal code {code} belongs to {city}',
    'part.city': 'city',
    'part.houseNumber': 'house number',
    'part.street': 'street',
    'part.area': 'area',
    'part.postalCode': 'postal code',
    'part.landmark': 'nearby place',
    'phone.landline': 'This looks like a landline number',
    'phone.not-mobile': 'This is not a mobile number',
    'phone.repeated-digits': 'This number repeats the same digit',
    'phone.sequential-digits': 'This number is a run of digits',
    'phone.test-number': 'This looks like a test number',
  };

  /// Urdu defaults.
  static const Map<String, String> ur = {
    'fullName': 'نام',
    'mobile': 'موبائل نمبر',
    'province': 'صوبہ',
    'district': 'ضلع',
    'tehsil': 'تحصیل',
    'city': 'شہر',
    'address': 'پتہ',
    'landmark': 'قریبی جگہ',
    'postalCode': 'پوسٹل کوڈ',
    'cnic': 'شناختی کارڈ نمبر',
    'submit': 'جمع کریں',
    'optional': '(اختیاری)',
    'mobilePlaceholder': '0300-1234567',
    'cnicPlaceholder': '35202-1234567-1',
    'provincePlaceholder': 'صوبہ منتخب کریں',
    'districtPlaceholder': 'ضلع منتخب کریں',
    'tehsilPlaceholder': 'تحصیل منتخب کریں',
    'cityPlaceholder': 'شہر کا نام لکھیں',
    'addressPlaceholder': 'مکان نمبر، گلی، علاقہ',
    'landmarkPlaceholder': 'مثلاً مسجد یا مارکیٹ کے قریب',
    'postalCodePlaceholder': '54000',
    'required': 'یہ خانہ بھرنا ضروری ہے',
    'fullNameRequired': 'اپنا نام لکھیں',
    'mobileInvalid': 'درست موبائل نمبر لکھیں',
    'provinceRequired': 'صوبہ منتخب کریں',
    'districtRequired': 'ضلع منتخب کریں',
    'cityRequired': 'شہر کا نام لکھیں',
    'addressRequired': 'اپنا پتہ لکھیں',
    'postalCodeInvalid': 'پوسٹل کوڈ پانچ ہندسوں کا ہوتا ہے',
    'cnicInvalid': 'درست شناختی کارڈ نمبر لکھیں',
    'errorSummary': 'براہ کرم سرخ نشان والے خانے درست کریں۔',
    'hintAddressScore': 'پتہ کتنا مکمل ہے: {score}/100',
    'hintMissing': 'یہ بھی لکھ دیں: {parts}',
    'hintPostalCode': 'پوسٹل کوڈ {code} {city} کا ہے',
    'part.city': 'شہر',
    'part.houseNumber': 'مکان نمبر',
    'part.street': 'گلی',
    'part.area': 'علاقہ',
    'part.postalCode': 'پوسٹل کوڈ',
    'part.landmark': 'قریبی جگہ',
    'phone.landline': 'یہ لینڈ لائن نمبر لگتا ہے',
    'phone.not-mobile': 'یہ موبائل نمبر نہیں ہے',
    'phone.repeated-digits': 'اس نمبر میں ایک ہی ہندسہ بار بار ہے',
    'phone.sequential-digits': 'اس نمبر کے ہندسے ترتیب سے ہیں',
    'phone.test-number': 'یہ آزمائشی نمبر لگتا ہے',
  };

  /// The defaults for [locale] with [overrides] applied on top.
  static Map<String, String> resolve(
    PakFormLocale locale, [
    Map<String, String>? overrides,
  ]) =>
      {
        ...(locale == PakFormLocale.ur ? ur : en),
        ...?overrides,
      };
}
