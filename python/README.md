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
pdk.parse_address("House 12, Street 5, Model Town Lahore 54000")

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
