"""Exact money arithmetic in whole paisa (mirrors src/internal/money.ts).

Every port does the same steps so results match to the paisa.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from .js import is_finite, number_to_string

#: Largest amount accepted, in rupees (one trillion).
MAX_AMOUNT = 1_000_000_000_000

_SHORTEST = re.compile(r"([0-9]+)(?:\.([0-9]+))?(?:e([+-][0-9]+))?\Z")
_LEADING_ZEROS = re.compile(r"^0+(?=[0-9])")


def to_units(value: Any, scale: int) -> Optional[int]:
    """Converts a number to an integer count of ``10**-scale`` units.

    Rounds half up from the decimal digits as written (JavaScript's shortest
    form, so ``1.005`` with scale 2 is 101). Returns ``None`` for anything that
    is not a finite number from 0 to :data:`MAX_AMOUNT`.
    """
    if not is_finite(value):
        return None
    if value < 0 or value > MAX_AMOUNT:
        return None
    match = _SHORTEST.match(number_to_string(value))
    if not match:
        return None
    int_part = match.group(1)
    frac_part = match.group(2) or ""
    exponent = int(match.group(3) or "0")
    digits = _LEADING_ZEROS.sub("", int_part + frac_part)
    point = len(int_part) + exponent - len(int_part + frac_part) + len(digits)
    keep = point + scale
    if keep <= 0:
        return 1 if keep == 0 and int(digits[0]) >= 5 else 0
    if keep >= len(digits):
        return int(digits + "0" * (keep - len(digits)))
    whole = int(digits[:keep])
    return whole + 1 if int(digits[keep]) >= 5 else whole


def from_paisa(paisa: int) -> float:
    """Rupees from paisa, as a float with at most 2 decimals."""
    return paisa / 100


def divide_half_up(numerator: int, denominator: int) -> int:
    """``numerator / denominator``, both non-negative integers, rounded half up, exactly."""
    quotient, remainder = divmod(numerator, denominator)
    return quotient + 1 if remainder * 2 >= denominator else quotient
