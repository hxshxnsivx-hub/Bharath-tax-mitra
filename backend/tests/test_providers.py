"""
Tests for the model-provider seam (Module 5.2).

Covers the parts that are real and offline: PII redaction, the rule-based
fallback's routing, the Anthropic provider's availability/unavailability
behaviour, and the selector's online/offline switch. The live Anthropic call is
not exercised (no key/SDK here) — but everything that decides *whether* it runs
is tested.
"""

import pytest

from src.providers import ChatMessage, ProviderUnavailable, get_provider
from src.providers.anthropic_provider import AnthropicProvider
from src.providers.pii import has_pii, redact_pii
from src.providers.rule_based import RuleBasedProvider


# ── PII redaction (5.2.2) ─────────────────────────────────────────────────────

def test_redacts_all_identifier_types():
    text = "PAN ABCDE1234F Aadhaar 1234 5678 9012 mobile +919876543210 acct 123456789012345"
    out, counts = redact_pii(text)
    assert "[PAN]" in out and "ABCDE1234F" not in out
    assert "[AADHAAR]" in out and "1234 5678 9012" not in out
    assert "[MOBILE]" in out
    assert "[ACCOUNT]" in out
    assert counts.get("pan") == 1
    assert counts.get("aadhaar") == 1
    assert counts.get("mobile") == 1
    assert counts.get("account") == 1


def test_clean_text_is_untouched():
    text = "How do I choose between the old and new regime?"
    out, counts = redact_pii(text)
    assert out == text
    assert counts == {}
    assert has_pii(text) is False


def test_has_pii_true_for_pan():
    assert has_pii("my pan is ABCDE1234F") is True


# ── Rule-based offline provider (5.2.1) ───────────────────────────────────────

@pytest.mark.parametrize(
    "text,expected",
    [
        ("I run a small business with GST", "business"),
        ("I am salaried, filing my job income", "salaried"),
        ("I have capital gains from shares", "investor"),
        ("I pay rent and have a home loan", "property"),
        ("I am a senior citizen with pension", "senior"),
        ("questions about my HUF", "huf"),
        ("I am an NRI abroad", "nri"),
    ],
)
def test_rule_based_routes_to_category(text, expected):
    res = RuleBasedProvider().chat([ChatMessage("user", text)])
    assert res.category == expected
    assert res.offline is True
    assert res.provider == "rule-based"
    assert res.citations  # grounded with at least one section/area


def test_rule_based_fallback_when_no_match():
    res = RuleBasedProvider().chat([ChatMessage("user", "hello there")])
    assert res.category is None
    assert "salaried" in res.content.lower()
    assert res.offline is True


# ── Anthropic provider availability (5.2.1) ───────────────────────────────────

def test_anthropic_unavailable_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    p = AnthropicProvider()
    assert p.available() is False
    with pytest.raises(ProviderUnavailable):
        p.chat([ChatMessage("user", "hi")])


def test_anthropic_available_with_key():
    p = AnthropicProvider(api_key="test-key-not-used")
    assert p.available() is True


def test_anthropic_uses_current_claude_not_bedrock_id():
    p = AnthropicProvider(api_key="x")
    assert "claude" in p.model
    assert "anthropic.claude-3" not in p.model  # not a Bedrock model id


# ── Selector: the online/offline switch (5.2.1) ───────────────────────────────

def test_selector_falls_back_offline_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    p = get_provider()
    assert isinstance(p, RuleBasedProvider)
    assert p.offline is True


def test_selector_prefer_offline_ignores_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "present")
    p = get_provider(prefer_offline=True)
    assert isinstance(p, RuleBasedProvider)


def test_selector_prefers_anthropic_when_key_present(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "present")
    p = get_provider()
    assert isinstance(p, AnthropicProvider)
    assert p.offline is False
