"""Standard sales tax rates in Pakistan and exact tax arithmetic."""

from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass, replace
from typing import Any, List, Literal, Optional

from ._data import load
from .data_info import DataSource
from ._internal.date import iso_date as _iso_date
from ._internal.js import is_number
from ._internal.money import divide_half_up, from_paisa, to_units
from ._internal.normalize import normalize_key

__all__ = [
    "SalesTaxKind",
    "SalesTaxRate",
    "SalesTaxAmounts",
    "get_sales_tax_rate",
    "calculate_sales_tax",
    "split_inclusive",
]

#: What is taxed: goods (federal sales tax) or services (provincial or ICT).
SalesTaxKind = Literal["goods", "services"]


@dataclass(frozen=True)
class SalesTaxRate:
    """One standard rate and the period it applied."""

    kind: str
    #: ``FBR``, ``PRA``, ``SRB``, ``KPRA`` or ``BRA``. FBR also collects ICT's tax on services.
    authority: str
    #: For services: the province or ``Islamabad Capital Territory``. ``None`` for goods.
    province: Optional[str]
    #: Percent, e.g. ``18``.
    rate: float
    #: First day it applied (``YYYY-MM-DD``). Coverage starts on 1 July 2019.
    #: (``from`` in the npm package; ``from_`` because ``from`` is a keyword.)
    from_: str
    #: Last day it applied, or ``None`` if it still applies.
    to: Optional[str]
    #: The law that sets it.
    law: str
    #: Official document.
    source: str


@dataclass(frozen=True)
class SalesTaxAmounts:
    """Result of :func:`calculate_sales_tax` and :func:`split_inclusive`, in rupees."""

    #: Value excluding tax (2 decimals at most).
    net: float
    tax: float
    #: Value including tax.
    gross: float
    #: Percent used.
    rate: float
    #: The rate's period, law and official source, when the rate was looked
    #: up from a province or kind. ``None`` when you passed the ``rate`` yourself.
    source: Optional[DataSource] = None


_PROVINCES = {
    "punjab": "Punjab",
    "sindh": "Sindh",
    "khyber pakhtunkhwa": "Khyber Pakhtunkhwa",
    "kp": "Khyber Pakhtunkhwa",
    "kpk": "Khyber Pakhtunkhwa",
    "balochistan": "Balochistan",
    "baluchistan": "Balochistan",
    "islamabad capital territory": "Islamabad Capital Territory",
    "ict": "Islamabad Capital Territory",
    "islamabad": "Islamabad Capital Territory",
    "azad jammu and kashmir": "Azad Jammu and Kashmir",
    "ajk": "Azad Jammu and Kashmir",
    "gilgit-baltistan": "Gilgit-Baltistan",
    "gilgit baltistan": "Gilgit-Baltistan",
    "gb": "Gilgit-Baltistan",
}

#: Provinces outside the federal Sales Tax Act's territory.
_OUTSIDE_FEDERAL = frozenset({"Azad Jammu and Kashmir", "Gilgit-Baltistan"})

_rates: Optional[List[SalesTaxRate]] = None


def _all_rates() -> List[SalesTaxRate]:
    global _rates
    if _rates is None:
        _rates = [
            SalesTaxRate(
                kind=r["kind"],
                authority=r["authority"],
                province=r["province"],
                rate=r["rate"],
                from_=r["from"],
                to=r["to"],
                law=r["law"],
                source=r["source"],
            )
            for r in load("sales-tax-rates.json")
        ]
    return _rates


def _province_name(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    return _PROVINCES.get(normalize_key(value))


def get_sales_tax_rate(
    *,
    kind: Any = None,
    province: Optional[str] = None,
    date: Any = None,
) -> Optional[SalesTaxRate]:
    """Returns the standard sales tax rate for goods (federal, Sales Tax Act
    1990) or for services in a province or Islamabad Capital Territory, on a
    given date.

    ``kind`` is ``"goods"`` or ``"services"``. ``province`` (needed for
    services) accepts the province names and ``KP``, ``KPK``, ``ICT`` and
    ``Islamabad``. ``date`` is ``YYYY-MM-DD`` or a ``datetime.date``, and
    defaults to today's local date.

    Only standard rates are covered, from 1 July 2019. Reduced, higher and
    sector rates are not. Returns ``None`` for an unknown province or kind, an
    invalid date, a date before 1 July 2019, services without a province, or
    goods in Azad Jammu and Kashmir or Gilgit-Baltistan. Never raises.

    >>> get_sales_tax_rate(kind="services", province="Sindh", date="2024-06-30").rate
    13
    """
    if not isinstance(kind, str) or kind not in ("goods", "services"):
        return None
    iso = _iso_date(_dt.date.today() if date is None else date)
    if iso is None:
        return None

    name: Optional[str] = None
    if province is not None:
        name = _province_name(province)
        if name is None:
            return None
    if kind == "goods":
        if name is not None and name in _OUTSIDE_FEDERAL:
            return None
    elif name is None:
        return None

    for r in _all_rates():
        if (
            r.kind == kind
            and (kind == "goods" or r.province == name)
            and r.from_ <= iso
            and (r.to is None or iso <= r.to)
        ):
            return r
    return None


def _basis_points(rate: Any) -> Optional[int]:
    """Basis points for a rate from 0 to 100 with at most 2 decimals."""
    if not is_number(rate):
        return None
    exact = to_units(rate, 4) if 0 <= rate <= 100 else None  # NaN fails the range check
    if exact is None or exact % 100 != 0:
        return None
    return exact // 100


def _amounts(net_paisa: int, tax_paisa: int, bp: int) -> SalesTaxAmounts:
    return SalesTaxAmounts(
        net=from_paisa(net_paisa),
        tax=from_paisa(tax_paisa),
        gross=from_paisa(net_paisa + tax_paisa),
        rate=bp / 100,
    )


def split_inclusive(gross: Any, rate: Any) -> Optional[SalesTaxAmounts]:
    """Splits an amount that includes sales tax into its value and tax.

    The value is rounded half up to the paisa and the tax is the rest, so
    ``net + tax`` is always ``gross``. ``gross`` is 0 to 1 trillion rupees and
    ``rate`` a percent from 0 to 100 with at most 2 decimals. Returns ``None``
    for an invalid amount or rate. Never raises.

    >>> split_inclusive(1180, 18)
    SalesTaxAmounts(net=1000.0, tax=180.0, gross=1180.0, rate=18.0, source=None)
    """
    gross_paisa = to_units(gross, 2)
    bp = _basis_points(rate)
    if gross_paisa is None or bp is None:
        return None
    net_paisa = divide_half_up(gross_paisa * 10000, 10000 + bp)
    return _amounts(net_paisa, gross_paisa - net_paisa, bp)


def calculate_sales_tax(
    amount: Any,
    *,
    rate: Any = None,
    province: Optional[str] = None,
    kind: Any = None,
    date: Any = None,
    inclusive: Any = False,
) -> Optional[SalesTaxAmounts]:
    """Adds sales tax to an amount, or splits it out when ``inclusive=True``.

    Give a ``rate`` (percent, 0 to 100, at most 2 decimals; it takes
    precedence), or a ``province`` (and ``kind``, default ``"services"``, and
    ``date``) to use the standard rate from :func:`get_sales_tax_rate`. The
    tax is rounded half up to the paisa. ``amount`` is 0 to 1 trillion rupees.

    When the rate was looked up, ``source`` gives its period, law and
    official document (a :class:`DataSource`); with your own ``rate`` it is
    ``None``.

    Returns ``None`` if the amount, rate or province is invalid or no rate
    applies. Never raises.

    >>> calculate_sales_tax(1000, rate=18)
    SalesTaxAmounts(net=1000.0, tax=180.0, gross=1180.0, rate=18.0, source=None)
    >>> calculate_sales_tax(1000, province="Punjab", date="2026-11-18").tax
    160.0
    >>> calculate_sales_tax(1000, province="Punjab", date="2026-11-18").source.effective_from
    '2019-07-01'
    """
    source: Optional[DataSource] = None
    if rate is None:
        if kind is None:
            kind = "services" if province is not None else None
        if kind is None:
            return None
        found = get_sales_tax_rate(kind=kind, province=province, date=date)
        if found is None:
            return None
        rate = found.rate
        source = DataSource(
            id="sales-tax-rates",
            effective_from=found.from_,
            effective_to=found.to,
            source_reference=found.law,
            source_url=found.source,
        )
    result: Optional[SalesTaxAmounts]
    if inclusive is True:
        result = split_inclusive(amount, rate)
    else:
        net_paisa = to_units(amount, 2)
        bp = _basis_points(rate)
        if net_paisa is None or bp is None:
            return None
        result = _amounts(net_paisa, divide_half_up(net_paisa * bp, 10000), bp)
    return replace(result, source=source) if result is not None and source is not None else result
