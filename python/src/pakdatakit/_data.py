"""Loads the bundled JSON datasets (shared with the npm package)."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

try:  # Python 3.9+
    from importlib.resources import files as _files
except ImportError:  # pragma: no cover
    _files = None  # type: ignore[assignment]


@lru_cache(maxsize=None)
def load(name: str) -> Any:
    """Returns the parsed contents of ``pakdatakit/data/<name>``."""
    text = _files("pakdatakit").joinpath("data").joinpath(name).read_text(encoding="utf-8")
    return json.loads(text)
