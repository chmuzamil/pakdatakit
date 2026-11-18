"""Income tax on salary in Pakistan, from the salaried rate table."""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass
from typing import Any, List, Optional

from ._data import load
from ._internal.date import iso_date
from ._internal.js import is_integer, js_round
from ._internal.money import divide_half_up, from_paisa, to_units

__all__ = [
    "SalaryTaxSlab",
    "SalaryTaxYear",
    "SalaryTax",
    "get_salary_tax_slabs",
    "get_salary_tax_years",
    "get_tax_year",
    "calculate_salary_tax",
    "calculate_monthly_salary_tax",
]


@dataclass(frozen=True)
class SalaryTaxSlab:
    """One band of the salaried rate table: income above ``over`` (and up to
    ``up_to``) pays ``fixed`` plus ``rate`` percent of the amount above ``over``."""

    #: Lower bound in rupees (income must exceed it).
    over: float
    #: Upper bound in rupees, or ``None`` for the top band.
    up_to: Optional[float]
    #: Tax on the income up to ``over``, in rupees.
    fixed: float
    #: Percent of the income above ``over``.
    rate: float


@dataclass(frozen=True)
class SalaryTaxYear:
    """The salaried rate table for one tax year (1 July to 30 June)."""

    #: The tax year, named after the June it ends in: 2026 is 1 July 2025 to 30 June 2026.
    tax_year: int
    #: ``YYYY-MM-DD``, always 1 July. (``from`` in the npm package; ``from_``
    #: because ``from`` is a keyword.)
    from_: str
    #: ``YYYY-MM-DD``, always 30 June.
    to: str
    #: The law that sets the table.
    law: str
    #: Official document.
    source: str
    slabs: List[SalaryTaxSlab]


@dataclass(frozen=True)
class SalaryTax:
    """Result of :func:`calculate_salary_tax` and :func:`calculate_monthly_salary_tax`."""

    #: Tax for the year, in rupees, rounded half up to the paisa.
    tax: float
    #: ``tax / 12``, rounded half up to the paisa.
    monthly: float
    #: ``tax`` as a percent of the income, rounded half up to 2 decimals.
    effective_rate: float
    #: The band the income falls in.
    slab: SalaryTaxSlab
    tax_year: int


def _slab(raw: Any) -> SalaryTaxSlab:
    return SalaryTaxSlab(over=raw["over"], up_to=raw["upTo"], fixed=raw["fixed"], rate=raw["rate"])


def _year(raw: Any) -> SalaryTaxYear:
    return SalaryTaxYear(
        tax_year=raw["taxYear"],
        from_=raw["from"],
        to=raw["to"],
        law=raw["law"],
        source=raw["source"],
        slabs=[_slab(s) for s in raw["slabs"]],
    )


def _raw_years() -> List[Any]:
    return load("income-tax-slabs.json")  # type: ignore[no-any-return]


def get_tax_year(date: Any = None) -> Optional[int]:
    """The tax year (July to June) that contains a date, or ``None`` for an
    invalid date.

    ``date`` is ``YYYY-MM-DD`` or a ``datetime.date``, and defaults to today's
    local date. Never raises.

    >>> get_tax_year("2025-07-01")
    2026
    """
    iso = iso_date(_dt.date.today() if date is None else date)
    if iso is None:
        return None
    year = int(iso[0:4])
    return year + 1 if int(iso[5:7]) >= 7 else year


def _find_year(tax_year: Any, date: Any) -> Optional[Any]:
    if tax_year is not None:
        if not is_integer(tax_year):
            return None
        wanted: Optional[int] = int(tax_year)
    else:
        wanted = get_tax_year(date)
    for raw in _raw_years():
        if raw["taxYear"] == wanted:
            return raw
    return None


def get_salary_tax_slabs(tax_year: Any = None) -> Optional[SalaryTaxYear]:
    """Returns the salaried rate table for a tax year: Division I of Part I of
    the First Schedule to the Income Tax Ordinance 2001, clause (2), which
    applies when salary is more than 75% of taxable income.

    Covers tax years 2020 to 2027, each from FBR's consolidated Ordinance.
    ``tax_year`` is e.g. ``2026`` (1 July 2025 to 30 June 2026) and defaults to
    the current tax year. Returns ``None`` for a year that is not covered.
    Never raises.
    """
    raw = _find_year(tax_year, None)
    return None if raw is None else _year(raw)


def get_salary_tax_years() -> List[int]:
    """Which tax years :func:`get_salary_tax_slabs` covers, oldest first."""
    return [raw["taxYear"] for raw in _raw_years()]


def _compute(income_paisa: int, raw: Any) -> SalaryTax:
    slabs = raw["slabs"]
    slab = slabs[0]
    for candidate in slabs:
        if income_paisa > candidate["over"] * 100:
            slab = candidate
    rate_bp = js_round(slab["rate"] * 100)
    over_paisa = int(slab["over"] * 100)
    fixed_paisa = int(slab["fixed"] * 100)
    if income_paisa > over_paisa:
        tax_paisa = fixed_paisa + divide_half_up((income_paisa - over_paisa) * rate_bp, 10000)
    else:
        tax_paisa = fixed_paisa
    return SalaryTax(
        tax=from_paisa(tax_paisa),
        monthly=from_paisa(divide_half_up(tax_paisa, 12)),
        effective_rate=0 if income_paisa == 0 else divide_half_up(tax_paisa * 10000, income_paisa) / 100,
        slab=_slab(slab),
        tax_year=raw["taxYear"],
    )


def calculate_salary_tax(
    annual_income: Any,
    *,
    tax_year: Any = None,
    date: Any = None,
) -> Optional[SalaryTax]:
    """Income tax on a salaried individual's taxable income for a tax year,
    from the salaried rate table (see :func:`get_salary_tax_slabs`).

    ``annual_income`` is the taxable income for the year in rupees, 0 to 1
    trillion (at most 2 decimals count). ``tax_year`` (e.g. ``2026``) takes
    precedence over ``date`` (``YYYY-MM-DD`` or a ``datetime.date``, a day in
    the tax year); with neither, the current tax year is used.

    The rate table only: the surcharge, tax credits, exemptions, the separate
    pension rate and withholding adjustments are not applied. Returns ``None``
    for an invalid amount or a tax year that is not covered. Never raises.

    >>> calculate_salary_tax(1_800_000, tax_year=2026).tax
    72000.0
    """
    paisa = to_units(annual_income, 2)
    if paisa is None:
        return None
    raw = _find_year(tax_year, date)
    return None if raw is None else _compute(paisa, raw)


def calculate_monthly_salary_tax(
    monthly_salary: Any,
    *,
    tax_year: Any = None,
    date: Any = None,
) -> Optional[SalaryTax]:
    """:func:`calculate_salary_tax` for a monthly salary: the income is
    ``monthly_salary * 12``, and ``monthly`` is the tax to withhold each month.

    >>> calculate_monthly_salary_tax(150_000, tax_year=2026).monthly
    6000.0
    """
    paisa = to_units(monthly_salary, 2)
    if paisa is None:
        return None
    raw = _find_year(tax_year, date)
    return None if raw is None else _compute(paisa * 12, raw)
