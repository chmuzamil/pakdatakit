"""Zakat deduction at source in Pakistan: each Zakat year's notified nisab."""

from __future__ import annotations

import datetime as _dt
import re
from dataclasses import dataclass
from typing import Any, List, Mapping, Optional

from ._data import load
from ._internal.date import iso_date
from ._internal.js import is_integer, trim
from ._internal.money import divide_half_up, from_paisa, to_units
from .data_info import DataSource

__all__ = [
    "ZakatDocument",
    "ZakatRamazan1Source",
    "ZakatNisab",
    "ZakatDeduction",
    "get_zakat_nisab",
    "get_zakat_years",
    "zakat_deduction",
]

# Days after the last notified year's 1 Ramazan that it still certainly covers.
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
class ZakatRamazan1Source:
    """Who announced a Zakat year's 1 Ramazan, and where the announcement was
    reported (``ZakatNisab.ramazan1_source``)."""

    #: Who announced it: ``Central Ruet-e-Hilal Committee``.
    announced_by: str
    #: The outlet that reported the announcement, e.g. ``Dawn``.
    reported_by: str
    #: The report's date (``YYYY-MM-DD``), or ``None`` if not recorded.
    reported_on: Optional[str]
    #: The report's URL, or ``None`` where none is recorded.
    url: Optional[str] = None


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
    #: The valuation date in the Hijri calendar, e.g. ``1 Ramazan 1447 AH``.
    valuation_date_hijri: str
    #: The valuation date: 1 Ramazan in the Gregorian calendar
    #: (``YYYY-MM-DD``), as announced by the Central Ruet-e-Hilal Committee.
    #: Zakat years are assigned to dates by it.
    ramazan1: str
    ramazan1_source: ZakatRamazan1Source
    #: The deduction day: the bank holiday SBP declares for it
    #: (``YYYY-MM-DD``). It is ``ramazan1``, or the next working day when 1
    #: Ramazan falls on a weekend or public holiday (for example 24 March
    #: 2023, after Pakistan Day). ``None`` where no SBP holiday circular was found.
    bank_holiday_date: Optional[str]
    #: The Ministry of Poverty Alleviation & Social Safety notification.
    notification: ZakatDocument
    #: The SBP BPRD circular letter that conveys it to banks.
    sbp_circular: ZakatDocument
    #: Notes on the documents, including the notification's "likely to fall
    #: on" text, or ``None``.
    note: Optional[str]
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
    #: The amount deducted, in whole rupees (First Schedule, Note 2: less
    #: than a rupee is not charged, 50 paisa or more counts as a rupee);
    #: ``0`` if not deductible.
    zakat: int
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
        # From 1 Ramazan to the day before the next year's; open while it is
        # the latest year.
        effective_from=row["ramazan1"],
        effective_to=None if following is None else _add_days(following["ramazan1"], -1),
        source_reference=(
            f"Notification No. {notification['number']} ({notification['date']}); "
            f"SBP {circular['number']} ({circular['date']})"
        ),
        source_url=notification["url"],
    )


def _nisab(row: Any) -> ZakatNisab:
    announced = row["ramazan1Source"]
    return ZakatNisab(
        zakat_year=row["zakatYear"],
        label=row["label"],
        nisab=row["nisab"],
        valuation_date_hijri=row["valuationDateHijri"],
        ramazan1=row["ramazan1"],
        ramazan1_source=ZakatRamazan1Source(
            announced_by=announced["announcedBy"],
            reported_by=announced["reportedBy"],
            reported_on=announced.get("reportedOn"),
            url=announced.get("url"),
        ),
        bank_holiday_date=row["bankHolidayDate"],
        notification=_document(row["notification"]),
        sbp_circular=_document(row["sbpCircular"]),
        note=row.get("note"),
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
    """The Zakat year a date falls in: the last year whose 1 Ramazan is on or
    before it. A date before the first covered year, or 353 days or more
    after the last year's 1 Ramazan (next year not yet notified), gives
    ``None``."""
    date = iso_date(value)
    if date is None:
        return None
    rows = _rows()
    for i in range(len(rows) - 1, -1, -1):
        row = rows[i]
        if date < row["ramazan1"]:
            continue
        if i == len(rows) - 1 and date >= _add_days(row["ramazan1"], _LUNAR_YEAR_DAYS):
            return None
        return row
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
    the npm package. A Zakat year starts on 1 Ramazan (``ramazan1``, as the
    Central Ruet-e-Hilal Committee announced it), and a date belongs to the
    last year whose 1 Ramazan is on or before it.

    This is the nisab for deduction from savings and similar bank accounts
    under the Zakat and Ushr Ordinance 1980, not a religious ruling on
    personal Zakat.

    Returns the year's nisab, dates and sources (:class:`ZakatNisab`), or
    ``None`` for a year that is not covered or an invalid query. Never raises.

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
    Ramazan): 2.5% of the whole balance, rounded to the nearest rupee (First
    Schedule, Note 2), when it is at or above that year's nisab, and nothing
    when it is below or the holder has a valid exemption declaration (Form
    CZ-50, ``exempt=True``).

    ``exempt=True`` means the declaration was filed with the bank at least 30
    days before the valuation date, sworn before a magistrate, oath
    commissioner, notary public or other person authorised to administer
    oaths, in the presence of two witnesses (Zakat and Ushr Ordinance 1980,
    s. 1(3), proviso (a)). The library does not check the declaration.

    A balance exactly equal to the nisab is deducted: every notification
    says no deduction where the balance is "less than" the nisab, and the
    Ordinance (s. 2(xxiii)) defines a sahib-e-nisab as owning "not less than
    nisab". The First Schedule's own wording ("does not exceed") would not
    deduct it. In Punjab the Punjab Zakat and Ushr Act 2018 replaced the
    Ordinance, with the same First Schedule wording.

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
    ``None`` for an invalid balance or a year that is not covered. Never raises.

    >>> zakat_deduction(balance=600000, zakat_year=1447).zakat
    15000
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
        zakat=_zakat_rupees(paisa) if deductible else 0,
        source=_source(row),
    )


def _zakat_rupees(balance_paisa: int) -> int:
    """2.5% of a balance in paisa, as the First Schedule's Note 2 rounds it:
    less than a rupee is not charged; otherwise 50 paisa or more counts as a
    rupee and less than 50 paisa is dropped."""
    exact = balance_paisa * 25  # thousandths of a paisa
    if exact < 100_000:
        return 0
    return divide_half_up(exact, 100_000)
