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
import time
import sqlite3
import hashlib
import random
from typing import Any, Optional
from contextlib import contextmanager

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
    Mock tax calculation endpoint.
    Returns a simple regime comparison without calling real Lambda.
    """
    # Minimal calculation — returns plausible structure for UI testing
    gross = 0
    if body.taxData:
        gross = body.taxData.get("income", {}).get("salary", {}).get("grossSalary", 0)
    elif body.income:
        gross = body.income.get("salary", {}).get("grossSalary", 0)

    taxable_old = max(0, gross - 250000 - 50000)  # rough deduction estimate
    taxable_new = max(0, gross - 50000)

    def slab_tax_old(income):
        tax = 0
        if income > 250000:
            tax += min(income - 250000, 250000) * 0.05
        if income > 500000:
            tax += min(income - 500000, 500000) * 0.20
        if income > 1000000:
            tax += (income - 1000000) * 0.30
        return round(tax * 1.04)  # + 4% cess

    def slab_tax_new(income):
        tax = 0
        if income > 300000:
            tax += min(income - 300000, 300000) * 0.05
        if income > 600000:
            tax += min(income - 600000, 300000) * 0.10
        if income > 900000:
            tax += min(income - 900000, 300000) * 0.15
        if income > 1200000:
            tax += min(income - 1200000, 300000) * 0.20
        if income > 1500000:
            tax += (income - 1500000) * 0.30
        rebate = min(tax, 25000) if income <= 700000 else 0
        return round((tax - rebate) * 1.04)

    old_tax = slab_tax_old(taxable_old)
    new_tax = slab_tax_new(taxable_new)
    recommended = "OLD" if old_tax <= new_tax else "NEW"

    return {
        "calculationId": f"calc-mock-{int(time.time())}",
        "grossTotalIncome": gross,
        "oldRegime": {
            "taxableIncome": taxable_old,
            "totalTax": old_tax,
            "effectiveTaxRate": round(old_tax / gross * 100, 2) if gross > 0 else 0,
        },
        "newRegime": {
            "taxableIncome": taxable_new,
            "totalTax": new_tax,
            "effectiveTaxRate": round(new_tax / gross * 100, 2) if gross > 0 else 0,
        },
        "recommendedRegime": recommended,
        "taxSavings": abs(old_tax - new_tax),
    }

# ---------------------------------------------------------------------------
# Error reporting endpoint (swallowed by ErrorBoundary)
# ---------------------------------------------------------------------------

@app.post("/api/errors")
async def log_error(request: Request):
    body = await request.json()
    print(f"[ERROR LOG] {body.get('message', 'Unknown error')} @ {body.get('timestamp', '')}")
    return {"logged": True}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "mode": "mock", "timestamp": int(time.time())}
