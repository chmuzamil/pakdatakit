"""Input normalization shared by the modules (mirrors src/internal/normalize.ts)."""

from __future__ import annotations

import re

from .js import WS, trim

_URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
_ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
_DIGIT_TABLE = {ord(c): str(i) for i, c in enumerate(_URDU_DIGITS)}
_DIGIT_TABLE.update({ord(c): str(i) for i, c in enumerate(_ARABIC_INDIC_DIGITS)})

# Whitespace, hyphens and dashes, dots, slashes and parentheses.
_SEPARATORS = re.compile("[" + WS + r"\-‐‑‒–—./()]")
_WHITESPACE_RUN = re.compile("[" + WS + "]+")


def to_ascii_digits(value: str) -> str:
    """Converts Urdu (Extended Arabic-Indic) and Arabic-Indic digits to ASCII digits."""
    return value.translate(_DIGIT_TABLE)


def strip_separators(value: str) -> str:
    """Removes whitespace, hyphens and dashes, dots, slashes and parentheses."""
    return _SEPARATORS.sub("", value)


def normalize_whitespace(value: str) -> str:
    """Collapses internal whitespace and trims leading/trailing whitespace."""
    return _WHITESPACE_RUN.sub(" ", trim(value))


def normalize_key(value: str) -> str:
    """Lowercase with collapsed whitespace."""
    return normalize_whitespace(value).lower()
