"""National Tax Number (NTN) and Sales Tax Registration Number (STRN) checks."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ._internal.js import trim
from ._internal.normalize import strip_separators, to_ascii_digits
from .cnic import validate_cnic

__all__ = ["NTNInfo", "analyze_ntn", "validate_ntn", "validate_strn"]

_BUSINESS_NTN = re.compile(r"([0-9]{7})(?:[-‐‑‒–— ]?([0-9]))?\Z")
_STRN = re.compile(r"[0-9]{13}\Z")


@dataclass(frozen=True)
class NTNInfo:
    """Result of :func:`analyze_ntn`."""

    #: ``"individual"`` (a CNIC) or ``"business"`` (7-digit NTN).
    type: str
    #: Digits without separators (7, 8 or 13 digits).
    digits: str
    #: ``1234567-8`` for business NTNs with a check digit, ``#####-#######-#`` for CNICs.
    formatted: str


def analyze_ntn(ntn: str) -> Optional[NTNInfo]:
    """Analyzes an NTN: a 13-digit CNIC for individuals, or 7 digits (plus an
    optional check digit) for businesses. Format only; returns ``None`` if invalid.
    """
    trimmed = to_ascii_digits(trim(ntn))
    if validate_cnic(trimmed):
        digits = strip_separators(trimmed)
        return NTNInfo(
            type="individual",
            digits=digits,
            formatted=f"{digits[:5]}-{digits[5:12]}-{digits[12]}",
        )
    match = _BUSINESS_NTN.match(trimmed)
    if not match:
        return None
    base, check = match.group(1), match.group(2)
    return NTNInfo(
        type="business",
        digits=base + (check or ""),
        formatted=base if check is None else f"{base}-{check}",
    )


def validate_ntn(ntn: str) -> bool:
    """Validates the format of an NTN. See :func:`analyze_ntn`."""
    return analyze_ntn(ntn) is not None


def validate_strn(strn: str) -> bool:
    """Validates the format of an STRN: 13 digits, with optional spaces or dashes."""
    return _STRN.match(strip_separators(to_ascii_digits(strn))) is not None
