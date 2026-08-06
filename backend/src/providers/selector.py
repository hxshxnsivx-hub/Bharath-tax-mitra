"""
Provider selector (Module 5.2.1) — the "online now, offline later" switch.

Prefers the Anthropic API when configured, else the offline rule-based fallback.
This is the single place the app's AI dependency is resolved, so migrating from
online to on-device later (a WebLLM provider, say) is a change here only.
"""

from __future__ import annotations

from .anthropic_provider import AnthropicProvider
from .base import ModelProvider
from .rule_based import RuleBasedProvider


def get_provider(prefer_offline: bool = False) -> ModelProvider:
    """
    Return the best available provider.

    - prefer_offline=True  → always the deterministic offline responder.
    - otherwise             → Anthropic if it has a key, else the offline fallback.
    """
    if not prefer_offline:
        anthropic = AnthropicProvider()
        if anthropic.available():
            return anthropic
    return RuleBasedProvider()
