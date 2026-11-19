"""Pakistani Rupee and lakh/crore formatting."""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Optional, Union

from ._internal.js import is_finite, js_round, number_to_string

__all__ = ["format_pkr", "format_lakh", "ParsedAmount", "parse_amount", "format_amount_input"]

_LAKH = 100_000
_CRORE = 10_000_000

Number = Union[int, float]


def _assert_finite(amount: Number) -> None:
    if not is_finite(amount):
        raise ValueError(f"Amount must be a finite number, received {amount!r}")


def _round_to_2(value: float) -> float:
    return js_round(value * 100) / 100


def _group(value: int) -> str:
    # Intl.NumberFormat formats the shortest round-trip digits of the double.
    return f"{int(Decimal(repr(float(value)))):,}"


def format_pkr(amount: Number) -> str:
    """Formats an amount as ``"Rs. 150,000"``, rounded to whole rupees.

    Raises ``ValueError`` if ``amount`` is NaN or infinite.
    """
    _assert_finite(amount)
    amount = float(amount)
    rounded = js_round(abs(amount))
    sign = "-" if amount < 0 and rounded != 0 else ""
    return f"{sign}Rs. {_group(rounded)}"


def format_lakh(amount: Number) -> str:
    """Formats an amount with lakh/crore units (``"25 Lakh"``, ``"1 Crore"``).

    Values are rounded to two decimals before the unit is chosen, so
    ``9999999`` renders as ``"1 Crore"``. Smaller amounts fall back to
    :func:`format_pkr`. Raises ``ValueError`` if ``amount`` is NaN or infinite.
    """
    _assert_finite(amount)
    amount = float(amount)
    sign = "-" if amount < 0 else ""
    absolute = abs(amount)

    crores = _round_to_2(absolute / _CRORE)
    if crores >= 1:
        return f"{sign}{number_to_string(crores)} Crore"

    lakhs = _round_to_2(absolute / _LAKH)
    if lakhs >= 1:
        return f"{sign}{number_to_string(lakhs)} Lakh"

    return format_pkr(amount)


@dataclass(frozen=True)
class ParsedAmount:
    """Result of :func:`parse_amount`."""

    #: The amount in rupees, rounded half-up to the paisa (2 decimals).
    value: float
    #: The input with surrounding whitespace removed.
    raw: str


# Whitespace around and inside an amount: space, tab, line breaks, no-break spaces.
# (Explicit set, not ``str.strip()`` / ``\s``, to match the TypeScript library.)
_SPACE = r"[ \t\n\r\u00a0\u202f]"
_TRIM = re.compile(rf"^{_SPACE}+|{_SPACE}+\Z")
# Rs, Rs., PKR or \u20a8 (after ASCII letters are lower-cased).
_CURRENCY = r"(rs\.?|pkr|\u20a8)"
# 1,234,567 (international) | 12,34,567 (Pakistani) | 1234567, then an
# optional decimal part. ``[0-9]``, never ``\d``: only ASCII digits count.
_NUMBER = r"([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,2}(?:,[0-9]{2})+,[0-9]{3}|[0-9]+)?(?:\.([0-9]*))?"
# x 1,000: k, thousand(s), hazar, \u06c1\u0632\u0627\u0631.
_THOUSAND = r"k|thousands?|hazar|\u06c1\u0632\u0627\u0631"
# x 100,000: lakh(s), lac(s), \u0644\u0627\u06a9\u06be.
_LAKH_UNIT = r"lakhs?|lacs?|\u0644\u0627\u06a9\u06be"
# x 10,000,000: crore(s), cr, \u06a9\u0631\u0648\u0691.
_CRORE_UNIT = r"crores?|cr|\u06a9\u0631\u0648\u0691"
_AMOUNT = re.compile(
    rf"^(?:{_CURRENCY}{_SPACE}*)?{_NUMBER}"
    rf"(?:{_SPACE}*({_THOUSAND}|{_LAKH_UNIT}|{_CRORE_UNIT}))?"
    rf"(?:{_SPACE}*{_CURRENCY})?(?:{_SPACE}*(/-))?\Z"
)
_THOUSAND_RE = re.compile(rf"(?:{_THOUSAND})\Z")
_LAKH_RE = re.compile(rf"(?:{_LAKH_UNIT})\Z")
# Urdu (Extended Arabic-Indic) and Arabic-Indic digits, and the Arabic decimal
# and thousands separators; then ASCII-only lower-casing.
_TRANSLATE = {
    **{0x06F0 + i: str(i) for i in range(10)},
    **{0x0660 + i: str(i) for i in range(10)},
    0x066B: ".",
    0x066C: ",",
    **{c: chr(c + 32) for c in range(ord("A"), ord("Z") + 1)},
}

# The largest amount, in paisa: Rs. 50 trillion (50 lakh crore). Below 2^46
# rupees (about 70 trillion) a float holds every paisa exactly.
_MAX_PAISA = 5_000_000_000_000_000


def _unit_exponent(unit: Optional[str]) -> int:
    """The power of ten a shorthand unit multiplies by."""
    if unit is None:
        return 0
    if _THOUSAND_RE.match(unit):
        return 3
    if _LAKH_RE.match(unit):
        return 5
    return 7


def parse_amount(input: Any) -> Optional[ParsedAmount]:
    """Reads a rupee amount the way people type it in Pakistan, and returns it
    in rupees, rounded half-up to the paisa. Returns ``None`` for anything that
    is not exactly one non-negative amount; it never raises.

    Accepted:

    - digits, with or without grouping: ``150000``, ``150,000``
      (international) or ``1,50,000`` (Pakistani: groups of two, then three),
      and decimals (``1,234.50``, ``.5``, ``5.``); a grouping must be complete
      and consistent;
    - Urdu (``۱۵۰۰۰۰``) and Arabic-Indic (``١٥٠٠٠٠``) digits, also
      mixed with 0-9, and the Arabic decimal and thousands separators
      (``٫``, ``٬``);
    - one currency mark before or after the number: ``Rs``, ``Rs.``, ``PKR``
      or ``₨`` (any case), and a trailing ``/-`` (``Rs. 5,000/-``);
    - one shorthand unit after the number, with or without a space, in any
      case: ``k``, ``thousand(s)``, ``hazar``, ``ہزار`` (x 1,000); ``lakh(s)``,
      ``lac(s)``, ``لاکھ`` (x 100,000); ``crore(s)``, ``cr``, ``کروڑ``
      (x 10,000,000). Decimals work with units: ``1.5 lakh`` is 150,000 and
      ``2.25cr`` is 22,500,000;
    - whitespace around and between the parts (spaces, tabs, line breaks and
      no-break spaces).

    Rejected (``None``): non-string or empty input, negative or signed amounts
    (``-500``, ``+500``), ranges (``5-10k``), more than one number
    (``500 600``), two currency marks or two units, leftover letters
    (``500 rupees``, ``5kk``), grouping that could be read two ways or is
    broken (``1,50``, ``1.500,00``, ``1,5000``), and amounts over Rs. 50
    trillion (50 lakh crore), beyond which a float can no longer hold every
    paisa exactly.

    The arithmetic is done on the digits, so the result is exact: ``1.005``
    rounds to 1.01 and ``1.5 lakh`` is exactly 150000.

    >>> parse_amount("Rs. 1,50,000/-")
    ParsedAmount(value=150000.0, raw='Rs. 1,50,000/-')
    >>> parse_amount("2.25cr")
    ParsedAmount(value=22500000.0, raw='2.25cr')
    >>> parse_amount("5-10k") is None
    True
    """
    if not isinstance(input, str):
        return None
    raw = _TRIM.sub("", input)
    text = raw.translate(_TRANSLATE)
    match = _AMOUNT.match(text)
    if not match:
        return None
    before, whole, fraction, unit, after, _ = match.groups()
    whole = whole or ""
    if before is not None and after is not None:
        return None
    if whole == "" and not fraction:
        return None

    # Move the decimal point by the unit's power of ten, on the digit string.
    integer = whole.replace(",", "")
    digits = integer + (fraction or "")
    point = len(integer) + _unit_exponent(unit)
    padded = digits.ljust(point + 3, "0")
    rupees = padded[:point] or "0"
    paisa = padded[point : point + 2]
    cents = int(rupees + paisa)
    if padded[point + 2] >= "5":  # half-up
        cents += 1
    if cents > _MAX_PAISA:
        return None
    return ParsedAmount(value=cents / 100, raw=raw)


def format_amount_input(input: Any) -> Optional[str]:
    """Writes back an amount typed in any form :func:`parse_amount` accepts,
    for showing next to the field ("= Rs. 150,000"): ``Rs.``, international
    grouping, and paisa only when there are any (``Rs. 1,234.50``). Returns
    ``None`` when :func:`parse_amount` does; it never raises.

    >>> format_amount_input("1.5 lakh")
    'Rs. 150,000'
    """
    parsed = parse_amount(input)
    if parsed is None:
        return None
    cents = js_round(parsed.value * 100)
    rupees, paisa = divmod(cents, 100)
    return f"Rs. {rupees:,}" + (f".{paisa:02d}" if paisa else "")
