"""Text normalization, Roman Urdu spelling and Urdu digits."""

from __future__ import annotations

import re
import unicodedata

from ._internal.normalize import normalize_whitespace, to_ascii_digits

__all__ = ["normalize_text", "normalize_roman_urdu", "to_urdu_digits", "to_english_digits"]

_URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

# Common Roman Urdu spelling normalizations (informal -> preferred). Only
# unambiguous variants are listed.
_ROMAN_URDU_REPLACEMENTS = [
    (re.compile(pattern, re.IGNORECASE | re.ASCII), replacement)
    for pattern, replacement in [
        (r"\bkia\b", "kya"),
        (r"\bker\b", "kar"),
        (r"\bkr\b", "kar"),
        (r"\bhy\b", "hai"),
        (r"\bmujhay\b", "mujhe"),
        (r"\bap\b", "aap"),
        (r"\bshukria\b", "shukriya"),
        (r"\bnhi\b", "nahi"),
        (r"\bassalamu alaikum\b", "assalamualaikum"),
        (r"\bassalam o alaikum\b", "assalamualaikum"),
    ]
]


def normalize_text(text: str) -> str:
    """Trims, collapses whitespace and applies Unicode NFC."""
    return normalize_whitespace(unicodedata.normalize("NFC", text))


def _match_case(original: str, replacement: str) -> str:
    if len(original) > 1 and original == original.upper():
        return original
    first = original[0]
    if first != first.lower():
        return replacement[0].upper() + replacement[1:]
    return replacement


def normalize_roman_urdu(text: str) -> str:
    """Normalizes informal Roman Urdu spellings (``kia`` -> ``kya``).

    Also applies :func:`normalize_text` and converts Urdu/Arabic digits to
    English. A capitalized word keeps its capital; all-caps words are left alone.
    """
    result = normalize_text(to_english_digits(text))
    for pattern, replacement in _ROMAN_URDU_REPLACEMENTS:
        result = pattern.sub(lambda m, r=replacement: _match_case(m.group(0), r), result)
    return result


def to_urdu_digits(text: str) -> str:
    """Converts English and Arabic-Indic digits to Urdu digits (۰-۹)."""
    return re.sub(r"[0-9]", lambda m: _URDU_DIGITS[int(m.group(0))], to_ascii_digits(text))


def to_english_digits(text: str) -> str:
    """Converts Urdu and Arabic-Indic digits to English digits (0-9)."""
    return to_ascii_digits(text)
