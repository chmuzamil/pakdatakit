"""Pakistani mobile number validation, formatting and analysis."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from ._internal.phone_utils import get_phone_prefix, normalize_phone_digits
from .networks import get_network

__all__ = [
    "PhoneAnalysis",
    "validate_phone",
    "format_phone",
    "analyze_phone",
    "get_phone_prefix",
    "normalize_phone_digits",
]


@dataclass(frozen=True)
class PhoneAnalysis:
    """Combined phone validation, formatting and network analysis result."""

    valid: bool
    formatted: Optional[str]
    network: str


def validate_phone(phone: str) -> bool:
    """Validates a Pakistani mobile number on an allocated ``03XX`` prefix."""
    return normalize_phone_digits(phone) is not None


def format_phone(phone: str) -> Optional[str]:
    """Formats a mobile number as E.164 (``+923001234567``), or ``None`` if invalid."""
    digits = normalize_phone_digits(phone)
    if digits is None:
        return None
    return f"+{digits}"


def analyze_phone(phone: str) -> PhoneAnalysis:
    """Validates, formats and detects the network of a mobile number in one call."""
    formatted = format_phone(phone)
    if formatted is None:
        return PhoneAnalysis(valid=False, formatted=None, network="Unknown")
    return PhoneAnalysis(valid=True, formatted=formatted, network=get_network(phone))
