"""Tabular Islamic (Hijri) calendar conversions."""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass
from typing import Any, Optional, Tuple

from ._internal.js import is_integer, number_to_string

__all__ = [
    "HijriDate",
    "to_hijri",
    "from_hijri",
    "format_hijri",
    "get_hijri_month_name",
    "is_ramadan",
]

_HIJRI_MONTHS = (
    "Muharram",
    "Safar",
    "Rabi al-Awwal",
    "Rabi al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Shaaban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qadah",
    "Dhu al-Hijjah",
)


@dataclass(frozen=True)
class HijriDate:
    """Islamic (Hijri) date components."""

    year: int
    month: int
    day: int


def _assert_valid_date(date: Any) -> None:
    if not isinstance(date, _dt.date):
        raise ValueError("Invalid Date")


def resolve_offset(offset: Any) -> int:
    """Validates a day offset (``None`` means 0)."""
    if offset is None:
        offset = 0
    if not is_integer(offset):
        raise ValueError(f"Hijri offset must be an integer, received {offset!r}")
    return int(offset)


def _components(hijri: Any) -> Tuple[Any, Any, Any]:
    if isinstance(hijri, dict):
        return hijri.get("year"), hijri.get("month"), hijri.get("day")
    if isinstance(hijri, (tuple, list)) and len(hijri) == 3:
        return hijri[0], hijri[1], hijri[2]
    return (
        getattr(hijri, "year", None),
        getattr(hijri, "month", None),
        getattr(hijri, "day", None),
    )


def _assert_valid_hijri(year: Any, month: Any, day: Any) -> None:
    if (
        not is_integer(year)
        or not is_integer(month)
        or not is_integer(day)
        or year < 1
        or month < 1
        or month > 12
        or day < 1
        or day > 30
    ):
        raise ValueError(
            "Invalid Hijri date: "
            + "-".join(number_to_string(v) if isinstance(v, (int, float)) else str(v) for v in (year, month, day))
        )


def gregorian_to_jdn(year: int, month: int, day: int) -> int:
    """Gregorian calendar date -> Julian Day Number."""
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def jdn_to_gregorian(jdn: int) -> Tuple[int, int, int]:
    """Julian Day Number -> (year, month, day)."""
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - (146097 * b) // 4
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    return (
        100 * b + d - 4800 + m // 10,
        m + 3 - 12 * (m // 10),
        e - (153 * m + 2) // 5 + 1,
    )


def _jdn_to_hijri(jdn: int) -> HijriDate:
    l = jdn - 1948440 + 10632  # noqa: E741
    n = (l - 1) // 10631
    l2 = l - 10631 * n + 354
    j = ((10985 - l2) // 5316) * ((50 * l2) // 17719) + (l2 // 5670) * ((43 * l2) // 15238)
    l3 = l2 - ((30 - j) // 15) * ((17719 * j) // 50) - (j // 16) * ((15238 * j) // 43) + 29
    month = (24 * l3) // 709
    day = l3 - (709 * month) // 24
    year = 30 * n + j - 30
    return HijriDate(year=year, month=month, day=day)


def hijri_to_jdn(year: int, month: int, day: int) -> int:
    """Tabular Hijri date -> Julian Day Number."""
    return (11 * year + 3) // 30 + 354 * year + 30 * month - (month - 1) // 2 + day + 1948440 - 385


def to_hijri(date: _dt.date, *, offset: Optional[int] = 0) -> HijriDate:
    """Converts a Gregorian date to a tabular ("islamic-civil") Hijri date.

    Actual dates in Pakistan follow moon sighting and can differ by a day or
    two; pass ``offset`` (whole days) to adjust. Accepts ``date`` or
    ``datetime`` (its calendar date is used). Raises ``ValueError`` for a
    non-date or a non-integer offset.
    """
    _assert_valid_date(date)
    jdn = gregorian_to_jdn(date.year, date.month, date.day)
    return _jdn_to_hijri(jdn + resolve_offset(offset))


def from_hijri(hijri: Any, *, offset: Optional[int] = 0) -> _dt.date:
    """Converts a Hijri date to a Gregorian ``datetime.date``.

    ``hijri`` may be a :class:`HijriDate`, a ``{"year", "month", "day"}`` dict
    or a ``(year, month, day)`` tuple. Raises ``ValueError`` if out of range.
    """
    year, month, day = _components(hijri)
    _assert_valid_hijri(year, month, day)
    jdn = hijri_to_jdn(int(year), int(month), int(day)) - resolve_offset(offset)
    y, m, d = jdn_to_gregorian(jdn)
    return _dt.date(y, m, d)


def format_hijri(date: _dt.date, *, offset: Optional[int] = 0) -> str:
    """Formats a Gregorian date as a Hijri string, e.g. ``"14 Ramadan 1447"``."""
    hijri = to_hijri(date, offset=offset)
    return f"{hijri.day} {_HIJRI_MONTHS[hijri.month - 1]} {hijri.year}"


def get_hijri_month_name(month: int) -> Optional[str]:
    """Returns the English name of a Hijri month (1-12), or ``None``."""
    if not is_integer(month) or month < 1 or month > 12:
        return None
    return _HIJRI_MONTHS[int(month) - 1]


def is_ramadan(date: _dt.date, *, offset: Optional[int] = 0) -> bool:
    """Returns whether a Gregorian date falls in Ramadan."""
    return to_hijri(date, offset=offset).month == 9
