"""
Unit tests for the tax-rules Lambda (GET /tax-rules/{financialYear}).

Task: OPT-A1 | Requirements: 11.1, 11.2, 11.3

The AppConfig data plane is faked with a stub client — these tests verify the
handler's session/caching/fallback behaviour, not boto3 itself.
"""

import io
import json
import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "lambdas", "tax_rules"))

import get_rules  # noqa: E402  (path inserted above)


RULES_FY2025 = {
    "version": "2.0.0",
    "financialYear": "FY2025-26",
    "newRegime": {"slabs": [{"min": 0, "max": 300000, "rate": 0}]},
    "oldRegime": {"slabs": [{"min": 0, "max": 250000, "rate": 0}]},
}


class FakeAppConfigClient:
    """Stub for boto3 appconfigdata client."""

    def __init__(self, payloads):
        # payloads: list of byte-strings returned by successive
        # get_latest_configuration calls (b"" = "unchanged")
        self._payloads = list(payloads)
        self.sessions_started = 0

    def start_configuration_session(self, **_kwargs):
        self.sessions_started += 1
        return {"InitialConfigurationToken": f"token-{self.sessions_started}-0"}

    def get_latest_configuration(self, ConfigurationToken):
        if not self._payloads:
            raise RuntimeError("no more payloads")
        content = self._payloads.pop(0)
        return {
            "NextPollConfigurationToken": ConfigurationToken + "-next",
            "Configuration": io.BytesIO(content),
        }


@pytest.fixture(autouse=True)
def _reset_module_state(monkeypatch):
    """Each test starts with a cold Lambda (no cached session/rules)."""
    monkeypatch.setattr(get_rules, "_session_token", None)
    monkeypatch.setattr(get_rules, "_cached_rules", None)
    monkeypatch.setenv("APPCONFIG_APP_ID", "app-123")
    monkeypatch.setenv("APPCONFIG_ENV_ID", "env-123")
    monkeypatch.setenv("APPCONFIG_PROFILE_ID", "prof-123")
    yield


def _install_client(monkeypatch, payloads):
    fake = FakeAppConfigClient(payloads)
    monkeypatch.setattr(get_rules, "_client", lambda: fake)
    return fake


def test_returns_deployed_rules(monkeypatch):
    _install_client(monkeypatch, [json.dumps(RULES_FY2025).encode()])

    resp = get_rules.handler({"pathParameters": {"financialYear": "FY2025-26"}}, None)

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["version"] == "2.0.0"
    assert body["financialYear"] == "FY2025-26"
    # Hot-reload freshness target (Req 11.3): short edge cache only
    assert "max-age=300" in resp["headers"]["Cache-Control"]


def test_ay_alias_normalised_to_fy(monkeypatch):
    _install_client(monkeypatch, [json.dumps(RULES_FY2025).encode()])

    resp = get_rules.handler({"pathParameters": {"financialYear": "AY2025-26"}}, None)

    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["financialYear"] == "FY2025-26"


def test_unchanged_config_served_from_warm_cache(monkeypatch):
    # First call returns content; second returns b"" (AppConfig "unchanged")
    _install_client(monkeypatch, [json.dumps(RULES_FY2025).encode(), b""])

    first = get_rules.handler({"pathParameters": {"financialYear": "FY2025-26"}}, None)
    second = get_rules.handler({"pathParameters": {"financialYear": "FY2025-26"}}, None)

    assert first["statusCode"] == 200
    assert second["statusCode"] == 200
    assert json.loads(second["body"])["version"] == "2.0.0"


def test_mismatched_year_returns_404(monkeypatch):
    _install_client(monkeypatch, [json.dumps(RULES_FY2025).encode()])

    resp = get_rules.handler({"pathParameters": {"financialYear": "FY2030-31"}}, None)

    assert resp["statusCode"] == 404
    assert json.loads(resp["body"])["deployedFinancialYear"] == "FY2025-26"


def test_appconfig_unreachable_returns_503(monkeypatch):
    class BrokenClient:
        def start_configuration_session(self, **_kwargs):
            raise RuntimeError("appconfig down")

    monkeypatch.setattr(get_rules, "_client", lambda: BrokenClient())

    resp = get_rules.handler({"pathParameters": {"financialYear": "FY2025-26"}}, None)

    assert resp["statusCode"] == 503
    assert "unavailable" in json.loads(resp["body"])["error"]


def test_expired_token_triggers_session_restart(monkeypatch):
    """First get_latest_configuration raises (expired token) → new session, retry."""
    fake = FakeAppConfigClient([json.dumps(RULES_FY2025).encode()])
    calls = {"n": 0}

    original_get = fake.get_latest_configuration

    def flaky_get(ConfigurationToken):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("BadRequestException: token expired")
        return original_get(ConfigurationToken)

    fake.get_latest_configuration = flaky_get
    monkeypatch.setattr(get_rules, "_client", lambda: fake)

    resp = get_rules.handler({"pathParameters": {"financialYear": "FY2025-26"}}, None)

    assert resp["statusCode"] == 200
    assert fake.sessions_started == 2  # original + restarted session
