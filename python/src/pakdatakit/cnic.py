"""CNIC (Computerized National Identity Card) validation and decoding."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, List, Optional, Tuple

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
# A separator between digit groups: a space, a hyphen or Unicode dash
# (U+2010-2014), a dot or a slash.
_CNIC_SEPARATOR = "[\\-" + chr(0x2010) + "-" + chr(0x2014) + "./ ]"
# A province digit, 1-8, in any of the three scripts.
_PROVINCE_DIGIT = "[1-8" + chr(0x06F1) + "-" + chr(0x06F8) + chr(0x0661) + "-" + chr(0x0668) + "]"

# A run of digit groups joined by single separators (``352 0212 3456 71``,
# ``35202/1234567/1``), as long as it goes. Two separators in a row, or any
# other character, end it.
_DIGIT_RUN = re.compile(f"{_ANY_DIGIT}(?:{_CNIC_SEPARATOR}?{_ANY_DIGIT})*")
# A CNIC in 5-7-1 groups (as in 2.7.0) inside a longer run, such as
# ``0300-1234567 35202-1234567-1``: a province digit, then 4, 7 and 1 digits
# with an optional separator between the groups, not next to another digit.
_CNIC_571 = re.compile(
    f"(?<!{_ANY_DIGIT})"
    f"{_PROVINCE_DIGIT}{_ANY_DIGIT}{{4}}{_CNIC_SEPARATOR}?{_ANY_DIGIT}{{7}}{_CNIC_SEPARATOR}?{_ANY_DIGIT}"
    f"(?!{_ANY_DIGIT})"
)
_DIGIT = re.compile(_ANY_DIGIT)
_FIRST_IS_PROVINCE = re.compile(_PROVINCE_DIGIT)


def _cnic_spans(text: str) -> List[Tuple[int, int]]:
    """Where CNICs are in a text: ``(start, end)`` pairs, in order."""
    spans: List[Tuple[int, int]] = []
    for run in _DIGIT_RUN.finditer(text):
        raw = run.group(0)
        start = run.start()
        digits = len(_DIGIT.findall(raw))
        if digits == 13 and _FIRST_IS_PROVINCE.match(raw):
            # Exactly 13 digits in any grouping: the whole run.
            spans.append((start, run.end()))
        elif digits > 13:
            # A longer run: only a CNIC written in 5-7-1 groups inside it.
            for m in _CNIC_571.finditer(raw):
                spans.append((start + m.start(), start + m.end()))
    return spans


@dataclass(frozen=True)
class CNICMatch:
    """A CNIC found by :func:`find_cnics`."""

    #: The text as written, e.g. ``35202 1234567-1``, ``352 0212 3456 71`` or
    #: with Urdu digits.
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

    #: The text with every CNIC masked (or replaced, with ``replacement``).
    text: str
    #: How many CNICs were masked.
    count: int


def find_cnics(text: Any) -> List[CNICMatch]:
    """Finds CNIC numbers in free text, such as a chat message, a note or an
    uploaded document, for example to mask them before logging.

    A match is either:

    - a run of exactly 13 digits whose first digit is a province code (1-8),
      together or in any grouping joined by single separators: a space, a
      hyphen or Unicode dash, a dot or a slash (``3520212345671``,
      ``35202-1234567-1``, ``352 0212 3456 71``, ``35202/1234567/1``); or
    - a CNIC in 5-7-1 groups inside a longer run of such groups
      (``0300-1234567 35202-1234567-1``).

    Digits may be ASCII, Urdu or Arabic-Indic, even mixed. A match never
    starts or ends next to another digit, and a run of more than 13 digits is
    never cut into a CNIC except at 5-7-1 groups.

    Accepting any grouping catches CNICs as people really type them, but
    matches more that is not a CNIC: any 13 digits starting with 1-8, however
    they are grouped (an account, order or tracking number, or two shorter
    numbers written together), are found. :func:`validate_cnic` stays strict.

    ``start`` and ``end`` are Python string indexes (code points); the npm
    package counts UTF-16 code units, which differ only after a character
    outside the Basic Multilingual Plane, such as an emoji.

    Returns the matches in order, or ``[]`` (also for a value that is not a
    string). Never raises.

    >>> find_cnics("CNIC: 35202-1234567-1, phone 0300-1234567")
    [CNICMatch(raw='35202-1234567-1', digits='3520212345671', formatted='35202-1234567-1', start=6, end=21)]
    >>> find_cnics("id 352 0212 3456 71")[0].digits
    '3520212345671'
    """
    if not isinstance(text, str):
        return []
    matches = []
    for start, end in _cnic_spans(text):
        raw = text[start:end]
        digits = re.sub("[^0-9]", "", to_ascii_digits(raw))
        matches.append(
            CNICMatch(
                raw=raw,
                digits=digits,
                formatted=f"{digits[:5]}-{digits[5:12]}-{digits[12]}",
                start=start,
                end=end,
            )
        )
    return matches


def mask_cnics(text: Any, *, mask: Any = "X", replacement: Any = None) -> MaskedText:
    """Masks every CNIC in free text, as found by :func:`find_cnics`: each
    digit becomes ``mask`` and the separators stay, so ``35202-1234567-1``
    becomes ``XXXXX-XXXXXXX-X``. The rest of the text is unchanged.

    With ``replacement``, each whole CNIC, separators included, is replaced
    by that string instead (e.g. ``"[CNIC removed]"``). It takes precedence
    over ``mask``; a value that is not a string is ignored.

    Like :func:`find_cnics`, it also masks any other 13 digits that start
    with 1-8, however they are grouped. ``mask`` is the string that replaces
    each digit (default ``"X"``; a value that is not a string means ``"X"``).

    Returns the masked text and the number of CNICs masked. A value that is
    not a string gives ``MaskedText(text="", count=0)``. Never raises.

    >>> mask_cnics("My CNIC is 35202-1234567-1")
    MaskedText(text='My CNIC is XXXXX-XXXXXXX-X', count=1)
    >>> mask_cnics("35202 1234567 1", mask="*").text
    '***** ******* *'
    >>> mask_cnics("CNIC 352 0212 3456 71", replacement="[CNIC removed]").text
    'CNIC [CNIC removed]'
    """
    if not isinstance(text, str):
        return MaskedText(text="", count=0)
    digit_mask = mask if isinstance(mask, str) else "X"
    whole = replacement if isinstance(replacement, str) else None
    spans = _cnic_spans(text)
    parts = []
    at = 0
    for start, end in spans:
        parts.append(text[at:start])
        if whole is not None:
            parts.append(whole)
        else:
            parts.append(_DIGIT.sub(lambda _: digit_mask, text[start:end]))
        at = end
    parts.append(text[at:])
    return MaskedText(text="".join(parts), count=len(spans))
