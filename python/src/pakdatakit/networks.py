"""Mobile network detection from the ``03XX`` prefix."""

from __future__ import annotations

from typing import Dict, Optional

from ._data import load
from ._internal.phone_utils import get_phone_prefix

__all__ = ["get_network"]

_prefix_map: Optional[Dict[str, str]] = None


def _prefixes() -> Dict[str, str]:
    global _prefix_map
    if _prefix_map is None:
        _prefix_map = {entry["prefix"]: entry["network"] for entry in load("networks.json")}
    return _prefix_map


def get_network(phone: str) -> str:
    """Returns the network a number's prefix was originally allocated to.

    One of ``"Jazz"``, ``"Zong"``, ``"Telenor"``, ``"Ufone"``, ``"SCO"`` or
    ``"Unknown"``. Because of number portability the current carrier may differ.
    """
    prefix = get_phone_prefix(phone)
    if prefix is None:
        return "Unknown"
    return _prefixes().get(prefix, "Unknown")
