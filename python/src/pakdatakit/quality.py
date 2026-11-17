"""Address completeness scores and phone number risk signals for deliveries."""

from __future__ import annotations

import dataclasses
import re
from dataclasses import dataclass
from types import MappingProxyType
from typing import List, Literal, Mapping, Sequence

from ._internal.normalize import normalize_whitespace, to_ascii_digits
from .address import ParsedAddress, parse_address
from .numbers import analyze_number
from .postal import get_post_office

__all__ = [
    "AddressPart",
    "AddressScore",
    "ADDRESS_WEIGHTS",
    "score_address",
    "PhoneRiskFlag",
    "phone_risk_signals",
]

#: A part of a delivery address that :func:`score_address` looks for.
AddressPart = Literal["city", "houseNumber", "street", "area", "postalCode", "landmark"]

#: Points for each part of an address. They add up to 100. A postal code
#: scores in full only when it is a known post office code; an unknown one
#: scores 5. Keys are the camelCase part names used in ``AddressScore.missing``.
ADDRESS_WEIGHTS: Mapping[str, int] = MappingProxyType(
    {
        "city": 30,
        "houseNumber": 20,
        "street": 15,
        "area": 10,
        "postalCode": 15,
        "landmark": 10,
    }
)

_UNKNOWN_POSTAL_CODE_POINTS = 5
# Taken off when the post office and the city are in different provinces.
_MISMATCH_PENALTY = 15

# Words that introduce a landmark, in English and Roman Urdu.
_LANDMARK_WORDS = (
    "near",
    "nr",
    "opposite",
    "opp",
    "behind",
    "beside",
    "besides",
    "adjacent",
    "next to",
    "in front of",
    "facing",
    "nazd",
    "nazdeek",
    "nazdik",
    "qareeb",
    "qarib",
    "kareeb",
    "samne",
    "saamne",
    "samnay",
    "peeche",
    "peechay",
    "pichay",
    "bil muqabil",
    "bilmuqabil",
    "muttasil",
    "mutasil",
)

# The same, in Urdu script.
_URDU_LANDMARK_WORDS = ("نزد", "نزدیک", "قریب", "سامنے", "پیچھے", "بالمقابل", "متصل")

# Words that name a street or lane.
_STREET_WORDS = (
    "street",
    "st",
    "road",
    "rd",
    "lane",
    "gali",
    "avenue",
    "ave",
    "boulevard",
    "blvd",
    "chowk",
    "bazar",
    "bazaar",
    "mohalla",
    "muhalla",
)

_URDU_STREET_WORDS = ("گلی", "سڑک", "روڈ", "محلہ", "چوک", "بازار")

# Words that name an area within a city.
_AREA_WORDS = (
    "block",
    "sector",
    "phase",
    "town",
    "colony",
    "society",
    "scheme",
    "housing",
    "garden",
    "gardens",
    "park",
    "estate",
    "abad",
    "nagar",
    "cantt",
    "cantonment",
)

_URDU_AREA_WORDS = ("بلاک", "سیکٹر", "فیز", "ٹاؤن", "کالونی", "سوسائٹی")

_NON_WORD = re.compile("[^a-z0-9؀-ۿ]+")
# A number other than the postal code: house, plot, flat or street number
# ("12", "12b", "4th"). ASCII digits and letters only, like the JavaScript regex.
_HOUSE_NUMBER = re.compile(" [0-9]+[a-z]{0,2} ")


@dataclass(frozen=True)
class AddressScore:
    """Result of :func:`score_address`."""

    #: 0 (unusable) to 100 (every part present and consistent).
    score: int
    #: Parts not found, in the order of :data:`ADDRESS_WEIGHTS`.
    missing: List[str]
    #: The address as :func:`parse_address` reads it, with any extra warnings.
    parsed: ParsedAddress


def _words(text: str) -> str:
    """Lower-cases, folds Urdu digits and collapses everything but letters and digits to single spaces."""
    return " " + _NON_WORD.sub(" ", to_ascii_digits(text).lower()).strip(" ") + " "


def _has_word(haystack: str, words: Sequence[str]) -> bool:
    return any(f" {word} " in haystack for word in words)


def _has_urdu(text: str, words: Sequence[str]) -> bool:
    return any(word in text for word in words)


def score_address(address: str) -> AddressScore:
    """Scores how complete a free-form Pakistani delivery address is, for cash
    on delivery and other courier use.

    Built on :func:`parse_address`. It looks for a city, a house, plot or flat
    number, a street, an area, a postal code and a landmark ("near", "opp",
    "nazd", "qareeb", "سامنے" ...), and adds up :data:`ADDRESS_WEIGHTS`. A
    postal code that is a known post office raises the score more than an
    unknown one, and a post office in a different province from the city
    lowers it (with a warning in ``parsed.warnings``).

    This is a heuristic: it says how much an address tells a rider, not
    whether the address exists. It never raises.

    >>> score_address("House 12, Street 4, Block B, Gulberg III, near Liberty Market, Lahore 54660").score
    100
    """
    text = normalize_whitespace(address) if isinstance(address, str) else ""
    parsed = parse_address(text)
    found = set()
    lowered = _words(text)
    postal = parsed.postal_code
    # The text without the postal code, for the house-number check.
    rest = lowered if postal is None else lowered.replace(f" {postal} ", " ", 1)

    if parsed.city is not None:
        found.add("city")
    if _HOUSE_NUMBER.search(rest):
        found.add("houseNumber")
    if _has_word(lowered, _STREET_WORDS) or _has_urdu(text, _URDU_STREET_WORDS):
        found.add("street")
    if (
        parsed.area is not None
        or _has_word(lowered, _AREA_WORDS)
        or _has_urdu(text, _URDU_AREA_WORDS)
    ):
        found.add("area")
    if _has_word(lowered, _LANDMARK_WORDS) or _has_urdu(text, _URDU_LANDMARK_WORDS):
        found.add("landmark")

    score = sum(ADDRESS_WEIGHTS[part] for part in found)
    warnings = list(parsed.warnings)

    if postal is not None:
        office = get_post_office(postal)
        if office is None:
            score += _UNKNOWN_POSTAL_CODE_POINTS
        else:
            found.add("postalCode")
            score += ADDRESS_WEIGHTS["postalCode"]
            if parsed.province is not None and office.province != parsed.province:
                score -= _MISMATCH_PENALTY
                warnings.append(
                    f"Postal code {postal} is in {office.province}, "
                    f"but the address is in {parsed.province}"
                )

    missing = [part for part in ADDRESS_WEIGHTS if part not in found]
    return AddressScore(
        score=max(0, min(100, score)),
        missing=missing,
        parsed=dataclasses.replace(parsed, warnings=warnings),
    )


#: A reason to double-check a phone number given for a delivery.
PhoneRiskFlag = Literal[
    "invalid",
    "landline",
    "not-mobile",
    "repeated-digits",
    "sequential-digits",
    "test-number",
]

_ASCENDING = "01234567890"
_DESCENDING = "09876543210"


def phone_risk_signals(phone: str) -> List[str]:
    """Flags a phone number that a courier cannot reach by SMS or call, or
    that looks made up. Pure heuristics on the number itself: no list of real
    numbers, no personal data, no network call.

    - ``invalid``: not a Pakistani phone number.
    - ``landline``: a fixed-line number (no SMS, often unanswered).
    - ``not-mobile``: a UAN, toll-free or other service number.
    - ``repeated-digits``: the 7-digit subscriber part uses at most two
      different digits (``0300-0000000``, ``0300-1111112``).
    - ``sequential-digits``: the subscriber part is a run such as ``1234567``
      or ``7654321``.
    - ``test-number``: a placeholder often typed into forms
      (``03XX-1234567``, ``03XX-7654321``, ``0312-3456789``).

    A valid mobile number with nothing suspicious returns ``[]``. It never
    raises.

    >>> phone_risk_signals("03001234567")
    ['sequential-digits', 'test-number']
    """
    info = analyze_number(phone) if isinstance(phone, str) else None
    if info is None:
        return ["invalid"]
    if info.type == "landline":
        return ["landline"]
    if info.type != "mobile" or info.e164 is None:
        return ["not-mobile"]

    national = info.e164[3:]  # 3XXXXXXXXX
    subscriber = national[3:]
    flags: List[str] = []
    if len(set(subscriber)) <= 2:
        flags.append("repeated-digits")
    if subscriber in _ASCENDING or subscriber in _DESCENDING:
        flags.append("sequential-digits")
    if subscriber in ("1234567", "7654321") or national == "3123456789":
        flags.append("test-number")
    return flags
