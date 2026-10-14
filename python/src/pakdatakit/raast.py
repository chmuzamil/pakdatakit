"""Raast QR codes: SBP person-to-person and EMVCo merchant QR payloads.

Implements SBP's "Standard for Interoperable QR Code for Person-to-Person and
Merchant Payments" v1.0 (DI&SD Circular Letter No. 1 of 2022, Annex-I).
"""

from __future__ import annotations

import datetime as _dt
import math
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional, Union

from ._internal.emv import EmvField, EmvSyntaxError, crc16, encode_field, parse_fields, with_crc
from ._internal.js import (
    is_finite,
    is_integer,
    number_to_string,
    to_fixed,
    trim,
    utf16_length,
)
from ._internal.normalize import strip_separators
from .iban import validate_iban

__all__ = [
    "EmvField",
    "MerchantAccountInfo",
    "ParsedRaastQr",
    "RaastQrValidation",
    "create_raast_p2p_qr",
    "create_merchant_qr",
    "parse_raast_qr",
    "validate_raast_qr",
]

_PK_IBAN_PATTERN = re.compile(r"PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\Z")

# Scheme identifier for P2P QR codes. SBP's standard lists "30" for Raast, but
# banking apps generate "00", and the Easypaisa and JazzCash apps reject "30".
_DEFAULT_P2P_SCHEME = "00"

_PLAIN_AMOUNT = re.compile(r"[0-9]+(?:\.[0-9]+)?\Z")
_MERCHANT_AMOUNT = re.compile(r"[0-9]+\.[0-9]{2}\Z")
_EXPIRY = re.compile(r"([0-9]{2})([0-9]{2})([0-9]{4})([0-9]{2})([0-9]{2})\Z")

_DURATION = re.compile(r"([0-9]+(?:\.[0-9]+)?)([mhd])\Z")
_DURATION_UNITS = {"m": 60_000, "h": 3_600_000, "d": 86_400_000}

# Marks an expiry that JavaScript would hold as an "Invalid Date".
_INVALID_DATE = object()

Number = Union[int, float]
Duration = Union[int, float, str, _dt.timedelta]


@dataclass(frozen=True)
class MerchantAccountInfo:
    """Account details for a merchant QR, as issued by the merchant's bank."""

    #: Sub-fields of the template, keyed by 2-digit ID, in the order given.
    fields: Mapping[str, str]
    #: Template tag. SBP reserves ``28``-``30`` for Raast. Defaults to ``28``.
    tag: Optional[str] = None


@dataclass(frozen=True)
class ParsedRaastQr:
    """Result of :func:`parse_raast_qr`."""

    #: ``"p2p"`` for person-to-person QR codes, ``"merchant"`` for EMVCo merchant QR codes.
    kind: str
    #: Whether the QR carries a fixed amount (point of initiation 12).
    dynamic: bool
    #: Whether the CRC checksum matches.
    crc_valid: bool
    iban: Optional[str]
    iban_valid: bool
    amount: Optional[float]
    #: P2P: expiry of a dynamic QR as local ``YYYY-MM-DDTHH:mm``.
    expires_at: Optional[str]
    bank_name: Optional[str]
    particulars: Optional[str]
    merchant_name: Optional[str]
    city: Optional[str]
    mcc: Optional[str]
    bill_number: Optional[str]
    #: Due date as ``YYYY-MM-DD``.
    due_date: Optional[str]
    amount_after_due_date: Optional[float]
    #: All top-level fields, with template fields parsed into ``children``.
    fields: List[EmvField]


@dataclass(frozen=True)
class RaastQrValidation:
    """Result of :func:`validate_raast_qr`."""

    #: ``True`` when there are no errors.
    valid: bool
    #: ``not-a-raast-qr``, ``bad-checksum``, ``no-iban``, ``invalid-iban``,
    #: ``expired`` or ``missing-expiry``.
    errors: List[str]
    #: ``amount-ignored`` or ``expires-soon``.
    warnings: List[str]
    #: The parsed QR, or ``None`` if it could not be read.
    qr: Optional[ParsedRaastQr]


def _naive(value: Any, label: str) -> _dt.datetime:
    if isinstance(value, _dt.datetime):
        if value.tzinfo is not None:
            value = value.astimezone().replace(tzinfo=None)
        return value
    if isinstance(value, _dt.date):
        return _dt.datetime(value.year, value.month, value.day)
    raise ValueError(f"{label} is invalid")


def _resolve_expiry(expires_at: Any, expires_in: Optional[Duration], now: Optional[_dt.datetime]) -> Any:
    if expires_at is not None and expires_in is not None:
        raise ValueError("Use either expiresAt or expiresIn, not both")
    if expires_in is None:
        return expires_at
    if isinstance(expires_in, _dt.timedelta):
        ms: float = expires_in / _dt.timedelta(milliseconds=1)
    elif isinstance(expires_in, str):
        match = _DURATION.match(expires_in)
        if not match:
            raise ValueError(
                "expiresIn must be milliseconds or like '30m', '12h' or '7d', "
                f"received {expires_in}"
            )
        ms = float(match.group(1)) * _DURATION_UNITS[match.group(2)]
    elif isinstance(expires_in, (int, float)) and not isinstance(expires_in, bool):
        ms = float(expires_in)
    else:
        raise ValueError("expiresIn must be a positive duration")
    if not math.isfinite(ms) or ms <= 0:
        raise ValueError("expiresIn must be a positive duration")
    start = _naive(now, "now") if now is not None else _dt.datetime.now()
    try:
        # JavaScript Dates have millisecond precision.
        return start + _dt.timedelta(milliseconds=math.trunc(ms))
    except OverflowError:
        return _INVALID_DATE


def _format_amount(amount: Any, max_length: int, label: str) -> str:
    if not is_finite(amount) or amount <= 0:
        raise ValueError(f"{label} must be a positive number")
    text = to_fixed(amount, 2)
    if len(text) > max_length or not _MERCHANT_AMOUNT.match(text):
        raise ValueError(f"{label} is too large for a Raast QR code")
    return text


def _format_p2p_amount(amount: Any) -> str:
    """Whole rupees as ``1500`` (as banking apps write them), otherwise ``1500.50``."""
    if not is_finite(amount) or amount <= 0:
        raise ValueError("amount must be a positive number")
    text = number_to_string(amount) if is_integer(amount) else to_fixed(amount, 2)
    # Very large numbers stringify in exponent form ("1e+21"), so check the shape too.
    if len(text) > 10 or not _PLAIN_AMOUNT.match(text):
        raise ValueError("amount is too large for a Raast QR code")
    return text


def _format_expiry(value: Any) -> str:
    """``DDMMYYYYhhmm`` in local time."""
    if value is _INVALID_DATE:
        raise ValueError("expiresAt is invalid")
    date = _naive(value, "expiresAt")
    return f"{date.day:02d}{date.month:02d}{date.year:04d}{date.hour:02d}{date.minute:02d}"


def _check_length(value: str, maximum: int, label: str) -> str:
    if len(value) > maximum:
        raise ValueError(f"{label} must be at most {maximum} characters")
    return value


def _normalize_iban(iban: str) -> str:
    normalized = strip_separators(iban).upper()
    if not validate_iban(normalized):
        raise ValueError(f"Invalid Pakistani IBAN: {iban}")
    return normalized


def create_raast_p2p_qr(
    iban: str,
    *,
    amount: Optional[Number] = None,
    expires_at: Optional[_dt.datetime] = None,
    expires_in: Optional[Duration] = None,
    bank_name: Optional[str] = None,
    particulars: Optional[str] = None,
    scheme: Optional[str] = _DEFAULT_P2P_SCHEME,
    now: Optional[_dt.datetime] = None,
) -> str:
    """Creates a Raast person-to-person QR payload (SBP P2P format ``02``).

    Matches the QR codes banking apps generate, so Easypaisa, JazzCash and
    other apps can scan it. Encode the returned string with any QR library.

    A QR with an ``amount`` is dynamic and needs ``expires_at`` (a naive local
    ``datetime``) or ``expires_in`` (milliseconds, a ``timedelta``, or a string
    such as ``"30m"``, ``"12h"`` or ``"7d"``, counted from ``now``, which
    defaults to the current local time).

    Raises ``ValueError`` if the IBAN is invalid, a field is too long, or an
    amount is given without an expiry.
    """
    expiry = _resolve_expiry(expires_at, expires_in, now)
    normalized_iban = _normalize_iban(iban)
    payload = (
        encode_field("00", "02")
        + encode_field("01", "11" if amount is None else "12")
        + encode_field("02", scheme if scheme is not None else _DEFAULT_P2P_SCHEME)
    )
    if bank_name:
        payload += encode_field("03", _check_length(bank_name, 25, "bankName"))
    payload += encode_field("04", normalized_iban)
    if amount is not None:
        payload += encode_field("05", _format_p2p_amount(amount))
    if particulars:
        payload += encode_field("06", _check_length(particulars, 30, "particulars"))
    if amount is not None:
        if expiry is None:
            raise ValueError("A QR with an amount needs expiresAt or expiresIn")
        payload += encode_field("07", _format_expiry(expiry))
    data = f"{payload}1004"
    return f"{data}{crc16(data)}"


def _account(merchant_account: Any) -> "tuple[Optional[str], Mapping[str, str]]":
    if isinstance(merchant_account, Mapping):
        return merchant_account.get("tag"), merchant_account.get("fields") or {}
    return getattr(merchant_account, "tag", None), getattr(merchant_account, "fields", None) or {}


def create_merchant_qr(
    merchant_account: Union[MerchantAccountInfo, Mapping[str, Any]],
    merchant_name: str,
    city: str,
    *,
    mcc: Optional[str] = None,
    amount: Optional[Number] = None,
    dynamic: Optional[bool] = None,
    bill_number: Optional[str] = None,
    mobile_number: Optional[str] = None,
    reference: Optional[str] = None,
    due_date: Optional[_dt.date] = None,
    amount_after_due_date: Optional[Number] = None,
) -> str:
    """Creates an EMVCo merchant-presented QR payload per SBP's Pakistan QR standard.

    ``merchant_account`` is a :class:`MerchantAccountInfo` or a dict such as
    ``{"tag": "28", "fields": {"00": "A000000736", "01": iban}}`` holding the
    template sub-fields your bank gives you.

    Raises ``ValueError`` if a field is missing, too long, or out of range.
    """
    tag, fields = _account(merchant_account)
    if tag is None:
        tag = "28"
    if not re.match(r"(?:2[6-9]|[34][0-9]|5[01])\Z", tag):
        raise ValueError("merchantAccount.tag must be between 26 and 51")
    account_fields = list(fields.items())
    if len(account_fields) == 0:
        raise ValueError("merchantAccount.fields must not be empty")
    if mcc is None:
        mcc = "0000"
    if not re.match(r"[0-9]{4}\Z", mcc):
        raise ValueError("mcc must be 4 digits")
    if (due_date is None) != (amount_after_due_date is None):
        raise ValueError("dueDate and amountAfterDueDate must be used together")

    is_dynamic = dynamic if dynamic is not None else amount is not None
    for field_id, _ in account_fields:
        if not isinstance(field_id, str) or not re.match(r"[0-9]{2}\Z", field_id):
            raise ValueError(f"Invalid merchant account sub-field ID: {field_id}")
    # Sub-fields are written in ID order (00, 01, ... 10 ...).
    account = "".join(
        encode_field(field_id, value)
        for field_id, value in sorted(account_fields, key=lambda item: int(item[0]))
    )

    payload = (
        encode_field("00", "01")
        + encode_field("01", "12" if is_dynamic else "11")
        + encode_field(tag, account)
        + encode_field("52", mcc)
        + encode_field("53", "586")
    )
    if amount is not None:
        payload += encode_field("54", _format_amount(amount, 13, "amount"))
    payload += (
        encode_field("58", "PK")
        + encode_field("59", _check_length(merchant_name, 25, "merchantName"))
        + encode_field("60", _check_length(city, 15, "city"))
    )

    additional = ""
    if bill_number:
        additional += encode_field("01", _check_length(bill_number, 25, "billNumber"))
    if mobile_number:
        additional += encode_field("02", _check_length(mobile_number, 15, "mobileNumber"))
    if reference:
        additional += encode_field("05", _check_length(reference, 25, "reference"))
    if due_date is not None and amount_after_due_date is not None:
        if not isinstance(due_date, _dt.date):
            raise ValueError("dueDate is invalid")
        ddmmyyyy = f"{due_date.day:02d}{due_date.month:02d}{due_date.year:04d}"
        additional += encode_field("50", ddmmyyyy) + encode_field(
            "51", _format_amount(amount_after_due_date, 13, "amountAfterDueDate")
        )
    if additional:
        payload += encode_field("62", additional)

    result = with_crc(payload)
    if len(result) > 512:
        raise ValueError("QR payload exceeds 512 characters")
    return result


def _field_value(fields: List[EmvField], field_id: str) -> Optional[str]:
    for f in fields:
        if f.id == field_id:
            return f.value
    return None


def _to_amount(value: Optional[str]) -> Optional[float]:
    """Reads an amount field: plain digits with optional decimals, else ``None``."""
    if value is None or not _PLAIN_AMOUNT.match(value):
        return None
    return float(value)


def _is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _parse_expiry(value: Optional[str]) -> Optional[str]:
    """Reads ``DDMMYYYYhhmm`` as ``YYYY-MM-DDTHH:mm``, or ``None`` unless it is
    a real date and time (month 1-12, a day that exists, hour 0-23, minute 0-59)."""
    match = _EXPIRY.match(value) if value else None
    if not match:
        return None
    dd, mm, yyyy, hh, mi = match.groups()
    day, month, year, hour, minute = int(dd), int(mm), int(yyyy), int(hh), int(mi)
    if not 1 <= month <= 12 or hour > 23 or minute > 59:
        return None
    days_in_month = [31, 29 if _is_leap(year) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if not 1 <= day <= days_in_month[month - 1]:
        return None
    return f"{yyyy}-{mm}-{dd}T{hh}:{mi}"


def _without_last_utf16_units(text: str, count: int) -> str:
    units = text.encode("utf-16-le", "surrogatepass")
    return units[: max(0, len(units) - 2 * count)].decode("utf-16-le", "surrogatepass")


def parse_raast_qr(payload: str) -> Optional[ParsedRaastQr]:
    """Parses a Raast QR payload (P2P format ``02`` or EMVCo merchant format ``01``)
    and verifies its CRC. Returns ``None`` if it is not a well-formed Pakistani QR code.
    """
    text = trim(payload)
    try:
        fields = parse_fields(text)
    except EmvSyntaxError:
        return None

    fmt = _field_value(fields, "00")
    kind = "p2p" if fmt == "02" else "merchant" if fmt == "01" else None
    if kind is None:
        return None

    crc_id = "10" if kind == "p2p" else "63"
    last = fields[-1] if fields else None
    crc_valid = (
        last is not None
        and last.id == crc_id
        and utf16_length(last.value) == 4
        and crc16(_without_last_utf16_units(text, 4)) == last.value.upper()
    )

    iban: Optional[str] = None
    if kind == "p2p":
        iban = _field_value(fields, "04")
    else:
        for f in fields:
            if 26 <= int(f.id) <= 51:
                match = next(
                    (c for c in (f.children or []) if _PK_IBAN_PATTERN.match(c.value)), None
                )
                if match:
                    iban = match.value
                    break

    additional: List[EmvField] = []
    for f in fields:
        if f.id == "62":
            additional = f.children or []
            break
    due = _field_value(additional, "50")
    expiry = _field_value(fields, "07") if kind == "p2p" else None

    expires_at = _parse_expiry(expiry)
    due_date = (
        f"{due[4:]}-{due[2:4]}-{due[0:2]}" if due and re.match(r"[0-9]{8}\Z", due) else None
    )

    return ParsedRaastQr(
        kind=kind,
        dynamic=_field_value(fields, "01") == "12",
        crc_valid=crc_valid,
        iban=iban,
        iban_valid=iban is not None and validate_iban(iban),
        amount=_to_amount(_field_value(fields, "05" if kind == "p2p" else "54")),
        expires_at=expires_at,
        bank_name=_field_value(fields, "03") if kind == "p2p" else None,
        particulars=_field_value(fields, "06") if kind == "p2p" else None,
        merchant_name=_field_value(fields, "59") if kind == "merchant" else None,
        city=_field_value(fields, "60") if kind == "merchant" else None,
        mcc=_field_value(fields, "52") if kind == "merchant" else None,
        bill_number=_field_value(additional, "01"),
        due_date=due_date,
        amount_after_due_date=_to_amount(_field_value(additional, "51")),
        fields=fields,
    )


def _local_date_time(value: str) -> Optional[_dt.datetime]:
    """``new Date(year, month - 1, day, hour, minute)``, including its rollover."""
    date, time = value.split("T")
    year, month, day = (int(p) for p in date.split("-"))
    hour, minute = (int(p) for p in time.split(":"))
    if 0 <= year <= 99:
        year += 1900
    year += (month - 1) // 12
    month = (month - 1) % 12 + 1
    try:
        return _dt.datetime(year, month, 1) + _dt.timedelta(
            days=day - 1, hours=hour, minutes=minute
        )
    except (OverflowError, ValueError):
        return None


def validate_raast_qr(
    payload: str,
    *,
    now: Optional[_dt.datetime] = None,
    expires_soon_ms: Optional[Number] = None,
) -> RaastQrValidation:
    """Checks whether a Raast QR code can be paid.

    Errors: not a Pakistani payment QR, checksum mismatch, no IBAN or an
    invalid IBAN, expired, or a fixed-amount QR without an expiry.
    Warnings: an amount in a static QR (apps ignore it), or a QR that expires
    within ``expires_soon_ms`` (default one hour) of ``now`` (default: the
    current local time).
    """
    qr = parse_raast_qr(payload)
    if qr is None:
        return RaastQrValidation(valid=False, errors=["not-a-raast-qr"], warnings=[], qr=None)

    errors: List[str] = []
    warnings: List[str] = []
    current = _naive(now, "now") if now is not None else _dt.datetime.now()

    if not qr.crc_valid:
        errors.append("bad-checksum")
    if qr.iban is None:
        errors.append("no-iban")
    elif not qr.iban_valid:
        errors.append("invalid-iban")

    if qr.kind == "p2p":
        if qr.dynamic and qr.expires_at is None:
            errors.append("missing-expiry")
        if not qr.dynamic and qr.amount is not None:
            warnings.append("amount-ignored")
        if qr.expires_at is not None:
            expiry = _local_date_time(qr.expires_at)
            remaining = (
                (expiry - current) / _dt.timedelta(milliseconds=1) if expiry else math.inf
            )
            if remaining <= 0:
                errors.append("expired")
            elif remaining <= (3_600_000 if expires_soon_ms is None else expires_soon_ms):
                warnings.append("expires-soon")

    return RaastQrValidation(valid=len(errors) == 0, errors=errors, warnings=warnings, qr=qr)
