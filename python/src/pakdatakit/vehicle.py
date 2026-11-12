"""Pakistani vehicle registration number checks."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ._internal.js import trim
from ._internal.normalize import to_ascii_digits

__all__ = ["VehiclePlate", "parse_vehicle_plate", "validate_vehicle_plate"]

_PLATE = re.compile(r"([A-Z]{1,4})[-‐‑‒–— ]?([0-9]{1,4})(?:[-‐‑‒–— /]{1,3}([0-9]{2}))?\Z")


@dataclass(frozen=True)
class VehiclePlate:
    """Result of :func:`parse_vehicle_plate`."""

    #: Letters before the number, e.g. ``LEA``.
    series: str
    #: Digits of the registration number, e.g. ``1234``.
    number: str
    #: Two-digit year printed on some older Punjab plates, e.g. ``19``; otherwise ``None``.
    year: Optional[str]
    #: Series and number joined with a dash, e.g. ``LEA-1234`` (without the year).
    formatted: str


def parse_vehicle_plate(plate: str) -> Optional[VehiclePlate]:
    """Splits a vehicle registration number into its series letters, number and
    optional year, e.g. ``LEA-1234`` or ``ABC 123``.

    There is no single national format, so this accepts the common shape: 1-4
    letters, then 1-4 digits, optionally followed by a two-digit year after a
    separator (``LEA-1234-19``). Series letters are not checked. Returns
    ``None`` if the plate does not have that shape. See DATA.md in the repository.
    """
    match = _PLATE.match(to_ascii_digits(trim(plate)).upper())
    if not match:
        return None
    series, number, year = match.group(1), match.group(2), match.group(3)
    return VehiclePlate(series=series, number=number, year=year, formatted=f"{series}-{number}")


def validate_vehicle_plate(plate: str) -> bool:
    """Validates the format of a vehicle registration number. See :func:`parse_vehicle_plate`."""
    return parse_vehicle_plate(plate) is not None
