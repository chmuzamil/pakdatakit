"""As-you-type formatters and checkers for form fields.

Each ``check_*_input`` function returns one of:

- ``"empty"``: nothing entered yet
- ``"incomplete"``: what has been typed so far can still become valid
- ``"valid"``: complete and valid
- ``"invalid"``: cannot become valid by typing more
"""

from __future__ import annotations

import re
from typing import Optional, Tuple, Union

from ._internal.js import WS, trim_end
from ._internal.normalize import to_ascii_digits
from ._internal.phone_utils import is_allocated_prefix
from .cnic import validate_cnic
from .iban import validate_iban

__all__ = [
    "format_cnic_input",
    "check_cnic_input",
    "format_phone_input",
    "check_phone_input",
    "format_iban_input",
    "check_iban_input",
]

# Characters people use between groups of digits.
_SEPARATORS = re.compile("[" + WS + "\\-‐‑‒–—./()]")
_NON_DIGIT = re.compile(r"[^0-9]")
_IBAN_SHAPE = re.compile(
    r"(P(K([0-9]([0-9]([A-Z]([A-Z]([A-Z]([A-Z]([A-Z0-9]{0,16})?)?)?)?)?)?)?)?)?\Z"
)


def _clean(value: str) -> str:
    return _SEPARATORS.sub("", to_ascii_digits(value))


def format_cnic_input(value: str) -> str:
    """Formats a CNIC as the user types: ``35202-1234567-1``."""
    digits = _NON_DIGIT.sub("", to_ascii_digits(value))[:13]
    if len(digits) <= 5:
        return digits
    if len(digits) <= 12:
        return f"{digits[:5]}-{digits[5:]}"
    return f"{digits[:5]}-{digits[5:12]}-{digits[12:]}"


def check_cnic_input(value: str) -> str:
    """Checks a CNIC while the user is typing (``"35202-12"`` -> ``"incomplete"``)."""
    text = _clean(value)
    if text == "":
        return "empty"
    if not re.match(r"[0-9]+\Z", text) or len(text) > 13:
        return "invalid"
    if not re.match(r"[1-8]", text):
        return "invalid"
    if len(text) < 13:
        return "incomplete"
    return "valid" if validate_cnic(text) else "invalid"


_Split = Union[Tuple[str, bool], str, None]


def _split_phone(value: str) -> _Split:
    """Returns ``(national, international)``, ``"incomplete"`` or ``None``."""
    text = _clean(value)
    if not re.match(r"\+?[0-9]*\Z", text):
        return None
    for code in ("+92", "0092", "92"):
        if code.startswith(text) and len(text) < len(code):
            # "0" and "9" could also be the start of a local or short number.
            return ("", False) if text == "0" else "incomplete"
        # Mobile numbers start with 3, so a leading 92 is always the country code.
        if text.startswith(code):
            rest = text[len(code) :]
            return (rest[1:] if rest.startswith("0") else rest, True)
    if text.startswith("+"):
        return None
    return (text[1:] if text.startswith("0") else text, False)


def format_phone_input(value: str) -> str:
    """Formats a mobile number as the user types: ``0300-1234567``, or
    ``+92 300 1234567`` when the user starts with the country code."""
    split = _split_phone(value)
    if split is None:
        return value
    if split == "incomplete":
        return _clean(value)
    national, international = split  # type: ignore[misc]
    digits = _NON_DIGIT.sub("", national)[:10]
    if international:
        return trim_end(f"+92 {digits}") if len(digits) <= 3 else f"+92 {digits[:3]} {digits[3:]}"
    local = f"0{digits}"
    return local if len(local) <= 4 else f"{local[:4]}-{local[4:]}"


def check_phone_input(value: str) -> str:
    """Checks a mobile number while the user is typing; the ``03XX`` prefix is
    checked as soon as it is complete."""
    if _clean(value) == "":
        return "empty"
    split = _split_phone(value)
    if split is None:
        return "invalid"
    if split == "incomplete":
        return "incomplete"
    national: str = split[0]  # type: ignore[index]
    if national == "":
        return "incomplete"
    if not national.startswith("3"):
        return "invalid"
    if len(national) >= 3 and not is_allocated_prefix(f"0{national[:3]}"):
        return "invalid"
    if len(national) < 10:
        return "incomplete"
    return "valid" if len(national) == 10 else "invalid"


def format_iban_input(value: str) -> str:
    """Formats an IBAN as the user types: uppercase, in groups of four, up to 24 characters."""
    clean = re.sub(r"[^A-Z0-9]", "", value.upper())[:24]
    return re.sub(r"(.{4})(?=.)", r"\1 ", clean)


def check_iban_input(value: str) -> str:
    """Checks a Pakistani IBAN while the user is typing."""
    clean = re.sub("[" + WS + "-]", "", value.upper())
    if clean == "":
        return "empty"
    if len(clean) > 24 or not _IBAN_SHAPE.match(clean):
        return "invalid"
    if len(clean) < 24:
        return "incomplete"
    return "valid" if validate_iban(clean) else "invalid"
