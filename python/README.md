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
pdk.parse_amount("Rs. 1,50,000/-")            # ParsedAmount(value=150000.0, raw='Rs. 1,50,000/-')
pdk.format_amount_input("1.5 lakh")           # 'Rs. 150,000'
pdk.amount_in_words(125000, cheque=True)      # 'Rupees One Lakh Twenty-Five Thousand Only'
pdk.number_to_words(125000, language="ur")    # 'ایک لاکھ پچیس ہزار'

pdk.format_hijri(dt.date(2026, 3, 1))         # '12 Ramadan 1447'
pdk.get_pakistan_holidays(2026)[0]            # Holiday(id='kashmir-day', ...)

payload = pdk.create_raast_p2p_qr("PK36SCBL0000001123456702", amount=1500, expires_in="1d")
pdk.validate_raast_qr(payload).valid          # True

pdk.format_cnic_input("3520212")              # '35202-12'
pdk.check_phone_input("0300 12")              # 'incomplete'
```

`parse_amount` reads a rupee amount as people type it: grouped or plain digits
(`150,000`, `1,50,000`, `1,234.50`), Urdu or Arabic-Indic digits, one `Rs`,
`Rs.`, `PKR` or `₨` mark, a trailing `/-`, and one unit (`k`, `thousand`,
`hazar`, `lakh`, `lac`, `crore`, `cr`, `ہزار`, `لاکھ`, `کروڑ`), and returns
`ParsedAmount(value, raw)` with the value rounded half-up to the paisa
(`"2.25cr"` → `22500000.0`). It returns `None`, never raising, for non-strings,
empty input, signs, ranges (`5-10k`), two numbers, marks or units, leftover
letters (`500 rupees`), ambiguous grouping (`1,50`) and amounts over Rs. 50
trillion. `format_amount_input` writes the amount back as `Rs. 150,000`
(paisa only when present), or `None` when `parse_amount` returns `None`.

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

Income tax on salary:

| Function                                                         | Returns                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `calculate_salary_tax(annual_income, tax_year=None, date=None)`  | `SalaryTax(tax, monthly, effective_rate, slab, tax_year)`, or `None`         |
| `calculate_monthly_salary_tax(monthly_salary, tax_year=, date=)` | The same for `monthly_salary × 12`; `monthly` is the tax to withhold a month |
| `get_salary_tax_slabs(tax_year=None)`                            | `SalaryTaxYear(tax_year, from_, to, law, source, slabs)`, or `None`          |
| `get_salary_tax_years()`                                         | The tax years covered, oldest first (`[2020, …, 2027]`)                      |
| `get_tax_year(date=None)`                                        | The tax year (July to June) a date falls in, or `None` for an invalid date   |

The salaried rate table of the Income Tax Ordinance 2001 (First Schedule,
Part I, Division I, clause (2), which applies when salary is more than 75% of
taxable income), for tax years 2020 to 2027. A tax year runs from 1 July to
30 June and is named after the June it ends in. `tax_year` (an integer) takes
precedence over `date` (`YYYY-MM-DD` or a `datetime.date`); with neither, the
current tax year is used, and a year that is not covered returns `None`. Each
slab is `SalaryTaxSlab(over, up_to, fixed, rate)`. Tax is rounded half up to
the paisa. Only the rate table is applied: the surcharge, tax credits,
exemptions, the separate rate for pensions and withholding adjustments are
not. Amounts from 0 to one trillion rupees are accepted; anything else
returns `None`, never an exception.

```python
pdk.calculate_salary_tax(1_800_000, tax_year=2026)
# SalaryTax(tax=72000.0, monthly=6000.0, effective_rate=4.0,
#           slab=SalaryTaxSlab(over=1200000, up_to=2200000, fixed=6000, rate=11), tax_year=2026)
pdk.calculate_monthly_salary_tax(150_000, tax_year=2026).monthly  # 6000.0
pdk.get_salary_tax_slabs(2027).law   # 'Income Tax Ordinance 2001, First Schedule, ...'
pdk.get_tax_year("2025-07-01")       # 2026
```

Urdu text:

| Function                            | Returns                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `slugify(text, script="any")`       | A URL slug: lower-case words joined by `-`, Urdu letters kept as they are |
| `compare_urdu(a, b)`                | `-1`, `0` or `1` in Urdu alphabetical order (CLDR 49), for `cmp_to_key`   |
| `is_rtl(text)`                      | Whether the first letter is from a right-to-left script                   |
| `wrap_bidi(text, direction="auto")` | The text wrapped in Unicode directional isolates                          |

`slugify` drops diacritics and zero-width characters, writes the Arabic
look-alikes ك ي ى as ک ی ی, turns Urdu digits into `0-9` and folds accented
Latin-1 letters (`é` → `e`, `ß` → `ss`); `script` is `any`, `latin` or `urdu`
(`SlugScript`). `compare_urdu` follows the CLDR collation for Urdu (ا آ ب بھ پ
پھ … ی یھ ے, a letter joined with ھ is a letter of its own), the same in every
port without depending on ICU: digits come before letters one digit at a time
(`10` before `2`), and other scripts after. `wrap_bidi` uses FSI … PDI, or
RLI/LRI with `"rtl"`/`"ltr"` (`BidiDirection`). None of these raise; a value
that is not a string gives `""` (or `False`).

```python
pdk.slugify("Lahore Fort, 2024")                # 'lahore-fort-2024'
pdk.slugify("لاہور Fort", script="latin")      # 'fort'
pdk.slugify("کراچی ۲۰۲۴", script="urdu")       # 'کراچی-2024'
sorted(["ے", "بھائی", "آم", "باغ", "اب"], key=functools.cmp_to_key(pdk.compare_urdu))
# ['اب', 'آم', 'باغ', 'بھائی', 'ے']
pdk.is_rtl("123 سلام")                          # True
f"آرڈر {pdk.wrap_bidi('PDK-1042')} بھیج دیا گیا"
```

FBR digital invoicing:

| Function                                    | Returns                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `build_fbr_invoice(input)`                  | `FbrInvoiceBuild(invoice, totals)` with the sales tax worked out, or `None`         |
| `validate_fbr_invoice(invoice, today=None)` | `FbrInvoiceValidation(valid, errors)`, each `FbrInvoiceError(code, field, message)` |
| `expected_sales_tax(item)`                  | The sales tax FBR expects on a line, in rupees, or `None`                           |

The invoice JSON for FBR's Digital Invoicing API (`postinvoicedata` and
`validateinvoicedata`), following PRAL's "Technical Specification for DI API"
version 1.12 (`FBR_DI_SPEC_VERSION`) and PRAL's Error Message Guide. The
invoice is a plain `dict` with FBR's camelCase keys (described by the
`FbrInvoice` and `FbrInvoiceItem` `TypedDict`s), ready for `json.dumps`; there
is no HTTP client and no token handling. `build_fbr_invoice` works out each
line's `salesTaxApplicable` when you leave it out (`N%` rates on the value
excluding sales tax, or the retail price for Third Schedule goods; `Rs.N`
rates on the quantity; other rates get 0), defaults `totalValues`,
`fixedNotifiedValueOrRetailPrice` and `salesTaxWithheldAtSource` to 0 and
`buyerNTNCNIC` and `invoiceRefNo` to `""`, and adds up the columns in
`totals` (a `dict`). `validate_fbr_invoice` returns every problem it can find
without calling FBR, with FBR's error code (`None` where FBR gives none):
required fields, formats (date, NTN/CNIC, FBR invoice number, sandbox
scenario), amounts (not negative, at most 2 decimals, 4 for quantity), SRO
rules and the sales tax arithmetic (to within one paisa). Pass
`today="YYYY-MM-DD"` to also reject future dates. Whether a province, HS code,
unit, rate, sale type or SRO is in FBR's lists is not checked. None of these
raise.

```python
built = pdk.build_fbr_invoice({
    "invoiceType": "Sale Invoice", "invoiceDate": "2025-04-21",
    "sellerNTNCNIC": "1234567", "sellerBusinessName": "Example Traders",
    "sellerProvince": "Sindh", "sellerAddress": "Karachi",
    "buyerNTNCNIC": "7654321", "buyerBusinessName": "Example Buyer",
    "buyerProvince": "Punjab", "buyerAddress": "Lahore",
    "buyerRegistrationType": "Registered",
    "items": [{"hsCode": "0101.2100", "productDescription": "Horses", "rate": "18%",
               "uoM": "Numbers, pieces, units", "quantity": 2,
               "valueSalesExcludingST": 1234, "saleType": "Goods at standard rate (default)"}],
})
built.invoice["items"][0]["salesTaxApplicable"]  # 222.12
built.totals["salesTaxApplicable"]               # 222.12
pdk.validate_fbr_invoice(built.invoice)          # FbrInvoiceValidation(valid=True, errors=[])
pdk.validate_fbr_invoice({**built.invoice, "invoiceDate": "21-04-2025"}).errors
# [FbrInvoiceError(code='0005', field='invoiceDate', message='Invoice date must be in YYYY-MM-DD format')]
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

**Experimental:** `map_courier_status` and the `CourierStatus` values may
change in a minor release while more couriers' status lists are added. See
[CONTRIBUTING.md](https://github.com/chmuzamil/pakdatakit/blob/main/CONTRIBUTING.md#courier-status-lists) to add one.

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
