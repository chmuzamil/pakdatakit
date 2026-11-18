"""Pakistani utility bill numbers: electricity references and gas consumer numbers."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal, Optional

from ._internal.js import WS
from ._internal.normalize import to_ascii_digits

__all__ = [
    "ElectricityRefType",
    "ElectricityRef",
    "GasCompany",
    "parse_electricity_ref",
    "validate_electricity_ref",
    "validate_gas_consumer_number",
]

#: Kind of electricity bill identifier.
#:
#: - ``reference``: the 14-digit reference number on a DISCO (WAPDA) bill,
#:   optionally followed by ``U`` (urban) or ``R`` (rural).
#: - ``customer-id``: the customer ID on a DISCO bill: 10 digits, or 11 for LESCO.
#: - ``k-electric``: a 13-digit K-Electric account number (``04000…``).
ElectricityRefType = Literal["reference", "customer-id", "k-electric"]

#: A gas company whose consumer number format is published.
GasCompany = Literal["SNGPL", "SSGC"]

# Separators people type inside bill numbers (JavaScript ``\s`` plus dashes, dots, slashes).
_SEPARATORS = re.compile("[" + WS + r"\-‐‑‒–—./]")
_REFERENCE_LETTER = re.compile(r"([0-9]{14})([UR])\Z")
_DIGITS = re.compile(r"[0-9]+\Z")

_GAS_DIGITS = {"SNGPL": 11, "SSGC": 10}


@dataclass(frozen=True)
class ElectricityRef:
    """Result of :func:`parse_electricity_ref`."""

    #: ``reference``, ``customer-id`` or ``k-electric``.
    type: ElectricityRefType
    #: The digits, without separators or the U/R letter.
    digits: str
    #: Display form: ``01 14111 1234567 U`` for a reference (2, 5 and 7 digits,
    #: as on PITC's bill illustration), the digits for the others.
    formatted: str
    #: ``U`` or ``R`` when given after a reference number, otherwise ``None``.
    urban_rural: Optional[Literal["U", "R"]]
    #: ``K-Electric`` for a K-Electric account; otherwise always ``None``, because
    #: no official source maps reference or customer ID digits to a DISCO.
    disco: Optional[Literal["K-Electric"]]


def parse_electricity_ref(ref: str) -> Optional[ElectricityRef]:
    """Parses a Pakistani electricity bill identifier: a DISCO reference number,
    a DISCO customer ID or a K-Electric account number.

    PITC's bill pages take a 14-digit reference number with a separate U/R
    choice, or a 10-digit customer ID (11 digits for LESCO); K-Electric asks for
    a 13-digit account number starting with ``04000``. No check digit is
    published, so only the format is checked. Spaces, dashes and dots are
    ignored, and Urdu digits are accepted. See DATA.md in the repository.

    Returns ``None`` if the input matches none of the formats. Never raises.
    """
    if not isinstance(ref, str):
        return None
    text = _SEPARATORS.sub("", to_ascii_digits(ref)).upper()
    urban_rural: Optional[Literal["U", "R"]] = None
    letter = _REFERENCE_LETTER.match(text)
    if letter:
        text = letter.group(1)
        urban_rural = "U" if letter.group(2) == "U" else "R"
    if not _DIGITS.match(text):
        return None

    if len(text) == 14:
        formatted = f"{text[:2]} {text[2:7]} {text[7:]}"
        if urban_rural:
            formatted = f"{formatted} {urban_rural}"
        return ElectricityRef("reference", text, formatted, urban_rural, None)
    if urban_rural is not None:
        return None
    if len(text) == 13 and text.startswith("04000"):
        return ElectricityRef("k-electric", text, text, None, "K-Electric")
    if len(text) in (10, 11):
        return ElectricityRef("customer-id", text, text, None, None)
    return None


def validate_electricity_ref(ref: str) -> bool:
    """Validates a Pakistani electricity bill identifier. See :func:`parse_electricity_ref`."""
    return parse_electricity_ref(ref) is not None


def validate_gas_consumer_number(number: str, company: GasCompany) -> bool:
    """Validates a gas bill consumer number: 11 digits for SNGPL, 10 digits for
    SSGC, as their bill pages ask for. No check digit is published, so only the
    format is checked. ``company`` is ``SNGPL`` or ``SSGC`` (any case); anything
    else returns ``False``. Never raises. See DATA.md in the repository.
    """
    if not isinstance(number, str) or not isinstance(company, str):
        return False
    digits = _GAS_DIGITS.get(company.upper())
    if digits is None:
        return False
    text = _SEPARATORS.sub("", to_ascii_digits(number))
    return len(text) == digits and _DIGITS.match(text) is not None
