"""WhatsApp click-to-chat links."""

from __future__ import annotations

from typing import Optional
from urllib.parse import quote

from ._internal.phone_utils import normalize_phone_digits

__all__ = ["create_whatsapp_link"]

# Characters JavaScript's encodeURIComponent leaves unescaped (besides alphanumerics).
_URI_COMPONENT_SAFE = "-_.!~*'()"


def create_whatsapp_link(phone: str, message: Optional[str] = None) -> Optional[str]:
    """Creates a ``wa.me`` link for a Pakistani mobile number, or ``None`` if invalid."""
    digits = normalize_phone_digits(phone)
    if digits is None:
        return None
    base_url = f"https://wa.me/{digits}"
    if message is None or len(message) == 0:
        return base_url
    return f"{base_url}?text={quote(message, safe=_URI_COMPONENT_SAFE)}"
