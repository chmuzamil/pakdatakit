"""Helpers that reproduce JavaScript semantics, so results match the npm package.

Python and JavaScript differ in small ways that matter for exact parity:
whitespace classes, ``Math.round``, number-to-string conversion,
``toFixed`` rounding, ``Number(string)`` parsing and ``localeCompare``.
"""

from __future__ import annotations

import math
import re
import unicodedata
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, List, Tuple

#: Characters matched by JavaScript's ``\\s`` and removed by ``String.prototype.trim``.
WS_CHARS = (
    "\t\n\x0b\x0c\r   "
    "           "
    "    　﻿"
)

#: Regex character-class body equivalent to JavaScript's ``\\s``.
WS = "\\t\\n\\x0b\\x0c\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff"

MAX_SAFE_INTEGER = 2**53 - 1


def trim(value: str) -> str:
    """``String.prototype.trim``."""
    return value.strip(WS_CHARS)


def trim_end(value: str) -> str:
    """``String.prototype.trimEnd``."""
    return value.rstrip(WS_CHARS)


def is_number(value: Any) -> bool:
    """``typeof value === 'number'`` (bools are not numbers in JavaScript)."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_finite(value: Any) -> bool:
    """``Number.isFinite``."""
    if not is_number(value):
        return False
    try:
        return math.isfinite(float(value))
    except OverflowError:
        return False


def is_integer(value: Any) -> bool:
    """``Number.isInteger``."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value) and value.is_integer()


def is_safe_integer(value: Any) -> bool:
    """``Number.isSafeInteger``."""
    return is_integer(value) and abs(value) <= MAX_SAFE_INTEGER


def js_round(value: float) -> int:
    """``Math.round``: halves round towards positive infinity."""
    floor = math.floor(value)
    return floor + 1 if value - floor >= 0.5 else floor


def number_to_string(value: float) -> str:
    """``String(number)`` / template-literal conversion of a number."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int) and abs(value) < 10**21:
        return str(value)
    value = float(value)
    if math.isnan(value):
        return "NaN"
    if math.isinf(value):
        return "Infinity" if value > 0 else "-Infinity"
    if value == 0:
        return "0"
    sign = "-" if value < 0 else ""
    _, digits_tuple, exponent = Decimal(repr(abs(value))).normalize().as_tuple()
    digits = "".join(str(d) for d in digits_tuple)
    k = len(digits)
    n = int(exponent) + k
    if k <= n <= 21:
        text = digits + "0" * (n - k)
    elif 0 < n <= 21:
        text = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        text = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        exp = ("+" if e >= 0 else "-") + str(abs(e))
        text = digits + "e" + exp if k == 1 else digits[0] + "." + digits[1:] + "e" + exp
    return sign + text


def to_fixed(value: float, places: int) -> str:
    """``Number.prototype.toFixed`` (rounds the exact binary value half up)."""
    value = float(value)
    if not math.isfinite(value) or abs(value) >= 1e21:
        return number_to_string(value)
    if value == 0:
        return "0." + "0" * places if places else "0"
    quantum = Decimal(1).scaleb(-places)
    return format(Decimal(value).quantize(quantum, rounding=ROUND_HALF_UP), "f")


_DECIMAL_LITERAL = re.compile(
    r"[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)\Z"
)
_RADIX_LITERAL = re.compile(r"0(?:[xX][0-9a-fA-F]+|[oO][0-7]+|[bB][01]+)\Z")


def to_number(text: str) -> float:
    """``Number(string)``: returns ``nan`` where JavaScript returns ``NaN``."""
    text = trim(text)
    if text == "":
        return 0.0
    if _DECIMAL_LITERAL.match(text):
        if text.lstrip("+-") == "Infinity":
            return float("-inf") if text.startswith("-") else float("inf")
        return float(text)
    if _RADIX_LITERAL.match(text):
        return float(int(text, 0))
    return float("nan")


# Root-collation order of ASCII punctuation and symbols (CLDR / ICU), all of
# which sort before digits and letters.
_PUNCTUATION = "_-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$"


def collation_key(text: str) -> Tuple[Any, ...]:
    """Sort key approximating ``a.localeCompare(b)`` (ICU root collation).

    Compares base letters case- and accent-insensitively first, then accents,
    then case (lowercase first), like ICU's default strength.
    """
    primary: List[Tuple[int, Any]] = []
    secondary: List[int] = []
    tertiary: List[int] = []
    for char in unicodedata.normalize("NFD", text):
        if unicodedata.combining(char):
            secondary.append(ord(char))
            continue
        if char in WS_CHARS:
            weight: Tuple[int, Any] = (0, ord(char))
        elif char in _PUNCTUATION:
            weight = (1, _PUNCTUATION.index(char))
        elif char.isdigit():
            weight = (2, unicodedata.digit(char, 0))
        elif char.isalpha():
            weight = (3, char.lower())
        else:
            weight = (4, ord(char))
        primary.append(weight)
        secondary.append(0)
        tertiary.append(1 if char.isupper() else 0)
    return (tuple(primary), tuple(secondary), tuple(tertiary), text)


def locale_sorted(values: List[str]) -> List[str]:
    """``values.sort((a, b) => a.localeCompare(b))``."""
    return sorted(values, key=collation_key)


def object_entries(mapping: Any) -> List[Tuple[str, Any]]:
    """``Object.entries`` order: integer-like keys ascending, then insertion order."""
    keys = list(mapping.keys())

    def is_index(key: str) -> bool:
        return (
            isinstance(key, str)
            and key.isascii()
            and key.isdigit()
            and (key == "0" or not key.startswith("0"))
            and int(key) < 2**32 - 1
        )

    indices = sorted((k for k in keys if is_index(k)), key=int)
    others = [k for k in keys if not is_index(k)]
    return [(k, mapping[k]) for k in indices + others]


def utf16_length(text: str) -> int:
    """``string.length`` (UTF-16 code units)."""
    return sum(2 if ord(c) > 0xFFFF else 1 for c in text)


def utf8_bytes(text: str) -> bytes:
    """``new TextEncoder().encode(text)``: lone surrogates become U+FFFD."""
    return re.sub("[\ud800-\udfff]", "�", text).encode("utf-8")
