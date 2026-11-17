"""Idiomatic Python usage: keyword arguments, dataclasses, dates, errors."""

from __future__ import annotations

import dataclasses
import datetime as dt
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
