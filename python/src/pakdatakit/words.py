"""Numbers and rupee amounts in words (English and Urdu, lakh/crore scale)."""

from __future__ import annotations

import re
from typing import List, Optional, Union

from ._internal.js import WS, is_finite, is_safe_integer, js_round, number_to_string

__all__ = ["number_to_words", "amount_in_words"]

# Pakistani scale words, largest first.
_SCALES = [
    (100_000_000_000, {"en": "kharab", "ur": "کھرب"}),
    (1_000_000_000, {"en": "arab", "ur": "ارب"}),
    (10_000_000, {"en": "crore", "ur": "کروڑ"}),
    (100_000, {"en": "lakh", "ur": "لاکھ"}),
    (1_000, {"en": "thousand", "ur": "ہزار"}),
    (100, {"en": "hundred", "ur": "سو"}),
]

_EN_ONES = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
]  # fmt: skip

_EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

# Urdu has a distinct word for every number from 0 to 99.
_UR_0_TO_99 = (
    "صفر ایک دو تین چار پانچ چھ سات آٹھ نو "
    "دس گیارہ بارہ تیرہ چودہ پندرہ سولہ سترہ اٹھارہ انیس "
    "بیس اکیس بائیس تئیس چوبیس پچیس چھبیس ستائیس اٹھائیس انتیس "
    "تیس اکتیس بتیس تینتیس چونتیس پینتیس چھتیس سینتیس اڑتیس انتالیس "
    "چالیس اکتالیس بیالیس تینتالیس چوالیس پینتالیس چھیالیس سینتالیس اڑتالیس انچاس "
    "پچاس اکاون باون ترپن چون پچپن چھپن ستاون اٹھاون انسٹھ "
    "ساٹھ اکسٹھ باسٹھ ترسٹھ چونسٹھ پینسٹھ چھیاسٹھ سڑسٹھ اڑسٹھ انہتر "
    "ستر اکہتر بہتر تہتر چوہتر پچھتر چھہتر ستتر اٹھہتر اناسی "
    "اسی اکیاسی بیاسی تراسی چوراسی پچاسی چھیاسی ستاسی اٹھاسی نواسی "
    "نوے اکانوے بانوے ترانوے چورانوے پچانوے چھیانوے ستانوے اٹھانوے ننانوے"
).split(" ")

_TITLE_CASE = re.compile("(^|[" + WS + "-])([a-z])")

Number = Union[int, float]


def _resolve_language(language: Optional[str]) -> str:
    value = "en" if language is None else language
    if value not in ("en", "ur"):
        raise ValueError(f"language must be 'en' or 'ur', received {value}")
    return value


def _under_hundred(n: int, language: str) -> str:
    if language == "ur":
        return _UR_0_TO_99[n]
    if n < 20:
        return _EN_ONES[n]
    tens = _EN_TENS[n // 10]
    return tens if n % 10 == 0 else f"{tens}-{_EN_ONES[n % 10]}"


def _convert(n: int, language: str) -> List[str]:
    for value, names in _SCALES:
        if n >= value:
            count, rest = divmod(n, value)
            words = _convert(count, language) + [names[language]]
            return words + (_convert(rest, language) if rest > 0 else [])
    return [_under_hundred(n, language)]


def number_to_words(n: int, *, language: str = "en") -> str:
    """Converts a whole number to words (hundred, thousand, lakh, crore, arab, kharab).

    ``number_to_words(125000)`` -> ``"one lakh twenty-five thousand"``;
    ``language="ur"`` gives Urdu. Raises ``ValueError`` unless ``n`` is a safe
    integer (``abs(n) <= 2**53 - 1``) or ``language`` is not ``"en"``/``"ur"``.
    """
    language = _resolve_language(language)
    if not is_safe_integer(n):
        raise ValueError(f"Expected a safe integer, received {n!r}")
    n = int(n)
    if n == 0:
        return _under_hundred(0, language)
    words = " ".join(_convert(abs(n), language))
    if n > 0:
        return words
    return f"منفی {words}" if language == "ur" else f"minus {words}"


def _title_case(text: str) -> str:
    return _TITLE_CASE.sub(lambda m: m.group(1) + m.group(2).upper(), text)


def amount_in_words(amount: Number, *, language: str = "en", cheque: bool = False) -> str:
    """Writes a rupee amount in words, with paisa, rounded to the nearest paisa.

    ``amount_in_words(125000, cheque=True)`` ->
    ``"Rupees One Lakh Twenty-Five Thousand Only"``.
    Raises ``ValueError`` if ``amount`` is negative, not finite, or too large,
    or if ``language`` is not ``"en"``/``"ur"``.
    """
    language = _resolve_language(language)
    if not is_finite(amount) or amount < 0:
        raise ValueError(
            "Amount must be a finite number of zero or more, received "
            + (number_to_string(amount) if isinstance(amount, (int, float)) else repr(amount))
        )
    total_paisa = js_round(float(amount) * 100)
    rupees = total_paisa // 100
    paisa = total_paisa % 100
    rupee_words = number_to_words(rupees, language=language)
    paisa_words = number_to_words(paisa, language=language) if paisa > 0 else None

    if language == "ur":
        text = f"{rupee_words} روپے"
        if paisa_words is not None:
            text += f" اور {paisa_words} پیسے"
        return f"{text} صرف" if cheque else text

    if cheque:
        paisa_part = f" and {paisa_words} paisa" if paisa_words is not None else ""
        return _title_case(f"rupees {rupee_words}{paisa_part} only").replace(" And ", " and ", 1)

    text = f"{rupee_words} {'rupee' if rupees == 1 else 'rupees'}"
    if paisa_words is not None:
        text += f" and {paisa_words} paisa"
    return text
