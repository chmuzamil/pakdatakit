export {
  validateCNIC,
  getCNICInfo,
  findCNICs,
  maskCNICs,
  type CNICInfo,
  type CNICMatch,
  type MaskCNICsOptions,
  type FindCNICsOptions,
  type MaskedText,
} from './cnic.js';
export {
  validatePhone,
  formatPhone,
  analyzePhone,
  type PhoneAnalysis,
  type NetworkName,
} from './phone.js';
export { getNetwork } from './networks.js';
export {
  getProvince,
  searchCities,
  getDistrictProvince,
  searchDistricts,
  getDistrictsByProvince,
  getDivisions,
  getDivisionOfDistrict,
  getTehsils,
  getTehsilDistrict,
} from './geo.js';
export {
  formatPKR,
  formatLakh,
  parseAmount,
  formatAmountInput,
  type ParsedAmount,
} from './format.js';
export { createWhatsAppLink } from './whatsapp.js';
export {
  validateIBAN,
  getBankFromIBAN,
  getBankInfo,
  getBanks,
  type BankInfo,
  type BankType,
} from './iban.js';
export {
  getCityByPostalCode,
  getPostalCode,
  getPostalCodes,
  getPostalAreas,
  searchPostalCodes,
} from './postal.js';
export {
  getPostOffice,
  searchPostOffices,
  type PostOffice,
} from './post-offices.js';
export { parseAddress, formatAddress, type ParsedAddress } from './address.js';
export {
  normalizeText,
  normalizeRomanUrdu,
  romanUrduKey,
  toUrduDigits,
  toEnglishDigits,
  slugify,
  compareUrdu,
  isRTL,
  wrapBidi,
  type SlugScript,
  type SlugifyOptions,
  type BidiDirection,
} from './text.js';
export {
  toHijri,
  fromHijri,
  formatHijri,
  getHijriMonthName,
  isRamadan,
  type HijriDate,
  type HijriOptions,
} from './hijri.js';
export {
  numberToWords,
  amountInWords,
  type WordsLanguage,
  type NumberToWordsOptions,
  type AmountInWordsOptions,
} from './words.js';
export {
  analyzeNTN,
  validateNTN,
  validateSTRN,
  type NTNInfo,
  type NTNType,
} from './tax.js';
export {
  analyzeNumber,
  getNumberType,
  validateLandline,
  getAreaCode,
  type NumberInfo,
  type NumberType,
} from './numbers.js';
export {
  createRaastP2PQr,
  createMerchantQr,
  parseRaastQr,
  validateRaastQr,
  type RaastDuration,
  type RaastQrValidation,
  type RaastQrError,
  type RaastQrWarning,
  type ValidateRaastQrOptions,
  type RaastP2PQrOptions,
  type MerchantQrOptions,
  type MerchantAccountInfo,
  type ParsedRaastQr,
} from './raast.js';
export {
  getPakistanHolidays,
  getHolidaysOn,
  isPakistanHoliday,
  type Holiday,
  type HolidayId,
  type HolidayOptions,
  type IslamicHolidayId,
} from './holidays.js';
export {
  formatCNICInput,
  checkCNICInput,
  formatPhoneInput,
  checkPhoneInput,
  formatIBANInput,
  checkIBANInput,
  type InputState,
} from './input.js';
export { validatePassport } from './passport.js';
export {
  validateVehiclePlate,
  parseVehiclePlate,
  type VehiclePlate,
} from './vehicle.js';
export {
  scoreAddress,
  phoneRiskSignals,
  ADDRESS_WEIGHTS,
  type AddressScore,
  type AddressPart,
  type PhoneRiskFlag,
} from './quality.js';
export {
  getSalesTaxRate,
  calculateSalesTax,
  splitInclusive,
  type SalesTaxKind,
  type SalesTaxRate,
  type SalesTaxRateQuery,
  type SalesTaxAmounts,
  type SalesTaxOptions,
} from './salestax.js';
export {
  parseElectricityRef,
  validateElectricityRef,
  validateGasConsumerNumber,
  type ElectricityRef,
  type ElectricityRefType,
  type GasCompany,
} from './bills.js';
export {
  mapCourierStatus,
  normalizeCityForCourier,
  type Courier,
  type CourierStatus,
} from './courier.js';
export {
  buildFbrInvoice,
  validateFbrInvoice,
  expectedSalesTax,
  FBR_DI_SPEC_VERSION,
  type FbrInvoice,
  type FbrInvoiceItem,
  type FbrInvoiceInput,
  type FbrInvoiceItemInput,
  type FbrInvoiceBuild,
  type FbrInvoiceTotals,
  type FbrInvoiceError,
  type FbrInvoiceValidation,
  type FbrInvoiceValidationOptions,
  type FbrInvoiceType,
  type FbrRegistrationType,
} from './fbr-invoice.js';
export {
  getSalaryTaxSlabs,
  getSalaryTaxYears,
  getTaxYear,
  calculateSalaryTax,
  calculateMonthlySalaryTax,
  type SalaryTax,
  type SalaryTaxOptions,
  type SalaryTaxSlab,
  type SalaryTaxSurcharge,
  type SalaryTaxYear,
} from './incometax.js';
export { dataVersion } from './data-version.js';
export {
  getDataInfo,
  listDataInfo,
  type DataInfo,
  type DataSource,
} from './data-info.js';
export {
  getZakatNisab,
  getZakatYears,
  zakatDeduction,
  type ZakatNisab,
  type ZakatDocument,
  type ZakatYearQuery,
  type ZakatDeduction,
  type ZakatDeductionInput,
} from './zakat.js';
export {
  getDistrictPopulation,
  getTehsilPopulation,
  type CensusCounts,
  type DistrictPopulation,
  type TehsilPopulation,
} from './population.js';
