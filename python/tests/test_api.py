"""Idiomatic Python usage: keyword arguments, dataclasses, dates, errors."""

from __future__ import annotations

import dataclasses
import datetime as dt
import functools
import re

import pytest

import pakdatakit as pdk

IBAN = "PK36SCBL0000001123456702"


def test_version_and_data_version() -> None:
    assert re.fullmatch(r"\d+\.\d+\.\d+", pdk.__version__)
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", pdk.DATA_VERSION)
    assert pdk.data_version == pdk.DATA_VERSION


def test_everything_in_all_is_exported() -> None:
    for name in pdk.__all__:
        assert hasattr(pdk, name), name


def test_results_are_frozen_dataclasses() -> None:
    info = pdk.get_cnic_info("35202-1234567-2")
    assert info == pdk.CNICInfo("3520212345672", "35202-1234567-2", "Punjab", "female")
    with pytest.raises(dataclasses.FrozenInstanceError):
        info.gender = "male"  # type: ignore[misc]
    assert pdk.get_cnic_info("invalid") is None


def test_phone() -> None:
    analysis = pdk.analyze_phone("+92 (0) 345 1234567")
    assert analysis == pdk.PhoneAnalysis(valid=True, formatted="+923451234567", network="Telenor")
    assert pdk.analyze_phone("12345").network == "Unknown"
    assert pdk.create_whatsapp_link("03001234567", "Salam & hi") == (
        "https://wa.me/923001234567?text=Salam%20%26%20hi"
    )


def test_address_round_trip() -> None:
    parsed = pdk.parse_address("House 12, Street 5, Model Town Lahore 54000")
    assert parsed.city == "Lahore"
    assert parsed.province == "Punjab"
    assert parsed.postal_code == "54000"
    assert pdk.format_address(parsed) == "House 12, Street 5, Model Town, Lahore, Punjab 54000"
    assert pdk.format_address(street="House 1", city="Karachi") == "House 1, Karachi"
    assert pdk.format_address({"district": "Kasur", "postal_code": "55050"}) == "Kasur 55050"


def test_hijri_with_dates_and_datetimes() -> None:
    assert pdk.to_hijri(dt.date(2026, 3, 1)) == pdk.HijriDate(1447, 9, 12)
    assert pdk.to_hijri(dt.datetime(2026, 3, 1, 23, 59)) == pdk.HijriDate(1447, 9, 12)
    assert pdk.to_hijri(dt.date(2026, 3, 1), offset=-1) == pdk.HijriDate(1447, 9, 11)
    assert pdk.from_hijri(pdk.HijriDate(1447, 9, 1)) == dt.date(2026, 2, 18)
    assert pdk.from_hijri((1447, 9, 1)) == pdk.from_hijri({"year": 1447, "month": 9, "day": 1})
    assert pdk.is_ramadan(dt.date(2026, 3, 1))
    assert pdk.get_hijri_month_name(9) == "Ramadan"
    with pytest.raises(ValueError):
        pdk.from_hijri(pdk.HijriDate(1447, 13, 1))
    with pytest.raises(ValueError):
        pdk.to_hijri(dt.date(2026, 3, 1), offset=0.5)  # type: ignore[arg-type]


def test_holidays() -> None:
    holidays = pdk.get_pakistan_holidays(2025)
    assert [h.date for h in holidays] == sorted(h.date for h in holidays)
    eid = next(h for h in holidays if h.id == "eid-ul-fitr")
    assert eid.date == "2025-03-31" and not eid.estimated and eid.source
    assert pdk.is_pakistan_holiday(dt.date(2025, 8, 14))
    assert pdk.is_pakistan_holiday("2025-12-26") is False
    assert pdk.is_pakistan_holiday("2025-12-26", include_christian_holidays=True)
    announced = pdk.get_pakistan_holidays(2031, announced={"eid-ul-fitr": ["2031-01-25"]})
    assert [h.date for h in announced if h.id == "eid-ul-fitr"] == ["2031-01-25"]
    with pytest.raises(ValueError):
        pdk.get_pakistan_holidays(1947)


def test_formatting_and_words() -> None:
    assert pdk.format_pkr(-1234.5) == "-Rs. 1,235"
    assert pdk.format_lakh(9_999_999) == "1 Crore"
    assert pdk.number_to_words(-21) == "minus twenty-one"
    assert pdk.amount_in_words(1.5) == "one rupee and fifty paisa"
    with pytest.raises(ValueError):
        pdk.format_pkr(float("nan"))
    with pytest.raises(ValueError):
        pdk.number_to_words(2**53)
    with pytest.raises(ValueError):
        pdk.amount_in_words(-1)


def test_raast_round_trip() -> None:
    expires = dt.datetime(2026, 11, 13, 23, 59)
    payload = pdk.create_raast_p2p_qr(IBAN, amount=1500, expires_at=expires, particulars="Rent")
    qr = pdk.parse_raast_qr(payload)
    assert qr is not None
    assert (qr.kind, qr.dynamic, qr.crc_valid, qr.iban, qr.amount) == ("p2p", True, True, IBAN, 1500)
    assert qr.expires_at == "2026-11-13T23:59"

    result = pdk.validate_raast_qr(payload, now=dt.datetime(2026, 11, 13, 23, 30))
    assert result.valid and result.warnings == ["expires-soon"]
    assert pdk.validate_raast_qr(payload, now=dt.datetime(2027, 1, 1)).errors == ["expired"]
    assert pdk.validate_raast_qr("hello").errors == ["not-a-raast-qr"]


def test_raast_expires_in() -> None:
    now = dt.datetime(2026, 10, 14, 12, 0)
    by_string = pdk.create_raast_p2p_qr(IBAN, amount=10, expires_in="90m", now=now)
    by_delta = pdk.create_raast_p2p_qr(IBAN, amount=10, expires_in=dt.timedelta(minutes=90), now=now)
    by_ms = pdk.create_raast_p2p_qr(IBAN, amount=10, expires_in=90 * 60_000, now=now)
    assert by_string == by_delta == by_ms
    assert pdk.parse_raast_qr(by_string).expires_at == "2026-10-14T13:30"  # type: ignore[union-attr]
    with pytest.raises(ValueError):
        pdk.create_raast_p2p_qr(IBAN, amount=10)
    with pytest.raises(ValueError):
        pdk.create_raast_p2p_qr("PK00XXXX")


def test_merchant_qr_accepts_dataclass_or_dict() -> None:
    fields = {"00": "A000000736", "01": IBAN}
    from_dict = pdk.create_merchant_qr({"fields": fields}, "Shop", "Lahore", amount=100)
    from_class = pdk.create_merchant_qr(pdk.MerchantAccountInfo(fields=fields), "Shop", "Lahore", amount=100)
    assert from_dict == from_class
    qr = pdk.parse_raast_qr(from_dict)
    assert qr is not None and qr.kind == "merchant" and qr.iban == IBAN and qr.amount == 100


def test_input_helpers() -> None:
    assert pdk.format_cnic_input("3520212345671") == "35202-1234567-1"
    assert pdk.check_cnic_input("35202-12") == "incomplete"
    assert pdk.format_phone_input("+923001234567") == "+92 300 1234567"
    assert pdk.check_phone_input("0360") == "invalid"
    assert pdk.format_iban_input("pk36scbl0000001123456702") == "PK36 SCBL 0000 0011 2345 6702"
    assert pdk.check_iban_input("") == "empty"


def test_bank_info() -> None:
    info = pdk.get_bank_info(IBAN)
    assert info is not None and info.code == "SCBL" and info.type == "commercial" and info.active
    assert pdk.get_bank_info("mezn") == pdk.get_bank_info("MEZN")
    assert pdk.get_bank_info("ZZZZ") is None
    inactive = [b for b in pdk.get_banks() if not b.active]
    assert inactive and all(b.merged_into or b.code == "SMES" for b in inactive)
    smes = pdk.get_bank_info("SMES")
    assert smes is not None and not smes.active and smes.merged_into is None
    with pytest.raises(ValueError):
        pdk.number_to_words(5, language="fr")


def test_score_address() -> None:
    result = pdk.score_address(
        "House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660"
    )
    assert result == pdk.AddressScore(score=100, missing=[], parsed=result.parsed)
    assert result.parsed.city == "Lahore"
    assert result.parsed.postal_code == "54660"
    assert sum(pdk.ADDRESS_WEIGHTS.values()) == 100
    with pytest.raises(TypeError):
        pdk.ADDRESS_WEIGHTS["city"] = 0  # type: ignore[index]

    lahore = pdk.score_address("Lahore")
    assert lahore.score == 30
    assert lahore.missing == ["houseNumber", "street", "area", "postalCode", "landmark"]

    for address in (
        "Makan 5, gali 3, masjid ke samne, Multan",
        "H 5 nazd Jamia Masjid, Multan",
        "مکان 5، گلی 3، مسجد کے سامنے، Multan",
        "Flat 2, opp. Civil Hospital, Karachi",
    ):
        assert "landmark" not in pdk.score_address(address).missing, address
    assert "landmark" in pdk.score_address("Flat 2, Karachi").missing

    known = pdk.score_address("House 1, Lahore 54660").score
    unknown = pdk.score_address("House 1, Lahore 54999")
    assert known - unknown.score == pdk.ADDRESS_WEIGHTS["postalCode"] - 5
    assert "postalCode" in unknown.missing

    mismatch = pdk.score_address("House 1, Street 2, Lahore 75500")
    assert "75500 is in Sindh" in " ".join(mismatch.parsed.warnings)
    assert mismatch.score == 30 + 20 + 15 + 10 + 15 - 15
    assert "houseNumber" in pdk.score_address("Lahore 54660").missing


def test_phone_risk_signals() -> None:
    assert pdk.phone_risk_signals("0301-2945716") == []
    assert pdk.phone_risk_signals("+92 333 5820147") == []
    assert pdk.phone_risk_signals("12345") == ["invalid"]
    assert pdk.phone_risk_signals("042 35761234") == ["landline"]
    assert pdk.phone_risk_signals("0800-12345") == ["not-mobile"]
    assert pdk.phone_risk_signals("03001111112") == ["repeated-digits"]
    assert pdk.phone_risk_signals("03123456789") == ["sequential-digits", "test-number"]


HOSTILE_INPUTS = [
    None,
    123,
    "",
    "   ",
    "!!!",
    "\u0000",
    "x" * 10000,
    "1 " * 5000,
    "\ud800",
    "\udfff abc \ud83d",
    "\U0001f600 Lahore 54660",
    "İ K ß ΣΑΣ",
    "۰۳۰۰۱۲۳۴۵۶۷",
    "near, near,,, , ,54660,54660",
]


def test_quality_never_raises() -> None:
    for value in HOSTILE_INPUTS:
        result = pdk.score_address(value)  # type: ignore[arg-type]
        assert 0 <= result.score <= 100
        flags = pdk.phone_risk_signals(value)  # type: ignore[arg-type]
        assert isinstance(flags, list)
    assert pdk.score_address("").score == 0
    assert pdk.score_address(None).score == 0  # type: ignore[arg-type]
    assert pdk.phone_risk_signals(None) == ["invalid"]  # type: ignore[arg-type]


def test_bills() -> None:
    ref = pdk.parse_electricity_ref("02-12624-0045901 r")
    assert ref == pdk.ElectricityRef("reference", "02126240045901", "02 12624 0045901 R", "R", None)
    assert pdk.parse_electricity_ref("۰۴۰۰۰۱۲۳۴۵۶۷۸") == pdk.ElectricityRef(
        "k-electric", "0400012345678", "0400012345678", None, "K-Electric"
    )
    assert pdk.parse_electricity_ref("12345678901").type == "customer-id"  # type: ignore[union-attr]
    assert pdk.parse_electricity_ref("1234567890U") is None
    assert not pdk.validate_electricity_ref("12345")
    assert pdk.validate_gas_consumer_number("123-4567-8901", "sngpl")
    assert pdk.validate_gas_consumer_number("1234567890", "SSGC")
    assert not pdk.validate_gas_consumer_number("1234567890", "SNGPL")
    assert not pdk.validate_gas_consumer_number("1234567890", "__proto__")  # type: ignore[arg-type]


def test_bills_never_raise() -> None:
    for value in HOSTILE_INPUTS:
        result = pdk.parse_electricity_ref(value)  # type: ignore[arg-type]
        assert result is None or isinstance(result, pdk.ElectricityRef)
        assert isinstance(pdk.validate_electricity_ref(value), bool)  # type: ignore[arg-type]
        for company in HOSTILE_INPUTS + ["SNGPL", "ssgc", "constructor"]:
            assert isinstance(pdk.validate_gas_consumer_number(value, company), bool)  # type: ignore[arg-type]


def test_sales_tax() -> None:
    rate = pdk.get_sales_tax_rate(kind="services", province="Sindh", date="2024-06-30")
    assert rate is not None and rate.rate == 13 and rate.authority == "SRB"
    goods = pdk.get_sales_tax_rate(kind="goods", date=dt.date(2026, 11, 18))
    assert goods is not None and goods.rate == 18 and goods.from_ == "2023-02-23" and goods.to is None
    assert pdk.get_sales_tax_rate(kind="goods", date=dt.datetime(2026, 11, 18, 23, 59)) == goods
    assert pdk.get_sales_tax_rate(kind="services", province="ICT") is not None  # today
    assert pdk.get_sales_tax_rate(kind="goods", province="AJK", date="2026-11-18") is None
    assert pdk.get_sales_tax_rate(kind="services", date="2026-11-18") is None

    assert pdk.calculate_sales_tax(1000, rate=18) == pdk.SalesTaxAmounts(1000, 180, 1180, 18)
    assert pdk.calculate_sales_tax(1000, province="Punjab", date="2026-11-18").tax == 160  # type: ignore[union-attr]
    split = pdk.calculate_sales_tax(1150, province="Sindh", date="2026-11-18", inclusive=True)
    assert split is not None and dataclasses.replace(split, source=None) == pdk.SalesTaxAmounts(1000, 150, 1150, 15)
    assert split.source is not None and split.source.id == "sales-tax-rates"
    assert pdk.split_inclusive(99.99, 18) == pdk.SalesTaxAmounts(84.74, 15.25, 99.99, 18)
    assert pdk.calculate_sales_tax(1.005, rate=0).net == 1.01  # type: ignore[union-attr]
    assert pdk.calculate_sales_tax(1000) is None
    assert pdk.calculate_sales_tax(1000, rate=16.666) is None
    assert pdk.calculate_sales_tax(10**12 + 1, rate=18) is None


def test_sales_tax_never_raises() -> None:
    values = HOSTILE_INPUTS + [
        True,
        -1,
        float("nan"),
        float("inf"),
        1e300,
        10**40,
        1e-7,
        [],
        {},
        dt.date(1, 1, 1),
        dt.datetime(9999, 12, 31, 23, 59),
        "goods",
        "services",
        "2026-11-18",
        "Sindh",
    ]
    for value in values:
        for other in values:
            pdk.get_sales_tax_rate(kind=value, province=other, date="2026-11-18")
            pdk.get_sales_tax_rate(kind="services", province=value, date=other)
            pdk.split_inclusive(value, other)
            pdk.calculate_sales_tax(value, rate=other)
            pdk.calculate_sales_tax(1000, province=value, kind=other, inclusive=True)
            pdk.calculate_sales_tax(value, province="Sindh", date=other, inclusive=value)


def test_salary_tax() -> None:
    result = pdk.calculate_salary_tax(1_800_000, tax_year=2026)
    assert result is not None
    assert (result.tax, result.monthly, result.effective_rate, result.tax_year) == (72000, 6000, 4, 2026)
    assert result.slab == pdk.SalaryTaxSlab(over=1_200_000, up_to=2_200_000, fixed=6000, rate=11)
    monthly = pdk.calculate_monthly_salary_tax(150_000, tax_year=2026)
    assert monthly is not None and monthly.monthly == 6000
    assert pdk.calculate_salary_tax(1_500_000, date="2019-07-01").tax_year == 2020  # type: ignore[union-attr]
    assert pdk.calculate_salary_tax(1_500_000, date=dt.date(2025, 7, 1)).tax_year == 2026  # type: ignore[union-attr]
    assert pdk.calculate_salary_tax(1_500_000, tax_year=2024, date="2026-01-01").tax_year == 2024  # type: ignore[union-attr]
    assert pdk.calculate_salary_tax(1_500_000, tax_year="2026") is None
    assert pdk.calculate_salary_tax(1_500_000, tax_year=2019) is None
    assert pdk.calculate_salary_tax("100000", tax_year=2026) is None
    assert pdk.calculate_salary_tax(True, tax_year=2026) is None
    assert pdk.calculate_salary_tax(1_500_000) is not None or pdk.get_tax_year() not in pdk.get_salary_tax_years()

    slabs = pdk.get_salary_tax_slabs(2027)
    assert slabs is not None and slabs.tax_year == 2027 and slabs.from_ == "2026-07-01" and slabs.to == "2027-06-30"
    assert pdk.get_salary_tax_slabs(2026.5) is None
    assert pdk.get_salary_tax_years() == list(range(2020, 2028))
    assert pdk.get_tax_year("2025-07-01") == 2026
    assert pdk.get_tax_year(dt.datetime(2025, 6, 30, 23, 59, 59)) == 2025
    assert pdk.get_tax_year("2026-02-29") is None
    assert isinstance(pdk.get_tax_year(), int)


def test_salary_tax_never_raises() -> None:
    values = HOSTILE_INPUTS + [
        True,
        -1,
        0,
        float("nan"),
        float("inf"),
        1e300,
        10**40,
        1e12,
        1e-7,
        2026,
        2026.0,
        [],
        {},
        dt.date(1, 1, 1),
        dt.datetime(9999, 12, 31, 23, 59),
        "2026-11-18",
    ]
    for value in values:
        pdk.get_salary_tax_slabs(value)
        pdk.get_tax_year(value)
        for other in values:
            pdk.calculate_salary_tax(value, tax_year=other)
            pdk.calculate_salary_tax(value, date=other)
            pdk.calculate_monthly_salary_tax(value, tax_year=other)
            pdk.calculate_monthly_salary_tax(value, tax_year=None, date=other)
    top = pdk.calculate_monthly_salary_tax(10**12, tax_year=2027)
    assert top is not None and top.tax > 0


def test_urdu_text() -> None:
    assert pdk.slugify("Lahore Fort, 2024") == "lahore-fort-2024"
    assert pdk.slugify("  Ünited   Kingdom ") == "united-kingdom"
    assert pdk.slugify("Straße ÆON") == "strasse-aeon"
    assert pdk.slugify("---a---") == "a"
    assert pdk.slugify("لاہور قلعہ") == "لاہور-قلعہ"
    assert pdk.slugify("مُحَمَّد") == "محمد"
    assert pdk.slugify("كتاب") == "کتاب"
    assert pdk.slugify("لاہور Fort", script="latin") == "fort"
    assert pdk.slugify("لاہور Fort", script="urdu") == "لاہور"
    assert pdk.slugify("کراچی ۲۰۲۴", script="urdu") == "کراچی-2024"
    assert pdk.slugify("a b", script=None) == "a-b"

    words = ["ے", "بھائی", "آم", "باغ", "اب"]
    assert sorted(words, key=functools.cmp_to_key(pdk.compare_urdu)) == ["اب", "آم", "باغ", "بھائی", "ے"]
    assert pdk.compare_urdu("بہن", "بھائی") == -1
    assert pdk.compare_urdu("ہم", "ھ") == -1
    assert pdk.compare_urdu("اب", "أب") == -1
    assert pdk.compare_urdu("أب", "اج") == -1
    assert pdk.compare_urdu("بت", "بَت") == -1
    assert pdk.compare_urdu("۲", "3") == -1
    assert pdk.compare_urdu("10", "۲") == -1
    assert pdk.compare_urdu(" ", "1") == -1
    assert pdk.compare_urdu("ے", "ك") == -1
    assert pdk.compare_urdu("ے", "a") == -1
    assert pdk.compare_urdu("ا", "ا") == 0
    assert pdk.compare_urdu("a", "A") == 1

    assert pdk.is_rtl("سلام") is True
    assert pdk.is_rtl("123 سلام") is True
    assert pdk.is_rtl("Order نمبر") is False
    assert pdk.is_rtl("שלום") is True
    assert pdk.is_rtl("123") is False
    assert pdk.wrap_bidi("PDK-1042") == "⁨PDK-1042⁩"
    assert pdk.wrap_bidi("abc", "rtl") == "⁧abc⁩"
    assert pdk.wrap_bidi("abc", "ltr") == "⁦abc⁩"


def test_urdu_text_never_raises() -> None:
    values = HOSTILE_INPUTS + [True, 1.5, [], {}, "rtl", "ltr", "urdu", "latin", "آٓھٔ", "ئھ"]
    for value in values:
        assert isinstance(pdk.is_rtl(value), bool)  # type: ignore[arg-type]
        for other in values:
            assert isinstance(pdk.slugify(value, script=other), str)
            assert pdk.compare_urdu(value, other) in (-1, 0, 1)
            assert isinstance(pdk.wrap_bidi(value, other), str)


def test_courier() -> None:
    assert pdk.map_courier_status("PostEx", "Out For Delivery") == "out-for-delivery"
    assert pdk.map_courier_status("postex", 5) == "delivered"
    assert pdk.map_courier_status("PostEx", 5.0) == "delivered"
    assert pdk.map_courier_status("PostEx", "5") == "delivered"
    assert pdk.map_courier_status("PostEx", 5.5) is None
    assert pdk.map_courier_status("PostEx", -1) is None
    assert pdk.map_courier_status("PostEx", True) is None
    assert pdk.map_courier_status("PostEx", "At Merchant’s Warehouse") == "booked"
    assert pdk.map_courier_status("PostEx", "Attempt Made: Customer not available") == "attempted"
    assert pdk.map_courier_status("PostEx", "attempt madez") is None
    assert pdk.map_courier_status("LCS", "Returned to Shipper") == "returned"
    assert pdk.map_courier_status("TCS", "Delivered") is None
    assert pdk.map_courier_status("constructor", "1") is None
    assert pdk.map_courier_status("PostEx", "__proto__") is None
    assert pdk.normalize_city_for_courier("LHR") == "Lahore"
    assert pdk.normalize_city_for_courier("lyallpur") == "Faisalabad"
    assert pdk.normalize_city_for_courier("Karachi City") == "Karachi"
    assert pdk.normalize_city_for_courier("D.G. Khan") == "Dera Ghazi Khan"
    assert pdk.normalize_city_for_courier("لاہور") == "Lahore"
    assert pdk.normalize_city_for_courier("hasOwnProperty") is None
    assert pdk.normalize_city_for_courier("Atlantis") is None


def test_courier_never_raises() -> None:
    values = HOSTILE_INPUTS + [True, -1, 1.5, float("nan"), float("inf"), 1e300, 10**40, [], {}, "PostEx"]
    for value in values:
        result = pdk.normalize_city_for_courier(value)  # type: ignore[arg-type]
        assert result is None or isinstance(result, str)
        for other in values:
            status = pdk.map_courier_status(value, other)  # type: ignore[arg-type]
            assert status is None or isinstance(status, str)
            pdk.map_courier_status("PostEx", other)


FBR_INPUT = {
    "invoiceType": "Sale Invoice",
    "invoiceDate": "2025-04-21",
    "sellerNTNCNIC": "1234567",
    "sellerBusinessName": "Example Traders",
    "sellerProvince": "Sindh",
    "sellerAddress": "Karachi",
    "buyerNTNCNIC": "7654321",
    "buyerBusinessName": "Example Buyer",
    "buyerProvince": "Punjab",
    "buyerAddress": "Lahore",
    "buyerRegistrationType": "Registered",
    "items": [
        {
            "hsCode": "0101.2100",
            "productDescription": "Horses",
            "rate": "18%",
            "uoM": "Numbers, pieces, units",
            "quantity": 2,
            "valueSalesExcludingST": 1234,
            "saleType": "Goods at standard rate (default)",
        }
    ],
}


def test_fbr_invoice() -> None:
    assert pdk.FBR_DI_SPEC_VERSION == "1.12"
    built = pdk.build_fbr_invoice(FBR_INPUT)
    assert built is not None
    item = built.invoice["items"][0]
    assert item["salesTaxApplicable"] == 222.12
    assert item["totalValues"] == 0 and item["salesTaxWithheldAtSource"] == 0
    assert built.invoice["invoiceRefNo"] == "" and built.invoice["buyerNTNCNIC"] == "7654321"
    assert built.totals["salesTaxApplicable"] == 222.12 and built.totals["quantity"] == 2
    assert pdk.validate_fbr_invoice(built.invoice) == pdk.FbrInvoiceValidation(True, [])
    assert pdk.build_fbr_invoice({"items": [1]}) is None
    assert pdk.build_fbr_invoice([]) is None

    bad = {**built.invoice, "invoiceDate": "21-04-2025", "buyerNTNCNIC": "1234567"}
    assert pdk.validate_fbr_invoice(bad).errors == [
        pdk.FbrInvoiceError("0005", "invoiceDate", "Invoice date must be in YYYY-MM-DD format"),
        pdk.FbrInvoiceError(
            "0058", "buyerNTNCNIC", "Buyer and seller must be different (self-invoicing is not allowed)"
        ),
    ]
    assert pdk.validate_fbr_invoice({**built.invoice, "invoiceDate": "2025-04-21\n"}).errors[0].code == "0005"
    future = pdk.validate_fbr_invoice(built.invoice, today="2025-04-20")
    assert [e.code for e in future.errors] == ["0043"]
    wrong = {**built.invoice, "items": [{**item, "salesTaxApplicable": 200}]}
    assert pdk.validate_fbr_invoice(wrong).errors == [
        pdk.FbrInvoiceError("0104", "items[0].salesTaxApplicable", "Sales tax should be 222.12 for this rate")
    ]
    assert pdk.expected_sales_tax({"rate": "Rs.3", "quantity": 12}) == 36
    assert pdk.expected_sales_tax({"rate": "ſs.3", "quantity": 12}) is None  # long s: not "rs" in JS
    assert pdk.expected_sales_tax({"rate": "١٨%", "valueSalesExcludingST": 1000}) is None
    assert pdk.validate_fbr_invoice(None).errors == [
        pdk.FbrInvoiceError(None, "invoice", "The invoice must be an object")
    ]


def test_fbr_invoice_never_raises() -> None:
    values = HOSTILE_INPUTS + [True, -1, 1.5, float("nan"), float("inf"), 1e300, 10**40, 1e-7, [], {}, [None], [{}]]
    keys = ["invoiceType", "invoiceDate", "sellerNTNCNIC", "buyerNTNCNIC", "buyerRegistrationType",
            "invoiceRefNo", "scenarioId", "items"]
    item_keys = ["rate", "saleType", "quantity", "valueSalesExcludingST", "salesTaxApplicable",
                 "fixedNotifiedValueOrRetailPrice", "extraTax", "sroScheduleNo", "discount"]
    base_item = FBR_INPUT["items"][0]  # type: ignore[index]
    for value in values:
        pdk.build_fbr_invoice(value)  # type: ignore[arg-type]
        pdk.expected_sales_tax(value)
        pdk.validate_fbr_invoice(value, today=value)
        for key in keys:
            invoice = {**FBR_INPUT, key: value}
            pdk.build_fbr_invoice(invoice)  # type: ignore[arg-type]
            result = pdk.validate_fbr_invoice(invoice, today="2026-11-18")
            assert isinstance(result.valid, bool)
        for key in item_keys:
            for other in values:
                item = {**base_item, key: value, "rate": other} if key != "rate" else {**base_item, key: value}
                pdk.expected_sales_tax(item)
                invoice = {**FBR_INPUT, "items": [item]}
                built = pdk.build_fbr_invoice(invoice)  # type: ignore[arg-type]
                assert built is not None
                pdk.validate_fbr_invoice(built.invoice)
                pdk.validate_fbr_invoice(invoice)


def test_landline_services() -> None:
    assert pdk.validate_landline("042-35761234") is True
    assert pdk.validate_landline("021-111-123-456") is False
    assert pdk.validate_landline("021-111-123-456", services=True) is True
    assert pdk.validate_landline("111-123-456", services=True) is True
    assert pdk.validate_landline("0800-12345", services=True) is True
    assert pdk.validate_landline("0900-12345", services=True) is True
    assert pdk.validate_landline("0122-123456", services=True) is False
    assert pdk.validate_landline("0300-1234567", services=True) is False
    # Toll-free is 800 and five or six digits.
    assert pdk.get_number_type("0800-12345") == "toll-free"
    assert pdk.get_number_type("0800005000") == "toll-free"
    assert pdk.analyze_number("0800005000").formatted == "0800-005000"  # type: ignore[union-attr]
    assert pdk.validate_landline("0800-005000", services=True) is True
    assert pdk.get_number_type("0800-12345678") is None
    for value in HOSTILE_INPUTS + [True, 1.5, [], {}]:
        assert pdk.validate_landline(value, services=True) is False or isinstance(value, str)


def test_cnics_in_text() -> None:
    text = "CNIC: 35202-1234567-1, phone 0300-1234567"
    found = pdk.find_cnics(text)
    assert found == [pdk.CNICMatch("35202-1234567-1", "3520212345671", "35202-1234567-1", 6, 21)]
    assert text[found[0].start : found[0].end] == found[0].raw
    mixed = pdk.find_cnics("x ۳۵۲۰۲ 1234567-١ y")
    assert len(mixed) == 1 and mixed[0].digits == "3520212345671" and mixed[0].formatted == "35202-1234567-1"
    assert pdk.find_cnics("1235202-1234567-1") == []
    assert pdk.find_cnics("35202-1234567-12") == []
    assert pdk.find_cnics("95202-1234567-1") == []
    assert pdk.mask_cnics("My CNIC is 35202-1234567-1") == pdk.MaskedText("My CNIC is XXXXX-XXXXXXX-X", 1)
    assert pdk.mask_cnics("35202 1234567 1", mask="*").text == "***** ******* *"
    assert pdk.mask_cnics("35202 1234567 1", mask=5).text == "XXXXX XXXXXXX X"  # type: ignore[arg-type]
    assert pdk.mask_cnics("a 3520212345671 b 61101-7654321-2", mask=r"\1").count == 2
    assert pdk.mask_cnics("3520212345671", mask=r"\1").text == r"\1" * 13
    for value in HOSTILE_INPUTS + [True, 1.5, [], {}]:
        if not isinstance(value, str):
            assert pdk.find_cnics(value) == []
            assert pdk.mask_cnics(value) == pdk.MaskedText("", 0)
            assert pdk.mask_cnics(value, replacement="[x]") == pdk.MaskedText("", 0)


def test_cnics_in_text_any_grouping() -> None:
    # Any grouping of exactly 13 digits, including slashes.
    for raw in ["352 0212 3456 71", "35202/1234567/1", "3520-2123-4567-1", "35.20.21.23.45.67.1"]:
        found = pdk.find_cnics(f"id {raw}.")
        assert [(m.raw, m.digits, m.start) for m in found] == [(raw, "3520212345671", 3)]
    assert pdk.find_cnics("a/35202/1234567/1/b")[0].raw == "35202/1234567/1"
    # Any run of spaces joins groups (2.7.2).
    assert pdk.find_cnics("352 0212  3456 71")[0].raw == "352 0212  3456 71"
    assert pdk.find_cnics("952 0212 3456 71") == []
    # Whole groups inside a longer run, the search going on after a match.
    found = pdk.find_cnics("0300-1234567 35202-1234567-1")
    assert [(m.raw, m.start, m.end) for m in found] == [("35202-1234567-1", 13, 28)]
    # An unbroken run of digits is never split.
    assert pdk.find_cnics("352 0212 3456 712") == []
    assert pdk.find_cnics("123520212345671") == []
    assert pdk.find_cnics("4111 1111 1111 1111") == []
    assert pdk.find_cnics("352021234567123") == []
    # Whole groups inside a longer run still match (2.7.2).
    assert pdk.find_cnics("1 352 0212 3456 71")[0].raw == "352 0212 3456 71"
    # Here the first two groups, as in Jaanch's redaction.
    assert pdk.find_cnics(chr(0x06F1) + "35202-1234567-1")[0].digits == "1352021234567"
    assert len(pdk.find_cnics("x35202-1234567-1y")) == 1
    assert pdk.find_cnics("0300 1234 5678 912") == []
    assert pdk.find_cnics("35202/1234567/1/2")[0].raw == "35202/1234567/1"
    # Since 2.7.2 the first three groups (1 + 5 + 7 digits) match here.
    assert pdk.find_cnics("1 35202-1234567-1")[0].raw == "1 35202-1234567"


def test_mask_cnics_replacement() -> None:
    text = "two: 352 0212 3456 71 and 61101/7654321/2."
    assert pdk.mask_cnics(text).text == "two: XXX XXXX XXXX XX and XXXXX/XXXXXXX/X."
    assert pdk.mask_cnics(text, replacement="[CNIC removed]") == pdk.MaskedText(
        "two: [CNIC removed] and [CNIC removed].", 2
    )
    assert pdk.mask_cnics("CNIC 352 0212 3456 71", mask="*", replacement="").text == "CNIC "
    assert pdk.mask_cnics("CNIC 352 0212 3456 71", replacement=42).text == "CNIC XXX XXXX XXXX XX"  # type: ignore[arg-type]
    assert pdk.mask_cnics("a 3520212345671", replacement=r"\1").text == r"a \1"
    assert pdk.mask_cnics("no ids here", replacement="[x]") == pdk.MaskedText("no ids here", 0)

def test_roman_urdu_key() -> None:
    key = pdk.roman_urdu_key
    assert key("Mubeen") == key("Mobeen")
    assert key("Muhammad") == key("Mohammad") == key("Muhammed")
    assert key("Rehman") == key("Rahman")
    assert key("Chaudhry") == key("Chaudhary") == key("Chaudhery")
    assert key("Muhammad Rehman") == "muhmd rahmn"
    assert key("Hussain") != key("Hassan")
    assert key("Fatimah") == key("Fatima")
    assert key("Zéeshan") == key("Zeeshan")
    assert key("سلام") == ""
    for value in HOSTILE_INPUTS + [True, 1.5, [], {}]:
        assert isinstance(key(value), str)  # type: ignore[arg-type]
    assert key(None) == "" and key(42) == ""  # type: ignore[arg-type]


def test_raast_kind_and_merchant_without_iban() -> None:
    payload = pdk.create_merchant_qr(
        {"fields": {"00": "A000000736", "01": "MERCHANT42"}}, "Aziz General Store", "Karachi"
    )
    result = pdk.validate_raast_qr(payload)
    assert (result.valid, result.kind, result.errors, result.warnings) == (True, "merchant", [], ["no-iban"])
    p2p = pdk.validate_raast_qr(pdk.create_raast_p2p_qr(IBAN))
    assert p2p.kind == "p2p" and p2p.valid
    missing = pdk.validate_raast_qr("hello")
    assert missing.kind is None and missing.errors == ["not-a-raast-qr"]
    assert [f.name for f in dataclasses.fields(pdk.RaastQrValidation)][:2] == ["valid", "kind"]


def test_salary_tax_surcharge() -> None:
    plain = pdk.calculate_salary_tax(12_000_000, tax_year=2026)
    assert plain is not None and plain.surcharge == 0 and plain.total == plain.tax == 3_381_000
    result = pdk.calculate_salary_tax(12_000_000, tax_year=2026, include_surcharge=True)
    assert result is not None
    assert (result.tax, result.surcharge, result.total, result.monthly) == (3_381_000, 304_290, 3_685_290, 307_107.5)
    assert result.effective_rate == 30.71
    assert [f.name for f in dataclasses.fields(pdk.SalaryTax)] == [
        "tax", "surcharge", "total", "monthly", "effective_rate", "slab", "tax_year", "source",
    ]
    # Only above Rs 10 million, and not in years without one.
    at_limit = pdk.calculate_salary_tax(10_000_000, tax_year=2026, include_surcharge=True)
    assert at_limit is not None and at_limit.surcharge == 0
    assert pdk.calculate_salary_tax(12_000_000, tax_year=2027, include_surcharge=True).surcharge == 0  # type: ignore[union-attr]
    assert pdk.calculate_salary_tax(12_000_000, tax_year=2024, include_surcharge=True).surcharge == 0  # type: ignore[union-attr]
    monthly = pdk.calculate_monthly_salary_tax(1_000_000, tax_year=2026, include_surcharge=True)
    assert monthly is not None and monthly.total == 3_685_290
    slabs = pdk.get_salary_tax_slabs(2026)
    assert slabs is not None and isinstance(slabs.surcharge, pdk.SalaryTaxSurcharge) and slabs.surcharge.rate == 9
    assert pdk.get_salary_tax_slabs(2024).surcharge is None  # type: ignore[union-attr]


def test_cnics_in_text_spaces_marks_underscores() -> None:
    tab = chr(9)
    for raw in [
        "35202  1234567  1",
        "35202 -1234567- 1",
        "35202_1234567_1",
        "35202 - 1234567 - 1",
        f"35202{tab}1234567{tab}1",
        "35202 _ 1234567 _ 1",
        "35202" + chr(0x00A0) + "1234567" + chr(0x202F) + "1",
    ]:
        assert pdk.mask_cnics(f"id {raw} ok", replacement="[CNIC]") == pdk.MaskedText("id [CNIC] ok", 1)
        assert pdk.find_cnics(f"id {raw} ok")[0].raw == raw
    # One mark between groups, not two; a comma never joins.
    assert pdk.find_cnics("35202 -- 1234567 -- 1") == []
    assert pdk.find_cnics("35202,1234567,1") == []
    # A line break never joins groups.
    lf, cr = chr(10), chr(13)
    for text in [
        f"35202{lf}1234567{lf}1",
        f"35202 {lf} 1234567 {lf} 1",
        f"35202{cr}{lf}1234567{cr}{lf}1",
        f"35202{cr}1234567{cr}1",
    ]:
        assert pdk.find_cnics(text) == []
    assert len(pdk.find_cnics(f"35202-1234567-1{lf}42201-7654321-2")) == 2


def test_cnics_across_lines() -> None:
    lf, cr = chr(10), chr(13)
    for text in [f"35202{lf}1234567{lf}1", f"35202{cr}{lf}1234567{cr}1", f"35202 -{lf} 1234567 {lf}- 1"]:
        found = pdk.find_cnics(text, across_lines=True)
        assert [m.digits for m in found] == ["3520212345671"]
        assert pdk.find_cnics(text) == []
    blank = f"35202{lf}{lf}1234567{lf}1"
    assert pdk.find_cnics(blank, across_lines=True) == []
    assert pdk.find_cnics(f"35202{lf}1234567{lf}1", across_lines=1) == []  # only True turns it on
    masked = pdk.mask_cnics(f"id 35202{lf}1234567{lf}1", across_lines=True)
    assert masked == pdk.MaskedText(f"id XXXXX{lf}XXXXXXX{lf}X", 1)
    replaced = pdk.mask_cnics(f"id 35202{lf}1234567{lf}1", across_lines=True, replacement="[CNIC]")
    assert replaced.text == "id [CNIC]"


def test_data_info() -> None:
    info = pdk.get_data_info("income-tax-slabs")
    assert isinstance(info, pdk.DataInfo) and info.file == "income-tax-slabs.json"
    assert not hasattr(info, "series")
    ids = [d.id for d in pdk.list_data_info()]
    assert ids == sorted(ids) and "banks" in ids
    for value in [None, 42, "", "BANKS", [], {}]:
        assert pdk.get_data_info(value) is None
    salary = pdk.calculate_salary_tax(1_800_000, tax_year=2026)
    assert salary is not None and salary.source.id == "income-tax-slabs"
    assert salary.source.effective_from == "2025-07-01"
    assert pdk.calculate_sales_tax(1000, rate=18).source is None  # type: ignore[union-attr]


def test_zakat() -> None:
    assert pdk.get_zakat_nisab(zakat_year=1447) == pdk.get_zakat_nisab({"zakatYear": 1447})
    nisab = pdk.get_zakat_nisab(zakat_year="1446-47")
    assert nisab is not None and nisab.zakat_year == 1447 and len(nisab.expected_valuation_dates) == 2
    first, second = nisab.expected_valuation_dates
    assert pdk.get_zakat_nisab(date=first) is None  # ambiguous: 1 Ramazan may be either day
    assert pdk.get_zakat_nisab(date=dt.date.fromisoformat(second)) == nisab
    years = pdk.get_zakat_years()
    assert years == sorted(years) and years[-1] == 1447
    deduction = pdk.zakat_deduction(balance=600_000, zakat_year=1447)
    assert deduction is not None and deduction.deductible and deduction.zakat == 15_000
    assert pdk.zakat_deduction({"balance": 600_000, "zakatYear": 1447, "exempt": True}).reason == "exempt"  # type: ignore[union-attr]
    assert pdk.zakat_deduction(balance=1, zakat_year=1447).reason == "below-nisab"  # type: ignore[union-attr]
    for value in HOSTILE_INPUTS + [[], {}, 1447.5, True]:
        assert pdk.get_zakat_nisab(value) is None or isinstance(value, dict)
        pdk.get_zakat_nisab(zakat_year=value)
        pdk.get_zakat_nisab(date=value)
        pdk.zakat_deduction(value)
        pdk.zakat_deduction(balance=value, zakat_year=1447)
        pdk.zakat_deduction(balance=600_000, zakat_year=value, date=value, exempt=value)


def test_withholding() -> None:
    result = pdk.calculate_withholding(section="236K", amount=60_000_000, atl=False, tax_year=2027)
    assert result is not None and result.rate == 14.5 and result.tax == 8_700_000
    assert result.non_atl_rule == "slabs" and isinstance(result.slab, pdk.WithholdingSlab)
    assert result == pdk.calculate_withholding(
        {"section": "236k", "amount": 60_000_000, "atl": False, "taxYear": 2027}
    )
    cash = pdk.calculate_withholding(section="231AB", amount=50_000, atl=False, tax_year=2027)
    assert cash is not None and cash.tax == 0 and cash.threshold is not None and cash.threshold.within_threshold
    assert pdk.calculate_withholding(section="151", amount=1000, atl=True, tax_year=2027) is None  # needs sub_type
    assert pdk.calculate_withholding(section="236K", amount=1000, tax_year=2027) is None  # needs atl
    by_date = pdk.calculate_withholding(section="236K", amount=1000, atl=True, date=dt.date(2026, 7, 1))
    assert by_date is not None and by_date.tax_year == 2027
    rates = pdk.get_withholding_rates(2027)
    assert rates and all(isinstance(r, pdk.WithholdingRate) for r in rates)
    assert [r.section for r in pdk.get_withholding_rates(2027, "154b")] == ["154B"]
    assert pdk.get_withholding_rates(2020) == [] and pdk.get_withholding_rates("2027") == []
    for value in HOSTILE_INPUTS + [[], {}, True, float("nan")]:
        pdk.calculate_withholding(value)
        pdk.calculate_withholding(section=value, amount=value, atl=True, tax_year=2027)
        pdk.calculate_withholding(section="153", sub_type=value, amount=1000, atl=True, tax_year=value, date=value)
        pdk.get_withholding_rates(value, value)


def test_population() -> None:
    lahore = pdk.get_district_population("  LAHORE ")
    assert lahore is not None and lahore.district == "Lahore" and lahore.census == 2023
    assert lahore.source.id == "district-population"
    murree = pdk.get_district_population("Murree")
    assert murree is not None and murree.population is None and murree.census_district is not None
    tehsil = pdk.get_tehsil_population("Murree")
    assert tehsil is not None and tehsil.current_district == "Murree"
    assert pdk.get_tehsil_population("Dasht") is None  # in two districts
    dasht = pdk.get_tehsil_population("Dasht", "Mastung")
    assert dasht is not None and dasht.census_district == "Mastung"
    for value in HOSTILE_INPUTS + [[], {}]:
        assert pdk.get_district_population(value) is None or isinstance(value, str)
        pdk.get_tehsil_population(value, value)
        pdk.get_tehsil_population("Dasht", value)


def test_fbr_reference_lists() -> None:
    sale_types = pdk.get_sale_types()
    assert sale_types[0].sale_type == "Goods at Standard Rate (default)"
    built = pdk.build_fbr_invoice(FBR_INPUT)
    assert built is not None
    invoice = built.invoice
    item = invoice["items"][0]
    ok = {
        "provinces": [invoice["sellerProvince"].upper(), invoice["buyerProvince"]],
        "saleTypes": [item["saleType"]],
        "uoms": [f" {item['uoM']} "],
        "hsUom": {item["hsCode"]: [item["uoM"]]},
    }
    assert pdk.validate_fbr_invoice(invoice, reference=ok).valid
    bad = pdk.validate_fbr_invoice(
        invoice, reference={"provinces": [], "sale_types": ["x"], "uoms": ["KG"], "hsUom": {"0000.0000": ["KG"]}}
    )
    assert [(e.code, e.field) for e in bad.errors] == [
        ("0073", "sellerProvince"),
        ("0074", "buyerProvince"),
        ("0013", "items[0].saleType"),
        ("0099", "items[0].uoM"),
        (None, "items[0].hsCode"),
    ]
    for value in HOSTILE_INPUTS + [[], {}, {"provinces": "x", "hsUom": [1]}, {"hsUom": {1: "x"}}]:
        assert isinstance(pdk.validate_fbr_invoice(invoice, reference=value).valid, bool)
