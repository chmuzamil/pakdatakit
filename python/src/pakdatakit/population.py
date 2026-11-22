"""District and tehsil population from Pakistan's 2023 census."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional

from ._data import load
from ._internal.normalize import normalize_key
from .data_info import DataSource

__all__ = [
    "CensusCounts",
    "DistrictPopulation",
    "TehsilPopulation",
    "get_district_population",
    "get_tehsil_population",
]


@dataclass(frozen=True)
class CensusCounts:
    """Census 2023 counts for a district or tehsil."""

    #: Total population (all sexes), or ``None`` where the census has no figure.
    population: Optional[int]
    #: Households, or ``None``.
    households: Optional[int]
    #: Urban population, or ``None``.
    urban: Optional[int]
    #: Rural population, or ``None``.
    rural: Optional[int]
    #: Always ``2023``: the 7th Population and Housing Census.
    census: int
    source: DataSource


@dataclass(frozen=True)
class DistrictPopulation(CensusCounts):
    """Result of :func:`get_district_population`."""

    district: str
    province: str
    #: The census district the figures belong to. For a district created
    #: after the census, the one its area was part of (its own figures are
    #: ``None``); ``None`` in Gilgit-Baltistan and Azad Jammu and Kashmir,
    #: which the census did not cover.
    census_district: Optional[str]
    #: ``True`` when the district has lost area to a district created after
    #: the census: the figures are for the district as it was at the census.
    boundary_changed: bool
    #: Why figures are missing or what they cover, or ``None``.
    note: Optional[str]


@dataclass(frozen=True)
class TehsilPopulation(CensusCounts):
    """Result of :func:`get_tehsil_population`."""

    tehsil: str
    #: The district at the census.
    census_district: str
    #: The district today, or ``None`` where the data names none.
    current_district: Optional[str]
    province: str
    note: Optional[str]


def _source(dataset: str) -> DataSource:
    return DataSource(
        id=dataset,
        effective_from="2023-03-01",
        effective_to=None,
        source_reference=(
            "7th Population and Housing Census 2023, Table 1 (population, urban and rural)"
            " and Table 20 (households)"
        ),
        source_url="https://www.pbs.gov.pk/result-excel/",
    )


# The data files call the census district ``inCensusDistrict``, so that they
# are not mistaken for tehsils.json.


@lru_cache(maxsize=None)
def _districts() -> Dict[str, Any]:
    return {normalize_key(row["district"]): row for row in load("district-population.json")}


@lru_cache(maxsize=None)
def _tehsils() -> Dict[str, List[Any]]:
    rows: Dict[str, List[Any]] = {}
    for row in load("tehsil-population.json"):
        rows.setdefault(normalize_key(row["tehsil"]), []).append(row)
    return rows


def get_district_population(district: Any) -> Optional[DistrictPopulation]:
    """A district's population, households and urban/rural split from
    Pakistan's 2023 census (Pakistan Bureau of Statistics), for any of the
    177 districts in :func:`get_districts_by_province`.

    - Districts created after the census have ``None`` figures and name the
      census district their area was part of; nothing is estimated.
    - Districts that lost area to a new district keep their census figures,
      with ``boundary_changed=True``.
    - Gilgit-Baltistan and Azad Jammu and Kashmir were not enumerated by this
      census, so their figures are ``None``.

    ``district`` is a district name, in any case. Returns the figures and
    their source, or ``None`` for an unknown district or a value that is not
    a string. Never raises.

    >>> get_district_population("Lahore").population
    13004135
    >>> get_district_population("Murree").population is None
    True
    """
    if not isinstance(district, str):
        return None
    row = _districts().get(normalize_key(district))
    if row is None:
        return None
    return DistrictPopulation(
        district=row["district"],
        province=row["province"],
        population=row["population"],
        households=row["households"],
        urban=row["urban"],
        rural=row["rural"],
        census=2023,
        census_district=row["inCensusDistrict"],
        boundary_changed=row["boundaryChanged"],
        note=row["note"],
        source=_source("district-population"),
    )


def get_tehsil_population(tehsil: Any, district: Any = None) -> Optional[TehsilPopulation]:
    """A tehsil's (or taluka's, sub-division's) population, households and
    urban/rural split from the 2023 census, for the 591 units in the census
    tables.

    ``tehsil`` is a tehsil name, in any case. A few names occur in more than
    one district; give ``district`` (the district at the census or today) to
    choose. Returns the figures and their source, or ``None`` for an unknown
    or ambiguous name or a value that is not a string. Never raises.

    >>> get_tehsil_population("Murree").current_district
    'Murree'
    """
    if not isinstance(tehsil, str):
        return None
    rows = _tehsils().get(normalize_key(tehsil), [])
    if isinstance(district, str):
        wanted = normalize_key(district)
        rows = [
            r
            for r in rows
            if normalize_key(r["inCensusDistrict"]) == wanted
            or (isinstance(r["currentDistrict"], str) and normalize_key(r["currentDistrict"]) == wanted)
        ]
    if len(rows) != 1:
        return None
    row = rows[0]
    return TehsilPopulation(
        tehsil=row["tehsil"],
        census_district=row["inCensusDistrict"],
        current_district=row["currentDistrict"],
        province=row["province"],
        population=row["population"],
        households=row["households"],
        urban=row["urban"],
        rural=row["rural"],
        census=2023,
        note=row["note"],
        source=_source("tehsil-population"),
    )
