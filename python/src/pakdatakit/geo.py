"""Cities, districts and provinces."""

from __future__ import annotations

from typing import Dict, List, Optional, Set

from ._data import load
from ._internal.js import locale_sorted
from ._internal.normalize import normalize_key

__all__ = [
    "get_province",
    "search_cities",
    "get_district_province",
    "search_districts",
    "get_districts_by_province",
    "get_divisions",
    "get_division_of_district",
    "get_tehsils",
    "get_tehsil_district",
]

_city_lookup: Optional[Dict[str, str]] = None
_district_lookup: Optional[Dict[str, str]] = None
_division_lookup: Optional[Dict[str, str]] = None
_census_district_keys: Optional[Set[str]] = None

# Districts that were split or renamed, so names stored before the change still
# resolve. They are not listed by search_districts or get_districts_by_province.
_FORMER_DISTRICTS = {
    "south waziristan": "Khyber Pakhtunkhwa",
    "quetta": "Balochistan",
    "dera bugti": "Balochistan",
    "upper dera bugti": "Balochistan",
    "upper swat": "Khyber Pakhtunkhwa",
}


def _cities() -> list:
    return load("cities.json")


def _districts() -> list:
    return load("districts.json")


def _cities_map() -> Dict[str, str]:
    global _city_lookup
    if _city_lookup is None:
        _city_lookup = {normalize_key(e["city"]): e["province"] for e in _cities()}
    return _city_lookup


def _districts_map() -> Dict[str, str]:
    global _district_lookup
    if _district_lookup is None:
        _district_lookup = {normalize_key(e["district"]): e["province"] for e in _districts()}
    return _district_lookup


def get_province(city: str) -> Optional[str]:
    """Returns the province for a city name (case- and spacing-insensitive), or ``None``."""
    key = normalize_key(city)
    if len(key) == 0:
        return None
    return _cities_map().get(key)


def search_cities(query: str) -> List[str]:
    """Searches cities by partial, case-insensitive name; sorted."""
    q = normalize_key(query)
    if len(q) == 0:
        return []
    matches = [e["city"] for e in _cities() if q in normalize_key(e["city"])]
    return locale_sorted(list(dict.fromkeys(matches)))


def get_district_province(district: str) -> Optional[str]:
    """Returns the province for a district name, or ``None``."""
    key = normalize_key(district)
    if len(key) == 0:
        return None
    found = _districts_map().get(key)
    if found is not None:
        return found
    return _FORMER_DISTRICTS.get(key)


def search_districts(query: str) -> List[str]:
    """Searches districts by partial, case-insensitive name; sorted."""
    q = normalize_key(query)
    if len(q) == 0:
        return []
    matches = [e["district"] for e in _districts() if q in normalize_key(e["district"])]
    return locale_sorted(list(dict.fromkeys(matches)))


def get_districts_by_province(province: str) -> List[str]:
    """Returns all districts in a province (case-insensitive), sorted."""
    key = normalize_key(province)
    if len(key) == 0:
        return []
    return locale_sorted(
        [e["district"] for e in _districts() if normalize_key(e["province"]) == key]
    )


def _divisions() -> list:
    return load("divisions.json")


def _tehsils() -> list:
    return load("tehsils.json")


def _division_of_district() -> Dict[str, str]:
    global _division_lookup
    if _division_lookup is None:
        _division_lookup = {
            normalize_key(district): entry["division"]
            for entry in _divisions()
            for district in entry["districts"]
        }
    return _division_lookup


def _census_districts() -> Set[str]:
    global _census_district_keys
    if _census_district_keys is None:
        _census_district_keys = {normalize_key(e["censusDistrict"]) for e in _tehsils()}
    return _census_district_keys


def get_divisions(province: Optional[str] = None) -> List[str]:
    """Returns the administrative divisions of Pakistan, or of one province, sorted.

    The list is the 30 divisions of the 2023 census: Punjab 9, Sindh 6, Khyber
    Pakhtunkhwa 7 and Balochistan 8. Islamabad has no division, and the census
    tables do not cover Azad Jammu and Kashmir or Gilgit-Baltistan. Divisions
    created since the census (such as Gujrat in Punjab) are not included.

    ``province`` is case-insensitive; leave it out for all divisions.
    """
    if province is None:
        return locale_sorted([e["division"] for e in _divisions()])
    key = normalize_key(province)
    if len(key) == 0:
        return []
    return locale_sorted(
        [e["division"] for e in _divisions() if normalize_key(e["province"]) == key]
    )


def get_division_of_district(district: str) -> Optional[str]:
    """Returns the division a district belonged to in the 2023 census, or ``None``.

    Census-district caveat: only the 136 districts of the 2023 census have a
    division here, under the name they had then (so ``Quetta``, ``Dera Bugti``
    and ``South Waziristan`` work, and their successors do not). Districts
    created after the census, and those of Azad Jammu and Kashmir,
    Gilgit-Baltistan and Islamabad, return ``None``.
    """
    key = normalize_key(district)
    if len(key) == 0:
        return None
    return _division_of_district().get(key)


def get_tehsils(district: str) -> List[str]:
    """Returns the tehsils (talukas, sub-divisions) of a district, sorted.

    Census-district caveat: the data is the 591 tehsil-level units of the 2023
    census, each recorded under the district it was in then. For a district of
    the 2023 census this returns its census tehsils, even if some have since
    moved to a new district (so ``Rawalpindi`` still lists Murree). For a
    district created after the census it returns only the tehsils an official
    source places in it, which can be an empty list. Azad Jammu and Kashmir
    and Gilgit-Baltistan are not covered.

    ``district`` is case-insensitive; former names such as ``Quetta`` and
    ``South Waziristan`` work.
    """
    key = normalize_key(district)
    if len(key) == 0:
        return []
    if key in _census_districts():
        matches = [e["tehsil"] for e in _tehsils() if normalize_key(e["censusDistrict"]) == key]
    else:
        matches = [
            e["tehsil"]
            for e in _tehsils()
            if e.get("currentDistrict") is not None
            and normalize_key(e["currentDistrict"]) == key
        ]
    return locale_sorted(matches)


def get_tehsil_district(tehsil: str, province: Optional[str] = None) -> Optional[str]:
    """Returns the district a tehsil was in at the 2023 census, or ``None``.

    Census-district caveat: the result is the census district, which may have
    been split since (a tehsil of ``Quetta`` is now in Quetta East or Quetta
    West). A few names are shared by tehsils in different districts
    (``Saddar``, ``Sahiwal``, ``Khanpur``); pass the province to tell them
    apart. Returns ``None`` when the name is unknown or still matches more
    than one district.
    """
    key = normalize_key(tehsil)
    if len(key) == 0:
        return None
    province_key = None if province is None else normalize_key(province)
    matches = {
        e["censusDistrict"]
        for e in _tehsils()
        if normalize_key(e["tehsil"]) == key
        and (province_key is None or normalize_key(e["province"]) == province_key)
    }
    if len(matches) != 1:
        return None
    return next(iter(matches))
