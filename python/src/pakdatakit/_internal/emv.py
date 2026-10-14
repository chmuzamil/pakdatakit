"""EMVCo Merchant-Presented QR encoding (mirrors src/internal/emv.ts)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .js import utf8_bytes


@dataclass(frozen=True)
class EmvField:
    """A parsed EMV field. ``children`` is set for template fields."""

    id: str
    value: str
    children: Optional[List["EmvField"]] = None


class EmvSyntaxError(ValueError):
    """Malformed EMV data."""


def is_template_id(field_id: str) -> bool:
    n = int(field_id)
    return 26 <= n <= 51 or n == 62 or n == 64 or 80 <= n <= 99


def crc16(text: str) -> str:
    """CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 uppercase hex digits."""
    crc = 0xFFFF
    for byte in utf8_bytes(text):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return format(crc, "04X")


def encode_field(field_id: str, value: str) -> str:
    """Encodes one field. Length counts characters, as the EMV spec requires."""
    length = len(value)
    if length > 99:
        raise ValueError(f"EMV field {field_id} is longer than 99 characters")
    return f"{field_id}{length:02d}{value}"


def _is_digits(text: str) -> bool:
    return all("0" <= c <= "9" for c in text)


def parse_fields(data: str, nested: bool = True) -> List[EmvField]:
    """Parses EMV fields. Raises ``EmvSyntaxError`` if the data is malformed."""
    chars = data
    fields: List[EmvField] = []
    i = 0
    while i < len(chars):
        header = chars[i : i + 4]
        if len(header) != 4 or not _is_digits(header):
            raise EmvSyntaxError(f"Malformed EMV field at position {i}")
        field_id = header[:2]
        length = int(header[2:])
        if i + 4 + length > len(chars):
            raise EmvSyntaxError(f"EMV field {field_id} is truncated")
        value = chars[i + 4 : i + 4 + length]
        children = parse_fields(value, False) if nested and is_template_id(field_id) else None
        fields.append(EmvField(field_id, value, children))
        i += 4 + length
    return fields


def with_crc(payload: str) -> str:
    """Appends the CRC field (63) to an encoded payload."""
    data = f"{payload}6304"
    return f"{data}{crc16(data)}"
