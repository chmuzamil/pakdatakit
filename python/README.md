# PakDataKit for Python

Utilities for Pakistani data: CNIC, mobile numbers and networks, WhatsApp links,
IBAN, postal codes, cities and districts, address parsing, Roman Urdu, Hijri
dates, public holidays, rupee formatting, amounts in words, NTN/STRN,
landlines and Raast QR codes.

This is the Python port of the [`pakdatakit` npm package](https://github.com/chmuzamil/pakdatakit).
It ships **the same datasets** and is tested against **shared test vectors**
generated from the TypeScript library, so both give identical results.
Pure Python, no dependencies, Python 3.9+.

## Install

```sh
pip install pakdatakit
```

## Examples

```python
import datetime as dt
import pakdatakit as pdk

pdk.validate_cnic("35202-1234567-1")          # True
pdk.get_cnic_info("35202-1234567-1")
# CNICInfo(digits='3520212345671', formatted='35202-1234567-1', province='Punjab', gender='male')

pdk.format_phone("0300 1234567")              # '+923001234567'
pdk.get_network("0345-1234567")               # 'Telenor'
pdk.create_whatsapp_link("03001234567", "Salam!")

pdk.validate_iban("PK36 SCBL 0000 0011 2345 6702")       # True
pdk.get_bank_from_iban("PK36SCBL0000001123456702")       # 'Standard Chartered Bank (Pakistan) Limited'
pdk.get_bank_info("MEZN").type                           # 'islamic'

pdk.get_province("Lahore")                    # 'Punjab'
pdk.get_divisions("Sindh")                    # ['Hyderabad', 'Karachi', 'Larkana', ...]
pdk.get_division_of_district("Kasur")         # 'Lahore'
pdk.get_tehsils("Rawalpindi")                 # ['Gujar Khan', 'Kahuta', ..., 'Murree', ...]
pdk.get_tehsil_district("Murree")             # 'Rawalpindi'
pdk.parse_address("House 12, Street 5, Model Town Lahore 54000")

pdk.get_city_by_postal_code("54660")          # 'Lahore'
pdk.get_post_office("48330")
# PostOffice(code='48330', office='Dulmial', town='Dulmial', district=None, province='Punjab')

pdk.format_pkr(150000)                        # 'Rs. 150,000'
pdk.format_lakh(2500000)                      # '25 Lakh'
pdk.amount_in_words(125000, cheque=True)      # 'Rupees One Lakh Twenty-Five Thousand Only'
pdk.number_to_words(125000, language="ur")    # 'ایک لاکھ پچیس ہزار'

pdk.format_hijri(dt.date(2026, 3, 1))         # '12 Ramadan 1447'
pdk.get_pakistan_holidays(2026)[0]            # Holiday(id='kashmir-day', ...)

payload = pdk.create_raast_p2p_qr("PK36SCBL0000001123456702", amount=1500, expires_in="1d")
pdk.validate_raast_qr(payload).valid          # True

pdk.format_cnic_input("3520212")              # '35202-12'
pdk.check_phone_input("0300 12")              # 'incomplete'
```

## API

Every function of the npm package is available under its snake_case name
(`validateCNIC` → `validate_cnic`, `createRaastP2PQr` → `create_raast_p2p_qr`).
Option objects become keyword arguments (`{ expiresIn: '1d' }` →
`expires_in="1d"`), structured results are frozen dataclasses with snake_case
fields, `null` is `None`, and a `RangeError` is a `ValueError`. Dates are
`datetime.date` / naive local `datetime.datetime`.

Geography:

| Function                                     | Returns                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `get_province(city)`                         | Province of a city, or `None`                                         |
| `search_cities(query)`                       | Matching city names, sorted                                           |
| `get_district_province(district)`            | Province of a district, or `None`                                     |
| `search_districts(query)`                    | Matching district names, sorted                                       |
| `get_districts_by_province(province)`        | Districts of a province, sorted                                       |
| `get_divisions(province=None)`               | The 30 divisions of the 2023 census, or those of one province, sorted |
| `get_division_of_district(district)`         | Division of a 2023 census district, or `None`                         |
| `get_tehsils(district)`                      | Tehsils (talukas, sub-divisions) of a district, sorted                |
| `get_tehsil_district(tehsil, province=None)` | Census district of a tehsil, or `None` if unknown or ambiguous        |

Divisions and tehsils come from the 2023 census. Each of the 591 tehsils is
recorded under the district it was in at the census, so `get_tehsils` and
`get_tehsil_district` use census districts (`Rawalpindi` still lists Murree,
and a tehsil of `Quetta` is reported under `Quetta`). Districts created after
the census have no division and may have no tehsils. Azad Jammu and Kashmir
and Gilgit-Baltistan are not covered.

Postal codes:

| Function                        | Returns                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `get_city_by_postal_code(code)` | City of a post code, or `None` (only cities on pakdatakit's city list)                                   |
| `get_postal_code(city)`         | Primary (GPO) post code of a city, or `None`                                                             |
| `get_postal_codes(city)`        | All post codes of a city, sorted                                                                         |
| `get_postal_areas(city)`        | Post office names of a city, sorted                                                                      |
| `search_postal_codes(query)`    | City post codes matching a city, office name or code prefix, sorted                                      |
| `get_post_office(code)`         | `PostOffice` for any delivery post office, or `None`                                                     |
| `search_post_offices(query)`    | `PostOffice`s whose office name or town contains the query, or whose code starts with it, sorted by code |

`get_city_by_postal_code` only answers for post offices in a city on
pakdatakit's city list (`54660` is Lahore); the code of an office in another
town or village returns `None`. `get_post_office` and `search_post_offices`
cover every delivery office in Pakistan Post's directory (about 2,560),
including towns and villages, as `PostOffice(code, office, town, district,
province)`. `district` is set only when the town is the headquarters a
district is named after.

Delivery checks:

| Function                    | Returns                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `score_address(address)`    | `AddressScore(score, missing, parsed)`: how complete a delivery address is   |
| `phone_risk_signals(phone)` | Reasons to double-check a delivery phone number; `[]` for an ordinary mobile |

`score_address` builds on `parse_address` and adds up `ADDRESS_WEIGHTS` for
the parts it finds: `city` 30, `houseNumber` 20, `street` 15, `area` 10,
`postalCode` 15 (5 for a code that is not a known post office) and `landmark`
10 ("near", "opp", "nazd", "qareeb", "سامنے" ...). A post office in a different
province from the city takes 15 off and adds a warning to `parsed.warnings`.
`missing` lists the parts not found, in that order. `phone_risk_signals`
returns any of `invalid`, `landline`, `not-mobile`, `repeated-digits`,
`sequential-digits` and `test-number`. Both are heuristics and never raise.

```python
pdk.score_address("House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660").score  # 100
pdk.score_address("Lahore").missing   # ['houseNumber', 'street', 'area', 'postalCode', 'landmark']
pdk.phone_risk_signals("03001234567")  # ['sequential-digits', 'test-number']
```

Sales tax:

| Function                                                                       | Returns                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `get_sales_tax_rate(kind=, province=None, date=None)`                          | `SalesTaxRate` for goods or a province's services on a date, or `None`   |
| `calculate_sales_tax(amount, rate=, province=, kind=, date=, inclusive=False)` | `SalesTaxAmounts(net, tax, gross, rate)`, or `None`                      |
| `split_inclusive(gross, rate)`                                                 | `SalesTaxAmounts` for an amount that already includes the tax, or `None` |

Standard rates only, from 1 July 2019: federal sales tax on goods (FBR) and
sales tax on services in Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan and
Islamabad Capital Territory, each with its `law` and `source`.
`SalesTaxRate` has the npm package's fields, with `from` named `from_`.
`province` accepts `KP`, `KPK`, `ICT` and `Islamabad`; `date` is
`YYYY-MM-DD` or a `datetime.date` and defaults to today. `calculate_sales_tax`
uses `rate` if given, otherwise looks one up (`kind` defaults to `services`
when a province is given). Amounts are rounded half up to the paisa as
written (`1.005` is Rs 1.01), and `net + tax` always equals `gross`. Amounts
from 0 to one trillion rupees and rates from 0 to 100 with at most two
decimals are accepted; anything else returns `None`, never an exception.

```python
pdk.get_sales_tax_rate(kind="services", province="Sindh", date="2024-06-30").rate  # 13
pdk.calculate_sales_tax(1000, rate=18)    # SalesTaxAmounts(net=1000.0, tax=180.0, gross=1180.0, rate=18.0)
pdk.calculate_sales_tax(1150, province="Sindh", inclusive=True).net  # 1000.0
pdk.split_inclusive(99.99, 18)            # SalesTaxAmounts(net=84.74, tax=15.25, gross=99.99, rate=18.0)
```

Utility bills:

| Function                                        | Returns                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `parse_electricity_ref(ref)`                    | `ElectricityRef(type, digits, formatted, urban_rural, disco)`, or `None`      |
| `validate_electricity_ref(ref)`                 | Whether the input is an electricity bill reference, customer ID or KE account |
| `validate_gas_consumer_number(number, company)` | Whether the input is an SNGPL (11 digits) or SSGC (10 digits) consumer number |

`type` is `reference` (DISCO reference number: 14 digits, optionally followed
by `U` or `R`), `customer-id` (DISCO customer ID: 10 digits, 11 for LESCO) or
`k-electric` (13 digits starting `04000`). Spaces, dashes and dots are ignored
and Urdu digits are accepted. `disco` is `K-Electric` for a K-Electric account
and `None` otherwise: no official source maps DISCO digits to a distribution
company. No utility publishes a check digit, so only the format is checked.
`company` is `SNGPL` or `SSGC` (any case); anything else returns `False`.
None of these raise.

```python
pdk.parse_electricity_ref("02-12624-0045901 R")
# ElectricityRef(type='reference', digits='02126240045901', formatted='02 12624 0045901 R', urban_rural='R', disco=None)
pdk.parse_electricity_ref("0400012345678").disco      # 'K-Electric'
pdk.validate_electricity_ref("12345")                 # False
pdk.validate_gas_consumer_number("12345678901", "SNGPL")  # True
```

Couriers:

| Function                            | Returns                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `map_courier_status(courier, raw)`  | A courier's status as one `CourierStatus`, or `None`                      |
| `normalize_city_for_courier(input)` | The city-list name for how a customer or courier writes a city, or `None` |

`CourierStatus` is one of `pending`, `booked`, `picked-up`, `in-transit`,
`out-for-delivery`, `attempted`, `under-review`, `delivered`, `returning`,
`returned` or `cancelled`. `courier` is `TCS`, `Leopards`, `PostEx`, `M&P`,
`Trax` or `BlueEx` (any case; `LCS`, `MnP` and `Blue Ex` are accepted), and
`raw` is the courier's status name, code or a non-negative integer ID (`5`,
`5.0` and `"5"` are the same). Only statuses a courier documents publicly are
mapped: every order status and tracking code in PostEx's merchant API guide
(v4.1.9), and Leopards' "Returned to Shipper". TCS, M&P, Trax and BlueEx
publish no status list, so they return `None`, as does any unknown status.
`normalize_city_for_courier` accepts the name in any case, short forms
(`LHR`, `Khi`, `Pindi`, `Isb`, `FSD`), the old name Lyallpur, a trailing
"city" and the main cities in Urdu script. No API is called, and neither
raises.

```python
pdk.map_courier_status("PostEx", "Out For Delivery")   # 'out-for-delivery'
pdk.map_courier_status("PostEx", 5)                    # 'delivered'
pdk.map_courier_status("PostEx", "Attempt Made: Customer not available")  # 'attempted'
pdk.map_courier_status("TCS", "Delivered")             # None
pdk.normalize_city_for_courier("LHR")                  # 'Lahore'
pdk.normalize_city_for_courier("Karachi City")         # 'Karachi'
pdk.normalize_city_for_courier("Atlantis")             # None
```

`BankInfo.type` is one of `commercial`, `public-sector`, `islamic`,
`microfinance`, `digital`, `emi`, `foreign`, `specialized` or `central`.
`BankInfo.active` is `False` for a bank that merged into another or has closed.

`DATA_VERSION` gives the date the datasets were last checked, and
`__version__` the package version.

See the [main README](https://github.com/chmuzamil/pakdatakit#readme) for the full API
reference and [DATA.md](https://github.com/chmuzamil/pakdatakit/blob/main/DATA.md)
for where each dataset comes from.

## Development

From `python/`:

```sh
uv run --with pytest pytest -q
```

The data files in `src/pakdatakit/data/` and the vectors in `../test-vectors/`
are generated from the TypeScript package; don't edit them by hand. From the
repository root:

```sh
npm run build && node scripts/generate-test-vectors.mjs
```

## License

MIT
