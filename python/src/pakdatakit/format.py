"""Pakistani Rupee and lakh/crore formatting."""

from __future__ import annotations

from decimal import Decimal
from typing import Union

from ._internal.js import is_finite, js_round, number_to_string

__all__ = ["format_pkr", "format_lakh"]

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
