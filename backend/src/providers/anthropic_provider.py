"""
Anthropic API provider (Module 5.2.1) — the online path.

Replaces the base project's Bedrock intent with the Anthropic API *directly*
(no AWS). It activates only when `ANTHROPIC_API_KEY` is set AND the `anthropic`
SDK is installed; otherwise it reports itself unavailable so the selector falls
back to the offline rule-based provider. Every outbound message is PII-redacted
first (Module 5.2.2) — the key and the redaction both stay server-side.

The live `messages.create` call is written to the real SDK shape but not
exercised in this environment (no key/SDK). The `available()` / unavailable
behaviour and the redaction pipeline ARE covered by tests.
"""

from __future__ import annotations

import os

from .base import ChatMessage, ModelProvider, ProviderResponse, ProviderUnavailable
from .pii import redact_pii

# Chosen at build time; default to a current Claude generation, not a Bedrock id.
DEFAULT_MODEL = "claude-sonnet-5"

_SYSTEM_PROMPT = (
    "You are Bharat Tax Mitra, a legal Indian tax-planning assistant. You NEVER "
    "compute tax yourself — you call the deterministic engine tools for every "
    "number and cite the section for every claim. You help with legal tax "
    "planning only; you refuse evasion and flag GAAR-exposed structures for a "
    "human CA."
)


class AnthropicProvider(ModelProvider):
    name = "anthropic"
    offline = False

    def __init__(self, model: str = DEFAULT_MODEL, api_key: str | None = None, max_tokens: int = 1024):
        self.model = model
        self.api_key = api_key if api_key is not None else os.environ.get("ANTHROPIC_API_KEY")
        self.max_tokens = max_tokens

    def available(self) -> bool:
        return bool(self.api_key)

    def chat(self, messages: list[ChatMessage]) -> ProviderResponse:
        if not self.api_key:
            raise ProviderUnavailable("ANTHROPIC_API_KEY not set")

        try:
            import anthropic  # lazy import — not a hard dependency of the package
        except ImportError as exc:  # pragma: no cover - depends on env
            raise ProviderUnavailable("anthropic SDK not installed") from exc

        # PII redaction BEFORE anything leaves the process.
        redacted = [
            {"role": m.role, "content": redact_pii(m.content)[0]}
            for m in messages
            if m.role in ("user", "assistant")
        ]

        client = anthropic.Anthropic(api_key=self.api_key)  # pragma: no cover
        resp = client.messages.create(  # pragma: no cover
            model=self.model,
            max_tokens=self.max_tokens,
            system=_SYSTEM_PROMPT,
            messages=redacted,
        )
        text = resp.content[0].text if resp.content else ""  # pragma: no cover
        return ProviderResponse(  # pragma: no cover
            content=text,
            provider=self.name,
            offline=False,
            meta={"model": self.model},
        )
