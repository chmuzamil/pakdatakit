"""Pakistani IBAN validation and bank lookup."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional

from ._data import load
from ._internal.normalize import strip_separators

__all__ = ["BankInfo", "validate_iban", "get_bank_from_iban", "get_bank_info", "get_banks"]

_PK_IBAN_PATTERN = re.compile(r"PK[0-9]{2}[A-Z]{4}[A-Z0-9]{16}\Z")
_BANK_CODE = re.compile(r"[A-Z]{4}\Z")


@dataclass(frozen=True)
class BankInfo:
    """A bank (or other institution) that issues Pakistani IBANs."""

    #: 4-letter IBAN bank code (characters 5-8 of the IBAN).
    code: str
    name: str
    #: ``commercial``, ``islamic``, ``microfinance``, ``digital``, ``emi``
    #: (electronic money institution such as a wallet), ``foreign``,
    #: ``specialized`` or ``central`` (State Bank of Pakistan).
    type: str
    #: ``False`` for banks that merged into another and no longer exist.
    active: bool
    #: Code of the bank this one merged into, if it no longer exists.
    merged_into: Optional[str] = None
    #: Main code of the same bank, when this is an older code still in use.
    alias_of: Optional[str] = None


_bank_list: Optional[List[BankInfo]] = None
_bank_map: Optional[Dict[str, BankInfo]] = None


def _banks() -> List[BankInfo]:
    global _bank_list
    if _bank_list is None:
        _bank_list = [
            BankInfo(
                code=entry["code"],
                name=entry["name"],
                type=entry["type"],
                active="mergedInto" not in entry,
                merged_into=entry.get("mergedInto"),
                alias_of=entry.get("aliasOf"),
            )
            for entry in load("banks.json")
        ]
    return _bank_list


def _bank_by_code() -> Dict[str, BankInfo]:
    global _bank_map
    if _bank_map is None:
        _bank_map = {bank.code: bank for bank in _banks()}
    return _bank_map


def _expand(value: str) -> str:
    return "".join(str(ord(c) - 55) if "A" <= c <= "Z" else c for c in value)


def _mod97(numeric: str) -> int:
    remainder = 0
    for digit in numeric:
        remainder = (remainder * 10 + int(digit)) % 97
    return remainder


def _normalize(iban: str) -> str:
    return strip_separators(iban).upper()


def validate_iban(iban: str) -> bool:
    """Validates a 24-character ``PK`` IBAN (format and ISO 13616 mod-97 checksum)."""
    normalized = _normalize(iban)
    if not _PK_IBAN_PATTERN.match(normalized):
        return False
    rearranged = normalized[4:] + normalized[:4]
    return _mod97(_expand(rearranged)) == 1


def get_bank_from_iban(iban: str) -> Optional[str]:
    """Returns the bank name for a valid IBAN, or ``None``."""
    if not validate_iban(iban):
        return None
    bank = _bank_by_code().get(_normalize(iban)[4:8])
    return bank.name if bank else None


def get_bank_info(iban_or_code: str) -> Optional[BankInfo]:
    """Returns details of the bank that issued an IBAN: name, type and whether
    it still exists. Also accepts a 4-letter bank code such as ``"MEZN"``.

    Returns ``None`` if the IBAN is invalid or the code unknown.
    """
    value = _normalize(iban_or_code)
    if _BANK_CODE.match(value):
        return _bank_by_code().get(value)
    if not validate_iban(value):
        return None
    return _bank_by_code().get(value[4:8])


def get_banks() -> List[BankInfo]:
    """Lists every bank code in the dataset, including merged banks and older
    alias codes. Filter it for a bank picker, e.g.
    ``[b for b in get_banks() if b.active and not b.alias_of]``.
    """
    return list(_banks())
