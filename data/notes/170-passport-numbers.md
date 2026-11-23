## Passport numbers

`validatePassport` accepts two letters followed by seven digits (`AB1234567`).
DGIP does not publish the format, and its forms only ask for "Passport Number".

- **Source:** the EU Council's PRADO register gives this pattern for the 2013
  ordinary passport
  (https://www.consilium.europa.eu/prado/en/PAK-AO-02003/index.html). The page
  sits behind a bot check, so it was confirmed through search-result text, not
  the page itself.
- **Observed on real passports:** the maintainer checked real ordinary
  (green) and official (blue) Pakistani passports in November 2026; their
  numbers have this shape. No numbers are recorded here.
- **Fits ICAO Doc 9303:** the document-number field is 9 characters, with the
  check digit stored separately in the machine-readable zone
  (https://www.icao.int/publications/Documents/9303_p4_cons_en.pdf).
- **Still unconfirmed:** diplomatic (red) passports and the e-passport
  variants (2022 onwards), and what the letters mean. A real number in another
  shape will be rejected; treat `false` as unusual, not fake.
