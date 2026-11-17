"""Helpers for orders shipped with Pakistani couriers: status mapping and city names.

There are no API clients: nothing is sent anywhere.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any, Dict, Literal, Optional

from ._data import load
from ._internal.js import is_integer, trim
from ._internal.normalize import normalize_key

__all__ = [
    "Courier",
    "CourierStatus",
    "map_courier_status",
    "normalize_city_for_courier",
]

#: Couriers that :func:`map_courier_status` knows about.
Courier = Literal["TCS", "Leopards", "PostEx", "M&P", "Trax", "BlueEx"]

#: A courier's status in one vocabulary, from order to delivery or return.
CourierStatus = Literal[
    "pending",
    "booked",
    "picked-up",
    "in-transit",
    "out-for-delivery",
    "attempted",
    "under-review",
    "delivered",
    "returning",
    "returned",
    "cancelled",
]

# Status values each courier documents publicly, by normalised key (lower
# case, single spaces, straight apostrophes). Only documented values are
# listed (see DATA.md); anything else maps to ``None``.
#
# - PostEx: "Merchant API Integration Guide" M- v4.1.9, order status IDs
#   (§3.15) and tracking history codes (§3.8).
# - Leopards: "Returned to Shipper", from its e-commerce FAQ.
# - TCS, M&P, Trax and BlueEx publish no status list outside their merchant
#   portals, so nothing is mapped for them.
_STATUSES: Dict[str, Dict[str, str]] = {
    "PostEx": {
        # Order status IDs and names (§3.15).
        "1": "pending",
        "unbooked": "pending",
        "2": "booked",
        "booked": "booked",
        "3": "in-transit",
        "postex warehouse": "in-transit",
        "4": "out-for-delivery",
        "out for delivery": "out-for-delivery",
        "5": "delivered",
        "delivered": "delivered",
        "6": "returned",
        "returned": "returned",
        "7": "cancelled",
        "un-assigned by me": "cancelled",
        "8": "cancelled",
        "expired": "cancelled",
        "9": "under-review",
        "delivery under review": "under-review",
        "15": "picked-up",
        "picked by postex": "picked-up",
        "16": "returning",
        "out for return": "returning",
        "17": "attempted",
        "attempted": "attempted",
        "18": "in-transit",
        "en-route to postex warehouse": "in-transit",
        # Tracking history codes and messages (§3.8).
        "0001": "booked",
        "at merchant's warehouse": "booked",
        "0002": "returned",
        "0003": "in-transit",
        "at postex warehouse": "in-transit",
        "0004": "in-transit",
        "package on root": "in-transit",
        "package on route": "in-transit",
        "0005": "delivered",
        "0006": "returned",
        "0007": "returned",
        "0008": "under-review",
        "0013": "attempted",
    },
    "Leopards": {
        "returned to shipper": "returned",
    },
    "TCS": {},
    "M&P": {},
    "Trax": {},
    "BlueEx": {},
}

# Accepted spellings of each courier's name.
_COURIER_NAMES: Dict[str, str] = {
    "tcs": "TCS",
    "leopards": "Leopards",
    "leopards courier": "Leopards",
    "lcs": "Leopards",
    "postex": "PostEx",
    "m&p": "M&P",
    "mnp": "M&P",
    "m and p": "M&P",
    "muller & phipps": "M&P",
    "muller and phipps": "M&P",
    "trax": "Trax",
    "blueex": "BlueEx",
    "blue ex": "BlueEx",
    "blue-ex": "BlueEx",
}

_CURLY_APOSTROPHES = re.compile("[‘’`]")
# JavaScript ``/^attempt made\b/``: ``\b`` is an ASCII word boundary.
_ATTEMPT_MADE = re.compile(r"attempt made\b", re.ASCII)


def _status_key(text: str) -> str:
    return normalize_key(_CURLY_APOSTROPHES.sub("'", text))


def map_courier_status(courier: str, raw: Any) -> Optional[CourierStatus]:
    """Maps a courier's own status (its name, numeric ID or code, as the
    courier documents it) to a :data:`CourierStatus`.

    Matching ignores case and extra spaces. PostEx's "Attempt Made: <reason>"
    history messages map to ``attempted``. ``raw`` is a string or a
    non-negative integer (``5`` and ``5.0`` are the same as ``"5"``).

    Only statuses the courier documents publicly are mapped: PostEx's API
    guide and one Leopards status. TCS, M&P, Trax and BlueEx publish no list,
    so they always return ``None``, as does any status not in the list. No API
    is called.

    ``courier`` is ``TCS``, ``Leopards``, ``PostEx``, ``M&P``, ``Trax`` or
    ``BlueEx`` (case-insensitive; ``LCS``, ``MnP`` and ``Blue Ex`` are
    accepted). Returns the status, or ``None``. Never raises.
    """
    if not isinstance(courier, str):
        return None
    name = _COURIER_NAMES.get(_status_key(courier))
    if name is None:
        return None
    if isinstance(raw, str):
        key = _status_key(raw)
    elif is_integer(raw):  # bools are not numbers
        if raw < 0:
            return None
        key = str(int(raw))
    else:
        return None
    status = _STATUSES[name].get(key)
    if status is not None:
        return status  # type: ignore[return-value]
    if name == "PostEx" and _ATTEMPT_MADE.match(key):
        return "attempted"
    return None


# Short forms and old names of cities, as people and courier forms write
# them: airport and dialling-style codes, Roman Urdu spellings, the former
# name Lyallpur, and Urdu script.
_CITY_ALIASES: Dict[str, str] = {
    "lhr": "Lahore",
    "lhe": "Lahore",
    "lahor": "Lahore",
    "لاہور": "Lahore",
    "khi": "Karachi",
    "krachi": "Karachi",
    "کراچی": "Karachi",
    "pindi": "Rawalpindi",
    "rwp": "Rawalpindi",
    "rawal pindi": "Rawalpindi",
    "راولپنڈی": "Rawalpindi",
    "isb": "Islamabad",
    "isl": "Islamabad",
    "اسلام آباد": "Islamabad",
    "lyallpur": "Faisalabad",
    "lyp": "Faisalabad",
    "fsd": "Faisalabad",
    "faisal abad": "Faisalabad",
    "فیصل آباد": "Faisalabad",
    "mux": "Multan",
    "mtn": "Multan",
    "ملتان": "Multan",
    "pew": "Peshawar",
    "psh": "Peshawar",
    "پشاور": "Peshawar",
    "uet": "Quetta",
    "qta": "Quetta",
    "کوئٹہ": "Quetta",
    "hyd": "Hyderabad",
    "حیدرآباد": "Hyderabad",
    "حیدر آباد": "Hyderabad",
    "skt": "Sialkot",
    "سیالکوٹ": "Sialkot",
    "grw": "Gujranwala",
    "گوجرانوالہ": "Gujranwala",
    "dgk": "Dera Ghazi Khan",
    "dg khan": "Dera Ghazi Khan",
    "d g khan": "Dera Ghazi Khan",
    "dik": "Dera Ismail Khan",
    "di khan": "Dera Ismail Khan",
    "d i khan": "Dera Ismail Khan",
    "ryk": "Rahim Yar Khan",
    "bwp": "Bahawalpur",
    "sgd": "Sargodha",
    "mzd": "Muzaffarabad",
}

_DOTS_AND_COMMAS = re.compile("[.,]")


@lru_cache(maxsize=None)
def _city_by_key() -> Dict[str, str]:
    return {normalize_key(entry["city"]): entry["city"] for entry in load("cities.json")}


def _city_key(text: str) -> str:
    """Lower case, with dots and commas removed and spaces collapsed."""
    return normalize_key(_DOTS_AND_COMMAS.sub(" ", text))


def normalize_city_for_courier(input: str) -> Optional[str]:
    """Maps the way a customer or a courier writes a city to the city's name in
    pakdatakit's city list, so orders can be matched against a courier's
    service list.

    Accepts the exact name in any case, short forms (``LHR``, ``Khi``,
    ``Pindi``, ``Isb``, ``FSD``), the old name Lyallpur, a trailing "city", and
    the main cities in Urdu script.

    >>> normalize_city_for_courier("LHR")
    'Lahore'
    >>> normalize_city_for_courier("Karachi City")
    'Karachi'
    >>> normalize_city_for_courier("Atlantis") is None
    True

    Returns a city from the city list, or ``None``. Never raises.
    """
    if not isinstance(input, str):
        return None
    key = _city_key(input)
    if not key:
        return None
    for _ in range(2):
        city = _city_by_key().get(key)
        if city is None:
            city = _CITY_ALIASES.get(key)
        if city is not None:
            return city
        if not key.endswith(" city"):
            break
        key = trim(key[: -len(" city")])
    return None
