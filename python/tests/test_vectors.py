"""Checks the Python port against vectors generated from the TypeScript library.

Regenerate the vectors with ``node scripts/generate-test-vectors.mjs`` (after
``npm run build``) from the repository root.
"""

from __future__ import annotations

import dataclasses
import datetime as dt
import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pytest

import pakdatakit

REPO_ROOT = Path(__file__).resolve().parents[2]
VECTORS_DIR = REPO_ROOT / "test-vectors"
DATA_DIR = REPO_ROOT / "data"
PACKAGE_DATA_DIR = Path(pakdatakit.__file__).resolve().parent / "data"

if not DATA_DIR.is_dir():  # e.g. running from an sdist, outside the repository
    pytest.skip("shared data/ and test-vectors/ are only in the repository", allow_module_level=True)

# TypeScript names whose snake_case form is not the mechanical conversion.
NAME_OVERRIDES = {
    "createWhatsAppLink": "create_whatsapp_link",
    "createRaastP2PQr": "create_raast_p2p_qr",
}


def snake(name: str) -> str:
    if name in NAME_OVERRIDES:
        return NAME_OVERRIDES[name]
    name = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    name = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    return name.lower()


def camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


def decode(value: Any) -> Any:
    """Turns the vector encoding of dates and non-finite numbers into Python values."""
    if isinstance(value, list):
        return [decode(v) for v in value]
    if isinstance(value, dict):
        if "$date" in value:
            text = value["$date"]
            if "T" in text:
                return dt.datetime.fromisoformat(text)
            return dt.date.fromisoformat(text)
        if "$num" in value:
            return float(value["$num"])
        return {k: decode(v) for k, v in value.items()}
    return value


def plain(value: Any) -> Any:
    """Converts a Python result into the vector encoding, with camelCase keys."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {camel(f.name): plain(getattr(value, f.name)) for f in dataclasses.fields(value)}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, dt.datetime):
        return {"$date": value.isoformat()}
    if isinstance(value, dt.date):
        return {"$date": value.isoformat()}
    if isinstance(value, float) and not math.isfinite(value):
        return {"$num": "NaN" if math.isnan(value) else ("Infinity" if value > 0 else "-Infinity")}
    return value


def mismatch(actual: Any, expected: Any, path: str = "$") -> str:
    """Returns a description of the first difference, or ``""`` if equal.

    Keys the TypeScript result leaves out (``undefined``) must be ``None`` in Python.
    """
    if isinstance(expected, bool) or isinstance(actual, bool):
        return "" if actual is expected else f"{path}: {actual!r} != {expected!r}"
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        return "" if actual == expected else f"{path}: {actual!r} != {expected!r}"
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return f"{path}: {actual!r} is not an object"
        for key in set(expected) | set(actual):
            if key not in expected:
                if actual[key] is not None:
                    return f"{path}.{key}: unexpected {actual[key]!r}"
            elif key not in actual:
                return f"{path}.{key}: missing"
            else:
                found = mismatch(actual[key], expected[key], f"{path}.{key}")
                if found:
                    return found
        return ""
    if isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            return f"{path}: {actual!r} != {expected!r}"
        for i, (a, e) in enumerate(zip(actual, expected)):
            found = mismatch(a, e, f"{path}[{i}]")
            if found:
                return found
        return ""
    if type(actual) is not type(expected) or actual != expected:
        return f"{path}: {actual!r} != {expected!r}"
    return ""


def load_vectors() -> List[Tuple[str, int, Dict[str, Any]]]:
    cases = []
    for path in sorted(VECTORS_DIR.glob("*.json")):
        for index, vector in enumerate(json.loads(path.read_text(encoding="utf-8"))):
            cases.append((path.stem, index, vector))
    return cases


VECTORS = load_vectors()


def test_vectors_exist() -> None:
    assert len(VECTORS) > 1000, f"no test vectors found in {VECTORS_DIR}"


@pytest.mark.parametrize(
    "module, index, vector",
    VECTORS,
    ids=[f"{module}-{index}-{vector['fn']}" for module, index, vector in VECTORS],
)
def test_vector(module: str, index: int, vector: Dict[str, Any]) -> None:
    if vector.get("constant"):
        assert getattr(pakdatakit, snake(vector["fn"])) == vector["expected"]
        assert pakdatakit.DATA_VERSION == vector["expected"]
        return

    fn = getattr(pakdatakit, snake(vector["fn"]))
    args = decode(vector["args"])
    kwargs = {snake(k): v for k, v in decode(vector["kwargs"]).items()}

    if vector["throws"]:
        with pytest.raises(ValueError):
            fn(*args, **kwargs)
        return

    actual = plain(fn(*args, **kwargs))
    problem = mismatch(actual, vector["expected"])
    assert not problem, f"{vector['fn']}{tuple(vector['args'])} {vector['kwargs']}: {problem}"


@pytest.mark.parametrize("name", sorted(p.name for p in DATA_DIR.glob("*.json")))
def test_package_data_is_identical(name: str) -> None:
    """python/src/pakdatakit/data must be a byte-for-byte copy of data/."""
    assert (PACKAGE_DATA_DIR / name).read_bytes() == (DATA_DIR / name).read_bytes()


def test_no_extra_package_data() -> None:
    shipped = {p.name for p in PACKAGE_DATA_DIR.glob("*.json")}
    assert shipped == {p.name for p in DATA_DIR.glob("*.json")}
