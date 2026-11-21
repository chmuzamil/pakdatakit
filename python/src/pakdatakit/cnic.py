"""CNIC (Computerized National Identity Card) validation and decoding."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, List, Optional

from ._internal.js import trim
from ._internal.normalize import to_ascii_digits

__all__ = ["CNICInfo", "CNICMatch", "MaskedText", "validate_cnic", "get_cnic_info", "find_cnics", "mask_cnics"]

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
    """Validates the format of a Pakistani CNIC number: 13 digits, in 5-7-1
    groups or together, starting with a province code from 1 to 8.

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


# One digit: ASCII, Urdu (U+06F0-06F9) or Arabic-Indic (U+0660-0669).
_ANY_DIGIT = "[0-9" + chr(0x06F0) + "-" + chr(0x06F9) + chr(0x0660) + "-" + chr(0x0669) + "]"
# A CNIC separator: a hyphen or dash (U+2010-2014), a dot, or a space.
_CNIC_SEPARATOR = "[\\-" + chr(0x2010) + "-" + chr(0x2014) + ". ]"
# A province digit, 1-8, in any of the three scripts.
_PROVINCE_DIGIT = "[1-8" + chr(0x06F1) + "-" + chr(0x06F8) + chr(0x0661) + "-" + chr(0x0668) + "]"

# A CNIC in running text: a province digit (1-8), then 4, 7 and 1 more digits
# with an optional separator between the groups (the two may differ), not
# touching another digit on either side.
_CNIC_IN_TEXT = re.compile(
    f"(?<!{_ANY_DIGIT})"
    f"{_PROVINCE_DIGIT}{_ANY_DIGIT}{{4}}{_CNIC_SEPARATOR}?{_ANY_DIGIT}{{7}}{_CNIC_SEPARATOR}?{_ANY_DIGIT}"
    f"(?!{_ANY_DIGIT})"
)
_DIGIT = re.compile(_ANY_DIGIT)


@dataclass(frozen=True)
class CNICMatch:
    """A CNIC found by :func:`find_cnics`."""

    #: The text as written, e.g. ``35202 1234567-1`` or with Urdu digits.
    raw: str
    #: The 13 digits, in ASCII.
    digits: str
    #: The CNIC in ``#####-#######-#`` form.
    formatted: str
    #: Offset of the first character in the text, in code points (a Python
    #: string index), so ``text[match.start:match.end] == match.raw``.
    start: int
    #: Offset just after the last character, in code points.
    end: int


@dataclass(frozen=True)
class MaskedText:
    """Result of :func:`mask_cnics`."""

    #: The text with every CNIC's digits masked; separators are kept.
    text: str
    #: How many CNICs were masked.
    count: int


def find_cnics(text: Any) -> List[CNICMatch]:
    """Finds CNIC numbers in free text, such as a chat message, a note or an
    uploaded document, for example to mask them before logging.

    A match is 13 digits whose first digit is a province code (1-8), written
    together or in 5-7-1 groups with a hyphen, dash, dot or space between the
    groups (the two separators may differ). Digits may be ASCII, Urdu or
    Arabic-Indic, even mixed. A match never starts or ends next to another
    digit, so a longer number is not cut into a CNIC.

    This is looser than :func:`validate_cnic`, which needs the same separator
    twice: text is written carelessly. It is a pattern match, so any other
    13-digit number that starts with 1-8 (an account or order number, say)
    also matches.

    ``start`` and ``end`` are Python string indexes (code points); the npm
    package counts UTF-16 code units, which differ only after a character
    outside the Basic Multilingual Plane, such as an emoji.

    Returns the matches in order, or ``[]`` (also for a value that is not a
    string). Never raises.

    >>> find_cnics("CNIC: 35202-1234567-1, phone 0300-1234567")
    [CNICMatch(raw='35202-1234567-1', digits='3520212345671', formatted='35202-1234567-1', start=6, end=21)]
    """
    if not isinstance(text, str):
        return []
    matches = []
    for match in _CNIC_IN_TEXT.finditer(text):
        raw = match.group(0)
        digits = re.sub("[^0-9]", "", to_ascii_digits(raw))
        matches.append(
            CNICMatch(
                raw=raw,
                digits=digits,
                formatted=f"{digits[:5]}-{digits[5:12]}-{digits[12]}",
                start=match.start(),
                end=match.end(),
            )
        )
    return matches


def mask_cnics(text: Any, *, mask: Any = "X") -> MaskedText:
    """Masks every CNIC in free text, as found by :func:`find_cnics`: each
    digit becomes ``mask`` and the separators stay, so ``35202-1234567-1``
    becomes ``XXXXX-XXXXXXX-X``. The rest of the text is unchanged.

    Like :func:`find_cnics`, it also masks any other 13-digit number that
    starts with 1-8. ``mask`` is the string that replaces each digit (default
    ``"X"``; a value that is not a string means ``"X"``).

    Returns the masked text and the number of CNICs masked. A value that is
    not a string gives ``MaskedText(text="", count=0)``. Never raises.

    >>> mask_cnics("My CNIC is 35202-1234567-1")
    MaskedText(text='My CNIC is XXXXX-XXXXXXX-X', count=1)
    >>> mask_cnics("35202 1234567 1", mask="*").text
    '***** ******* *'
    """
    if not isinstance(text, str):
        return MaskedText(text="", count=0)
    replacement = mask if isinstance(mask, str) else "X"
    masked, count = _CNIC_IN_TEXT.subn(lambda m: _DIGIT.sub(lambda _: replacement, m.group(0)), text)
    return MaskedText(text=masked, count=count)
