/**
 * pakdatakit-faker: seeded mock data for Pakistan.
 *
 * SAFETY: generated CNICs, mobile numbers and IBANs are structurally valid and
 * may coincide with REAL people or accounts, because Pakistan has no reserved
 * test ranges. Never call, SMS or WhatsApp a generated number and never use a
 * generated IBAN with a real bank or payment provider. Use the data in test
 * and demo systems only. For screenshots, `phone({ dialable: false })` gives a
 * number on an unallocated prefix. Emails only use RFC 2606 domains.
 *
 * @packageDocumentation
 */
import { createFaker, type Faker } from './faker.js';

export {
  createFaker,
  RESERVED_EMAIL_DOMAINS,
  PROVINCES,
  type Faker,
  type CreateFakerOptions,
  type Gender,
  type ProvinceInput,
  type ReservedEmailDomain,
  type CnicOptions,
  type PhoneOptions,
  type PhoneFormat,
  type CityNumberOptions,
  type IbanOptions,
  type IbanDetails,
  type NtnOptions,
  type NameOptions,
  type CityOptions,
  type AddressOptions,
  type AddressParts,
  type CompanyOptions,
  type EmailOptions,
  type AmountOptions,
  type DateOptions,
  type DobOptions,
  type RaastQrOptions,
  type PersonOptions,
  type Person,
  type BusinessOptions,
  type Business,
} from './faker.js';
export type { Province, ProvinceAlias, Network, BankType } from './data.js';
export { seededRandom, type RandomSource } from './random.js';

/**
 * Shared default instance with a random seed. Call `faker.seed(…)` (or the
 * exported `seed`) to make it reproducible. The functions exported below are
 * bound to this instance.
 */
export const faker: Faker = createFaker();

export const {
  seed,
  random,
  int,
  float,
  bool,
  pick,
  digits,
  many,
  gender,
  cnic,
  phone,
  landline,
  uan,
  iban,
  ibanDetails,
  ntn,
  strn,
  firstName,
  lastName,
  name,
  city,
  address,
  addressParts,
  company,
  email,
  amount,
  date,
  dob,
  raastQr,
  person,
  business,
} = faker;
