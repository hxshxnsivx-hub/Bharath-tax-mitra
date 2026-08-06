"""
Server-side PII redaction (Module 5.2.2).

Mirrors the intent of frontend `src/utils/pii.ts`: strip taxpayer identifiers
before any text leaves the device for an online model. Redaction runs in front
of every outbound provider call so PAN / Aadhaar / mobile / account numbers are
never sent to a third-party API.

Order matters — longer/more-specific patterns first, each replacing its matches
with a token so later patterns don't re-match the same digits. This is a
best-effort filter (contiguous numbers; space-separated variants may slip),
not a guarantee — treat it as defence-in-depth alongside consent + the offline
rule-based path.
"""

from __future__ import annotations

import re

# PAN: 5 letters, 4 digits, 1 letter.
_PAN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
# Aadhaar: 12 digits, optionally grouped 4-4-4 by space/hyphen.
_AADHAAR = re.compile(r"(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)")
# Indian mobile: optional +91, then 10 digits starting 6-9.
_MOBILE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)")
# Bank account: 9–18 digit run (after the above are tokenised out).
_ACCOUNT = re.compile(r"(?<!\d)\d{9,18}(?!\d)")

# Order matters. Mobile runs BEFORE Aadhaar: a "+91"-prefixed mobile is 12
# digits and would otherwise be misread as a 12-digit Aadhaar. The mobile
# pattern's trailing (?!\d) means it can't match *inside* a bare 12-digit Aadhaar
# run, so plain Aadhaar numbers are still caught by the later Aadhaar step.
_STEPS: list[tuple[str, re.Pattern[str], str]] = [
    ("pan", _PAN, "[PAN]"),
    ("mobile", _MOBILE, "[MOBILE]"),
    ("aadhaar", _AADHAAR, "[AADHAAR]"),
    ("account", _ACCOUNT, "[ACCOUNT]"),
]


def redact_pii(text: str) -> tuple[str, dict[str, int]]:
    """Return (redacted_text, {kind: count}). Never raises on normal input."""
    counts: dict[str, int] = {}
    out = text
    for kind, pattern, token in _STEPS:
        n = 0

        def _sub(_match: re.Match[str]) -> str:
            nonlocal n
            n += 1
            return token

        out = pattern.sub(_sub, out)
        if n:
            counts[kind] = n
    return out, counts


def has_pii(text: str) -> bool:
    _, counts = redact_pii(text)
    return bool(counts)
