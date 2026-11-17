"""Pakistani postal code lookups."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional

from ._data import load
from ._internal.js import WS, locale_sorted, trim
from ._internal.normalize import normalize_key

__all__ = [
    "PostOffice",
    "get_post_office",
    "search_post_offices",
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
    """Returns the city for a Pakistani postal code (whitespace is ignored), or ``None``.

    Only codes of post offices in a city on pakdatakit's city list return a
    city (``54660`` -> ``Lahore``). The code of a post office in a town or
    village that is not on the list returns ``None``; use
    :func:`get_post_office` for those.
    """
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


@dataclass(frozen=True)
class PostOffice:
    """A delivery post office from Pakistan Post's post code directory."""

    #: 5-digit post code, e.g. ``48330``.
    code: str
    #: Office name as the directory gives it, in title case, e.g. ``Dulmial``.
    office: str
    #: The city the office belongs to when that is known (``Lahore`` for an
    #: office in Lahore); otherwise the office's own name, which for most
    #: offices is its town or village.
    town: str
    #: The district, when the town is the headquarters a district is named
    #: after; otherwise ``None``. The directory has no district column.
    district: Optional[str]
    #: Province or territory.
    province: str


_offices: Optional[List[PostOffice]] = None
_offices_by_code: Optional[Dict[str, PostOffice]] = None


def _post_offices() -> List[PostOffice]:
    global _offices
    if _offices is None:
        _offices = [
            PostOffice(
                code=o["code"],
                office=o["office"],
                town=o["town"],
                district=o.get("district"),
                province=o["province"],
            )
            for o in load("post-offices.json")
        ]
    return _offices


def _post_offices_by_code() -> Dict[str, PostOffice]:
    global _offices_by_code
    if _offices_by_code is None:
        _offices_by_code = {o.code: o for o in _post_offices()}
    return _offices_by_code


def get_post_office(code: str) -> Optional[PostOffice]:
    """Returns the delivery post office for a post code, from Pakistan Post's
    directory of about 2,560 offices.

    Unlike :func:`get_city_by_postal_code`, which only answers for codes in
    the cities pakdatakit lists, this knows every delivery office, including
    those in towns and villages. Whitespace in ``code`` is ignored.

    Returns ``None`` if the code is not in the directory.

    >>> get_post_office("48330")
    PostOffice(code='48330', office='Dulmial', town='Dulmial', district=None, province='Punjab')
    """
    key = _WS_RUN.sub("", trim(code))
    if len(key) == 0:
        return None
    return _post_offices_by_code().get(key)


def search_post_offices(query: str) -> List[PostOffice]:
    """Searches Pakistan Post's directory by office name, town or post code.

    Matching is case-insensitive: an office matches when its name or town
    contains the query, or its code starts with it. Returns the matching post
    offices, sorted by post code.
    """
    key = normalize_key(query)
    if len(key) == 0:
        return []
    code_prefix = trim(query)
    return [
        o
        for o in _post_offices()
        if key in normalize_key(o.office)
        or key in normalize_key(o.town)
        or o.code.startswith(code_prefix)
    ]
