"""Pakistani postal code lookups."""

from __future__ import annotations

import re
from typing import Dict, List, Optional

from ._data import load
from ._internal.js import WS, locale_sorted, trim
from ._internal.normalize import normalize_key

__all__ = [
    "get_city_by_postal_code",
    "get_postal_code",
    "get_postal_codes",
    "get_postal_areas",
    "search_postal_codes",
]

_WS_RUN = re.compile("[" + WS + "]+")
_by_code: Optional[Dict[str, str]] = None
_by_city: Optional[Dict[str, str]] = None


def _entries() -> list:
    return load("postal-codes.json")


def _postal_by_code() -> Dict[str, str]:
    global _by_code
    if _by_code is None:
        _by_code = {e["postalCode"]: e["city"] for e in _entries()}
    return _by_code


def _postal_by_city() -> Dict[str, str]:
    global _by_city
    if _by_city is None:
        mapping: Dict[str, str] = {}
        for e in _entries():
            key = normalize_key(e["city"])
            if key not in mapping or e.get("primary") is True:
                mapping[key] = e["postalCode"]
        _by_city = mapping
    return _by_city


def get_city_by_postal_code(postal_code: str) -> Optional[str]:
    """Returns the city for a postal code (whitespace is ignored), or ``None``."""
    code = _WS_RUN.sub("", trim(postal_code))
    if len(code) == 0:
        return None
    return _postal_by_code().get(code)


def get_postal_code(city: str) -> Optional[str]:
    """Returns the primary (GPO) postal code for a city, or ``None``."""
    key = normalize_key(city)
    if len(key) == 0:
        return None
    return _postal_by_city().get(key)


def get_postal_codes(city: str) -> List[str]:
    """Returns all known postal codes for a city, sorted."""
    key = normalize_key(city)
    if len(key) == 0:
        return []
    return locale_sorted([e["postalCode"] for e in _entries() if normalize_key(e["city"]) == key])


def search_postal_codes(query: str) -> List[str]:
    """Searches postal entries by city name, area, or postal code prefix."""
    normalized_query = normalize_key(query)
    if len(normalized_query) == 0:
        return []
    prefix = trim(query)
    matches = [
        e["postalCode"]
        for e in _entries()
        if normalized_query in normalize_key(e["city"])
        or normalized_query in (normalize_key(e["area"]) if e.get("area") else "")
        or e["postalCode"].startswith(prefix)
    ]
    return locale_sorted(list(dict.fromkeys(matches)))


def get_postal_areas(city: str) -> List[str]:
    """Returns known area names for a city's postal entries, sorted."""
    key = normalize_key(city)
    if len(key) == 0:
        return []
    return locale_sorted(
        [e["area"] for e in _entries() if normalize_key(e["city"]) == key and e.get("area")]
    )
