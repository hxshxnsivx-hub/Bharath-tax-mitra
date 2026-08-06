"""Provider interface + shared types (Module 5.2.1)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ChatMessage:
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class ProviderResponse:
    content: str
    provider: str
    offline: bool
    category: str | None = None          # routed taxpayer category, if detected
    citations: list[str] = field(default_factory=list)
    meta: dict = field(default_factory=dict)


class ProviderUnavailable(RuntimeError):
    """Raised when a provider is selected but cannot serve (no key, no SDK, offline)."""


class ModelProvider(ABC):
    """A pluggable chat backend. Implementations must keep the taxpayer's numbers
    on the deterministic engine — a provider proposes/explains, it never computes
    tax itself (LLM-modulo)."""

    name: str = "abstract"
    offline: bool = False

    def available(self) -> bool:
        """Whether this provider can serve right now (key present, deps installed)."""
        return True

    @abstractmethod
    def chat(self, messages: list[ChatMessage]) -> ProviderResponse:
        """Answer the conversation. Raise ProviderUnavailable if it cannot."""
        raise NotImplementedError
