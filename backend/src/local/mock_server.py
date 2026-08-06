"""
mock_server.py — FastAPI local development mock server

Simulates all backend API endpoints without real AWS services.
Designed to unblock frontend development before DLT registration
and CDK infrastructure deployment.

Usage:
    cd backend
    pip install fastapi uvicorn
    uvicorn src.local.mock_server:app --reload --port 3001

Environment:
    SMS_MODE=mock (default) — logs OTP to console instead of calling SNS
    MOCK_JWT_SECRET — JWT secret for test tokens (default: 'mock-dev-secret')

Design reference: design.md — Gap 5 (BLOCKER-3 / Mock server for local dev)
"""

import json
import os
import sys
import time
import sqlite3
import hashlib
import random
from typing import Any, Optional
from contextlib import contextmanager

# Delegate tax math to the REAL engine (OPT-A2 single source of truth) instead
# of a divergent mock. calculate.py mirrors taxCalculator.ts exactly, both
# pinned by shared/golden-vectors.json.
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "lambdas", "tax_calculation")
)
from calculate import compare_regimes  # noqa: E402

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Bharat Tax Mitra — Local Mock Server",
    description="Mocks all backend APIs for frontend development",
    version="1.0.0",
)

# Allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_JWT_SECRET = os.environ.get("MOCK_JWT_SECRET", "mock-dev-secret")
DB_PATH = os.path.join(os.path.dirname(__file__), "mock_db.sqlite")

# ---------------------------------------------------------------------------
# SQLite helpers
# ---------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS otps (
            mobile TEXT PRIMARY KEY,
            otp    TEXT NOT NULL,
            expiry INTEGER NOT NULL,
            attempts INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            mobile  TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            fy         TEXT NOT NULL,
            status     TEXT DEFAULT 'draft',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()


init_db()

# ---------------------------------------------------------------------------
# JWT helpers (minimal, not production-safe)
# ---------------------------------------------------------------------------

def _make_token(payload: dict, expiry_seconds: int = 86400) -> str:
    """
    Minimal token: base64(header).base64(payload).signature
    Uses hashlib-based HMAC for simplicity — NOT production safe.
    """
    import base64
    import hmac

    header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').rstrip(b'=').decode()
    payload["exp"] = int(time.time()) + expiry_seconds
    payload_b64 = (
        base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
    )
    signing_input = f"{header}.{payload_b64}"
    sig = hmac.new(MOCK_JWT_SECRET.encode(), signing_input.encode(), "sha256").hexdigest()
    return f"{signing_input}.{sig}"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SendOTPRequest(BaseModel):
    mobileNumber: str

class VerifyOTPRequest(BaseModel):
    mobileNumber: str
    otp: str

class RefreshTokenRequest(BaseModel):
    refreshToken: str

class CreateSessionRequest(BaseModel):
    assessmentYear: Optional[str] = "FY2025-26"

class CalculateRequest(BaseModel):
    taxData: Optional[dict] = None
    income: Optional[dict] = None
    deductions: Optional[dict] = None

class AssistantRequest(BaseModel):
    messages: list[dict]                     # [{role, content}, ...]
    language: Optional[str] = "en"
    scenario: Optional[dict] = None          # {category?, grossSalary?, investableBudget?, ...}

# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/auth/send-otp")
async def send_otp(body: SendOTPRequest):
    mobile = body.mobileNumber.strip()
    if len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number — must be 10 digits")

    # Generate OTP — accept any 6-digit code starting with '123' in mock mode
    otp = str(random.randint(100000, 999999))

    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO otps (mobile, otp, expiry, attempts) VALUES (?, ?, ?, 0)",
        (mobile, otp, int(time.time()) + 300),
    )
    conn.commit()
    conn.close()

    # In mock mode: print OTP to console instead of calling SNS
    print(f"\n[MOCK SMS] OTP for {mobile[-4:].rjust(10, '*')}: {otp}\n")

    return {"message": "OTP sent successfully", "expiresIn": 300}


@app.post("/auth/verify-otp")
async def verify_otp(body: VerifyOTPRequest):
    mobile = body.mobileNumber.strip()
    otp = body.otp.strip()

    if len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(status_code=400, detail="Invalid OTP")

    conn = get_db()
    row = conn.execute("SELECT * FROM otps WHERE mobile = ?", (mobile,)).fetchone()

    # Mock convenience: any OTP starting with '123' is automatically accepted
    mock_bypass = otp.startswith("123")

    if not row and not mock_bypass:
        conn.close()
        raise HTTPException(status_code=401, detail="OTP not found or expired")

    if row:
        if int(time.time()) > row["expiry"] and not mock_bypass:
            conn.close()
            raise HTTPException(status_code=401, detail="OTP expired. Please request a new one.")

        if row["otp"] != otp and not mock_bypass:
            attempts = row["attempts"] + 1
            conn.execute("UPDATE otps SET attempts = ? WHERE mobile = ?", (attempts, mobile))
            conn.commit()
            conn.close()
            remaining = max(0, 3 - attempts)
            raise HTTPException(
                status_code=401,
                detail=f"Invalid OTP. {remaining} attempt(s) remaining.",
            )

    # Valid OTP — create/update user
    user_id = hashlib.sha256(mobile.encode()).hexdigest()[:16]
    now = int(time.time())
    conn.execute(
        "INSERT OR REPLACE INTO users (user_id, mobile, created_at) VALUES (?, ?, ?)",
        (user_id, mobile, now),
    )
    conn.execute("DELETE FROM otps WHERE mobile = ?", (mobile,))
    conn.commit()
    conn.close()

    access_token = _make_token({"userId": user_id}, expiry_seconds=86400)
    refresh_token = _make_token({"userId": user_id, "type": "refresh"}, expiry_seconds=30 * 86400)

    return {
        "message": "Authentication successful",
        "userId": user_id,
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "expiresIn": 86400,
    }


@app.post("/auth/refresh")
async def refresh_token(body: RefreshTokenRequest):
    # In mock mode: accept any non-empty refresh token
    if not body.refreshToken:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Return a new mock access token
    access_token = _make_token({"userId": "mock-user", "refreshed": True})
    return {"accessToken": access_token, "expiresIn": 86400}


@app.post("/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}

# ---------------------------------------------------------------------------
# Session endpoints
# ---------------------------------------------------------------------------

@app.post("/sessions")
async def create_session(body: CreateSessionRequest):
    conn = get_db()
    now = int(time.time())
    session_id = f"session-mock-{now}"
    conn.execute(
        "INSERT INTO sessions (session_id, user_id, fy, status, created_at, updated_at) VALUES (?,?,?,?,?,?)",
        (session_id, "mock-user", body.assessmentYear or "FY2025-26", "draft", now, now),
    )
    conn.commit()
    conn.close()
    return {"sessionId": session_id, "assessmentYear": body.assessmentYear, "status": "draft", "createdAt": now * 1000}


@app.get("/sessions")
async def get_sessions():
    conn = get_db()
    rows = conn.execute("SELECT * FROM sessions ORDER BY updated_at DESC").fetchall()
    conn.close()
    return {"sessions": [dict(r) for r in rows]}

# ---------------------------------------------------------------------------
# Calculate endpoint (delegates to the Python tax calculator)
# ---------------------------------------------------------------------------

@app.post("/calculate")
async def calculate(body: CalculateRequest):
    """
    Tax calculation endpoint — delegates to the real engine (calculate.py),
    so the local server returns numbers IDENTICAL to the client-side
    TaxCalculator and the production Lambda. Returns the full
    RegimeComparisonResult (both regimes, slab-wise breakdown, surcharge,
    87A, cess), not a simplified mock.
    """
    # Accept either a nested taxData envelope or top-level income/deductions.
    src = body.taxData or {}
    income = src.get("income", body.income) or {}
    deductions = src.get("deductions", body.deductions) or {}
    personal_info = src.get("personalInfo") or getattr(body, "personalInfo", None)

    try:
        result = compare_regimes(income, deductions, personal_info)
    except ValueError as exc:  # e.g. NRI/RNOR guard
        raise HTTPException(status_code=400, detail=str(exc))

    result["calculationId"] = f"calc-{int(time.time())}"
    return result

# ---------------------------------------------------------------------------
# Guided assistant endpoint (Module 5.2.3) — provider + optimiser driven.
# Makes the assistant DYNAMIC: category routing comes from the provider, and a
# concrete recommendation is COMPUTED by the optimiser when the scenario carries
# income. Offline it uses the rule-based provider; with an ANTHROPIC_API_KEY the
# same endpoint returns an LLM-generated, per-language roadmap (no code change).
# ---------------------------------------------------------------------------

@app.post("/assistant")
async def assistant(body: AssistantRequest):
    # Imports resolve because the server runs as `python -m uvicorn` from backend/.
    from src.providers import ChatMessage, get_provider
    from src.optimization.tax_optimizer import OptimizerInput, optimize
    from src.optimization.decision_engine import decide

    provider = get_provider()
    messages = [ChatMessage(m.get("role", "user"), m.get("content", "")) for m in body.messages]
    try:
        resp = provider.chat(messages)
    except Exception as exc:  # provider unavailable → never 500 the assistant
        raise HTTPException(status_code=503, detail=f"Assistant provider unavailable: {exc}")

    out: dict[str, Any] = {
        "content": resp.content,
        "provider": resp.provider,
        "offline": resp.offline,
        "category": resp.category,
        "citations": resp.citations,
        "language": body.language or "en",
    }

    # Dynamic, engine-verified recommendation when the scenario carries income.
    sc = body.scenario or {}
    gross = sc.get("grossSalary")
    if isinstance(gross, (int, float)) and gross > 0:
        inp = OptimizerInput(
            gross_salary=int(gross),
            investable_budget=sc.get("investableBudget"),
            health_insurance_80d=int(sc.get("healthInsurance80D", 0) or 0),
            is_senior=bool(sc.get("isSenior", False)),
        )
        opt = optimize(inp)
        dec = decide(inp, sc.get("weightProfile", "balanced"))
        out["recommendation"] = {
            "recommendedRegime": dec.recommended_regime,
            "totalTax": opt.total_tax,
            "oldTax": opt.old_tax_optimal,
            "newTax": opt.new_tax,
            "budgetDeployed": opt.budget_deployed,
            "advocate": opt.advocate,
            "adversary": opt.adversary,
            "note": dec.note,
        }

    return out

# ---------------------------------------------------------------------------
# Error reporting endpoint (swallowed by ErrorBoundary)
# ---------------------------------------------------------------------------

@app.post("/api/errors")
async def log_error(request: Request):
    body = await request.json()
    print(f"[ERROR LOG] {body.get('message', 'Unknown error')} @ {body.get('timestamp', '')}")
    return {"logged": True}

# ---------------------------------------------------------------------------
# Tax rules (mocks the AppConfig-backed GET /tax-rules/{fy} route — OPT-A1)
# ---------------------------------------------------------------------------

# In production this route is a Lambda reading the AppConfig data plane
# (appconfigdata:GetLatestConfiguration). Locally we serve the same JSON the
# AppConfig hosted configuration was seeded from (shared/tax-rules-*.json),
# so the frontend hot-reload path is exercised end-to-end in dev.
# mock_server.py lives at backend/src/local/ → repo root is three levels up.
_SHARED_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "shared")
)

_TAX_RULES_FILES = {
    "FY2025-26": "tax-rules-fy2025-26.json",
    "AY2025-26": "tax-rules-fy2025-26.json",
    "FY2026-27": "tax-rules-fy2026-27.json",
    "AY2026-27": "tax-rules-fy2026-27.json",
}


@app.get("/tax-rules/{financial_year}")
async def get_tax_rules(financial_year: str):
    filename = _TAX_RULES_FILES.get(financial_year)
    if filename is None:
        raise HTTPException(
            status_code=404,
            detail=f"No tax rules for '{financial_year}'. "
                   f"Supported: {sorted(set(_TAX_RULES_FILES))}",
        )

    rules_path = os.path.join(_SHARED_DIR, filename)
    if not os.path.exists(rules_path):
        raise HTTPException(status_code=503, detail=f"Rules file missing: {filename}")

    with open(rules_path, encoding="utf-8") as fh:
        return json.load(fh)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "mode": "mock", "timestamp": int(time.time())}
