"""Calendar dates shared by the sales tax and income tax modules (mirrors src/internal/date.ts)."""

from __future__ import annotations

import datetime as _dt
import re
from typing import Any, Optional

from .js import trim

_ISO_DATE = re.compile(r"([0-9]{4})-([0-9]{2})-([0-9]{2})\Z")


def iso_date(value: Any) -> Optional[str]:
    """``YYYY-MM-DD`` for a valid calendar date, otherwise ``None``.

    A ``datetime.date`` (or ``datetime``) gives its calendar date.
    """
    if isinstance(value, _dt.date):  # also a datetime: its calendar date
        return f"{value.year:04d}-{value.month:02d}-{value.day:02d}"
    if not isinstance(value, str):
        return None
    match = _ISO_DATE.match(trim(value))
    if not match:
        return None
    y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
    leap = (y % 4 == 0 and y % 100 != 0) or y % 400 == 0
    days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if m < 1 or m > 12 or d < 1 or d > days[m - 1]:
        return None
    return match.group(0)
