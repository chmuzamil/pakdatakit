"""Landline, UAN, toll-free, premium and personal numbers."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ._data import load
from ._internal.normalize import normalize_key, strip_separators, to_ascii_digits
from ._internal.phone_utils import normalize_phone_digits

__all__ = ["NumberInfo", "analyze_number", "get_number_type", "validate_landline", "get_area_code"]

# Number patterns from Google libphonenumber's PK metadata (v9.0.41). They apply
# to the national significant number, without the trunk prefix 0.
_FIXED_LINE = re.compile(
    r"(?:(?:(?:21|42)[2-9]|58[126])[0-9]{7}|(?:2[25]|4[0146-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9][0-9]{6,7}|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8]))[2-9][0-9]{5,6})\Z"
)
_UAN = re.compile(
    r"((?:2(?:[125]|3[2358]|4[2-4]|9[2-8])|4(?:[0-246-9]|5[3479])|5(?:[1-35-7]|4[2-467])|6(?:0[468]|[1-8])|7(?:[14]|2[236])|8(?:[16]|2[2-689]|3[23578]|4[3478]|5[2356])|9(?:1|22|3[27-9]|4[2-6]|6[3569]|9[2-7])))111([0-9]{6})\Z"
)
_UAN_WITHOUT_AREA_CODE = re.compile(r"111([0-9]{6})\Z")
_TOLL_FREE = re.compile(r"800([0-9]{5}(?:[0-9]{3})?)\Z")
_PREMIUM = re.compile(r"900([0-9]{5})\Z")
_PERSONAL = re.compile(r"122([0-9]{6})\Z")
_NATIONAL = re.compile(r"[0-9]{8,12}\Z")

_area_code_map: Optional[Dict[str, List[str]]] = None


@dataclass(frozen=True)
class NumberInfo:
    """Result of :func:`analyze_number`."""

    #: ``mobile``, ``landline``, ``uan``, ``toll-free``, ``premium`` or ``personal``.
    type: str
    #: National format with trunk prefix and separators, e.g. ``021-111-825-888``.
    formatted: str
    #: E.164 format; ``None`` for a UAN dialled without an area code.
    e164: Optional[str]
    #: Area code with trunk prefix (e.g. ``021``) for landlines and UANs.
    area_code: Optional[str] = None
    #: Cities served by the area code, when known.
    cities: List[str] = field(default_factory=list)


def _area_codes() -> list:
    return load("area-codes.json")


def _area_map() -> Dict[str, List[str]]:
    global _area_code_map
    if _area_code_map is None:
        _area_code_map = {e["code"]: e["cities"] for e in _area_codes()}
    return _area_code_map


def _to_national_number(value: str) -> Optional[str]:
    digits = strip_separators(to_ascii_digits(value))
    if digits.startswith("+"):
        digits = digits[1:]
        if not digits.startswith("92"):
            return None
        digits = digits[2:]
    elif digits.startswith("0092"):
        digits = digits[4:]
    elif digits.startswith("92") and len(digits) >= 11:
        digits = digits[2:]
    if digits.startswith("0"):
        digits = digits[1:]
    return digits if _NATIONAL.match(digits) else None


def _find_area_code(national: str) -> Optional[str]:
    for length in (4, 3, 2):
        prefix = national[:length]
        if prefix in _area_map():
            return prefix
    return None


def _group_digits(digits: str, size: int = 3) -> str:
    groups = re.findall("[0-9]{1,%d}" % size, digits)
    return "-".join(groups) if groups else digits


def analyze_number(phone: str) -> Optional[NumberInfo]:
    """Identifies and formats any Pakistani telephone number.

    Handles mobile, landline, UAN (``111``), toll-free (``0800``), premium-rate
    (``0900``) and personal (``0122``) numbers. Returns ``None`` if invalid.
    """
    mobile = normalize_phone_digits(phone)
    if mobile is not None:
        national = mobile[2:]
        return NumberInfo(
            type="mobile",
            formatted=f"0{national[:3]}-{national[3:]}",
            e164=f"+{mobile}",
            area_code=None,
            cities=[],
        )

    bare_uan = _UAN_WITHOUT_AREA_CODE.match(strip_separators(to_ascii_digits(phone)))
    if bare_uan:
        return NumberInfo(
            type="uan",
            formatted=f"111-{_group_digits(bare_uan.group(1))}",
            e164=None,
            area_code=None,
            cities=[],
        )

    national = _to_national_number(phone)
    if national is None:
        return None

    def service(kind: str, prefix: str, rest: str) -> NumberInfo:
        return NumberInfo(
            type=kind, formatted=f"0{prefix}-{rest}", e164=f"+92{national}", area_code=None, cities=[]
        )

    match = _TOLL_FREE.match(national)
    if match:
        return service("toll-free", "800", match.group(1))
    match = _PREMIUM.match(national)
    if match:
        return service("premium", "900", match.group(1))
    match = _PERSONAL.match(national)
    if match:
        return service("personal", "122", match.group(1))

    match = _UAN.match(national)
    if match:
        code = match.group(1)
        return NumberInfo(
            type="uan",
            formatted=f"0{code}-111-{_group_digits(match.group(2))}",
            e164=f"+92{national}",
            area_code=f"0{code}",
            cities=list(_area_map().get(code, [])),
        )

    if _FIXED_LINE.match(national):
        code = _find_area_code(national)
        return NumberInfo(
            type="landline",
            formatted=f"0{code}-{national[len(code):]}" if code else f"0{national}",
            e164=f"+92{national}",
            area_code=f"0{code}" if code else None,
            cities=list(_area_map().get(code, [])) if code else [],
        )

    return None


def get_number_type(phone: str) -> Optional[str]:
    """Returns the type of a Pakistani telephone number, or ``None``."""
    info = analyze_number(phone)
    return info.type if info else None


def validate_landline(phone: str) -> bool:
    """Validates a landline (fixed-line) number such as ``042-35761234``."""
    return get_number_type(phone) == "landline"


def get_area_code(city: str) -> Optional[str]:
    """Returns the landline area code for a city with trunk prefix (``"042"``), or ``None``."""
    key = normalize_key(city)
    for entry in _area_codes():
        if any(normalize_key(name) == key for name in entry["cities"]):
            return f"0{entry['code']}"
    return None
