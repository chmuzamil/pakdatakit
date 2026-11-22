"""PakDataKit: utilities for Pakistani data.

CNIC, phone, networks, WhatsApp, IBAN, postal codes, geography, address
parsing, Roman Urdu, Urdu slugs and sorting, Hijri dates, holidays, currency
formatting, amounts in words, tax numbers, sales tax, income tax on salary,
FBR digital invoices, withholding tax, Zakat deduction, census population,
landlines, Raast QR codes, and passport and vehicle registration number
formats, electricity and gas bill numbers, and the sources of every dataset.

A Python port of the ``pakdatakit`` npm package: it ships the same datasets and
is tested against shared test vectors, so both give identical results.
"""

from .address import ParsedAddress, format_address, parse_address
from .bills import (
    ElectricityRef,
    ElectricityRefType,
    GasCompany,
    parse_electricity_ref,
    validate_electricity_ref,
    validate_gas_consumer_number,
)
from .cnic import CNICInfo, CNICMatch, MaskedText, find_cnics, get_cnic_info, mask_cnics, validate_cnic
from .courier import Courier, CourierStatus, map_courier_status, normalize_city_for_courier
from .data_info import DataInfo, DataSource, get_data_info, list_data_info
from .data_version import DATA_VERSION, data_version
from .fbr_invoice import (
    FBR_DI_SPEC_VERSION,
    FbrInvoice,
    FbrInvoiceBuild,
    FbrInvoiceError,
    FbrInvoiceInput,
    FbrInvoiceItem,
    FbrInvoiceItemInput,
    FbrInvoiceReference,
    FbrInvoiceTotals,
    FbrInvoiceType,
    FbrInvoiceValidation,
    FbrRegistrationType,
    FbrSaleType,
    build_fbr_invoice,
    expected_sales_tax,
    get_sale_types,
    validate_fbr_invoice,
)
from .format import ParsedAmount, format_amount_input, format_lakh, format_pkr, parse_amount
from .geo import (
    get_district_province,
    get_districts_by_province,
    get_division_of_district,
    get_divisions,
    get_province,
    get_tehsil_district,
    get_tehsils,
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
from .incometax import (
    SalaryTax,
    SalaryTaxSlab,
    SalaryTaxSurcharge,
    SalaryTaxYear,
    calculate_monthly_salary_tax,
    calculate_salary_tax,
    get_salary_tax_slabs,
    get_salary_tax_years,
    get_tax_year,
)
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
from .passport import validate_passport
from .phone import PhoneAnalysis, analyze_phone, format_phone, validate_phone
from .population import (
    CensusCounts,
    DistrictPopulation,
    TehsilPopulation,
    get_district_population,
    get_tehsil_population,
)
from .postal import (
    PostOffice,
    get_city_by_postal_code,
    get_post_office,
    get_postal_areas,
    get_postal_code,
    get_postal_codes,
    search_post_offices,
    search_postal_codes,
)
from .quality import (
    ADDRESS_WEIGHTS,
    AddressPart,
    AddressScore,
    PhoneRiskFlag,
    phone_risk_signals,
    score_address,
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
from .salestax import (
    SalesTaxAmounts,
    SalesTaxKind,
    SalesTaxRate,
    calculate_sales_tax,
    get_sales_tax_rate,
    split_inclusive,
)
from .tax import NTNInfo, analyze_ntn, validate_ntn, validate_strn
from .text import (
    BidiDirection,
    SlugScript,
    compare_urdu,
    is_rtl,
    normalize_roman_urdu,
    normalize_text,
    roman_urdu_key,
    slugify,
    to_english_digits,
    to_urdu_digits,
    wrap_bidi,
)
from .vehicle import VehiclePlate, parse_vehicle_plate, validate_vehicle_plate
from .whatsapp import create_whatsapp_link
from .withholding import (
    Withholding,
    WithholdingNonAtlRule,
    WithholdingRate,
    WithholdingSlab,
    WithholdingThreshold,
    calculate_withholding,
    get_withholding_rates,
)
from .words import amount_in_words, number_to_words
from .zakat import (
    ZakatDeduction,
    ZakatDocument,
    ZakatNisab,
    get_zakat_nisab,
    get_zakat_years,
    zakat_deduction,
)

__version__ = "2.7.2"

__all__ = [
    "__version__",
    "DATA_VERSION",
    "data_version",
    # data sources
    "DataInfo",
    "DataSource",
    "get_data_info",
    "list_data_info",
    # cnic
    "CNICInfo",
    "validate_cnic",
    "get_cnic_info",
    "CNICMatch",
    "find_cnics",
    "MaskedText",
    "mask_cnics",
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
    "PostOffice",
    "get_post_office",
    "search_post_offices",
    # geo
    "get_province",
    "search_cities",
    "get_district_province",
    "search_districts",
    "get_districts_by_province",
    "get_divisions",
    "get_division_of_district",
    "get_tehsils",
    "get_tehsil_district",
    # population (census 2023)
    "CensusCounts",
    "DistrictPopulation",
    "TehsilPopulation",
    "get_district_population",
    "get_tehsil_population",
    # address
    "ParsedAddress",
    "parse_address",
    "format_address",
    # courier
    "Courier",
    "CourierStatus",
    "map_courier_status",
    "normalize_city_for_courier",
    # quality
    "AddressPart",
    "AddressScore",
    "ADDRESS_WEIGHTS",
    "score_address",
    "PhoneRiskFlag",
    "phone_risk_signals",
    # text
    "normalize_text",
    "normalize_roman_urdu",
    "roman_urdu_key",
    "to_urdu_digits",
    "to_english_digits",
    "SlugScript",
    "slugify",
    "compare_urdu",
    "BidiDirection",
    "is_rtl",
    "wrap_bidi",
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
    "parse_amount",
    "format_amount_input",
    "ParsedAmount",
    "number_to_words",
    "amount_in_words",
    # tax
    "NTNInfo",
    "analyze_ntn",
    "validate_ntn",
    "validate_strn",
    # sales tax
    "SalesTaxKind",
    "SalesTaxRate",
    "SalesTaxAmounts",
    "get_sales_tax_rate",
    "calculate_sales_tax",
    "split_inclusive",
    # income tax on salary
    "SalaryTaxSlab",
    "SalaryTaxSurcharge",
    "SalaryTaxYear",
    "SalaryTax",
    "get_salary_tax_slabs",
    "get_salary_tax_years",
    "get_tax_year",
    "calculate_salary_tax",
    "calculate_monthly_salary_tax",
    # withholding tax
    "WithholdingNonAtlRule",
    "WithholdingSlab",
    "WithholdingThreshold",
    "WithholdingRate",
    "Withholding",
    "get_withholding_rates",
    "calculate_withholding",
    # zakat
    "ZakatDocument",
    "ZakatNisab",
    "ZakatDeduction",
    "get_zakat_nisab",
    "get_zakat_years",
    "zakat_deduction",
    # FBR digital invoicing
    "FBR_DI_SPEC_VERSION",
    "FbrInvoiceType",
    "FbrRegistrationType",
    "FbrInvoiceItem",
    "FbrInvoice",
    "FbrInvoiceItemInput",
    "FbrInvoiceInput",
    "FbrInvoiceTotals",
    "FbrInvoiceBuild",
    "FbrInvoiceError",
    "FbrInvoiceValidation",
    "FbrInvoiceReference",
    "FbrSaleType",
    "get_sale_types",
    "expected_sales_tax",
    "build_fbr_invoice",
    "validate_fbr_invoice",
    # passport / vehicle
    "validate_passport",
    "VehiclePlate",
    "parse_vehicle_plate",
    "validate_vehicle_plate",
    # bills
    "ElectricityRef",
    "ElectricityRefType",
    "GasCompany",
    "parse_electricity_ref",
    "validate_electricity_ref",
    "validate_gas_consumer_number",
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
