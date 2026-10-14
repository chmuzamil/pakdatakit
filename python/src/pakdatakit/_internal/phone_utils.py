"""Mobile number normalization (mirrors src/internal/phone-utils.ts)."""

from __future__ import annotations

import re
from typing import Optional

from .._data import load
from .normalize import strip_separators, to_ascii_digits

_MOBILE = re.compile(r"3[0-9]{9}\Z")
_allocated: Optional[frozenset] = None


def _allocated_prefixes() -> frozenset:
    global _allocated
    if _allocated is None:
        _allocated = frozenset(entry["prefix"] for entry in load("networks.json"))
    return _allocated


def is_allocated_prefix(prefix: str) -> bool:
    """Whether a ``03XX`` mobile prefix is allocated to an operator."""
    return prefix in _allocated_prefixes()


def normalize_phone_digits(phone: str) -> Optional[str]:
    """Normalizes a phone string to digits with country code (no leading plus).

    Returns ``None`` when the input is not a Pakistani mobile number on an
    allocated ``03XX`` prefix.
    """
    digits = strip_separators(to_ascii_digits(phone))
    if digits.startswith("+"):
        digits = digits[1:]
    elif digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("92") and len(digits) > 10:
        digits = digits[2:]
    if digits.startswith("0"):
        digits = digits[1:]
    if not _MOBILE.match(digits):
        return None
    if f"0{digits[:3]}" not in _allocated_prefixes():
        return None
    return f"92{digits}"


def get_phone_prefix(phone: str) -> Optional[str]:
    """Returns the local mobile prefix (``0XXX``), or ``None`` if invalid."""
    digits = normalize_phone_digits(phone)
    if digits is None:
        return None
    return f"0{digits[2:5]}"
