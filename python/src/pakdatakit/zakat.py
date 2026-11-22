"""Zakat deduction at source in Pakistan: each Zakat year's notified nisab."""

from __future__ import annotations

import datetime as _dt
import re
from dataclasses import dataclass
from typing import Any, List, Mapping, Optional, Tuple

from ._data import load
from ._internal.date import iso_date
from ._internal.js import is_integer, trim
from ._internal.money import divide_half_up, from_paisa, to_units
from .data_info import DataSource

__all__ = [
    "ZakatDocument",
    "ZakatNisab",
    "ZakatDeduction",
    "get_zakat_nisab",
    "get_zakat_years",
    "zakat_deduction",
]

# Days after the last notified year's first possible start that it still certainly covers.
_LUNAR_YEAR_DAYS = 353
_FOUR_DIGITS = re.compile(r"[0-9]{4}\Z")


@dataclass(frozen=True)
class ZakatDocument:
    """A document behind a Zakat year's nisab: its number, date and URL."""

    number: str
    #: ``YYYY-MM-DD``.
    date: str
    url: str


@dataclass(frozen=True)
class ZakatNisab:
    """One Zakat year's nisab for deduction at source, as notified. Returned
    by :func:`get_zakat_nisab`."""

    #: The Hijri year of the valuation date (1 Ramazan), e.g. ``1447``.
    zakat_year: int
    #: The year as the Ministry's notification writes it, e.g. ``1446-47``.
    label: str
    #: Nisab in rupees: accounts with a lower balance are not deducted.
    nisab: float
    #: The valuation (deduction) date in the Hijri calendar, e.g. ``1 Ramazan 1447 AH``.
    valuation_date_hijri: str
    #: The two Gregorian dates the notification says 1 Ramazan is likely to
    #: fall on (``YYYY-MM-DD``). The day itself depends on the moon sighting.
    expected_valuation_dates: Tuple[str, str]
    #: The bank holiday for the deduction, when SBP's circular names a
    #: Gregorian date (``YYYY-MM-DD``); otherwise ``None``.
    bank_holiday_date: Optional[str]
    #: The Ministry of Poverty Alleviation & Social Safety notification.
    notification: ZakatDocument
    #: The SBP BPRD circular letter that conveys it to banks.
    sbp_circular: ZakatDocument
    #: The notification and SBP circular, as a :class:`DataSource`.
    source: DataSource


@dataclass(frozen=True)
class ZakatDeduction:
    """Result of :func:`zakat_deduction`, in rupees."""

    zakat_year: int
    nisab: float
    balance: float
    #: Whether Zakat is deducted from this balance.
    deductible: bool
    #: Why not, when ``deductible`` is false: ``"exempt"`` or
    #: ``"below-nisab"``; otherwise ``None``.
    reason: Optional[str]
    #: Percent of the whole balance: 2.5.
    rate: float
    #: The amount deducted, rounded half up to the paisa; ``0`` if not deductible.
    zakat: float
    source: DataSource


def _rows() -> List[Any]:
    return load("zakat-nisab.json")  # type: ignore[no-any-return]


def _add_days(iso: str, days: int) -> str:
    return (_dt.date.fromisoformat(iso) + _dt.timedelta(days=days)).isoformat()


def _document(raw: Any) -> ZakatDocument:
    return ZakatDocument(number=raw["number"], date=raw["date"], url=raw["url"])


def _source(row: Any) -> DataSource:
    following = next((r for r in _rows() if r["zakatYear"] == row["zakatYear"] + 1), None)
    notification = row["notification"]
    circular = row["sbpCircular"]
    return DataSource(
        id="zakat-nisab",
        # From the earlier of the two likely days of 1 Ramazan, to the day
        # before the next year's; open while it is the latest year.
        effective_from=row["expectedValuationDates"][0],
        effective_to=(
            None if following is None else _add_days(following["expectedValuationDates"][0], -1)
        ),
        source_reference=(
            f"Notification No. {notification['number']} ({notification['date']}); "
            f"SBP {circular['number']} ({circular['date']})"
        ),
        source_url=notification["url"],
    )


def _nisab(row: Any) -> ZakatNisab:
    first, second = row["expectedValuationDates"]
    return ZakatNisab(
        zakat_year=row["zakatYear"],
        label=row["label"],
        nisab=row["nisab"],
        valuation_date_hijri=row["valuationDateHijri"],
        expected_valuation_dates=(first, second),
        bank_holiday_date=row["bankHolidayDate"],
        notification=_document(row["notification"]),
        sbp_circular=_document(row["sbpCircular"]),
        source=_source(row),
    )


def _by_year(value: Any) -> Optional[Any]:
    year: Optional[int] = None
    if is_integer(value):
        year = int(value)
    elif isinstance(value, str):
        text = trim(value)
        if _FOUR_DIGITS.match(text):
            year = int(text)
        else:
            return next((r for r in _rows() if r["label"] == text), None)
    if year is None:
        return None
    return next((r for r in _rows() if r["zakatYear"] == year), None)


def _by_date(value: Any) -> Optional[Any]:
    """The Zakat year a date falls in. A year starts on 1 Ramazan, which the
    notification gives only as one of two likely days; a date on the earlier
    of the two is ambiguous and gives ``None``, as does a date past the last
    notified year."""
    date = iso_date(value)
    if date is None:
        return None
    rows = _rows()
    for i in range(len(rows) - 1, -1, -1):
        row = rows[i]
        first, second = row["expectedValuationDates"]
        if date >= second:
            if i == len(rows) - 1 and date >= _add_days(first, _LUNAR_YEAR_DAYS):
                return None
            return row
        if date >= first:
            return None
    return None


_MISSING = object()


def _find(query: Any, zakat_year: Any, date: Any) -> Optional[Any]:
    if query is None:
        year_value: Any = _MISSING if zakat_year is None else zakat_year
        date_value: Any = _MISSING if date is None else date
    elif isinstance(query, Mapping):
        year_value = query.get("zakatYear", query.get("zakat_year", _MISSING))
        date_value = query.get("date", _MISSING)
    else:
        return None
    if year_value is not _MISSING:
        return _by_year(year_value)
    if date_value is not _MISSING:
        return _by_date(date_value)
    return None


def get_zakat_nisab(
    query: Any = None, *, zakat_year: Any = None, date: Any = None
) -> Optional[ZakatNisab]:
    """The nisab for compulsory Zakat deduction at source in Pakistan for a
    Zakat year, as notified by the Administrator-General Zakat (Ministry of
    Poverty Alleviation & Social Safety) and conveyed to banks by SBP, Zakat
    years 1433 to 1447 AH (2012-2026).

    Give the year with ``zakat_year`` (``1447``, ``"1447"`` or the
    notification's ``"1446-47"``) or a ``date`` (``YYYY-MM-DD`` or a
    ``datetime.date``); ``zakat_year`` takes precedence. They may also be
    passed as a ``dict``, ``{"zakatYear": 1447}`` or ``{"date": ...}``, as in
    the npm package. A Zakat year starts on 1 Ramazan; for a date on the
    first of the two days the notification gives for it, the year is unknown
    and the result is ``None``.

    This is the nisab for deduction from savings and similar bank accounts
    under the Zakat and Ushr Ordinance 1980, not a religious ruling on
    personal Zakat.

    Returns the year's nisab, dates and sources (:class:`ZakatNisab`), or
    ``None`` for a year that is not covered, an invalid query or an
    ambiguous date. Never raises.

    >>> get_zakat_nisab(zakat_year=1447).nisab
    503529
    >>> get_zakat_nisab(zakat_year="1445-46").zakat_year
    1446
    >>> get_zakat_nisab(date="2025-06-01").nisab
    179689
    """
    row = _find(query, zakat_year, date)
    return None if row is None else _nisab(row)


def get_zakat_years() -> List[int]:
    """Every notified Zakat year that :func:`get_zakat_nisab` covers, as Hijri
    years, oldest first.

    >>> get_zakat_years()[0]
    1433
    """
    return [row["zakatYear"] for row in _rows()]


def zakat_deduction(
    input: Any = None,  # noqa: A002 - mirrors the npm API
    *,
    balance: Any = None,
    zakat_year: Any = None,
    date: Any = None,
    exempt: Any = False,
) -> Optional[ZakatDeduction]:
    """Zakat deducted at source from one account on the valuation date (1
    Ramazan): 2.5% of the whole balance when it is at or above that year's
    nisab, and nothing when it is below or the holder filed the exemption
    declaration (Form CZ-50, ``exempt=True``).

    ``balance`` is the account balance in rupees at the start of the
    valuation date (0 to 1 trillion, at most 2 decimals count). The year is
    given by ``zakat_year`` or ``date``, as in :func:`get_zakat_nisab`. All of
    them may also be passed as one ``dict`` with the npm package's keys:
    ``{"balance": 600000, "zakatYear": 1447, "exempt": True}``.

    It applies to the accounts the Ordinance subjects to deduction at source:
    savings, profit-and-loss sharing and similar accounts (asset code 101).
    Current accounts and foreign currency accounts are not deducted. It is
    not a religious ruling on how much Zakat a person owes.

    Returns the deduction and its source (:class:`ZakatDeduction`), or
    ``None`` for an invalid balance, a year that is not covered, or an
    ambiguous date. Never raises.

    >>> zakat_deduction(balance=600000, zakat_year=1447).zakat
    15000.0
    >>> zakat_deduction(balance=600000, zakat_year=1447, exempt=True).reason
    'exempt'
    """
    if input is not None:
        if not isinstance(input, Mapping):
            return None
        balance = input.get("balance")
        exempt = input.get("exempt", False)
    paisa = to_units(balance, 2)
    if paisa is None:
        return None
    row = _find(input, zakat_year, date)
    if row is None:
        return None
    is_exempt = exempt is True
    below = paisa < row["nisab"] * 100
    deductible = not is_exempt and not below
    return ZakatDeduction(
        zakat_year=row["zakatYear"],
        nisab=row["nisab"],
        balance=from_paisa(paisa),
        deductible=deductible,
        reason="exempt" if is_exempt else ("below-nisab" if below else None),
        rate=2.5,
        zakat=from_paisa(divide_half_up(paisa * 25, 1000)) if deductible else 0,
        source=_source(row),
    )
