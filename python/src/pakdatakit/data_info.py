"""Where each bundled dataset comes from and which period it covers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Optional

from ._data import load

__all__ = ["DataInfo", "DataSource", "get_data_info", "list_data_info"]


@dataclass(frozen=True)
class DataInfo:
    """Where a dataset comes from and which period it covers: one entry of
    ``data/manifest.json``. See :func:`get_data_info`."""

    #: The dataset's id, e.g. ``income-tax-slabs``.
    id: str
    #: Its file in ``data/``, e.g. ``income-tax-slabs.json``.
    file: str
    title: str
    #: The body that publishes the source, e.g. ``Federal Board of Revenue (FBR)``.
    issuer: str
    #: The official document or page the data is taken from.
    source_url: str
    #: Its number or title: an SRO, circular, notification or table.
    source_reference: str
    #: When the source was issued (YYYY, YYYY-MM or YYYY-MM-DD), or ``None`` if it is undated.
    source_date: Optional[str]
    #: When the source was last downloaded (YYYY-MM-DD).
    retrieved_at: str
    #: When the data was last checked against the source (YYYY-MM-DD).
    checked_at: str
    #: First date the data applies to (YYYY, YYYY-MM or YYYY-MM-DD).
    effective_from: str
    #: Last date it applies to, or ``None`` while it is current.
    effective_to: Optional[str]
    #: What it covers, e.g. ``Tax years 2020-2027``.
    coverage: str
    #: Number of records in the file.
    record_count: int
    #: When the source is next expected to change (YYYY-MM-DD).
    next_expected_update: str
    #: What triggers an update, e.g. ``After the Finance Act each July``.
    update_cadence: str
    notes: str


@dataclass(frozen=True)
class DataSource:
    """The source of the dated record a result was calculated from: which
    dataset, the period that record applies to, and the law or notification
    behind it."""

    #: The dataset's id, as in :func:`get_data_info`.
    id: str
    #: First date the record applies to (YYYY-MM-DD).
    effective_from: str
    #: Last date it applies to, or ``None`` while it is current.
    effective_to: Optional[str]
    #: The law, SRO, circular or notification, as written in the source.
    source_reference: str
    #: The official document.
    source_url: str


def _info(raw: Any) -> DataInfo:
    # The manifest's ``series`` key (the CI check's configuration) is left out.
    return DataInfo(
        id=raw["id"],
        file=raw["file"],
        title=raw["title"],
        issuer=raw["issuer"],
        source_url=raw["sourceUrl"],
        source_reference=raw["sourceReference"],
        source_date=raw["sourceDate"],
        retrieved_at=raw["retrievedAt"],
        checked_at=raw["checkedAt"],
        effective_from=raw["effectiveFrom"],
        effective_to=raw["effectiveTo"],
        coverage=raw["coverage"],
        record_count=raw["recordCount"],
        next_expected_update=raw["nextExpectedUpdate"],
        update_cadence=raw["updateCadence"],
        notes=raw["notes"],
    )


def get_data_info(id: Any = None) -> Optional[DataInfo]:  # noqa: A002 - mirrors the npm API
    """Where a bundled dataset comes from: the issuer, the official source and
    its reference and date, when it was checked, the period it covers, its
    record count and when it is next expected to change.

    ``id`` is a dataset id such as ``banks``, ``income-tax-slabs`` or
    ``sales-tax-rates`` (see :func:`list_data_info`); it must match exactly.
    Returns the manifest entry, or ``None`` for an unknown id or a value that
    is not a string. Never raises.

    >>> get_data_info("income-tax-slabs").coverage
    'Tax years 2020-2027'
    >>> get_data_info("income-tax-slabs").next_expected_update
    '2027-07-15'
    """
    if not isinstance(id, str):
        return None
    for raw in load("manifest.json"):
        if raw["id"] == id:
            return _info(raw)
    return None


def list_data_info() -> List[DataInfo]:
    """Every bundled dataset's manifest entry, as :func:`get_data_info` returns
    them, sorted by id.

    >>> [d.id for d in list_data_info()][:2]
    ['area-codes', 'banks']
    """
    return sorted((_info(raw) for raw in load("manifest.json")), key=lambda d: d.id)
