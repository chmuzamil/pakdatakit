"""CNIC (Computerized National Identity Card) validation and decoding."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ._internal.js import trim
from ._internal.normalize import to_ascii_digits

__all__ = ["CNICInfo", "validate_cnic", "get_cnic_info"]

# 13 digits, optionally grouped as #####-#######-# with a consistent separator.
_CNIC_PATTERN = re.compile(r"[1-8][0-9]{4}([-‐‑‒–—. ]?)[0-9]{7}\1[0-9]\Z")

_CNIC_PROVINCES = {
    "1": "Khyber Pakhtunkhwa",
    "2": "Khyber Pakhtunkhwa",
    "3": "Punjab",
    "4": "Sindh",
    "5": "Balochistan",
    "6": "Islamabad Capital Territory",
    "7": "Gilgit-Baltistan",
    "8": "Azad Jammu and Kashmir",
}


@dataclass(frozen=True)
class CNICInfo:
    """Information encoded in a CNIC number."""

    #: The CNIC as 13 digits without separators.
    digits: str
    #: The CNIC in ``#####-#######-#`` form.
    formatted: str
    #: Province where the CNIC was first registered (from the first digit).
    province: str
    #: ``"male"`` (odd last digit) or ``"female"`` (even last digit).
    gender: str


def validate_cnic(cnic: str) -> bool:
    """Validates a Pakistani CNIC number (structure only).

    Accepts ``3520212345671``, ``35202-1234567-1``, ``35202 1234567 1`` and Urdu digits.
    """
    return _CNIC_PATTERN.match(to_ascii_digits(trim(cnic))) is not None


def get_cnic_info(cnic: str) -> Optional[CNICInfo]:
    """Reads the province of registration and gender encoded in a CNIC.

    Returns ``None`` if the CNIC is invalid.
    """
    if not validate_cnic(cnic):
        return None
    digits = re.sub(r"[^0-9]", "", to_ascii_digits(cnic))
    return CNICInfo(
        digits=digits,
        formatted=f"{digits[:5]}-{digits[5:12]}-{digits[12]}",
        province=_CNIC_PROVINCES[digits[0]],
        gender="male" if int(digits[12]) % 2 == 1 else "female",
    )
