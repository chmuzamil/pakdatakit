# pakdatakit-faker

Seeded mock data for Pakistan: **CNICs**, **mobile numbers**, **landlines and UANs**, **IBANs**, **NTN/STRN**, **names**, **addresses**, **companies**, **Raast QR codes**, and coherent **personas** and **businesses**. Every value is checked against [pakdatakit](https://github.com/chmuzamil/pakdatakit), the validator library it is built on.

- Valid by construction: CNICs pass `validateCNIC`, mobile numbers pass `validatePhone`, IBANs pass the mod-97 checksum, addresses are read back by `parseAddress` with the same city and province
- Coherent personas: the CNIC's first digit matches the province, its last digit matches the gender, the landline uses the city's area code, the postal code belongs to the city
- Reproducible: the same seed gives the same data on every platform and JavaScript engine
- Works with [`@faker-js/faker`](https://fakerjs.dev): plug in its random source so one seed drives both
- Uses pakdatakit's own datasets (cities, postal codes, banks, mobile prefixes, area codes), bundled at build time
- ESM and CommonJS, TypeScript types, no dependencies besides `pakdatakit`

> [!WARNING]
> **Read the [Safety](#safety) section before you use this anywhere near real systems.** Generated CNICs, mobile numbers and IBANs are structurally valid and may belong to real people.

## Install

```bash
npm install --save-dev pakdatakit-faker
```

## Quick start

```ts
import { createFaker } from 'pakdatakit-faker';

const f = createFaker({ seed: 42 });

f.cnic(); //    '68707-6932604-0'
f.phone(); //   '03095592120'
f.iban(); //    'PK44MEZN5165216300839683'
f.name(); //    'Rehana Tanoli'
f.address(); // '113-B, Mohallah Bilal Ganj, Swat 19200'

f.person();
// {
//   name: 'Marvi Raisani', firstName: 'Marvi', lastName: 'Raisani',
//   gender: 'female', cnic: '16221-1058327-4', dateOfBirth: '1994-12-10',
//   phone: '03432507443', email: 'marviraisani784@example.org',
//   city: 'Lakki Marwat', province: 'Khyber Pakhtunkhwa', district: 'Lakki Marwat',
//   address: 'House # 383, Street # 3, Civil Lines, Lakki Marwat 28420',
//   postalCode: '28420', landline: '0969-357350',
//   iban: 'PK83ASCM3772893706128459', bank: 'Askari Bank Limited',
//   ntn: '16221-1058327-4'
// }
```

(The example values above come from `seed: 42` with `now: new Date('2026-06-15T12:00:00Z')`.)

For quick scripts there is also a shared default instance with a random seed, and every generator is exported on its own, bound to it:

```ts
import { cnic, person, seed, many } from 'pakdatakit-faker';

seed('fixtures-v1'); // optional: make the default instance reproducible
const users = many(50, () => person());
```

## Generators

All options are optional.

### Identity

| Generator         | Returns               | Options                                                                                                                                                 |
| ----------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cnic(opts)`      | `'35202-1234567-1'`   | `province` (name or `KP`/`ICT`/`GB`/`AJK`), `gender`, `formatted` (default `true`; `false` gives 13 digits), `provinceCode` (force the first digit 1-8) |
| `name(opts)`      | `'Ayesha Khattak'`    | `gender`                                                                                                                                                |
| `firstName(opts)` | `'Bilal'`             | `gender`                                                                                                                                                |
| `lastName()`      | `'Soomro'`            |                                                                                                                                                         |
| `gender()`        | `'male' \| 'female'`  |                                                                                                                                                         |
| `dob(opts)`       | `Date` (UTC midnight) | `minAge` (18), `maxAge` (65)                                                                                                                            |

The first CNIC digit is the province of registration: 1 Khyber Pakhtunkhwa, 3 Punjab, 4 Sindh, 5 Balochistan, 6 Islamabad, 7 Gilgit-Baltistan. By default codes are weighted roughly by population. Code 2 (former FATA) and code 8 (Azad Jammu and Kashmir, widely reported but not in FBR's list) are only produced when you ask: `cnic({ province: 'AJK' })` or `cnic({ provinceCode: 2 })`. The last digit is odd for men and even for women, so `getCNICInfo` always reads back the gender you asked for.

Names come from lists written for this package: about 120 male and 120 female given names and over 100 family names common among Punjabi, Sindhi, Pashtun, Baloch, Urdu-speaking, Kashmiri and Saraiki families, in Latin script.

### Phone numbers

| Generator        | Returns             | Options                                                                     |
| ---------------- | ------------------- | --------------------------------------------------------------------------- |
| `phone(opts)`    | `'03001234567'`     | `network` (`Jazz`, `Zong`, `Ufone`, `Telenor`, `SCO`), `format`, `dialable` |
| `landline(opts)` | `'042-35761234'`    | `city`                                                                      |
| `uan(opts)`      | `'021-111-482-907'` | `city`                                                                      |

`format` is `'local'` (`03001234567`, default), `'international'` (`+92 300 1234567`) or `'e164'` (`+923001234567`). Prefixes come from pakdatakit's `networks.json`, so `getNetwork` returns the network you asked for.

`landline` and `uan` use the area codes in `area-codes.json`; `analyzeNumber` reports the right type and lists the city. They throw a `RangeError` for a city with no known area code.

`phone({ dialable: false })` returns a number on an **unallocated** `036X` prefix, such as `03641234567`. It has the right shape for UI demos and screenshots, but cannot reach anyone, and it **fails `validatePhone` by design**.

### Banking and tax

| Generator           | Returns                              | Options                                                                                                                                         |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `iban(opts)`        | `'PK36SCBL0000001123456702'`         | `bank` (4-letter code), `type` (`commercial`, `islamic`, `microfinance`, `digital`, `emi`, `foreign`, `specialized`), `formatted` (groups of 4) |
| `ibanDetails(opts)` | `{ iban, bankCode, bank, bankType }` | as `iban`                                                                                                                                       |
| `ntn(opts)`         | `'1234567-8'`                        | `type` (`business` default, or `individual` = a CNIC), `checkDigit` (default `true`), `cnic` (CNIC options for individuals)                     |
| `strn()`            | `'3277876153826'`                    |                                                                                                                                                 |
| `amount(opts)`      | `25000`                              | `min` (100), `max` (100,000), `decimals` (0)                                                                                                    |
| `raastQr(opts)`     | Raast P2P QR payload                 | `iban` (random if omitted), `amount`, `expiresIn` (default `'1h'` with an amount)                                                               |

Random IBANs only use banks that still exist: codes of merged banks (`mergedInto`), older alias codes (`aliasOf`) and the State Bank itself are skipped. Name any code explicitly, e.g. `iban({ bank: 'NIBP' })`, to get one anyway. `getBankFromIBAN` returns the bank of the generated code. SadaPay IBANs follow SadaPay's layout: `SADA` + `000000` + a 10-digit mobile number. `raastQr` uses pakdatakit's `createRaastP2PQr`, so `validateRaastQr` accepts the result.

### Places and contact details

| Generator            | Returns                                              | Options                                |
| -------------------- | ---------------------------------------------------- | -------------------------------------- |
| `city(opts)`         | `'Sialkot'`                                          | `province`                             |
| `address(opts)`      | `'House # 12, Street # 4, Johar Town, Lahore 54000'` | `city`, `province`, `includeProvince`  |
| `addressParts(opts)` | `{ street, area, city, province, postalCode, full }` | as `address`                           |
| `company(opts)`      | `'Indus Textiles (Pvt) Ltd'`, `'Memon Traders'`      | `city`                                 |
| `email(opts)`        | `'ayesha.khattak@example.org'`                       | `name`, `domain`                       |
| `date(opts)`         | `Date`                                               | `from` (a year before now), `to` (now) |

Addresses use realistic patterns (house and street numbers, blocks, Islamabad sectors such as `Sector F-7/2`, mohallahs, and neighbourhoods from pakdatakit's postal data). `parseAddress` reads every generated address back with the same city and province. The postal code is the city's code from `postal-codes.json` (or the area's own code, e.g. Clifton, Karachi 75600); cities with no postal data get none.

Emails only use the RFC 2606 reserved domains `example.com`, `example.org` and `example.net` (exported as `RESERVED_EMAIL_DOMAINS`). Any other domain throws.

### Personas

`person(opts)` returns a coherent, fictional person:

| Field                                     |                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `name`, `firstName`, `lastName`, `gender` |                                                                                                        |
| `cnic`                                    | first digit matches `province`, last digit matches `gender`                                            |
| `dateOfBirth`                             | `YYYY-MM-DD`, age between `minAge` and `maxAge`                                                        |
| `phone`, `email`                          | email built from the name                                                                              |
| `city`, `province`, `district?`           | `district` when a district of the same name exists                                                     |
| `address`, `postalCode`                   |                                                                                                        |
| `landline`                                | city's area code when known, otherwise another area code in the same province, `null` if there is none |
| `iban`, `bank`                            |                                                                                                        |
| `ntn`                                     | the CNIC, as for every individual taxpayer                                                             |

Options: `gender`, `province`, `city`, `minAge`, `maxAge`, `bank`, `phone` (phone options such as `network` or `dialable: false`). Without `province` or `city`, people live anywhere except Azad Jammu and Kashmir, because its CNIC code (8) is unverified; pass `province: 'AJK'` to include it.

`business(opts)` returns `{ name, ntn, strn, city, province, address, postalCode, phone, landline, uan, iban, bank }`, with a business NTN and a UAN on the city's area code when UANs exist there (`null` otherwise). Options: `city`, `province`, `bank`.

### Helpers

`int(min, max)` (inclusive), `float(min, max)`, `bool(probability)`, `pick(array)`, `digits(length)`, `random()` and `many(count, fn)` use the same random source as the generators.

## Seeding

```ts
const a = createFaker({ seed: 'checkout-tests' });
const b = createFaker({ seed: 'checkout-tests' });
a.person(); // deep-equals b.person()
```

- Seeds can be numbers or strings (`42` and `'42'` are the same seed).
- The generator is [sfc32](https://pracrand.sourceforge.net/RNG_engines.txt) seeded through the cyrb128 string hash. It uses only 32-bit integer arithmetic, so sequences are identical in Node, browsers, Deno and Bun.
- `f.seed(value)` restarts an instance; `seed(value)` restarts the default instance.
- Ages and default dates are relative to "now". Pass `now` for fully reproducible dates: `createFaker({ seed: 1, now: new Date('2026-01-01') })`.
- `seededRandom(seed)` is exported if you need the raw generator.
- Output for a given seed can change between minor versions when datasets or generators improve. Pin the version if you snapshot generated data.

## Using it with @faker-js/faker

Pass any function that returns numbers in `[0, 1)` as `random`. To drive both libraries from one seed, hand pakdatakit-faker the random source of `@faker-js/faker`:

```ts
import { faker } from '@faker-js/faker';
import { createFaker } from 'pakdatakit-faker';

faker.seed(123);
const pk = createFaker({ random: () => faker.number.float() });

const user = {
  id: faker.string.uuid(),
  avatar: faker.image.avatar(),
  ...pk.person(),
};
```

`faker.number.float()` returns a number in `[0, 1)` by default. `seed` and `random` cannot be combined; seed `@faker-js/faker` instead. pakdatakit-faker does not depend on `@faker-js/faker`.

## Safety

**Pakistan has no reserved test ranges for CNICs, mobile numbers or bank accounts.** Values from this package are structurally valid, so any of them may coincide with a real person's CNIC, a real subscriber's phone number or a real bank account.

- **Never** call, SMS or WhatsApp a generated number, and never let a system that sends messages (OTP, notifications, marketing) run on generated data. Use `phone({ dialable: false })` for demos and screenshots: it gives an unallocated `036X` number that cannot reach anyone (and fails `validatePhone`).
- **Never** use generated IBANs with real banks, Raast, or payment providers, including their sandbox environments when they are wired to real rails. Generated Raast QR codes are for testing scanners and parsers only.
- **Never** submit generated CNICs or NTNs to NADRA, FBR or any other government or third-party service.
- Keep generated data in test, staging and demo systems. Do not mix it with production data, where it could be mistaken for real records.
- Emails only use RFC 2606 domains (`example.com`, `example.org`, `example.net`), which never deliver mail.

Generated names, addresses and personas are random combinations and do not describe real people; any resemblance is coincidental.

## Related

- [pakdatakit](https://github.com/chmuzamil/pakdatakit): validators, formatters and datasets for Pakistani data (CNIC, phone, IBAN, postal codes, address parsing, Raast QR and more)
- [pakdatakit-react](https://github.com/chmuzamil/pakdatakit/tree/main/react): React inputs that format as you type
- [Data sources](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md) for the datasets
- [Issues](https://github.com/chmuzamil/pakdatakit/issues)

## License

MIT
