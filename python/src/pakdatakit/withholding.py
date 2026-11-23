"""Withholding tax in Pakistan for persons on and not on the Active Taxpayers List."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Literal, Mapping, Optional

from ._data import load
from ._internal.js import is_integer, is_number, js_round, number_to_string, trim
from ._internal.money import divide_half_up, to_units
from .data_info import DataSource
from .incometax import get_salary_tax_slabs, get_tax_year

__all__ = [
    "WithholdingNonAtlRule",
    "WithholdingSlab",
    "WithholdingThreshold",
    "WithholdingRate",
    "Withholding",
    "get_withholding_rates",
    "calculate_withholding",
]

#: How the rate for a person not on the Active Taxpayers List is set:
#: ``double`` (the Tenth Schedule's 100% increase), ``fixed`` (its own rate),
#: ``slabs`` (its own value bands) or ``not-applicable`` (the same rate for all).
WithholdingNonAtlRule = Literal["double", "fixed", "slabs", "not-applicable"]


@dataclass(frozen=True)
class WithholdingSlab:
    """A value band: the rate for amounts over ``over`` up to ``up_to``
    (inclusive; ``None`` means no limit)."""

    over: float
    up_to: Optional[float]
    #: Percent.
    rate: float


@dataclass(frozen=True)
class WithholdingThreshold:
    """The amount at or below which nothing is collected (231AB: Rs 50,000 of
    cash withdrawn in a day, all withdrawals added up)."""

    #: In rupees.
    amount: float
    #: The period it applies to, e.g. ``day``.
    per: str
    #: In :func:`calculate_withholding`, whether the amount was within the
    #: threshold (so nothing is collected); ``None`` in :func:`get_withholding_rates`.
    within_threshold: Optional[bool] = None


@dataclass(frozen=True)
class WithholdingRate:
    """One case of a section in a tax year, as in FBR's rate card. Returned by
    :func:`get_withholding_rates`."""

    tax_year: int
    section: str
    sub_type: str
    description: str
    #: Percent for a person on the list; ``None`` where it does not apply or
    #: depends on the value (see ``atl_slabs``).
    atl_rate: Optional[float]
    atl_slabs: Optional[List[WithholdingSlab]]
    #: ``double``, ``fixed``, ``slabs`` or ``not-applicable``.
    non_atl_rule: str
    #: Percent for a person not on the list, or ``None`` (see ``non_atl_slabs``).
    non_atl_rate: Optional[float]
    non_atl_slabs: Optional[List[WithholdingSlab]]
    #: Late-filer value bands, where the year has them.
    late_filer_slabs: Optional[List[WithholdingSlab]]
    #: The threshold, or ``None`` where there is none.
    threshold: Optional[WithholdingThreshold]
    #: Rate card and law references, as printed on the card.
    card_ref: str
    law_ref: str
    #: Where the statute differs from the card and the statute is used, why.
    statute_override: Optional[str]
    note: Optional[str]
    source: DataSource


@dataclass(frozen=True)
class Withholding:
    """Result of :func:`calculate_withholding`, in rupees."""

    section: str
    sub_type: str
    #: The case as the rate card describes it.
    description: str
    tax_year: int
    atl: bool
    late_filer: bool
    #: Percent applied to the whole amount (for 149, the effective rate).
    rate: float
    #: Tax to withhold or collect, in whole rupees: section 219 of the
    #: Ordinance disregards fractions under 50 paisa and counts 50 paisa or
    #: more as a rupee.
    tax: int
    #: How the rate for a person not on the list is set for this case:
    #: ``double`` (the Tenth Schedule's 100% increase), ``fixed`` (its own
    #: rate, as for 236C, or 231AB, which applies only to them), ``slabs``
    #: (its own value bands, 236K) or ``not-applicable`` (149: the same rate
    #: for all).
    non_atl_rule: str
    #: The value band used (236C, 236K), or ``None``.
    slab: Optional[WithholdingSlab]
    #: The amount at or below which nothing is collected, and whether this
    #: amount was within it (``within_threshold``). ``None`` where there is none.
    threshold: Optional[WithholdingThreshold]
    #: Rate card and law references, as printed on the card.
    card_ref: str
    law_ref: str
    #: Where the statute differs from the card and the statute is used, why.
    statute_override: Optional[str]
    #: 154B with ``resident`` given: ``"minimum"`` for a resident, ``"final"``
    #: for a non-resident without a permanent establishment in Pakistan;
    #: otherwise ``None``.
    tax_nature: Optional[str]
    source: DataSource


def _rows() -> List[Any]:
    return load("withholding-rates.json")  # type: ignore[no-any-return]


def _source(row: Any) -> DataSource:
    return DataSource(
        id="withholding-rates",
        effective_from=row["from"],
        effective_to=row["to"],
        source_reference=(
            f"{row['lawRef']} (FBR Withholding Tax Rate Card, tax year {row['taxYear']}, {row['cardRef']})"
        ),
        source_url=row["card"],
    )


def _slab(raw: Any) -> WithholdingSlab:
    return WithholdingSlab(over=raw["over"], up_to=raw["upTo"], rate=raw["rate"])


def _slabs(raw: Any) -> Optional[List[WithholdingSlab]]:
    return None if raw is None else [_slab(s) for s in raw]


def _js_string(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if is_number(value):
        return number_to_string(value)
    return str(value)


def get_withholding_rates(tax_year: Any, section: Any = None) -> List[WithholdingRate]:
    """Every case FBR's Withholding Tax Rate Card lists for the covered
    sections in a tax year (2025 to 2027), with its rates for persons on and
    not on the Active Taxpayers List and its references.

    ``tax_year`` is e.g. ``2027``; ``section`` (optional, e.g. ``"153"``, in
    any case) keeps only that section. Returns the cases, or ``[]`` for a
    year that is not covered. Never raises.

    >>> [r.sub_type for r in get_withholding_rates(2027, "236K")]
    ['purchase']
    """
    wanted = None if section is None else _js_string(section).upper()
    year_ok = is_number(tax_year)
    result = []
    for r in _rows():
        if not year_ok or r["taxYear"] != tax_year:
            continue
        if wanted is not None and r["section"] != wanted:
            continue
        late = r.get("lateFiler")
        threshold = r.get("threshold")
        result.append(
            WithholdingRate(
                tax_year=r["taxYear"],
                section=r["section"],
                sub_type=r["subType"],
                description=r["description"],
                atl_rate=r["atl"].get("rate"),
                atl_slabs=_slabs(r["atl"].get("slabs")),
                non_atl_rule=r["nonAtl"]["rule"],
                non_atl_rate=r["nonAtl"].get("rate"),
                non_atl_slabs=_slabs(r["nonAtl"].get("slabs")),
                late_filer_slabs=None if late is None else _slabs(late.get("slabs")),
                threshold=(
                    None
                    if threshold is None
                    else WithholdingThreshold(amount=threshold["amount"], per=threshold["per"])
                ),
                card_ref=r["cardRef"],
                law_ref=r["lawRef"],
                statute_override=r.get("statuteOverride"),
                note=r.get("note"),
                source=_source(r),
            )
        )
    return result


def _in_slab(paisa: int, slabs: List[Any]) -> Any:
    for s in slabs:
        if paisa > s["over"] * 100 and (s["upTo"] is None or paisa <= s["upTo"] * 100):
            return s
    return slabs[0]


_MISSING = object()


def calculate_withholding(
    input: Any = None,  # noqa: A002 - mirrors the npm API
    *,
    section: Any = None,
    sub_type: Any = None,
    amount: Any = None,
    atl: Any = None,
    late_filer: Any = False,
    return_on_investment: Any = None,
    resident: Any = None,
    tax_year: Any = None,
    date: Any = None,
) -> Optional[Withholding]:
    """Income tax to withhold or collect under one section of the Income Tax
    Ordinance 2001, for a person on or not on FBR's Active Taxpayers List
    (ATL), from FBR's Withholding Tax Rate Card for tax years 2025 to 2027.

    Covered: 231AB cash withdrawal, 236C sale and 236K purchase of immovable
    property, 151 profit on debt, 150 dividends, 153 goods, services and
    contracts, 154B social media income (from 2027) and 149 salary (the
    salaried rate table, as :func:`calculate_salary_tax`).

    ``section`` is the section (``"231AB"``, ``"236C"``, ``"236K"``,
    ``"151"``, ``"150"``, ``"153"``, ``"154B"`` or ``"149"``, in any case);
    ``sub_type`` the case, e.g. ``"bank-deposit"`` (151) or
    ``"goods-company"`` (153), optional for sections with one case (see
    :func:`get_withholding_rates`). ``amount`` is the payment (for 236C and
    236K the value; for 149 the year's taxable salary) in rupees. ``atl`` is
    ``True`` if the person is on the list and is required. ``late_filer=True``
    is for a person on the list who filed late; it changes the rate only
    where the year has a late-filer rate (236C and 236K in 2025 and 2026).
    ``return_on_investment`` is for 151 sukuk held by an individual or AOP:
    the holder's return on investment, which decides the case (more than Rs 1
    million: ``sukuk-individual-above-1m``; less than Rs 1 million:
    ``sukuk-individual-below-1m``); it defaults to ``amount``. The law gives
    no rate for exactly Rs 1 million, so that, or a case that does not fit
    the return, gives ``None``. ``resident`` is for 154B: the rate is the
    same, but it decides whether the tax is a minimum tax (resident) or a
    final tax (non-resident without a permanent establishment in Pakistan),
    given in ``tax_nature``.
    ``tax_year`` (e.g. ``2027``) takes precedence over ``date``. All of them
    may also be passed as one ``dict`` with the npm package's camelCase keys.

    The rate for a person not on the list follows each case's own rule in the
    Tenth Schedule: usually double, but a fixed rate (236C, and 151 in 2025),
    its own value bands (236K), or none (149; 231AB applies only to them).
    The rate applies to the whole amount (236C and 236K value bands are not
    marginal), and the tax is rounded to the nearest rupee (section 219; for
    149, the salaried rate table is computed exactly and rounded once).
    Where FBR's card and the Ordinance differ, the Ordinance is used and
    ``statute_override`` says so. For 231AB, pass the day's total of all cash
    withdrawals: nothing is collected up to Rs 50,000. For 150 mutual fund
    dividends received by a company, the debt part is
    ``mutual-fund-debt-part-company`` (29%).

    This is an estimate from the rate card, not tax advice: exemptions,
    reduced-rate certificates, adjustable or final status and the many cases
    not listed here are not applied. Returns the rate, tax and references
    (:class:`Withholding`), or ``None`` for an unknown section, case or tax
    year, an invalid amount, or a missing ``atl``. Never raises.

    >>> calculate_withholding(section="236K", amount=60_000_000, atl=False, tax_year=2027).rate
    14.5
    >>> calculate_withholding(section="231AB", amount=80_000, atl=False, tax_year=2027).tax
    640
    >>> calculate_withholding(
    ...     section="151", sub_type="bank-deposit", amount=10_000, atl=True, tax_year=2027
    ... ).tax
    2000
    """
    if input is not None:
        if not isinstance(input, Mapping):
            return None

        def get(camel: str, snake: str) -> Any:
            return input.get(camel, input.get(snake, _MISSING))

        section = get("section", "section")
        sub_type = get("subType", "sub_type")
        amount = get("amount", "amount")
        atl = get("atl", "atl")
        late_filer = get("lateFiler", "late_filer")
        return_on_investment = get("returnOnInvestment", "return_on_investment")
        resident = get("resident", "resident")
        tax_year = get("taxYear", "tax_year")
        date = get("date", "date")
    else:
        sub_type = _MISSING if sub_type is None else sub_type
        return_on_investment = _MISSING if return_on_investment is None else return_on_investment
        tax_year = _MISSING if tax_year is None else tax_year
        date = _MISSING if date is None else date

    if not isinstance(atl, bool):
        return None
    if not isinstance(section, str):
        return None
    paisa = to_units(amount, 2)
    if paisa is None:
        return None
    year: Optional[int] = None
    if tax_year is not _MISSING:
        year = int(tax_year) if is_integer(tax_year) else None
    elif date is not _MISSING:
        year = None if date is None else get_tax_year(date)
    if year is None:
        return None
    wanted = trim(section).upper()
    cases = [r for r in _rows() if r["taxYear"] == year and r["section"] == wanted]
    if not cases:
        return None
    row: Any = None
    if sub_type is _MISSING:
        if len(cases) == 1:
            row = cases[0]
    elif isinstance(sub_type, str):
        row = next((r for r in cases if r["subType"] == sub_type), None)
    if row is None:
        return None

    # 151 sukuk (individual or AOP): the case must fit the return; the law
    # says "more than" and "less than" Rs 1 million, so exactly Rs 1 million
    # fits neither.
    band = row.get("returnBand")
    if band is not None:
        ret = paisa if return_on_investment is _MISSING else to_units(return_on_investment, 2)
        if ret is None:
            return None
        if "over" in band and not ret > band["over"] * 100:
            return None
        if "under" in band and not ret < band["under"] * 100:
            return None

    is_late = atl and late_filer is True
    slab: Optional[WithholdingSlab] = None
    threshold: Optional[WithholdingThreshold] = None

    if row["atl"].get("salarySlabs"):
        # The salaried rate table, computed exactly and rounded once.
        table = get_salary_tax_slabs(year)
        if table is None:
            return None
        salary_band = table.slabs[0]
        for candidate in table.slabs:
            if paisa > candidate.over * 100:
                salary_band = candidate
        over_paisa = int(salary_band.over * 100)
        above = paisa - over_paisa if paisa > over_paisa else 0
        tax_rupees = salary_band.fixed + divide_half_up(above * js_round(salary_band.rate * 100), 1_000_000)
        rate = 0 if paisa == 0 else divide_half_up(int(tax_rupees) * 1_000_000, paisa) / 100
    else:
        if not atl:
            spec = row["nonAtl"]
        elif is_late and row.get("lateFiler") is not None:
            spec = row["lateFiler"]
        else:
            spec = row["atl"]
        if spec.get("slabs") is not None:
            slab = _slab(_in_slab(paisa, spec["slabs"]))
            rate = slab.rate
        else:
            spec_rate = spec.get("rate")
            rate = spec_rate if is_number(spec_rate) else 0
        tax_rupees = divide_half_up(paisa * js_round(rate * 100), 1_000_000)
        raw_threshold = row.get("threshold")
        if raw_threshold is not None:
            within = paisa <= raw_threshold["amount"] * 100
            threshold = WithholdingThreshold(
                amount=raw_threshold["amount"], per=raw_threshold["per"], within_threshold=within
            )
            if within:
                tax_rupees = 0

    return Withholding(
        section=row["section"],
        sub_type=row["subType"],
        description=row["description"],
        tax_year=year,
        atl=atl,
        late_filer=is_late,
        rate=rate,
        tax=tax_rupees,
        non_atl_rule=row["nonAtl"]["rule"],
        slab=slab,
        threshold=threshold,
        card_ref=row["cardRef"],
        law_ref=row["lawRef"],
        statute_override=row.get("statuteOverride"),
        tax_nature=(
            (nature["resident"] if resident else nature["nonResident"])
            if (nature := row.get("taxNature")) is not None and isinstance(resident, bool)
            else None
        ),
        source=_source(row),
    )
