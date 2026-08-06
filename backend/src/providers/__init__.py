"""Model-provider layer (Bharat Tax Mitra 2.0, Module 5.2).

The "online now, offline later" seam: one interface, swappable implementations.
`get_provider()` picks the Anthropic API when configured, else the offline
rule-based fallback — so wiring the live AI later is a config change, not a
rewrite.
"""

from .base import ChatMessage, ModelProvider, ProviderResponse, ProviderUnavailable
from .selector import get_provider

__all__ = [
    "ChatMessage",
    "ModelProvider",
    "ProviderResponse",
    "ProviderUnavailable",
    "get_provider",
]
