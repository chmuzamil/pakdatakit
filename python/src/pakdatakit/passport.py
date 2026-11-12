"""Pakistani passport number checks."""

from __future__ import annotations

import re

from ._internal.js import trim
from ._internal.normalize import to_ascii_digits

__all__ = ["validate_passport"]

_SEPARATORS = re.compile(r"[-‐‑‒–— ]")
_PASSPORT = re.compile(r"[A-Z]{2}[0-9]{7}\Z")


def validate_passport(passport: str) -> bool:
    """Validates the format of a Pakistani passport number: two letters followed
    by seven digits, e.g. ``AB1234567``. Case, surrounding spaces and spaces or
    dashes between the letters and digits are ignored.

    DGIP does not publish the format, so this checks the common shape only;
    other passport types may differ. See DATA.md in the repository.
    """
    compact = _SEPARATORS.sub("", to_ascii_digits(trim(passport)).upper())
    return _PASSPORT.match(compact) is not None
