"""Cities, districts and provinces."""

from __future__ import annotations

from typing import Dict, List, Optional

from ._data import load
from ._internal.js import locale_sorted
from ._internal.normalize import normalize_key

__all__ = [
    "get_province",
    "search_cities",
    "get_district_province",
    "search_districts",
    "get_districts_by_province",
]

_city_lookup: Optional[Dict[str, str]] = None
_district_lookup: Optional[Dict[str, str]] = None

# Districts that were split or renamed, so names stored before the change still
# resolve. They are not listed by search_districts or get_districts_by_province.
_FORMER_DISTRICTS = {
    "south waziristan": "Khyber Pakhtunkhwa",
    "quetta": "Balochistan",
    "dera bugti": "Balochistan",
    "upper dera bugti": "Balochistan",
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
