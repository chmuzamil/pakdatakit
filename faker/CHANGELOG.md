# Changelog

## 0.1.0

First release.

- `createFaker({ seed })`: the same seed gives the same data everywhere; plug
  in another random source (e.g. Faker.js) with `random`.
- Generators for CNICs, mobile, landline and UAN numbers, IBANs, NTNs, STRNs,
  Raast QR codes, names, cities, addresses, companies, emails, amounts and
  dates.
- `person()` and `business()` produce records where everything agrees: the
  CNIC's province and gender digits, city, postal code, area code and bank.
- Every generated value passes the matching `pakdatakit` validator.
- Emails use only reserved test domains (RFC 2606). Generated numbers can
  belong to real people: never contact them or use generated IBANs with real
  payment providers.
