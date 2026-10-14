"""PakDataKit: utilities for Pakistani data.

CNIC, phone, networks, WhatsApp, IBAN, postal codes, geography, address
parsing, Roman Urdu, Hijri dates, holidays, currency formatting, amounts in
words, tax numbers, landlines and Raast QR codes.

A Python port of the ``pakdatakit`` npm package: it ships the same datasets and
is tested against shared test vectors, so both give identical results.
"""

from .address import ParsedAddress, format_address, parse_address
from .cnic import CNICInfo, get_cnic_info, validate_cnic
from .data_version import DATA_VERSION, data_version
from .format import format_lakh, format_pkr
from .geo import (
    get_district_province,
    get_districts_by_province,
    get_province,
    search_cities,
    search_districts,
)
from .hijri import (
    HijriDate,
    format_hijri,
    from_hijri,
    get_hijri_month_name,
    is_ramadan,
    to_hijri,
)
from .holidays import Holiday, get_holidays_on, get_pakistan_holidays, is_pakistan_holiday
from .iban import BankInfo, get_bank_from_iban, get_bank_info, get_banks, validate_iban
from .input import (
    check_cnic_input,
    check_iban_input,
    check_phone_input,
    format_cnic_input,
    format_iban_input,
    format_phone_input,
)
from .networks import get_network
from .numbers import (
    NumberInfo,
    analyze_number,
    get_area_code,
    get_number_type,
    validate_landline,
)
from .phone import PhoneAnalysis, analyze_phone, format_phone, validate_phone
from .postal import (
    get_city_by_postal_code,
    get_postal_areas,
    get_postal_code,
    get_postal_codes,
    search_postal_codes,
)
from .raast import (
    EmvField,
    MerchantAccountInfo,
    ParsedRaastQr,
    RaastQrValidation,
    create_merchant_qr,
    create_raast_p2p_qr,
    parse_raast_qr,
    validate_raast_qr,
)
from .tax import NTNInfo, analyze_ntn, validate_ntn, validate_strn
from .text import normalize_roman_urdu, normalize_text, to_english_digits, to_urdu_digits
from .whatsapp import create_whatsapp_link
from .words import amount_in_words, number_to_words

__version__ = "2.2.0"

__all__ = [
    "__version__",
    "DATA_VERSION",
    "data_version",
    # cnic
    "CNICInfo",
    "validate_cnic",
    "get_cnic_info",
    # phone
    "PhoneAnalysis",
    "validate_phone",
    "format_phone",
    "analyze_phone",
    "get_network",
    "create_whatsapp_link",
    # iban
    "validate_iban",
    "get_bank_from_iban",
    "BankInfo",
    "get_bank_info",
    "get_banks",
    # postal
    "get_city_by_postal_code",
    "get_postal_code",
    "get_postal_codes",
    "get_postal_areas",
    "search_postal_codes",
    # geo
    "get_province",
    "search_cities",
    "get_district_province",
    "search_districts",
    "get_districts_by_province",
    # address
    "ParsedAddress",
    "parse_address",
    "format_address",
    # text
    "normalize_text",
    "normalize_roman_urdu",
    "to_urdu_digits",
    "to_english_digits",
    # hijri
    "HijriDate",
    "to_hijri",
    "from_hijri",
    "format_hijri",
    "get_hijri_month_name",
    "is_ramadan",
    # format / words
    "format_pkr",
    "format_lakh",
    "number_to_words",
    "amount_in_words",
    # tax
    "NTNInfo",
    "analyze_ntn",
    "validate_ntn",
    "validate_strn",
    # numbers
    "NumberInfo",
    "analyze_number",
    "get_number_type",
    "validate_landline",
    "get_area_code",
    # raast
    "EmvField",
    "MerchantAccountInfo",
    "ParsedRaastQr",
    "RaastQrValidation",
    "create_raast_p2p_qr",
    "create_merchant_qr",
    "parse_raast_qr",
    "validate_raast_qr",
    # holidays
    "Holiday",
    "get_pakistan_holidays",
    "get_holidays_on",
    "is_pakistan_holiday",
    # input
    "format_cnic_input",
    "check_cnic_input",
    "format_phone_input",
    "check_phone_input",
    "format_iban_input",
    "check_iban_input",
]
