"""Free-form Pakistani address parsing and formatting."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, List, Optional, Tuple

from ._data import load
from ._internal.js import WS
from ._internal.normalize import normalize_key, normalize_whitespace
from .geo import get_district_province, get_province
from .postal import get_city_by_postal_code

__all__ = ["ParsedAddress", "parse_address", "format_address"]

_PROVINCES = [
    "Islamabad Capital Territory",
    "Azad Jammu and Kashmir",
    "Gilgit-Baltistan",
    "Khyber Pakhtunkhwa",
    "Balochistan",
    "Punjab",
    "Sindh",
]

# Words that mark a following 5-digit number as something other than a postal code.
_NON_POSTAL_PREFIX = re.compile(
    r"(?:\b(?:p\.?[WS]*o\.?[WS]*box|box|house|h\.?[WS]*no\.?|plot|street|st\.?|flat|shop|office|suite|no\.?)|#)[WS]*\Z".replace(
        "[WS]", "[" + WS + "]"
    ),
    re.IGNORECASE | re.ASCII,
)
_POSTAL_CANDIDATE = re.compile(r"(?<![\w#/-])([1-9][0-9]{4})(?![\w/-])", re.ASCII)

_city_names: Optional[List[str]] = None
_district_names: Optional[List[str]] = None


def _cities_by_length() -> List[str]:
    global _city_names
    if _city_names is None:
        # Longest names first so "Dera Ghazi Khan" wins over "Ghazi".
        _city_names = _stable_length_desc([e["city"] for e in load("cities.json")])
    return _city_names


def _districts_by_length() -> List[str]:
    global _district_names
    if _district_names is None:
        _district_names = _stable_length_desc([e["district"] for e in load("districts.json")])
    return _district_names


def _stable_length_desc(names: List[str]) -> List[str]:
    return sorted(names, key=lambda name: -len(name))


@dataclass(frozen=True)
class ParsedAddress:
    """Parsed components of a Pakistani mailing address."""

    raw: str
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    #: Inconsistencies found while parsing, e.g. a city in a different province.
    warnings: List[str] = field(default_factory=list)


def _find_postal_code(text: str) -> Optional[Tuple[str, int]]:
    result: Optional[Tuple[str, int]] = None
    for match in _POSTAL_CANDIDATE.finditer(text):
        before = text[: match.start()]
        if not _NON_POSTAL_PREFIX.search(before):
            result = (match.group(1), match.start())
    return result


def _match_exact(segment: str, options: List[str]) -> Optional[str]:
    key = normalize_key(segment)
    if len(key) == 0:
        return None
    for option in options:
        if normalize_key(option) == key:
            return option
    return None


def _match_trailing(segment: str, options: List[str]) -> Optional[Tuple[str, str]]:
    key = normalize_key(segment)
    for option in options:
        if key.endswith(" " + normalize_key(option)):
            return option, normalize_whitespace(segment[: len(segment) - len(option)])
    return None


def parse_address(address: str) -> ParsedAddress:
    """Parses a free-form Pakistani address into structured components.

    Extracts the postal code, matches known cities, districts and provinces,
    and assigns the remaining segments to ``street`` and ``area``.
    """
    raw = normalize_whitespace(address)
    if len(raw) == 0:
        return ParsedAddress(raw=raw)

    warnings: List[str] = []
    working = raw
    postal = _find_postal_code(working)
    postal_code = postal[0] if postal else None
    if postal:
        code, index = postal
        working = working[:index] + " " + working[index + len(code) :]

    segments = [part for part in (normalize_whitespace(p) for p in working.split(",")) if part]

    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None

    # Match whole segments first, from the end of the address.
    for i in range(len(segments) - 1, -1, -1):
        segment = segments[i]
        matched_province = _match_exact(segment, _PROVINCES) if province is None else None
        if matched_province:
            province = matched_province
            segments[i] = ""
            continue
        matched_city = _match_exact(segment, _cities_by_length()) if city is None else None
        if matched_city:
            city = matched_city
            segments[i] = ""
            continue
        matched_district = (
            _match_exact(segment, _districts_by_length()) if district is None else None
        )
        if matched_district:
            district = matched_district
            segments[i] = ""

    # Then look for names at the end of a segment ("12 Model Town Lahore").
    for i in range(len(segments) - 1, -1, -1):
        if province is None:
            found = _match_trailing(segments[i], _PROVINCES)
            if found:
                province, segments[i] = found
        if city is None:
            found = _match_trailing(segments[i], _cities_by_length())
            if found:
                city, segments[i] = found

    if city is None and district is not None:
        city = district

    if postal_code is not None and city is None:
        city = get_city_by_postal_code(postal_code)

    if city is not None:
        inferred = get_province(city)
        if inferred is None:
            inferred = get_district_province(city)
    elif district is not None:
        inferred = get_district_province(district)
    else:
        inferred = None

    if province is None:
        province = inferred
    elif inferred is not None and inferred != province:
        place = city if city is not None else district
        warnings.append(f"{place} is in {inferred}, but the address says {province}")

    remaining = [part for part in segments if part]
    street = remaining[0] if remaining else None
    area = ", ".join(remaining[1:]) if len(remaining) > 1 else None

    return ParsedAddress(
        raw=raw,
        street=street,
        area=area,
        city=city,
        district=district,
        province=province,
        postal_code=postal_code,
        warnings=warnings,
    )


def _get(parts: Any, name: str) -> Any:
    if parts is None:
        return None
    if isinstance(parts, dict):
        return parts.get(name)
    return getattr(parts, name, None)


def format_address(
    parts: Any = None,
    *,
    street: Optional[str] = None,
    area: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    province: Optional[str] = None,
    postal_code: Optional[str] = None,
    raw: Optional[str] = None,
    warnings: Any = None,
) -> str:
    """Formats address components into a single mailing line.

    Pass a :class:`ParsedAddress` (or a dict with the same keys), keyword
    arguments, or both (keywords win). Only the components given are included.
    """

    def pick(name: str, value: Any) -> Any:
        return value if value is not None else _get(parts, name)

    street = pick("street", street)
    area = pick("area", area)
    city = pick("city", city)
    district = pick("district", district)
    province = pick("province", province)
    postal_code = pick("postal_code", postal_code)
    raw = pick("raw", raw)

    segments = [
        part
        for part in (street, area, city if city is not None else district, province)
        if isinstance(part, str) and len(part) > 0
    ]
    formatted = ", ".join(segments)
    if postal_code:
        formatted = f"{formatted} {postal_code}" if formatted else postal_code
    if formatted:
        return formatted
    return raw if raw is not None else ""
