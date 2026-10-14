"""Pakistan's federal public holidays."""

from __future__ import annotations

import datetime as _dt
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional, Sequence, Union

from ._data import load
from ._internal.js import is_integer, number_to_string
from .hijri import (
    _jdn_to_hijri,
    gregorian_to_jdn,
    hijri_to_jdn,
    jdn_to_gregorian,
    resolve_offset,
)

__all__ = ["Holiday", "get_pakistan_holidays", "get_holidays_on", "is_pakistan_holiday"]


@dataclass(frozen=True)
class Holiday:
    """A public holiday on a specific date."""

    id: str
    name: str
    #: Date as ``YYYY-MM-DD``.
    date: str
    #: ``"national"`` or ``"religious"``.
    type: str
    #: ``True`` when an Islamic date is estimated from the tabular Hijri calendar.
    estimated: bool
    #: ``True`` for holidays that apply to Christian employees only.
    christians_only: Optional[bool] = None
    #: Source of an observed Islamic holiday date.
    source: Optional[str] = None


_FIXED_HOLIDAYS = [
    ("kashmir-day", "Kashmir Solidarity Day", 2, 5, "national", None, False),
    ("pakistan-day", "Pakistan Day", 3, 23, "national", None, False),
    ("labour-day", "Labour Day", 5, 1, "national", None, False),
    # A one-off holiday in 2024, on the annual list since 2025.
    ("youm-e-takbeer", "Youm-e-Takbeer", 5, 28, "national", lambda y: y >= 2024, False),
    ("independence-day", "Independence Day", 8, 14, "national", None, False),
    # Dropped from 2015 to 2021, restored in 2022.
    ("iqbal-day", "Iqbal Day", 11, 9, "national", lambda y: y <= 2014 or y >= 2022, False),
    ("quaid-e-azam-day", "Quaid-e-Azam Day / Christmas", 12, 25, "national", None, False),
    ("day-after-christmas", "Day after Christmas", 12, 26, "religious", None, True),
]

# (id, dataset key, name, hijri month, hijri day, usual number of days)
_ISLAMIC_HOLIDAYS = [
    ("eid-ul-fitr", "eidUlFitr", "Eid ul Fitr", 10, 1, 3),
    ("eid-ul-adha", "eidUlAdha", "Eid ul Adha", 12, 10, 3),
    ("ashura", "ashura", "Ashura", 1, 9, 2),
    ("eid-milad-un-nabi", "eidMiladUnNabi", "Eid Milad un Nabi", 3, 12, 1),
]

_ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}\Z")


def _iso(year: int, month: int, day: int) -> str:
    return f"{year:04d}-{month:02d}-{day:02d}"


def _assert_iso_date(value: Any) -> None:
    if not isinstance(value, str) or not _ISO_DATE.match(value):
        raise ValueError(f"Expected a YYYY-MM-DD date, received {value}")


def _estimate(hijri_month: int, hijri_day: int, days: int, year: int, offset: Any) -> List[str]:
    first_hijri_year = _jdn_to_hijri(gregorian_to_jdn(year, 1, 1)).year
    dates: List[str] = []
    for hijri_year in (first_hijri_year, first_hijri_year + 1):
        start = hijri_to_jdn(hijri_year, hijri_month, hijri_day) - resolve_offset(offset)
        for i in range(days):
            y, m, d = jdn_to_gregorian(start + i)
            if y == year:
                dates.append(_iso(y, m, d))
    return dates


def get_pakistan_holidays(
    year: int,
    *,
    include_christian_holidays: bool = False,
    announced: Optional[Mapping[str, Sequence[str]]] = None,
    hijri_offset: Optional[int] = 0,
) -> List[Holiday]:
    """Lists Pakistan's federal public holidays for a year, sorted by date.

    Islamic holidays use the dates observed after moon sighting (2020 onwards).
    For years not in the dataset they are estimated from the tabular Hijri
    calendar and marked ``estimated=True``; pass ``announced`` (e.g.
    ``{"eid-ul-fitr": ["2027-03-10"]}``) to use official dates instead.

    Raises ``ValueError`` for a year outside 1948-9999.
    """
    if not is_integer(year) or year < 1948 or year > 9999:
        raise ValueError(f"Expected a year from 1948, received {number_to_string(year) if isinstance(year, (int, float)) else year}")
    year = int(year)

    holidays: List[Holiday] = []
    for hid, name, month, day, kind, applies_in, christians_only in _FIXED_HOLIDAYS:
        if applies_in is not None and not applies_in(year):
            continue
        if christians_only and not include_christian_holidays:
            continue
        holidays.append(
            Holiday(
                id=hid,
                name=name,
                date=_iso(year, month, day),
                type=kind,
                estimated=False,
                christians_only=True if christians_only else None,
            )
        )

    observed: Optional[Dict[str, Any]] = load("holidays.json").get(str(year))
    for hid, key, name, hijri_month, hijri_day, days in _ISLAMIC_HOLIDAYS:
        announced_dates = announced.get(hid) if announced else None
        recorded = observed.get(key) if observed else None
        estimated = False
        source: Optional[str] = None
        if announced_dates is not None:
            for value in announced_dates:
                _assert_iso_date(value)
            dates = list(announced_dates)
        elif recorded:
            dates = list(recorded["dates"])
            source = recorded["source"]
        else:
            dates = _estimate(hijri_month, hijri_day, days, year, hijri_offset)
            estimated = True
        for date in dates:
            holidays.append(
                Holiday(
                    id=hid,
                    name=name,
                    date=date,
                    type="religious",
                    estimated=estimated,
                    source=source if source else None,
                )
            )

    return sorted(holidays, key=lambda h: h.date)


def get_holidays_on(date: Union[_dt.date, str], **options: Any) -> List[Holiday]:
    """Returns the public holidays on a date (``date``/``datetime`` or ``YYYY-MM-DD``).

    Accepts the same keyword options as :func:`get_pakistan_holidays`.
    """
    if isinstance(date, str):
        _assert_iso_date(date)
        iso = date
    elif isinstance(date, _dt.date):
        iso = _iso(date.year, date.month, date.day)
    else:
        raise ValueError("Invalid Date")
    return [h for h in get_pakistan_holidays(int(iso[:4]), **options) if h.date == iso]


def is_pakistan_holiday(date: Union[_dt.date, str], **options: Any) -> bool:
    """Returns whether a date is a federal public holiday."""
    return len(get_holidays_on(date, **options)) > 0
