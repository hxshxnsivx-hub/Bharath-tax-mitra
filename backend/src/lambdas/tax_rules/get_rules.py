"""
Tax Rules Lambda — GET /tax-rules/{financialYear}

Serves the tax rules JSON from the AWS AppConfig data plane so rule changes
deploy through AppConfig (with validators + rollout strategy) instead of code
deploys. This is the production counterpart of the mock server's
GET /tax-rules/{fy} route and the origin the frontend TaxRulesService fetches.

Task: OPT-A1 | Requirements: 11.1, 11.2, 11.3

Environment variables:
    APPCONFIG_APP_ID      — AppConfig application ID
    APPCONFIG_ENV_ID      — AppConfig environment ID
    APPCONFIG_PROFILE_ID  — TaxRules configuration profile ID

Notes:
    - Uses the appconfigdata API (StartConfigurationSession /
      GetLatestConfiguration). The session token and last configuration are
      cached in module globals so warm invocations don't re-fetch; AppConfig
      returns an EMPTY body when the config is unchanged, which is why the
      last non-empty payload must be retained.
    - AY identifiers are normalised to their FY equivalents, mirroring
      frontend/src/services/taxRulesService.ts.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import boto3

# Financial-year aliases (AY → FY), mirroring the frontend service.
_FY_ALIASES = {
    "AY2025-26": "FY2025-26",
    "AY2026-27": "FY2026-27",
}

# Warm-start caches (per Lambda execution environment).
_appconfig_client = None
_session_token: Optional[str] = None
_cached_rules: Optional[dict] = None


def _client():
    global _appconfig_client  # pylint: disable=global-statement
    if _appconfig_client is None:
        _appconfig_client = boto3.client("appconfigdata")
    return _appconfig_client


def _start_session() -> str:
    response = _client().start_configuration_session(
        ApplicationIdentifier=os.environ["APPCONFIG_APP_ID"],
        EnvironmentIdentifier=os.environ["APPCONFIG_ENV_ID"],
        ConfigurationProfileIdentifier=os.environ["APPCONFIG_PROFILE_ID"],
        # Data-plane minimum poll interval; the frontend caches for 24h anyway.
        RequiredMinimumPollIntervalInSeconds=60,
    )
    return response["InitialConfigurationToken"]


def _load_rules() -> dict:
    """Fetch the latest TaxRules configuration from AppConfig.

    Returns the cached payload when AppConfig reports "unchanged" (empty body).
    Raises on first-call failures — the handler maps that to a 503.
    """
    global _session_token, _cached_rules  # pylint: disable=global-statement

    if _session_token is None:
        _session_token = _start_session()

    try:
        response = _client().get_latest_configuration(ConfigurationToken=_session_token)
    except Exception:
        # Token likely expired (24h) — start a fresh session once and retry.
        _session_token = _start_session()
        response = _client().get_latest_configuration(ConfigurationToken=_session_token)

    # Always advance the token — each token is single-use.
    _session_token = response["NextPollConfigurationToken"]

    content = response["Configuration"].read()
    if content:
        _cached_rules = json.loads(content)
    if _cached_rules is None:
        raise RuntimeError("AppConfig returned no configuration content")
    return _cached_rules


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            # Edge/browser caching is deliberately short — hot-reload target is
            # "refresh within 5 minutes" (Req 11.3).
            "Cache-Control": "public, max-age=300",
        },
        "body": json.dumps(body),
    }


def handler(event: dict, _context: Any) -> dict:
    """API Gateway entry point for GET /tax-rules/{financialYear}."""
    path_params = event.get("pathParameters") or {}
    requested = path_params.get("financialYear", "FY2025-26")
    normalised = _FY_ALIASES.get(requested, requested)

    try:
        rules = _load_rules()
    except Exception as exc:  # pylint: disable=broad-except
        # No config reachable and nothing cached — the frontend falls back to
        # its IndexedDB cache / bundled rules, so a 503 here is non-fatal.
        return _response(503, {"error": f"Tax rules unavailable: {exc}"})

    deployed_fy = rules.get("financialYear")
    if deployed_fy is not None and deployed_fy != normalised:
        return _response(404, {
            "error": f"No tax rules deployed for '{requested}'",
            "deployedFinancialYear": deployed_fy,
        })

    return _response(200, rules)
