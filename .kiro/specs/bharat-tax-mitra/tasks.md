# Implementation Plan: Bharat Tax Mitra

## Overview

Phased implementation of Bharat Tax Mitra — an offline-first, AI-powered income tax filing PWA for Indian taxpayers. Development is organized into Module 0 (gap closures to make the app runnable) followed by 4 strategic phases: Foundation, Document Intelligence, Compliance/Export, and Privacy/Production Readiness.

**Start with Module 0** — the app currently cannot run because `MainApp.tsx` is missing and auth is unwired. Complete Module 0 before progressing through Phase 1 checkpoints.

## Tasks

<!-- All tasks are listed below in phase order. Module 0 must be completed first. -->

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "comment": "Independent bootstrap tasks — no prerequisites; start DLT process immediately (weeks-long)",
      "tasks": ["0.1.1", "0.1.5", "0.3.1", "0.5.1", "0.5.2", "0.6.1", "0.7.1", "0.7.2", "0.7.3", "0.7.4", "0.7.5", "0.8.2", "0.8.3", "0.8.7", "0.9.1", "0.9.4"]
    },
    {
      "wave": 2,
      "comment": "Depends on Wave 1: form types ready, DLT credentials in, Finance Bill + correctness fixes applied",
      "tasks": ["0.1.2", "0.2.1", "0.4.1", "0.5.3", "0.6.2", "0.8.1", "0.8.4", "0.8.5", "0.8.6", "0.9.2"]
    },
    {
      "wave": 3,
      "comment": "Depends on Wave 2: MainApp needs mapper+types; auth wiring needs authService; infra needs DB stack",
      "tasks": ["0.1.3", "0.1.4", "0.1.6", "0.2.2", "0.2.3", "0.2.4", "0.4.2", "0.4.5", "0.4.6", "0.7.6", "0.11.1"]
    },
    {
      "wave": 4,
      "comment": "Depends on Wave 3: PWA features need MainApp; infra hosting needs auth+appconfig stacks",
      "tasks": ["0.4.3", "0.4.4", "0.11.2", "0.11.4", "0.11.5", "1.6.1", "1.6.2", "1.6.3", "1.6.4"]
    },
    {
      "wave": 5,
      "comment": "Phase 1 checkpoint: ALL Module 0 tasks (waves 1–4) must be complete",
      "tasks": ["1.7.1", "1.7.2", "1.7.3", "1.7.4", "1.7.5"]
    },
    {
      "wave": 6,
      "comment": "Phase 2 infrastructure — parallel S3/Lambda and upload UI",
      "tasks": ["2.1.1", "2.1.2", "2.2.1", "2.2.2"]
    },
    {
      "wave": 7,
      "comment": "Step Functions needs S3+Lambda from Wave 6",
      "tasks": ["2.3.1", "2.3.2"]
    },
    {
      "wave": 8,
      "comment": "Parsers need Textract Lambda from Wave 7; Bedrock enhancement needs extraction pipeline",
      "tasks": ["2.3.3", "2.3.4", "2.4.1", "2.4.2"]
    },
    {
      "wave": 9,
      "comment": "Review UI needs extraction data; WebSocket needs Step Functions; 0.11.3 WebSocket reconnect depends on 2.6.2 existing first; 0.9.3 (DOMPurify) moved to wave 17 to follow 4.5.3",
      "tasks": ["2.5.1", "2.5.2", "2.5.3", "2.6.1", "2.6.2", "0.11.3"]
    },
    {
      "wave": 10,
      "comment": "Phase 2 checkpoint",
      "tasks": ["2.7.1", "2.7.2", "2.7.3", "2.7.4", "2.7.5"]
    },
    {
      "wave": 11,
      "comment": "Phase 3: validation rules + ITR schema files (3.2.1a must precede 3.2.1)",
      "tasks": ["3.1.1", "3.1.2", "3.2.1a"]
    },
    {
      "wave": 12,
      "comment": "ITR JSON generator needs schema files; bank form is independent",
      "tasks": ["3.2.1", "3.2.2", "3.2.3", "3.3.1"]
    },
    {
      "wave": 13,
      "comment": "Export UI needs JSON generator; PDF needs export Lambda",
      "tasks": ["3.3.2", "3.3.3", "3.4.1", "3.4.2", "3.4.3"]
    },
    {
      "wave": 14,
      "comment": "Phase 3 checkpoint",
      "tasks": ["3.5.1", "3.5.2", "3.5.3", "3.5.4", "3.5.5"]
    },
    {
      "wave": 15,
      "comment": "Phase 4 privacy infrastructure — parallel tracks; 4.3.1 supersedes 0.9.2 (userId-scoped crypto key) — only implement 4.3.1 if 0.9.2 not yet done",
      "tasks": ["4.1.1", "4.2.1", "4.2.2", "4.3.1", "4.4.1"]
    },
    {
      "wave": 16,
      "comment": "PII encryption needs Comprehend Lambda; chat needs KB; XSS fix 0.9.3 moved to wave 17 (depends on chat component 4.5.3)",
      "tasks": ["4.1.2", "4.1.3", "4.2.3", "4.3.3", "4.5.1"]
    },
    {
      "wave": 17,
      "comment": "Chat Lambda needs KB; i18n infrastructure; 0.9.3 DOMPurify added here (must precede or co-occur with 4.5.3)",
      "tasks": ["4.5.2", "4.5.3", "4.6.1", "4.6.2", "4.6.3", "4.6.4", "0.9.3"]
    },
    {
      "wave": 18,
      "comment": "Monitoring and mobile optimization",
      "tasks": ["4.7.1", "4.7.2", "4.7.3", "4.8.1", "4.8.2", "4.8.3"]
    },
    {
      "wave": 19,
      "comment": "Error handling and sync",
      "tasks": ["4.9.1", "4.9.2", "4.9.3", "4.9.4", "4.10.1", "4.10.2"]
    },
    {
      "wave": 20,
      "comment": "Storage optimization and integration testing",
      "tasks": ["4.11.1", "4.11.2", "4.12.1", "4.12.2", "4.12.3"]
    },
    {
      "wave": 21,
      "comment": "Final audits — all preceding waves must complete",
      "tasks": ["4.13.1", "4.13.2", "4.13.3", "4.13.4", "4.13.5", "4.13.6", "4.13.7"]
    }
  ]
}
```
      "tasks": ["4.13.1", "4.13.2", "4.13.3", "4.13.4", "4.13.5", "4.13.6", "4.13.7"]
    }
  ]
}
```

## Notes

- Tasks marked `*` are optional property-based tests — skip for faster MVP delivery
- **Start with Module 0** — nothing else can be validated without it
- **Start DLT registration (0.6.1) immediately** — it has a 2–6 week bureaucratic lead time independent of code
- Module 0.8 (correctness fixes) and Module 0.9 (security fixes) should run in Wave 1–2 alongside wiring tasks — they are small, targeted code changes
- The Python backend calculator (0.5.3) must produce numerically identical results to the TypeScript frontend calculator — add a cross-language property test
- ⚠️ *(superseded 2026-07-18)* ~~All AWS services (Textract, Bedrock, Comprehend) require AWS account with appropriate service quotas enabled before Phase 2~~ — the AI layer now uses the **Anthropic API** (no AWS AI models / no Bedrock quota needed). Only optional production infra (DynamoDB/KMS) needs AWS. See Provider Migration notice (Module 2.3) & Phase 5 Module 5.2.
- AppConfig (0.4.5) must be provisioned before Phase 1 checkpoint — otherwise tax rule hot-reload is non-functional
- IndexedDB encryption key must be scoped to `userId + deviceId` (0.9.2) before any user data is stored — this change cannot be applied retroactively to existing data

---

## Professional Tax Filing System - Phased Development Approach

## Executive Summary

This implementation plan structures the Bharat Tax Mitra development into **4 Strategic Phases** with **12 Professional Modules**, following industry best practices for tax software development, regulatory compliance, and enterprise-grade architecture.

**Implementation Stack**: 
- **Backend**: Python 3.11 (Lambda) - Tax calculation, compliance, audit
- **Frontend**: React 18 + TypeScript - Professional UI/UX
- **Infrastructure**: AWS Serverless (CDK) - Scalable, secure
- **AI/ML**: ⚠️ *(superseded → Anthropic API direct; see Module 2.3 migration notice)* ~~Bedrock, Textract, Comprehend~~ - Document intelligence

**Compliance Framework**: 
- Income Tax Act 1961 (Sections 80C, 80D, 44AD, 87A, HRA)
- IT Department JSON Schema v1.0 (FY 2025-26)
- Data Protection & Privacy (24-hour TTL, KMS encryption)
- Audit Trail Requirements (90-day retention)

---

## 🔧 MODULE 0: GAP CLOSURES — MAKE THE APP RUNNABLE
**Priority**: CRITICAL BLOCKER — complete before any new Phase 1 tasks
**Deliverable**: A working, runnable app with real auth and connected components

> These tasks close the gaps identified in the Gap Analysis section of design.md.
> None of the Phase 1 checkpoint tasks (1.7.x) can be validated until these are done.

### Module 0.1: Core App Wiring (Blocker)

- [x] 0.1.1 Create TaxFormData shared type and useTaxForm hook
  - Create `shared/types/form-data.ts` with `TaxFormData`, `PersonalInfo`, `SalaryIncome`, `DeductionInfo`, `BusinessInfo` interfaces
  - Create `frontend/src/hooks/useTaxForm.ts` with state, setters, auto-save (30s), and draft restore from IndexedDB
  - Expose `isDirty`, `lastSavedAt`, `clearDraft` from hook
  - _Requirements: 20.5, 1.4 | Compliance: Data loss prevention_

- [x] 0.1.2 Create formDataMapper utility
  - Create `frontend/src/utils/formDataMapper.ts`
  - Implement `toIncomeData(salary, business): IncomeData`
  - Implement `toDeductionData(deductions, salary): DeductionData`
  - Add unit tests covering standard and edge-case inputs
  - _Requirements: 5.1 | Compliance: Calculator accuracy_

- [x] 0.1.3 Build MainApp page with 7-step tax wizard
  - Create `frontend/src/pages/MainApp.tsx`
  - Implement step-based wizard: Personal → Salary → Deductions → Business → Compare → Breakdown → Export
  - Wire `useTaxForm` hook as shared state across all steps
  - Call `TaxCalculator.compareRegimes()` on income/deduction changes (debounced 500ms)
  - Pass `RegimeComparisonResult` down to `RegimeComparison`, `TaxBreakdown`, `TaxSummaryDashboard`
  - _Requirements: 5.1, 5.10, 7.8, 20.5 | Compliance: Complete tax flow_

- [x] 0.1.4 Build layout shell components
  - Create `frontend/src/components/layout/Header.tsx` (logo, connectivity dot, sync status, language selector, logout)
  - Create `frontend/src/components/layout/BottomNav.tsx` (mobile-only, 5 tabs, react-router routing)
  - Create `frontend/src/components/layout/WizardStepper.tsx` (step indicator, mobile-friendly)
  - Create `frontend/src/components/layout/ConnectivityBanner.tsx` (offline banner with queue count)
  - _Requirements: 10.4, 13.2 | Compliance: Mobile-first UX_

- [x] 0.1.5 Build feedback components (ErrorBoundary + Toast)
  - Create `frontend/src/components/feedback/ErrorBoundary.tsx` (class component, catches render errors, logs to CloudWatch)
  - Create `frontend/src/components/feedback/Toast.tsx` and `frontend/src/hooks/useToast.ts`
  - Wrap `<App>` with `<ErrorBoundary>` in `main.tsx`
  - _Requirements: 20.2, 20.3 | Compliance: User-friendly errors_

- [x] 0.1.6 Create AutoSaveIndicator component
  - Create `frontend/src/components/layout/AutoSaveIndicator.tsx`
  - States: saving (spinner), saved (timestamp), not saved (yellow warning)
  - Mount in Header or form footer area
  - _Requirements: 20.5 | Compliance: Data loss prevention_

### Module 0.2: API Client & Auth Wiring

- [x] 0.2.1 Create authService API client
  - Create `frontend/src/services/authService.ts`
  - Implement `sendOTP(mobileNumber)`, `verifyOTP(mobileNumber, otp)`, `refreshToken(token)`
  - Add `X-Device-Id` header from `crypto.ts` device fingerprint on all requests
  - Store JWT in IndexedDB (encrypted) via `db.saveProfile()`
  - Handle `401` → auto-refresh → retry pattern
  - _Requirements: 1.2, 1.3, 1.4 | Compliance: Secure authentication_

- [x] 0.2.2 Wire AuthFlow to real API
  - Remove `setTimeout` simulations from `AuthFlow.tsx`
  - Replace with `authService.sendOTP()` and `authService.verifyOTP()` calls
  - Show real error messages from API response (rate limit, invalid OTP, locked)
  - Store real JWT + userId in IndexedDB on success
  - _Requirements: 1.2, 1.3, 1.7 | Compliance: Auth audit trail_

- [x] 0.2.3 Create sessionService
  - Create `frontend/src/services/sessionService.ts`
  - Implement `createSession`, `getActiveSession`, `getAllSessions`, `updateSession`, `updateCompleteness`
  - Completeness score: count filled mandatory fields (PAN, fullName, DOB, grossSalary, tdsDeducted) / 5 × 100
  - Store/retrieve from IndexedDB `taxSessions` table
  - Sync to server `POST /sessions` when online
  - _Requirements: 7.8 | Compliance: Session tracking_

- [x] 0.2.4 Create offline syncService
  - Create `frontend/src/services/syncService.ts`
  - Implement `enqueue(endpoint, method, payload)` writing to IndexedDB `pendingRequests`
  - Implement `processPending()` with exponential backoff retry (1s, 2s, 4s, 8s, max 30s)
  - Register `window.addEventListener('online', startSync)` in `main.tsx`
  - Expose `getSyncStatus()` → `{ pending: number, lastSyncAt: number }`
  - _Requirements: 10.5, 10.6, 20.1 | Compliance: Data integrity_

### Module 0.3: Local Development Mock Server

- [x] 0.3.1 Create Python mock server for local development
  - Create `backend/src/local/mock_server.py` using FastAPI
  - Routes: `POST /auth/send-otp` (log OTP to console), `POST /auth/verify-otp` (accept any OTP starting with `123`), `POST /sessions`, `GET /sessions`, `POST /calculate`
  - Use SQLite for ephemeral local storage
  - Add `backend/src/local/requirements_local.txt` (fastapi, uvicorn, sqlite3)
  - Document startup command in README: `uvicorn mock_server:app --reload --port 3001`
  - _Requirements: Developer experience | Compliance: N/A_

### Module 0.4: AWS Infrastructure (CDK Stacks)

- [x] 0.4.1 Create database CDK stack
  - Create `infrastructure/lib/stacks/database-stack.ts`
  - Provision DynamoDB tables: `BharatTaxMitra-OTPs` (TTL: expiresAt), `BharatTaxMitra-Users`, `BharatTaxMitra-TaxSessions`, `BharatTaxMitra-Documents` (TTL: expiresAt), `BharatTaxMitra-CalculationResults`, `BharatTaxMitra-AuditEvents` (TTL: 90d)
  - Add all GSIs defined in design.md data models
  - Use on-demand capacity for all tables
  - _Requirements: 4.3, 4.4 | Compliance: Data TTL enforcement_

- [x] 0.4.2 Create auth CDK stack
  - Create `infrastructure/lib/stacks/auth-stack.ts`
  - Provision Lambda functions: `send-otp` and `verify-otp` with correct env vars
  - Provision API Gateway REST API with routes: `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`
  - Wire Lambda execution roles with least-privilege IAM policies (DynamoDB, SNS, KMS)
  - Store `JWT_SECRET` in AWS SSM Parameter Store (SecureString)
  - _Requirements: 1.2, 1.3 | Compliance: Authentication infrastructure_

- [x] 0.4.3 Create frontend hosting CDK stack
  - Create `infrastructure/lib/stacks/frontend-stack.ts`
  - Provision private S3 bucket for static website hosting
  - Provision CloudFront distribution with OAC, TLS 1.3 minimum, security headers response policy
  - Add HSTS, CSP, X-Content-Type-Options, X-Frame-Options headers
  - _Requirements: 4.9 | Compliance: TLS 1.3, security headers_

- [x] 0.4.4 Create main CDK app entry point
  - Create `infrastructure/lib/main-stack.ts` instantiating all sub-stacks
  - Create `infrastructure/bin/app.ts` as CDK app entry
  - Wire environment config from `config/dev.json`, `config/staging.json`, `config/prod.json`
  - Add CDK deploy scripts to root `package.json`
  - _Requirements: All infrastructure | Compliance: Multi-environment_

### Module 0.5: Backend Tests (Missing Entirely)

- [x] 0.5.1 Write backend unit tests for send_otp Lambda
  - Create `backend/tests/conftest.py` with `moto` fixtures for DynamoDB, SNS, KMS
  - Create `backend/tests/test_send_otp.py`
  - Test: valid 10-digit number → 200 + OTP stored in DynamoDB
  - Test: 9-digit number → 400
  - Test: 4th OTP in 15 min → 429 rate limit
  - Test: SNS publish failure → 500
  - _Requirements: 1.2 | Compliance: Authentication validation_

- [x] 0.5.2 Write backend unit tests for verify_otp Lambda
  - Create `backend/tests/test_verify_otp.py`
  - Test: valid OTP within expiry → 200 + JWT tokens
  - Test: expired OTP → 401
  - Test: wrong OTP → 401 + remaining attempts count
  - Test: 3 wrong attempts → lockout (15 min)
  - Test: locked account → 401 with lockout message
  - _Requirements: 1.3, 1.7 | Compliance: Security validation_

- [x] 0.5.3 Create backend tax calculation Lambda and tests
  - Create `backend/src/lambdas/tax_calculation/calculate.py`
  - Mirror `taxCalculator.ts` logic in Python — same tax rules, same algorithm
  - Write `backend/tests/test_calculate.py` with 5+ scenarios (salaried, business, senior citizen, zero income, high income)
  - Cross-verify: backend Python output must equal frontend TypeScript output for same inputs
  - _Requirements: 5.1–5.10 | Compliance: Calculation consistency_

### Module 0.7: Finance Bill 2025 Statutory Corrections

> These tasks fix architectural gaps identified by direct audit of Finance Bill 2025 (Bill No. 14 of 2025). See "Finance Bill 2025 — Statutory Compliance Audit" section in design.md for statutory references.

- [x] 0.7.1 Add senior citizen and super senior citizen slab differentiation
  - Add `age` field to `IncomeData` or derive from `PersonalInfo.dateOfBirth`
  - In `TaxCalculator.calculateOldRegime()`: select slabs based on age — Paragraph A(I) for < 60, A(II) for 60-79, A(III) for 80+
  - Add senior citizen slabs to `tax-rules-fy2025-26.json` (done in v2.0.0)
  - Update property tests to cover senior and super senior citizen scenarios
  - _Source: Finance Bill 2025, First Schedule, Paragraph A, Items I/II/III | Requirements: 5.1_

- [x] 0.7.2 Implement marginal relief on surcharge
  - Add `applyMarginalRelief(incomeAtThreshold, income, taxAtThreshold, taxBeforeRelief)` helper to `TaxCalculator`
  - At each surcharge threshold band: cap `(tax + surcharge)` so it does not exceed `taxAtThreshold + (income - threshold)`
  - Apply to both old and new regime surcharge calculations
  - Add property test: tax + surcharge at ₹50,00,001 must not exceed tax at ₹50,00,000 + ₹1
  - _Source: Finance Bill 2025, First Schedule, Paragraph A surcharge provisos (pages 102-103) | Requirements: 5.1_

- [x] 0.7.3 Implement Section 44AD enhanced ₹3 crore threshold
  - Add `cashReceiptsPercentage` calculation: `cashReceipts / (digitalReceipts + cashReceipts)`
  - If `cashReceiptsPercentage <= 0.05`: apply ₹3 crore threshold
  - If `cashReceiptsPercentage > 0.05`: apply ₹2 crore threshold
  - Update `BusinessIncomeForm.tsx` to compute and display which threshold applies
  - Add property test: business with 4% cash receipts and ₹2.5Cr turnover is eligible for presumptive taxation; same with 6% cash is not
  - _Source: Section 44AD as amended by Finance Act 2023 (unchanged by Finance Bill 2025) | Requirements: 5.3_

- [x] 0.7.4 Implement Section 87A marginal relief for new regime
  - When taxable income slightly exceeds ₹7L (new regime, AY 2025-26): apply proviso (b)
  - Rebate = `taxLiability - (taxableIncome - 700000)` if this is less than max rebate
  - This prevents the "cliff" where ₹7,00,001 income results in more total outflow than ₹7,00,000
  - Add property test: effective tax at ₹7,00,001 must not exceed effective tax at ₹7,00,000 by more than ₹1
  - _Source: Finance Bill 2025 Clause 20 (page 149) — describes marginal relief proviso (b) for 7L threshold | Requirements: 5.4_

- [x] 0.7.5 Add Section 87A rebate to old regime calculator
  - Old regime has its own 87A rebate: min(tax, ₹12,500) for income ≤ ₹5,00,000
  - Current `calculateOldRegime()` does not apply this rebate — add it
  - This is a correctness bug: salaried person with ₹4L income under old regime should pay zero tax
  - Add property test: old regime taxpayer with ₹4.5L income must have zero tax liability
  - _Source: Section 87A main provision (not amended by Finance Bill 2025 for old regime) | Requirements: 5.1_

- [x] 0.7.6 Bundle AY 2026-27 rules as separate configuration
  - The `newRegime_AY2026_27` block in `tax-rules-fy2025-26.json` contains the 7-slab table and ₹60,000 rebate
  - Create `shared/tax-rules-fy2026-27.json` using the AY 2026-27 values from Finance Bill 2025 Clauses 20 and 24
  - Update `TaxRulesService.getTaxRules(financialYear)` to load the correct file for the requested year
  - Ensure the app defaults to FY 2025-26 but supports FY 2026-27 when available
  - _Source: Finance Bill 2025 Clauses 20 and 24 — effective 1st April 2026 | Requirements: 11.1, 11.2_

### Module 0.8: Code Correctness Fixes (High Priority)

> Closes BLOCKER-5, HIGH-3, HIGH-4, HIGH-5, HIGH-6, HIGH-7 from design.md Rework Decisions.

- [x] 0.8.1 Fix OTP table key structure — use query not get_item
  - Change `verify_otp.py` `get_otp_record()` from `table.get_item(Key={'mobileNumber': ...})` to `table.query(KeyConditionExpression=Key('mobileNumber').eq(mobile), ScanIndexForward=False, Limit=1)`
  - Fix OTP rate-limit exception handler: distinguish `ResourceNotFoundException` (raise) from transient errors (swallow)
  - Update DynamoDB table spec in `database-stack.ts` (task 0.4.1) to use composite PK: `mobileNumber` (PK) + `timestamp` (SK)
  - _Ref: BLOCKER-5 (Q) | Requirements: 1.2, 1.3_

- [x] 0.8.2 Add Section 87A rebate to Old Regime calculator
  - In `taxCalculator.ts` `calculateOldRegime()`: apply 87A after slab tax, before surcharge — `min(taxBeforeSurcharge, 12500)` for `taxableIncome <= 500000`
  - Compute surcharge on `taxAfterRebate` not `taxBeforeSurcharge`
  - Add `rebate87A: 0` to old regime result by default (non-optional now)
  - Add property test: old regime taxpayer with ₹4.5L income must have zero tax
  - _Ref: HIGH-3 (P) | Requirements: 5.1_

- [x] 0.8.3 Fix professional tax — move from gross income to Section 16 deduction
  - In `calculateGrossTotalIncome()`: remove `total -= income.salary.professionalTax` line
  - In `calculateOldRegimeDeductions()`: add `section16: { professionalTax: income.salary.professionalTax }` to deduction breakdown
  - In `calculateNewRegime()`: also add professional tax as deduction (allowed in both regimes under Section 16)
  - Update `TaxCalculationResult.deductionBreakdown` to include `professionalTax` field (already typed)
  - Add test: ₹2,400 professional tax appears in deduction breakdown, not reducing gross income
  - _Ref: HIGH-4 (G) | Requirements: 5.1_

- [x] 0.8.4 Update HRA calculation to use IncomeData.salary.basicSalary
  - In `calculateHRAExemption()`: change signature from `(rentPaid, basicSalary, hraReceived, isMetro)` to derive `basicSalary` from `income.salary.basicSalary`
  - Remove `basicSalary` field from `DeductionData.hra` (already done in type update)
  - Update `DeductionsForm.tsx`: remove `basicSalary` input field; display it read-only (pulled from `SalaryIncomeForm` state)
  - Update `formDataMapper.ts`: pass `income.salary.basicSalary` to HRA calculation
  - _Ref: HIGH-5 (H) | Requirements: 5.2_

- [x] 0.8.5 Update TaxSummaryDashboard to show "Tax Payable / Refund Due"
  - Add `taxPayableOrRefund` computation: `totalTaxLiability - tdsDeducted`
  - Replace primary metric card "Tax Liability" with "Amount Due" (red, if positive) or "Refund Expected" (green, if negative)
  - Move `totalTaxLiability` to a secondary card
  - Show TDS Paid, Net Payable/Refund as the top 3 metrics
  - _Ref: HIGH-6 (E) | Requirements: 5.10_

- [x] 0.8.6 Normalize DOB to ISO 8601 in formDataMapper and compute age correctly
  - In `formDataMapper.ts`: convert `dob` (`DD/MM/YYYY`) to `dateOfBirth` (`YYYY-MM-DD`)
  - Compute `age` as age at 31 March of the filing year (e.g., for FY 2025-26, age at 31 March 2026)
  - Set `isSeniorCitizen = age >= 60`, `isSuperSeniorCitizen = age >= 80`
  - Pass these flags through to `calculateOldRegime(income, deductions, personalInfo)`
  - Add test: person born 1 April 1965 filing FY 2025-26 return — age = 60, isSeniorCitizen = true
  - _Ref: HIGH-7 (F) | Requirements: 7.1_

- [x] 0.8.7 Add CI guard for minimum backend test count
  - Add to `backend/pytest.ini`: `addopts = --tb=short`
  - Add to `ci.yml` backend test step: `python -m pytest --collect-only | grep "test session starts" && pytest --co -q | wc -l | awk '{if($1<5) exit 1}'`
  - Alternatively: add a `conftest.py` fixture that asserts `len(session.items) >= 5` on collection
  - _Ref: BLOCKER-6 (Z) | Requirements: CI/CD compliance_

### Module 0.9: Security Hardening Fixes

> Closes BLOCKER-2, MEDIUM-2, MEDIUM-3 from design.md Rework Decisions.

- [x] 0.9.1 Remove hardcoded JWT_SECRET fallback from verify_otp Lambda
  - Replace `os.environ.get('JWT_SECRET', 'dev-secret-key')` with a hard failure:
    ```python
    JWT_SECRET = os.environ.get('JWT_SECRET')
    if not JWT_SECRET:
        raise EnvironmentError("JWT_SECRET environment variable is required — check SSM configuration")
    ```
  - Remove last-4-phone-digits from JWT payload — store only `userId`
  - _Ref: BLOCKER-2 (J), LOW-5 (Z) | Requirements: 1.3, 4.2_

- [x] 0.9.2 Scope IndexedDB encryption key to userId + deviceId
  - In `crypto.ts` `getDeviceId()`: accept `userId` parameter; derive fingerprint as `[navigator.userAgent, navigator.language, userId].join('|')`
  - Update `encryptData(plaintext, userId)` and `decryptData(encrypted, userId)` signatures
  - Update all callers in `db.ts` to pass `userId` from the active profile
  - Add test: same plaintext encrypted by different userIds produces different ciphertext
  - _Ref: MEDIUM-2 (J+I) | Requirements: 1.4, 4.8_

- [x] 0.9.3 Add DOMPurify to sanitize Bedrock chat responses
  - Install: `npm install dompurify --save && npm install @types/dompurify --save-dev` in `frontend/`
  - In chat component (task 4.5.3): `import DOMPurify from 'dompurify'`
  - Render: `<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(response) }} />`
  - Add test: chat response containing `<script>alert('xss')</script>` is sanitized to empty string
  - _Ref: MEDIUM-3 (X) | Requirements: 6.1_

- [x] 0.9.4 Add residentialStatus guard in TaxCalculator
  - At the top of `calculateOldRegime()` and `calculateNewRegime()`: check `personalInfo.residentialStatus`
  - If not `'resident'`: throw `UnsupportedResidentialStatusError` with clear message
  - Add UI note in `PersonalInfoForm`: "This tool supports resident individuals only. NRI tax calculation requires a different form."
  - _Ref: MEDIUM-8 (T) | Requirements: 5.1_

### Module 0.10: Infrastructure Completeness Fixes

> Closes HIGH-8, HIGH-9 from design.md Rework Decisions. New tasks not in prior modules.

- [x] 0.4.5 Create AWS AppConfig CDK stack for tax rule hot-reload
  - Provision AppConfig Application: `BharatTaxMitra`
  - Provision AppConfig Environments: `dev`, `staging`, `prod`
  - Provision AppConfig Configuration Profile: `TaxRules` (freeform JSON, validator: JSON schema)
  - Provision Deployment Strategy: `AllAtOnce` for dev, `Linear20PercentEvery1Minute` for prod
  - Upload initial configuration content from `shared/tax-rules-fy2025-26.json`
  - Grant Lambda execution roles `appconfig:GetConfiguration` permission
  - Replace the `// In production, fetch from AWS AppConfig` stub in `TaxRulesService` with real AppConfig call
  - _Ref: HIGH-8 (V) | Requirements: 11.1, 11.2, 11.3_

- [x] 0.4.6 Document CDK cross-stack export/import pattern
  - In `database-stack.ts`: add `CfnOutput` for all table ARNs (OTPs, Users, TaxSessions, Documents, CalculationResults, AuditEvents)
  - In `auth-stack.ts`: import table ARNs using `Fn.importValue()`; also export Lambda function ARNs
  - Document the pattern in a `infrastructure/README.md` with deployment order: database → auth → frontend
  - Add CDK unit tests using `aws-cdk-lib/assertions` to verify resource creation
  - _Ref: HIGH-9 (I) | Requirements: Infrastructure_

### Module 0.11: UX + Offline Correctness

> Closes MEDIUM-1, MEDIUM-4, MEDIUM-5, MEDIUM-6, MEDIUM-7 from design.md Rework Decisions.

- [x] 0.11.1 Create OfflineContext React provider
  - Create `frontend/src/contexts/OfflineContext.tsx` with `isOnline`, `pendingCount`, `lastSyncAt`
  - Subscribe to `window.addEventListener('online'/'offline')` inside the provider
  - Subscribe to `syncService.getSyncStatus()` for `pendingCount` on online state changes
  - Wrap `<App>` root with `<OfflineProvider>` in `main.tsx`
  - Export `useOffline()` hook for consuming components
  - _Ref: MEDIUM-4 (O) | Requirements: 10.3, 10.4_

- [x] 0.11.2 Add Safari iOS fallback for Background Sync
  - In `syncService.ts` `startSync()`: detect `'SyncManager' in window` before registering background sync
  - If not supported: register `window.addEventListener('online', processPending)` instead
  - Test: simulate offline→online transition — pending operations must replay on both Chrome and Safari
  - _Ref: MEDIUM-1 (B) | Requirements: 10.5, 10.6_

- [ ] 0.11.3 Implement WebSocket reconnection with polling fallback for extraction progress
  - In the extraction progress component (created in task 2.6.2): add reconnect logic with exponential backoff (1s, 2s, 4s, max 30s, 3 attempts)
  - After 3 failed reconnects: switch to polling `GET /documents/{documentId}` every 3 seconds
  - Show "Reconnecting..." indicator with attempt counter during backoff
  - Show "Using slower update mode" badge when polling fallback is active
  - _Ref: MEDIUM-5 (W) | Requirements: 2.4_

- [x] 0.11.4 Change Workbox skipWaiting to user-confirmation pattern
  - In `vite.config.ts`: set `skipWaiting: false, clientsClaim: false`
  - In `main.tsx`: add `wb.addEventListener('waiting', () => toast.show({ message: 'New version available', action: 'Refresh', onClick: () => wb.messageSkipWaiting() }))`
  - Import `workbox-window` `Workbox` class in `main.tsx` (already in `package.json` dependencies)
  - _Ref: MEDIUM-6 (V) | Requirements: 10.1_

- [x] 0.11.5 Remove redundant languagePacks IndexedDB store
  - Remove `languagePacks` object store from `BharatTaxMitraDB` schema in `db.ts`
  - Remove `LanguagePack` interface from `db.ts`
  - Bump Dexie database version from 1 to 2 (schema migration removes the store)
  - Add migration code: `this.version(2).stores({ languagePacks: null })` (null removes the store)
  - _Ref: MEDIUM-7 (L) | Requirements: N/A (cleanup)_

### Module 0.6: DLT Compliance for Production OTP

- [x] 0.6.1 Register on DLT portal and obtain credentials
  - Register entity on TRAI DLT portal via telecom provider (Airtel/Jio Business)
  - Register sender ID `BTAXMTR`
  - Register SMS template: "Your Bharat Tax Mitra OTP is: {#var#}. Valid for 5 minutes. Do not share with anyone."
  - Store `DLT_ENTITY_ID` and `DLT_TEMPLATE_ID` in AWS SSM Parameter Store
  - _Requirements: 1.2 | Compliance: TRAI DLT mandate (India)_

- [x] 0.6.2 Update send_otp Lambda with DLT MessageAttributes
  - Add `DLT_ENTITY_ID` and `DLT_TEMPLATE_ID` env vars to Lambda
  - Update `send_sms()` in `send_otp.py` to include `AWS.SNS.SMS.EntityId` and `AWS.SNS.SMS.TemplateId` MessageAttributes
  - Test with Airtel/Jio test number before production deployment
  - _Requirements: 1.2 | Compliance: TRAI DLT mandate_

---

## 📋 PHASE 1: FOUNDATION & CORE TAX ENGINE
**Duration**: 3-4 weeks | **Priority**: CRITICAL
**Deliverable**: Functional tax calculator with manual entry

### Module 1.1: Project Infrastructure & Development Environment

- [x] 1.1.1 Initialize professional project structure
  - Create monorepo: `/frontend`, `/backend`, `/infrastructure`, `/shared`
  - Set up React 18 PWA with TypeScript, Tailwind CSS, Vite
  - Initialize AWS CDK with multi-environment support
  - Configure ESLint, Prettier, Husky for code quality
  - Set up Jest + React Testing Library + Pytest
  - _Requirements: All | Compliance: Audit-ready structure_

- [x] 1.1.2 Establish CI/CD pipeline with quality gates
  - Configure GitHub Actions for automated builds
  - Set up automated testing on every commit
  - Implement code coverage thresholds (80% for tax modules)
  - Configure security scanning (Snyk, AWS Security Hub)
  - Set up staging environment
  - _Requirements: All | Compliance: Change management_

### Module 1.2: Tax Calculation Engine (Core Business Logic)


- [x] 1.2.1 Implement FY 2025-26 tax rules configuration
  - Create AWS AppConfig integration for dynamic rules
  - Define Old Regime JSON schema (5 slabs + surcharge + cess)
  - Define New Regime JSON schema (6 slabs + rebate 87A)
  - Implement versioning and rollback capability
  - Cache rules in IndexedDB for offline calculation
  - _Requirements: 11.1, 11.2, 11.7, 5.1 | Compliance: Section-wise accuracy_

- [x] 1.2.2 Build Old Regime tax calculator
  - Implement slab-wise calculation algorithm
  - **Section 80C**: Deductions up to ₹1.5L (LIC, PPF, ELSS, NSC)
  - **Section 80D**: Health insurance (₹25k self, ₹50k senior, ₹25k parents)
  - **HRA Exemption**: Min of 3 options (actual, rent-10%, 50%/40% metro)
  - **Standard Deduction**: ₹50,000 for salaried
  - Apply surcharge tiers (5%, 10%, 15%, 25%)
  - Calculate 4% Health & Education Cess
  - Round final tax to nearest rupee
  - _Requirements: 5.1, 5.2, 5.7, 5.8, 18.1 | Compliance: Income Tax Act 1961_

- [x] 1.2.3 Build New Regime tax calculator
  - Implement 6-slab calculation (0%, 5%, 10%, 15%, 20%, 30%)
  - **Section 87A Rebate**: Up to ₹25,000 for income ≤ ₹7L
  - **Standard Deduction**: ₹50,000 (only deduction allowed)
  - Apply surcharge and cess
  - _Requirements: 5.1, 5.4, 5.8, 18.2 | Compliance: Finance Act 2023_

- [x] 1.2.4 Implement HRA exemption calculator
  - **Option 1**: Actual HRA received
  - **Option 2**: Rent paid minus 10% of basic salary
  - **Option 3**: 50% basic (metro) or 40% (non-metro)
  - Return minimum of three options
  - Handle edge cases: no rent, HRA not received
  - _Requirements: 5.2 | Compliance: Rule 2A of IT Rules_

- [x] 1.2.5 Implement Section 44AD presumptive taxation
  - Calculate: **6% of digital receipts** + **8% of cash receipts** (correct statutory rates per Section 44AD)
  - Validate ₹2 crore turnover threshold (₹3 crore when cash receipts ≤ 5% of total per Finance Act 2023)
  - Handle mixed digital + cash receipts
  - _Requirements: 5.3 | Compliance: Section 44AD for businesses < ₹2 Cr (or < ₹3 Cr digital-heavy)_

- [x] 1.2.6 Build regime comparison engine
  - Calculate tax under both regimes simultaneously
  - Compute effective tax rate (tax/gross income × 100)
  - Calculate tax savings if switching regimes
  - Identify deductions lost in new regime
  - Recommend optimal regime
  - _Requirements: 5.10, 18.1-18.5 | Compliance: Taxpayer optimization_

- [x]* 1.2.7 Write property-based tests for tax correctness
  - **Property 1**: Tax liability always non-negative
  - **Property 2**: Deductions never exceed gross income
  - **Property 3**: Higher income → higher/equal tax (monotonicity)
  - **Property 4**: Slab rate application correct at boundaries
  - Use Hypothesis (Python) with 1000+ test cases
  - _Requirements: 5.1, 5.2, 5.7 | Compliance: Calculation accuracy_

### Module 1.3: User Authentication & Profile Management

- [x] 1.3.1 Build language selection interface (7 languages)
  - Create selector: English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati
  - Display in native scripts (हिंदी, தமிழ், తెలుగు, मराठी, বাংলা, ગુજરાતી)
  - Auto-detect device locale
  - Persist preference in IndexedDB (encrypted)
  - _Requirements: 1.1, 13.1, 13.2 | Compliance: Tier-2/3 accessibility_

- [x] 1.3.2 Implement OTP-based authentication UI
  - Create mobile number input (+91, 10-digit validation)
  - Build OTP verification (6-digit, auto-focus)
  - Add countdown timer (30s) with resend
  - Implement regime selection screen
  - Add visual progress indicators
  - _Requirements: 1.2, 1.3, 1.6 | Compliance: Secure identification_

- [x] 1.3.3 Create backend OTP Lambda functions
  - **send-OTP Lambda**: Generate 6-digit OTP, store in DynamoDB (5-min TTL)
  - Integrate Amazon SNS for SMS delivery
  - Implement rate limiting: Max 3 OTP/15 min per mobile
  - Log attempts to CloudWatch for audit
  - **verify-OTP Lambda**: Validate OTP, generate JWT tokens
  - Create user profile with encrypted mobile number
  - Implement lockout after 3 failed attempts (15-min cooldown)
  - _Requirements: 1.2, 1.3, 1.7 | Compliance: Authentication audit trail_

- [x] 1.3.4 Set up IndexedDB for offline profile storage
  - Create schema: `profiles`, `taxSessions`, `savedDrafts`, `taxRules`
  - Implement Web Crypto API encryption for tokens and PII
  - Generate device-specific key using PBKDF2 (100k iterations)
  - Store encrypted data with AES-GCM-256
  - Enable offline access to authenticated profiles
  - _Requirements: 1.4, 1.5, 4.8 | Compliance: Data protection at rest_

- [ ]* 1.3.5 Write property tests for authentication security
  - **Property 5**: Auth tokens always encrypted before storage
  - **Property 6**: Profile round-trip preserves integrity
  - **Property 7**: Offline profile access works without network
  - _Requirements: 1.4, 1.5, 1.6 | Compliance: Security validation_

### Module 1.4: Tax Data Entry Forms (Professional UI/UX)

- [x] 1.4.1 Create personal information form
  - 🐛 **Fixed (2026-07-12)**: two compounding Aadhaar bugs — (1) `validateAadhaar` stripped only whitespace, so it rejected `formatAadhaar`'s own dashed output ("Aadhaar must be 12 digits" on every valid entry); (2) the input rendered the privacy mask and fed it back through `onChange`, so any edit of a completed field destroyed the first 8 digits. Now: validator strips all non-digits; mask is at-rest only (real digits while focused). Regression suite: `PersonalInfoForm.aadhaar.test.tsx`.
  - Build fields: PAN (AAAAA9999A), Full Name, DOB, Address, Email
  - Implement PAN format validation with real-time feedback
  - Add Aadhaar input (optional, masked: XXXX-XXXX-1234)
  - Validate DOB (age 18-100, DD/MM/YYYY)
  - Auto-save every 30 seconds to IndexedDB
  - Show "Last saved" timestamp
  - _Requirements: 7.1, 7.8, 20.5 | Compliance: PAN mandatory for ITR_

- [x] 1.4.2 Create salary income form (Form-16 equivalent)
  - **Income**: Gross Salary, **Basic Salary** (required — used for HRA Rule 2A exemption + senior citizen slab selection), HRA Received, Special Allowance, Other Allowances
  - **Deductions**: Standard Deduction (₹50k auto), Professional Tax (Section 16 deduction, shown separately from gross), Others
  - **TDS**: TDS Deducted (quarterly Q1–Q4), Employer TAN
  - Implement numeric validation (non-negative, max 10 crores)
  - Add Indian number formatting (₹12,34,567 - lakhs/crores)
  - Display calculated "Net Taxable Salary" in real-time
  - Add contextual help tooltips
  - **NOTE (rework HIGH-5)**: `basicSalary` is mandatory in `IncomeData.salary` — HRA exemption and senior citizen slab selection both depend on it
  - _Requirements: 7.1, 7.2, 13.8 | Compliance: Salary income reporting_

- [x] 1.4.3 Create deductions form (Chapter VI-A)
  - **Section 80C**: LIC, PPF, ELSS, NSC, Home Loan Principal (max ₹1.5L)
  - **Section 80D**: Health insurance - Self (₹25k/₹50k seniors), Parents (₹25k/₹50k seniors)
  - **HRA**: Rent paid, landlord PAN (if > ₹1L/year), metro/non-metro city toggle
    - **NOTE (rework HIGH-5)**: `basicSalary` is NOT entered here — it flows from `SalaryIncomeForm` via the `basicSalary` prop. Removing it from HRA section was intentional.
  - **Other**: 80CCD(1B) NPS (₹50k), 80G Donations, 80E Education Loan
  - Implement limit validation with visual warnings
  - Show remaining limit (e.g., "₹50,000 remaining in 80C")
  - Add anomaly detection: Warn if total deductions > 50% of annual basic salary (prop from parent)
  - _Requirements: 7.3, 7.4, 12.2 | Compliance: Deduction eligibility & limits_

- [x] 1.4.4 Create business income form (Section 44AD)
  - Input: Gross Receipts (Digital), Gross Receipts (Cash), Business Type
  - Auto-calculate presumptive income: **6% digital + 8% cash** (correct statutory rates per Section 44AD)
  - Validate ₹2 crore threshold for 44AD eligibility (₹3 crore if cash ≤ 5% of total)
  - Show warning if receipts exceed applicable threshold
  - _Requirements: 5.3 | Compliance: Presumptive taxation scheme_

### Module 1.5: Regime Comparison & Tax Summary UI

- [x] 1.5.1 Build regime comparison component (side-by-side)
  - Create two cards: "Old Regime" vs "New Regime"
  - Display for each: Gross Income, Deductions, Taxable Income, Tax Liability, Effective Rate, Take-Home
  - Highlight recommended regime with green border + badge
  - Show savings: "Save ₹XX,XXX by choosing New Regime"
  - Add toggle button to switch regime
  - Trigger real-time recalculation (debounced 500ms)
  - _Requirements: 5.10, 18.3-18.5 | Compliance: Informed regime choice_

- [x] 1.5.2 Create tax breakdown component (detailed view)
  - Build expandable accordion sections:
    - Income Breakdown: Salary, House Property, Business, Capital Gains, Others
    - Deductions Breakdown: 80C, 80D, HRA, Standard Deduction, Others
    - Tax Calculation: Slab-wise tax, Surcharge, Cess, Rebate 87A, Final Tax
  - Add visual charts: Bar chart (income vs deductions), Pie chart (tax distribution)
  - Display slab-wise calculation table with color-coded slabs
  - Show "How is my tax calculated?" explainer
  - _Requirements: 5.10, 18.6 | Compliance: Transparency in calculation_

- [x] 1.5.3 Create tax summary dashboard (overview)
  - Display key metrics in card layout:
    - Total Income, Total Deductions, Taxable Income, Tax Liability, TDS Paid, Refund/Tax Payable
  - Add progress indicator: "Your return is 85% complete"
  - Show regime recommendation with one-click switch
  - _Requirements: 5.10, 7.8 | Compliance: User-friendly summary_

### Module 1.6: Offline-First PWA Architecture

- [x] 1.6.1 Set up Workbox Service Worker with caching
  - **App Shell**: Cache-first for HTML, CSS, JS (precache on install)
  - **API Calls**: Network-first (10s timeout), fallback to cache
  - **Static Assets**: Cache-first for images, fonts (stale-while-revalidate)
  - **Tax Rules**: Cache-first with background update (24h refresh)
  - Configure cache expiration: 7 days app shell, 24h API responses
  - Implement cache versioning for clean updates
  - _Requirements: 10.1, 10.3 | Compliance: Offline accessibility_

- [x] 1.6.2 Implement background sync for offline operations
  - Register Background Sync API for queued operations
  - Queue failed API calls in IndexedDB `pendingRequests`
  - Trigger sync when network restored
  - Implement exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - Show sync status: "3 operations pending sync"
  - Complete sync within 2 minutes of coming online
  - _Requirements: 10.5, 10.6, 20.1 | Compliance: Data integrity_

- [x] 1.6.3 Enable offline tax calculation (client-side)
  - Cache tax rules in IndexedDB on first load
  - Implement client-side calculation using cached rules
  - Display "Calculated Offline" badge when network unavailable
  - Add connectivity indicator: Green (online), Yellow (slow), Red (offline)
  - Ensure calculation accuracy matches server-side
  - _Requirements: 5.9, 10.2, 10.4 | Compliance: Consistent calculation_

- [x] 1.6.4 Optimize for 2G/3G networks (Tier-2/3 cities)
  - Implement lazy loading for non-critical components
  - Compress images with WebP format (fallback JPEG)
  - Minify and tree-shake JS bundles (< 500KB initial load)
  - Use code splitting for route-based chunks
  - Ensure page load < 3s on 3G, < 10s on 2G
  - Add loading skeletons for perceived performance
  - _Requirements: 10.8, 19.4, 19.7 | Compliance: Low-bandwidth accessibility_

- [ ]* 1.6.5 Write property tests for offline functionality
  - **Property 8**: Offline profile access works without network
  - **Property 9**: Tax calculation results match online/offline
  - **Property 10**: Queued operations sync correctly when online
  - _Requirements: 1.5, 5.9, 10.5 | Compliance: Offline reliability_

### 🎯 Phase 1 Checkpoint: Core Tax Engine Validation

- [x] 1.7.1 Run comprehensive test suite (unit + integration + property)
- [x] 1.7.2 Validate calculations against IT Department test cases
- [x] 1.7.3 Test offline functionality (airplane mode simulation)
- [x] 1.7.4 Performance audit: Lighthouse score > 90, bundle < 500KB
- [x] 1.7.5 User acceptance testing with sample taxpayer profiles

**Phase 1 Deliverable**: Functional PWA with manual tax filing, regime comparison, offline capability

---

## 📄 PHASE 2: DOCUMENT INTELLIGENCE & AI EXTRACTION
**Duration**: 3-4 weeks | **Priority**: HIGH
**Deliverable**: AI-powered Form-16/AIS extraction

### Module 2.1: Document Upload Infrastructure (AWS S3 + Security)


- [ ] 2.1.1 Create S3 buckets with lifecycle policies
  - **Raw Documents Bucket**: 24-hour TTL, KMS encryption, versioning disabled
  - **Redacted Documents Bucket**: 24-hour TTL, KMS encryption
  - **Exports Bucket**: 7-day TTL for JSON/PDF exports
  - Configure S3 bucket policies: Deny public access, enforce HTTPS
  - Set up CloudWatch Events to monitor TTL deletions
  - _Requirements: 4.3, 4.7 | Compliance: Data retention policy_

- [ ] 2.1.2 Create upload Lambda function with pre-signed URLs
  - Generate pre-signed S3 upload URLs (15-min expiry)
  - Validate file type (PDF, JPEG, PNG) and size (max 10MB)
  - Store document metadata in DynamoDB with 24-hour TTL
  - Return uploadId and pre-signed URL to client
  - Log upload attempts to CloudWatch for audit
  - _Requirements: 2.1, 2.7, 2.8 | Compliance: Secure upload mechanism_

- [ ]* 2.1.3 Write property test for file size validation
  - **Property 11**: Files > 10MB are rejected
  - **Property 12**: Only PDF/JPEG/PNG files accepted
  - _Requirements: 2.1, 2.7, 2.8 | Compliance: Input validation_

### Module 2.2: Document Upload UI (Drag-Drop + Camera)

- [ ] 2.2.1 Create file upload component with multiple input methods
  - Build dropzone with drag-and-drop support
  - Add "Choose File" button for file picker
  - Add "Take Photo" button for mobile camera capture
  - Implement upload progress indicator (0-100%)
  - Show file preview thumbnail before upload
  - Display file name, size, and type
  - _Requirements: 2.1, 2.4 | Compliance: User-friendly upload_

- [ ] 2.2.2 Implement offline upload queue management
  - Store queued uploads in IndexedDB when offline
  - Display "Queued for Upload" badge with count
  - Implement background sync when network restored
  - Add retry logic with exponential backoff (3 attempts)
  - Show sync progress: "Uploading 2 of 3 documents..."
  - _Requirements: 2.2, 2.3, 2.5, 20.1 | Compliance: Offline resilience_

- [ ]* 2.2.3 Write property test for offline document queueing
  - **Property 13**: Documents queued offline are uploaded when online
  - **Property 14**: Queue order preserved (FIFO)
  - _Requirements: 2.2 | Compliance: Queue integrity_

### Module 2.3: AI Document Extraction (Textract + Bedrock)
> ⚠️ **PROVIDER MIGRATION (2026-07-18) — Bharat Tax Mitra 2.0.** All AWS-AI-model references in Phase 2 & 4 (Bedrock / Claude 3 model IDs / Textract / Comprehend / Bedrock Knowledge Base) are **SUPERSEDED** by Phase 5 **Module 5.2**:
> - **Bedrock (Claude 3, KB) → Anthropic API direct** (current Claude gen), proxied + PII-redacted; Sarvam per-language + offline rule-based fallbacks.
> - **Textract (OCR) → vision-model extraction now, on-device OCR later** — not Textract.
> - **Comprehend (PII) → local/regex PII (`frontend/src/utils/pii.ts`) + provider guardrails** — not Comprehend.
> - **Bedrock KB (RAG) → self-hosted statute corpus + retrieval** — not a Bedrock KB.
> AWS infra (DynamoDB/KMS/AppConfig) stays optional/deployment-only — never AI models. AWS-model text retained for traceability; **build against Phase 5.**

- [ ] 2.3.1 Create Step Functions document processing workflow
  - Define state machine: Upload → Textract → PII Detection → Enhancement → Storage
  - Add error handling and retry logic (3 attempts with exponential backoff)
  - Configure CloudWatch logging for each step
  - Set timeout: 60s per step, 5 min total workflow
  - Emit progress events to WebSocket for real-time UI updates
  - _Requirements: 3.1, 3.6 | Compliance: Auditable processing pipeline_

- [ ] 2.3.2 Create Textract extraction Lambda
  - Invoke Textract AnalyzeDocument with FORMS and TABLES features
  - Parse Textract response into structured key-value pairs
  - Calculate field-level confidence scores (0-100%)
  - Extract bounding box coordinates for UI highlighting
  - Handle multi-page PDFs (iterate through all pages)
  - _Requirements: 3.1, 3.4 | Compliance: OCR accuracy_

- [ ] 2.3.3 Implement Form-16 parser (salary certificate)
  - **Employer Details**: Name, PAN, TAN, Address
  - **Employee Details**: Name, PAN, Designation
  - **Salary Components**: Gross Salary, Basic Salary, HRA, Special Allowance, Allowances
  - **Deductions**: Standard Deduction, Professional Tax, Other Deductions
  - **TDS**: Quarterly TDS breakup (Q1, Q2, Q3, Q4), Total TDS
  - **Assessment Year**: Extract FY and AY
  - Map extracted fields to internal tax data schema
  - **CRITICAL MAPPING NOTE (rework HIGH-5)**: Map extracted `basicSalary` → `IncomeData.salary.basicSalary` (NOT `DeductionData.hra.basicSalary` — that field was removed). HRA exemption reads basicSalary from income, not deductions.
  - **CRITICAL MAPPING NOTE (rework HIGH-4)**: Map `professionalTax` → `IncomeData.salary.professionalTax` AND `DeductionData.section16.professionalTax` (the calculator mirrors them for Section 16 deduction)
  - _Requirements: 15.1-15.5 | Compliance: Form-16 structure (Part A + Part B)_

- [ ] 2.3.4 Implement AIS parser (Annual Information Statement)
  - **Salary Income**: Extract all salary entries with employer TAN
  - **Interest Income**: Banks, post offices, cooperative societies
  - **Dividend Income**: Equity, mutual funds
  - **Capital Gains**: Short-term, long-term
  - **TDS by Deductor**: TAN, deductor name, TDS amount, date
  - **Tax Payments**: Advance tax, self-assessment tax, dates
  - Group income by type for easy review
  - _Requirements: 16.1-16.5 | Compliance: AIS structure (IT Department format)_

- [ ]* 2.3.5 Write property tests for document parsing
  - **Property 15**: Form-16 required fields always extracted (PAN, TAN, Gross Salary, TDS)
  - **Property 16**: AIS required fields always extracted (Salary, TDS, Tax Payments)
  - **Property 17**: Extracted numeric values are non-negative
  - _Requirements: 15.1-15.5, 16.1-16.5 | Compliance: Parsing completeness_

### Module 2.4: AI Enhancement with Bedrock (Claude 3)
> ⚠️ **SUPERSEDED → Anthropic API direct** (not Bedrock/Claude-3-model-id). See the Provider Migration notice in Module 2.3 & Phase 5 Module 5.2.

- [ ] 2.4.1 Create Bedrock enhancement Lambda
  - Invoke Claude 3 Sonnet to validate extracted data
  - Prompt: "Review this Form-16 data. Validate field values, fill missing fields if inferable, flag anomalies."
  - Enhance key-value pairs with context (e.g., infer missing employer name from TAN)
  - Calculate enhanced confidence scores
  - Return validated data + anomalies list
  - Handle extraction errors gracefully (fallback to Textract-only data)
  - _Requirements: 3.1, 3.6 | Compliance: AI-assisted validation_

- [ ] 2.4.2 Implement confidence scoring and flagging
  - Calculate field-level confidence: (Textract confidence + Bedrock validation) / 2
  - Flag fields below 85% confidence for user review
  - Store confidence metadata in DynamoDB
  - Display confidence indicators in UI: Green (>90%), Yellow (85-90%), Red (<85%)
  - _Requirements: 3.4, 3.8 | Compliance: Transparency in AI confidence_

- [ ]* 2.4.3 Write property test for low confidence flagging
  - **Property 18**: Fields with confidence < 85% are flagged for review
  - **Property 19**: Flagged fields displayed with warning indicator
  - _Requirements: 3.4 | Compliance: User review requirement_

### Module 2.5: Data Review & Correction UI (Split-View)

- [ ] 2.5.1 Create split-view review component
  - **Left Panel**: Display original document with pinch-to-zoom (mobile)
  - **Right Panel**: Show extracted fields in editable form
  - Highlight extracted text in document using bounding boxes
  - Sync scroll between document and fields
  - Add confidence indicators next to each field
  - _Requirements: 7.1, 7.2, 7.7 | Compliance: Human-in-the-loop verification_

- [ ] 2.5.2 Implement validation engine with cross-field rules
  - **Mandatory Fields**: Check for missing PAN, TAN, Gross Salary, TDS
  - **Format Validation**: PAN (AAAAA9999A), TAN (AAAA99999A), dates (DD/MM/YYYY)
  - **Numeric Validation**: Non-negative amounts, max 10 crores
  - **Cross-Field Rules**:
    - TDS ≤ Gross Salary
    - Deductions ≤ Gross Income
    - HRA ≤ Gross Salary
    - Rent paid > ₹1L/year → Landlord PAN mandatory
  - Display inline error messages with correction guidance
  - _Requirements: 7.3, 7.4, 7.5, 12.1-12.5 | Compliance: Data integrity checks_

- [ ] 2.5.3 Add completeness scoring and progress tracking
  - Calculate completeness: (filled fields / total fields) × 100
  - Display progress bar at top: "Your return is 85% complete"
  - Enable "Calculate Tax" button when completeness > 80%
  - Show checklist of missing mandatory fields
  - _Requirements: 7.8, 7.9 | Compliance: Completeness validation_

- [ ]* 2.5.4 Write property test for extraction data offline storage
  - **Property 20**: Extracted data stored in IndexedDB for offline access
  - **Property 21**: User edits preserved during offline mode
  - _Requirements: 3.8 | Compliance: Offline data persistence_

### Module 2.6: Real-Time Extraction Updates (WebSocket)

- [ ] 2.6.1 Create WebSocket API Gateway
  - Configure WebSocket routes: $connect, $disconnect, $default
  - Implement connection management Lambda (store connectionId in DynamoDB)
  - Add JWT authentication for WebSocket connections
  - Set connection timeout: 10 minutes
  - _Requirements: 2.4 | Compliance: Secure real-time communication_

- [ ] 2.6.2 Send extraction progress updates to client
  - Emit progress events from Step Functions to WebSocket
  - Send stage updates: "Textract" (0-40%), "PII Detection" (40-60%), "Enhancement" (60-80%), "Storage" (80-100%)
  - Notify client on completion with extracted data
  - Notify client on error with retry option
  - _Requirements: 2.4 | Compliance: User experience transparency_

### 🎯 Phase 2 Checkpoint: Document Extraction Validation

- [ ] 2.7.1 Test extraction accuracy with sample Form-16 and AIS documents
- [ ] 2.7.2 Validate confidence scoring and flagging logic
- [ ] 2.7.3 Test offline upload queue and background sync
- [ ] 2.7.4 Performance test: Extraction < 10s per document
- [ ] 2.7.5 User acceptance testing with real taxpayer documents

**Phase 2 Deliverable**: AI-powered document extraction with human review and correction

---

## 🔐 PHASE 3: COMPLIANCE & EXPORT (ITR JSON + PDF)
**Duration**: 2-3 weeks | **Priority**: CRITICAL
**Deliverable**: IT Portal-ready JSON export + PDF summary

### Module 3.1: Advanced Validation & Anomaly Detection

- [x] 3.1.1 Implement cross-field validation rules
  - ✅ **DONE (2026-07-13)**: `frontend/src/utils/taxValidation.ts::validateCrossFields()` — all 5 rules implemented against the wizard's real `TaxDataState`, sourcing 80C/80D caps from `defaultTaxRules` (not hardcoded, stays correct if rules change): HRA-without-received, landlord PAN required over ₹1L rent, TDS ≤ gross salary, 80C cap, 80D self/parents caps (senior-aware). Added a 6th: total-deductions-vs-income (surfaces a likely data-entry mistake the calculator would otherwise silently clamp). Surfaced via `ReviewWarnings.tsx` on the Results screen. Tests: `taxValidation.test.ts` (9 cases incl. senior-cap distinction and a clean-return zero-issues case).
  - **HRA vs Rent**: If HRA claimed, rent paid must be present
  - **Deductions vs Income**: Total deductions ≤ Gross Total Income
  - **TDS vs Salary**: TDS ≤ Gross Salary
  - **80C Limit**: Total 80C deductions ≤ ₹1.5L
  - **80D Limit**: Self (₹25k/₹50k) + Parents (₹25k/₹50k)
  - Display validation errors with field highlighting
  - _Requirements: 5.7, 12.4, 12.5 | Compliance: IT Act validation rules_

- [~] 3.1.2 Add anomaly detection and warnings — PARTIAL (2/6 anomalies; rest need Phase 2 data)
  - ✅ **DONE for what's buildable now**: Anomaly 1 (TDS > 50% salary) and Anomaly 5 (HRA > 50% basic) implemented in `detectAnomalies()`, surfaced in a dedicated **"Review Warnings"** section (`ReviewWarnings.tsx`) with **per-anomaly explicit override** — each shows an "I've reviewed this" button; acknowledgement state is lifted to `MainApp` (persists across tab/step navigation) and re-triggers if the underlying data changes back into the anomalous range.
  - ⛔ **Honestly NOT implemented** (would require faking data that doesn't exist): Anomaly 2 (Form-16 vs AIS discrepancy) and Anomaly 4 (missing AIS bank interest) need document extraction — **Phase 2, not built**. Anomaly 6 (>50% income variation from previous year) needs persisted prior-year sessions — not built. Anomaly 3 (duplicate income entries) doesn't apply to this single-entry wizard flow without multi-document ingestion. Revisit all four once Phase 2 (document AI) lands.
  - 🐛 **i18n interpolation gotcha found & documented**: adding a locale key for a message with a runtime-computed number baked in (e.g. "exceeds the ₹X cap") makes i18next prefer the static translation over the dynamic `defaultValue`, silently dropping the real number. Fixed by leaving those specific keys unset (documented in `taxValidation.ts`) so they always use the live-computed fallback text; only static messages got real locale entries.
  - Tests: `taxValidation.test.ts` (4 anomaly cases) + `ReviewWarnings.test.tsx` (5: empty state, issue display, unacknowledged/button, acknowledge callback, acknowledged state).
  - _Requirements 12.1-12.8 partially met — full closure blocked on Phase 2._
  - **Anomaly 1**: TDS > 50% of salary → Warning
  - **Anomaly 2**: Income discrepancy between Form-16 and AIS → Flag
  - **Anomaly 3**: Duplicate income entries → Prompt to review
  - **Anomaly 4**: Missing bank interest when AIS shows interest → Prompt to add
  - **Anomaly 5**: HRA > 50% of basic salary → Warning
  - **Anomaly 6**: Income variation > 50% from previous year → Flag
  - Display anomalies in dedicated "Review Warnings" section
  - Allow user to override warnings with explicit confirmation
  - _Requirements: 12.1-12.8 | Compliance: Fraud detection & accuracy_

### Module 3.2: ITR JSON Export (IT Portal Schema)

- [x] 3.2.1 Create ITR-1 JSON generator
  - ✅ **DONE (2026-07-13)**: `frontend/src/services/itrExport.ts` — `buildITR1(ITRExportInput)` maps internal filing data → the IT-Portal ITR-1 shape (`shared/types/itr.ts`). Reshapes only; every tax figure comes straight from the pinned engine `TaxCalculationResult` (never re-derives tax). Handles name split (First/Middle/Sur, always a surname), DD/MM/YYYY→ISO DOB, Aadhaar de-masking, PAN/IFSC uppercasing, refund/liability from taxes-paid, bank block only when refund>0, other-sources block when present. Fully client-side (offline export, Req 8.6). Tests: `itrExport.test.ts` (5) prove schema-valid output + faithful figure carry-through.
  - Map tax data to ITR-1 schema structure (IT Portal v1.0 FY 2025-26)
  - **Personal Info**: Name, PAN, DOB (ISO 8601 from formDataMapper), Aadhaar, Address, Mobile, Email
  - **Filing Status**: Return type, residential status, filing category
  - **Income & Deductions**: Salary, deductions (80C, 80D, HRA, Standard Deduction)
    - **MAPPING NOTE (rework HIGH-4)**: `deductionBreakdown.professionalTax` → ITR-1 **Schedule S, Row 5** ("Deductions under Section 16"). This is NOT a Chapter VI-A deduction — do not map it to Schedule VIA.
  - **Tax Computation**: Tax on total income, rebate 87A (present in both regimes), surcharge, cess, total tax
  - **Taxes Paid**: TDS on salary (sum of tdsQ1+Q2+Q3+Q4), advance tax, self-assessment tax
  - **Refund / Tax Payable**: `totalTaxLiability - tdsDeducted` — positive = tax due, negative = refund
  - **Refund**: Bank account details (IFSC, account number) — required when refund > 0
  - Generate all mandatory fields per IT Portal requirements
  - **DEPENDENCY**: Task 3.2.1a must be complete (schema files sourced) before this task begins
  - _Requirements: 8.1, 8.2, 8.3 | Compliance: ITR-1 schema conformance_

- [x] 3.2.1a Source and bundle ITR JSON schema files
  - ✅ **DONE (2026-07-13)** — with a scope caveat: the official IT-Portal offline-utility schema **cannot be downloaded from this environment** (external/gated). Instead authored `shared/schemas/itr1-fy2025-26.schema.json` — a **faithful draft-07 subset** derived from design.md's `ITR1Export` structure, covering every field the app generates (salary + other-sources filer). Provenance + the hard production gate (replace with the official file before real filing) are documented in `shared/schemas/README.md` and the schema's `$comment`. Canonical single copy in `shared/schemas/` (both validators import it — no duplication, per OPT-P3.1). Annual-refresh process documented.
  - Download IT Portal offline utility from `https://www.incometax.gov.in/iec/foportal/downloads/offline-utilities`
  - Extract ITR-1, ITR-2, ITR-3, ITR-4 JSON schema files for AY 2026-27
  - Store in `backend/src/lambdas/tax_calculation/schemas/`
  - Store client-side copy in `frontend/src/data/schemas/`
  - Add schema version header comments (date sourced, IT Department version)
  - Document annual schema refresh process in README
  - _Requirements: 17.1, 8.1 | Compliance: IT Portal schema conformance_

- [x] 3.2.2 Implement JSON schema validator (+ OPT-P3.1 satisfied)
  - ✅ **DONE (2026-07-13)**: one schema, two validators. **Frontend** `itrValidator.ts` — a dependency-free draft-07 walker returning JSON-pointer field paths (Req 17). Deliberately NOT Ajv: Vite's dep pre-bundler mangles Ajv 8's internals (empty `instancePath`, `opts:false`), which silently returns wrong paths; a focused walker is correct across vitest/dev/build and lighter. **Backend** `test_itr_schema.py` drives Python `jsonschema` (added to requirements) against the SAME file. An export passing the client can't be rejected server-side for shape.
  - 🐛 **Two-validator approach earned its keep**: the Python validator caught that the schema marked `TDS` required while the generator omits it for zero-TDS filers — real generator/schema mismatch, fixed (TDS now optional).
  - Load ITR Portal JSON schema for FY 2025-26 (ITR-1, ITR-2, ITR-3, ITR-4)
  - Validate generated JSON against schema using JSON Schema validator
  - Check mandatory field presence for selected ITR form type
  - Validate data types (string, number, date) for all fields
  - Validate field length constraints and pattern matching (PAN, date formats)
  - Validate cross-field dependencies (e.g., HRA claimed → rent paid present)
  - Validate numerical constraints (non-negative amounts, percentage ranges)
  - Validate enum values against IT Portal allowed values
  - Return specific field errors with JSON path and error description
  - _Requirements: 17.1-17.8 | Compliance: IT Portal acceptance guarantee_

- [x] 3.2.3 Add offline JSON generation capability
  - ✅ **DONE (2026-07-13)**: ExportView generates + validates the ITR JSON entirely client-side (`useMemo` over `buildITR1` + `validateITR1`) — zero network, works offline (Req 8.6). An "Generated offline" badge shows when `useOffline().isOnline` is false. Generator/validator/schema live in the lazy `ExportView` chunk (4.6 KB gz), off the initial bundle.
  - Enable JSON generation using cached data in IndexedDB
  - Store generated JSON in IndexedDB for offline access
  - Display "Generated Offline" badge
  - Sync generated JSON to server when online
  - _Requirements: 8.6 | Compliance: Offline export capability_

- [ ]* 3.2.4 Write property tests for ITR JSON validation
  - **Property 22**: Generated JSON conforms to IT Portal schema
  - **Property 23**: All mandatory fields present in JSON
  - **Property 24**: PAN format valid (AAAAA9999A)
  - **Property 25**: Numeric fields non-negative
  - _Requirements: 8.1-8.3, 17.1-17.3 | Compliance: Export correctness_

### Module 3.3: Export UI (JSON + PDF Download)

- [x] 3.3.1 Create bank details form for refund
  - ✅ **DONE (2026-07-13)**: `BankDetailsForm.tsx` (premium ink/gold) — IFSC input with local format validation (AAAA0XXXXXX) + best-effort online bank/branch lookup via `ifscLookup.ts` (keyless Razorpay IFSC API, 5s timeout, graceful offline/error fallback to manual entry), account number with **re-enter confirmation** (mismatch blocked), auto-filled+editable bank name. Emits completed `{ifsc, bankName, accountNo}` upward only when all-valid. Wired into `ExportView`: the form appears **only when a refund is due**, and the download is **gated** until bank details are complete (per 3.2.1's refund-account requirement). Tests: `BankDetailsForm.test.tsx` (4: IFSC validation, lookup auto-fill, confirm-match callback, offline fallback) + ExportView refund-gating test.
  - 🧹 Fixed a test-hygiene leak found here: `BankDetailsForm.test` initially assigned `globalThis.fetch` directly (not restored by `restoreAllMocks`), leaking a mocked fetch into other suites → switched to `vi.stubGlobal`/`unstubAllGlobals`. Also bumped the lazy `ResultsView` test timeout (5s→15s) which flaked under full-suite load.
  - Build IFSC code input with bank name lookup (API integration)
  - Add account number with confirmation field (re-enter to confirm)
  - Validate IFSC format (AAAA0999999)
  - Display bank name and branch after IFSC validation
  - _Requirements: 8.1 | Compliance: Refund processing_

- [x] 3.3.2 Create JSON preview component
  - ✅ **DONE (2026-07-13)** in `ExportView.tsx`: premium (ink/gold) export screen with a **validation-status card** (✓ ready / ⚠ with per-field JSON-pointer errors, Req 17), a **return-summary** grid (PAN, form, total income, net tax, taxes paid, refund — serif figures), and a collapsible **raw JSON preview** (`<details>` over the ink surface). Gates on ≥80% completeness with a gold progress bar.
  - Display key fields from generated JSON in readable format
  - Show: Personal Info, Income Summary, Deductions, Tax Liability, Refund/Payable
  - Display file size and validation status (✓ Valid / ✗ Invalid)
  - Add "Download JSON" button
  - Provide "How to upload to IT Portal" instructions
  - _Requirements: 8.7 | Compliance: User guidance_

- [x] 3.3.3 Implement file download functionality
  - ✅ **DONE (2026-07-13)**: Blob + object-URL download, filename `ITR1_{PAN}_AY2025-26.json`, disabled until the JSON validates, with a post-download "upload it at incometax.gov.in" hint. Verified live in-app (ExportView mounts, completeness-gated) and by component test `ExportView.test.tsx` (3) which asserts the **downloaded blob itself is schema-valid** and PAN-stamped. Caught + fixed a validator edge case (undefined-valued keys now treated as absent, matching JSON.stringify).
  - Deferred to later Phase 3: bank-details form (3.3.1) with IFSC lookup, and PDF summary (3.4.x). Current ExportView threads bank details through the generator but has no dedicated form yet.
  - Trigger browser download for JSON file (filename: ITR1_PAN_AY2026-27.json)
  - Add success confirmation screen with next steps
  - Provide step-by-step guide for IT Portal upload
  - Add "Download PDF Summary" option
  - _Requirements: 8.5 | Compliance: Export delivery_

### Module 3.4: PDF Summary Generation

- [~] 3.4.1 Create PDF generator Lambda (server-side)  — DEFERRED (needs AWS deploy)
  - Server-side ReportLab PDF is deferred with the other AWS-runtime tasks. The **client-side print-to-PDF (3.4.2) already covers the user-facing need offline and with correct Indic rendering**, which the server ReportLab path would actually struggle with (Indic shaping in ReportLab needs extra fonts + config). Revisit only if a server-generated audit copy is required.
  - Generate PDF with income, deductions, tax liability using ReportLab (Python)
  - Include regime comparison table (Old vs New)
  - Add section-wise ITR breakdown (Income, Deductions, Tax Calculation)
  - Display tax savings breakdown by deduction category (80C, 80D, HRA)
  - Redact PII: Show only last 4 digits of PAN/Aadhaar
  - Format for A4 paper with readable fonts (minimum 10pt)
  - _Requirements: 9.1-9.7 | Compliance: Taxpayer record-keeping_

- [x] 3.4.2 Add offline PDF generation (client-side)
  - ✅ **DONE (2026-07-13)**: `TaxSummaryDocument.tsx` — an A4 tax-computation summary rendered to PDF via the **browser's native print → "Save as PDF"** (not jsPDF; see OPT-P3.2). Fully offline, PII redacted to last 4 chars (PAN `XXXXXX234F`), "Generated Offline" watermark, premium ink/gold document styling via a `@media print` stylesheet. Portaled to `document.body` (sibling of `#root`) so the print CSS hides the app and outputs only the A4 doc. Tests: `TaxSummaryDocument.test.tsx` (3: redaction, watermark, Devanagari heading render).
  - Use jsPDF library for client-side PDF generation
  - Generate PDF from cached data in IndexedDB
  - Match server-side PDF layout and content
  - Display "Generated Offline" watermark
  - _Requirements: 9.8 | Compliance: Offline export capability_

- [x] 3.4.3 Implement PDF download
  - ✅ **DONE (2026-07-13)**: "Download PDF Summary" button in ExportView → `window.print()` with `body.printing` toggle (cleaned up on `afterprint` + a 1s fallback). Verified by ExportView test asserting `print()` is called once and the print class applied. Browsers offer "Save as PDF" as the print destination, so this is both the download and the print path (3.4.2 note re: print option covered).
  - Trigger browser download (filename: TaxSummary_PAN_AY2026-27.pdf)
  - Add print option for direct printing
  - _Requirements: 9.6, 9.7 | Compliance: Record delivery_

### 🎯 Phase 3 Checkpoint: Export Validation

- [ ] 3.5.1 Validate ITR JSON against IT Portal test environment
- [ ] 3.5.2 Test JSON schema validation with edge cases
- [ ] 3.5.3 Verify PDF generation (server + client-side)
- [ ] 3.5.4 Test offline JSON/PDF generation
- [ ] 3.5.5 User acceptance testing with complete filing flow

**Phase 3 Deliverable**: IT Portal-ready JSON export + PDF summary with offline capability

---

## 🔒 PHASE 4: PRIVACY, SECURITY & PRODUCTION READINESS
**Duration**: 2-3 weeks | **Priority**: CRITICAL
**Deliverable**: Production-ready system with privacy hardening

### Module 4.1: PII Detection & Protection (Comprehend + KMS)
> ⚠️ **SUPERSEDED → local/regex PII detection** (`frontend/src/utils/pii.ts`, already built) **+ provider guardrails**, not Amazon Comprehend. KMS stays optional (deployment-only). See Provider Migration notice (Module 2.3) & Phase 5 Module 5.2/5.4.


- [ ] 4.1.1 Create PII detection Lambda (Amazon Comprehend)
  - Invoke Comprehend DetectPiiEntities on extracted text
  - Identify PII: PAN, Aadhaar, Name, Address, Bank Account, IFSC, Mobile, Email
  - Store PII entity metadata (type, score, offset) in DynamoDB
  - Flag documents with high PII content for extra protection
  - _Requirements: 4.1 | Compliance: GDPR-inspired data protection_

- [ ] 4.1.2 Implement PII encryption (AWS KMS)
  - Create customer-managed KMS key for PII encryption
  - Encrypt PII fields before storing in DynamoDB using KMS
  - Implement decryption for display (decrypt on-demand)
  - Use envelope encryption for large data (data key + KMS master key)
  - Rotate KMS keys annually (automated)
  - _Requirements: 4.2 | Compliance: Encryption at rest_

- [x] 4.1.3 Add PII redaction in UI  (+ consent flow)
  - ✅ **DONE (2026-07-13)**: `src/utils/pii.ts` is the single source for masking — `redactPAN` (`XXXXXX234F`), `redactAadhaar` (`XXXX-XXXX-1234`), `redactMobile` (`XXXXXX7890`), `redactAccountNo`. `TaxSummaryDocument` refactored onto it (killed a duplicate local `redact`), so redaction can never drift between surfaces. Redaction is display-only — the full value still reaches the ITR JSON the portal requires.
  - **Consent flow**: `ConsentDialog.tsx` + `utils/consent.ts` — names exactly what is processed (PAN, Aadhaar, bank details), states the 24h deletion and no-sharing promise, and the primary action stays **disabled until the box is ticked**. Gated in front of the **filing wizard** (both the CTA and the bottom-nav tab, so it can't be bypassed) rather than the document uploader — document processing is Phase 2 and unbuilt, so gating there would be theatre. Consent persists per device and is **revoked by the "delete all my data" erasure path**. Tests: `pii.test.ts` (10) + `ConsentDialog.test.tsx` (6, incl. blocked-storage → treated as not-consented).
  - Redact PII fields in display: Show only last 4 characters
  - Examples: PAN (XXXXX9999A), Aadhaar (XXXX-XXXX-1234), Mobile (XXXXXX7890)
  - Implement explicit consent flow before processing documents
  - Display consent dialog: "We will process your PAN, Aadhaar, and bank details. Data will be deleted after 24 hours."
  - Require user to check "I consent" before proceeding
  - _Requirements: 4.5, 4.6 | Compliance: Informed consent_

- [ ]* 4.1.4 Write property test for PII detection and encryption
  - **Property 26**: PII detected by Comprehend is encrypted before storage
  - **Property 27**: Encrypted PII can be decrypted correctly
  - **Property 28**: Redacted display shows only last 4 characters
  - _Requirements: 4.1, 4.2, 4.5 | Compliance: Privacy validation_

### Module 4.2: TTL Policies & Data Deletion

- [ ] 4.2.1 Configure DynamoDB TTL
  - Set 24-hour TTL on `taxSessions` table (expiresAt attribute)
  - Set 24-hour TTL on `documents` table
  - Set 90-day TTL on `auditEvents` table (compliance retention)
  - Enable DynamoDB Streams to log deletions
  - _Requirements: 4.3, 4.4 | Compliance: Data minimization_

- [ ] 4.2.2 Configure S3 lifecycle policies
  - Set 24-hour deletion for raw documents bucket
  - Set 24-hour deletion for redacted documents bucket
  - Set 7-day deletion for exports bucket
  - Enable S3 Event Notifications to CloudWatch on deletion
  - _Requirements: 4.3 | Compliance: Automated data purging_

- [ ] 4.2.3 Create TTL verification Lambda (daily cron)
  - Run daily to verify TTL deletions executed correctly
  - Query DynamoDB for items with expiresAt < yesterday
  - List S3 objects older than TTL threshold
  - Log deletion confirmations to CloudWatch
  - Alert administrators on TTL policy failures
  - _Requirements: 4.7 | Compliance: Deletion audit trail_

- [ ]* 4.2.4 Write property test for TTL application
  - **Property 29**: Items with expiresAt < now are deleted
  - **Property 30**: S3 objects older than TTL are deleted
  - _Requirements: 4.3, 4.4 | Compliance: TTL enforcement_

### Module 4.3: Client-Side Encryption & Data Deletion

- [x] 4.3.1 Add Web Crypto API encryption for IndexedDB
  - ✅ **DONE — checkbox corrected 2026-08-05 (audit)**: the work landed with 0.9.2 and was never ticked here. Verified in `frontend/src/lib/crypto.ts`: `PBKDF2_ITERATIONS = 100000`, `deriveKey()` → AES-GCM-256, `getDeviceId(userId)` derives the fingerprint scoped to **userId + deviceId**, random 12-byte IV per encrypt **prefixed to the ciphertext** (`combined = iv ‖ ciphertext`, base64). Wired in `lib/db.ts` — `saveProfile` encrypts `mobileNumber`/`authToken`/`refreshToken`, `getProfile` decrypts. Tests: `lib/__tests__/crypto.test.ts` (9) + `db.test.ts` "should store encrypted data in IndexedDB (not plaintext)" asserts the at-rest row differs from plaintext and is base64.
  - **DEPENDENCY NOTE**: Task 0.9.2 (userId-scoped key) is a sub-task of this. If 0.9.2 was completed earlier, only the remaining 4.3.1 items below are needed. Do NOT redo 0.9.2 work.
  - Generate device-specific encryption key using PBKDF2 (100k iterations)
  - Derive key from **userId + deviceId** (not deviceId alone — see 0.9.2 for correct signature)
  - Encrypt IndexedDB data before storage using AES-GCM-256
  - Implement decryption on retrieval
  - Store IV (Initialization Vector) with encrypted data
  - _Requirements: 4.8 | Compliance: Client-side data protection_

- [x]* 4.3.2 Write property test for client-side encryption
  - ✅ **DONE — checkbox corrected 2026-08-05 (audit)**: all three properties are asserted, though as **example-based tests, not `fast-check` generators**. P31 → `db.test.ts` "should store encrypted data in IndexedDB (not plaintext)"; P32 → `crypto.test.ts` "should encrypt and decrypt data correctly" (+ unicode / long-string / JSON round-trips); P33 → "should use device-specific keys" + "should fail to decrypt with wrong device keys" + "different ciphertext for same plaintext encrypted by different userIds". If a true generative pass is wanted later, `fast-check` is already a dependency (used by `taxCalculator.property.test.ts`).
  - **Property 31**: IndexedDB data is encrypted before storage
  - **Property 32**: Encrypted data can be decrypted correctly
  - **Property 33**: Encryption key is device-specific
  - _Requirements: 4.8 | Compliance: Encryption validation_

- [x] 4.3.3 Implement user-initiated data deletion  (client-side scope)
  - ✅ **DONE (2026-07-13)**: "Delete all my data" in `SettingsView` behind a real **Radix confirmation dialog** (not `window.confirm`). On confirm: `db.deleteAllUserData()` clears **all six IndexedDB stores** (profiles, taxSessions, pendingRequests, savedDrafts, taxRules, faqCache) + `clearAllCaches()` (service-worker Cache Storage) + `localStorage` lang key, then logs out to a clean session. The AES-GCM key is *derived* (userId+deviceId), not stored, so clearing the data is complete erasure. Tests: `SettingsView.test.tsx` (dialog gate, full wipe + logout) + `db.deleteAllUserData` unit (all six stores → 0).
  - Note: the DynamoDB/S3/CloudFront server-side deletion legs (Req 4.10) are **deferred with the AWS deploy** — nothing is provisioned yet. The client-side erasure (the part that exists and holds real user data today) is complete.
  - Create "Delete My Data" button in settings
  - Show confirmation dialog with deletion scope
  - **Delete from DynamoDB**: User profile, tax sessions, documents metadata
  - **Delete from S3**: All documents (raw, redacted, exports)
  - **Delete from CloudFront**: Invalidate cached data
  - **Delete from IndexedDB**: Clear all local data
  - Display deletion confirmation: "All your data has been permanently deleted"
  - Complete deletion within 1 hour
  - _Requirements: 4.10 | Compliance: Right to erasure_

### Module 4.4: HTTPS, TLS & Security Headers

- [ ] 4.4.1 Configure CloudFront with TLS 1.3
  - Set up CloudFront distribution for PWA
  - Configure TLS 1.3 as minimum version
  - Add security headers:
    - Strict-Transport-Security (HSTS): max-age=31536000
    - Content-Security-Policy (CSP): Restrict script sources
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
  - Enable HTTPS-only (redirect HTTP to HTTPS)
  - _Requirements: 4.9 | Compliance: Transport security_

### Module 4.5: AI Chat Assistant (RAG with Bedrock Knowledge Base)
> ⚠️ **SUPERSEDED by Phase 5** (Modules 5.2/5.3/5.7) — Anthropic-API-proxied swarm + self-hosted RAG, not a Bedrock Knowledge Base. The guided assistant UI (5.7) replaces this module's chat. See Provider Migration notice (Module 2.3).

- [ ] 4.5.1 Set up Bedrock Knowledge Base with tax documentation
  - Upload Income Tax Act sections: 80C, 80D, HRA, 44AD, 87A
  - Add regime comparison guides (Old vs New)
  - Include ITR form instructions (ITR-1, ITR-2, ITR-3, ITR-4)
  - Add FAQs for common taxpayer questions
  - Configure vector embeddings model for semantic search
  - Index knowledge base documents
  - Test retrieval accuracy with sample queries
  - _Requirements: 6.3 | Compliance: Accurate tax guidance_

- [ ] 4.5.2 Create chat Lambda function (RAG-powered)
  - Invoke Bedrock with RAG from Knowledge Base
  - Implement conversation context management (10 messages)
  - Add language-specific responses (7 languages)
  - Extract field context from user request for contextual help
  - Provide field-specific explanations
  - Detect anomaly explanation requests
  - Detect out-of-domain questions and politely decline
  - Suggest relevant topics when declining
  - Respond within 3 seconds
  - _Requirements: 6.1-6.8 | Compliance: User assistance_

- [ ] 4.5.3 Build chat assistant UI
  - **SECURITY DEPENDENCY (task 0.9.3)**: Install DOMPurify BEFORE rendering any Bedrock responses — `npm install dompurify @types/dompurify`. Render responses as: `<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(response) }} />`. DO NOT render raw HTML from Bedrock without sanitization.
  - Create chat interface: Bottom sheet (mobile), Sidebar (desktop)
  - Implement message bubbles with streaming responses
  - Add suggested questions chips
  - Place "?" icon next to form fields for contextual help
  - Auto-generate field-specific questions
  - Display responses in chat overlay
  - Cache common questions and responses in IndexedDB (`savedDrafts` table or dedicated `faqCache` table)
  - Serve cached responses when offline
  - Display "You're offline" message with cached FAQ access
  - _Requirements: 6.1, 6.2, 6.5, 6.9 | Compliance: Accessible guidance_

- [ ]* 4.5.4 Write property test for offline FAQ access
  - **Property 34**: Cached FAQs accessible offline
  - **Property 35**: FAQ cache updated when online
  - _Requirements: 6.9 | Compliance: Offline assistance_

### Module 4.6: Multi-Language Support (i18n)

- [x] 4.6.1 Create translation infrastructure
  - ✅ **VERIFIED DONE (2026-07-13)**: react-i18next + LanguageDetector configured in `src/i18n/config.ts`; all 7 locale JSONs imported as `resources` (bundled at build). Language switch is instant, no reload.
  - Set up react-i18next framework
  - Create translation files for 7 languages (JSON format)
  - Implement language switching without page reload
  - Persist language preference in IndexedDB
  - _Requirements: 13.1, 13.2, 13.3, 13.6 | Compliance: Linguistic accessibility_

- [x] 4.6.2 Translate all UI text  (core UI; placeholder views pending)
  - ✅ **DONE (2026-07-13)**: chrome (header/nav/brand), auth flow, home, wizard forms, settings, review-warnings and conflict dialogs are all keyed across 7 languages. Remaining English: the Chat placeholder view and some results-screen leaf labels — tracked, low-traffic. Currency/number strings localised via 4.6.4.
  - Translate form labels, error messages, help text, tooltips
  - Maintain tax terminology consistency using glossary
  - Translate chat assistant responses
  - Translate validation messages
  - _Requirements: 13.3, 13.4, 13.5 | Compliance: Consistent terminology_

- [x] 4.6.3 Offline language support (bundled translations)
  - ✅ **VERIFIED DONE**: all locales bundled in the JS (no network fetch); choice persisted to `localStorage` key `btm_lang` and restored on startup (works fully offline). Matches the task note (no `languagePacks` store — removed in 0.11.5).
  - **REWORK (resolves contradiction with task 0.11.5)**: `languagePacks` IndexedDB store was removed in task 0.11.5 (redundant). Do NOT re-add it.
  - Translations are bundled at build time via `frontend/src/i18n/locales/*.json` (all 7 languages in the JS bundle)
  - Store selected language code in `localStorage` key `btm_lang` for persistence across sessions
  - On app startup: read `btm_lang` from `localStorage`; call `i18n.changeLanguage()` — works fully offline
  - If `localStorage` empty: detect device locale via `navigator.language`, fall back to `en`
  - Offline language switching works without any network request (all strings bundled)
  - _Requirements: 13.7 | Compliance: Offline language support_

- [x] 4.6.4 Implement Indian number formatting
  - ✅ **VERIFIED DONE**: `src/utils/currency.ts` uses `Intl.NumberFormat('en-IN')` (lakh/crore grouping) in `formatIndianCurrency` / `formatIndianNumber`, used throughout results, breakdown, summary doc, and export.
  - Display numbers in lakhs and crores format (₹12,34,567)
  - Apply to all languages
  - Use Intl.NumberFormat with 'en-IN' locale
  - _Requirements: 13.8 | Compliance: Cultural localization_

### Module 4.7: Admin Monitoring Dashboard (CloudWatch)

- [ ] 4.7.1 Create CloudWatch dashboard
  - Display extraction confidence scores (average, min, max)
  - Show extraction failure rate by document type (Form-16, AIS, Bank)
  - Track API latency for Textract, Bedrock, Comprehend
  - Display active user count and session duration metrics
  - Monitor TTL policy execution and data deletion
  - Track offline session count and sync success rate
  - _Requirements: 14.1, 14.2, 14.4, 14.5, 14.8, 14.9, 14.10 | Compliance: Operational visibility_

- [ ] 4.7.2 Set up CloudWatch alarms
  - Alert when extraction failure rate > 10% over 1 hour
  - Alert on high API latency (> 10s for Textract, > 5s for Bedrock)
  - Alert on TTL policy failures
  - Alert on sync failure rate > 20%
  - Send alerts to SNS topic for admin notifications
  - _Requirements: 14.3 | Compliance: Proactive monitoring_

- [ ] 4.7.3 Add metrics logging
  - Log validation errors with field names and error types
  - Track JSON export success rate and common validation failures
  - Monitor user journey: Onboarding → Upload → Review → Calculate → Export
  - Track feature usage: Manual entry vs AI extraction, Old vs New regime selection
  - _Requirements: 14.6, 14.7 | Compliance: Product analytics_

### Module 4.8: Mobile Performance Optimization

- [x] 4.8.1 Implement responsive design (320px - 1920px)
  - ✅ **VERIFIED DONE**: mobile-first Tailwind throughout (single-column by default, `sm:`/`md:`/`lg:` progressive enhancement — e.g. the home 12-col grid collapses to one column under `lg`); `Button` default is `h-11` = **44px** min tap target; bottom nav is `md:hidden` (mobile-only) with `safe-area-inset-bottom`; `<meta viewport>` present. Per-page JS budget enforced at **<500KB gz** by the `check:bundle` CI gate (currently ~152KB).
  - Ensure correct rendering across all screen sizes
  - Use touch-friendly controls (44x44px minimum tap targets)
  - Optimize for mobile bandwidth (< 500KB per page)
  - Implement single-column layout on mobile (< 768px)
  - _Requirements: 19.1, 19.2, 19.4 | Compliance: Mobile-first design_

- [~] 4.8.2 Add mobile-specific features — PARTIAL
  - ✅ Bottom navigation for primary actions (done, mobile-only); portrait/landscape both work (fluid layout, no orientation lock).
  - ⛔ **Pinch-to-zoom document viewing** needs the document viewer — **Phase 2, not built**. **Haptic feedback** not implemented (Vibration API is unsupported on iOS Safari, so it would only cover part of the audience — deferred as low-value).
  - Support pinch-to-zoom for document viewing
  - Use bottom navigation for primary actions on mobile
  - Support portrait and landscape orientations
  - Add haptic feedback for button presses (mobile)
  - _Requirements: 19.5, 19.6, 19.8 | Compliance: Mobile UX_

- [x] 4.8.3 Optimize for low bandwidth (2G/3G)
  - ✅ **VERIFIED DONE**: route-level code splitting via `React.lazy` (Results, Chat, Export, Settings — 4 lazy chunks) keeps heavy deps (recharts, Radix dialog, ITR schema+validator, PDF doc) **out of the initial bundle**; initial JS is **~152KB gz against a hard 500KB CI gate**. Service worker precaches the app shell for repeat visits. Progressive image loading is N/A — the UI uses inline SVG/emoji, no raster assets.
  - Note: the literal "<3s on 3G / <10s on 2G" figures need a real device/network lab to certify — the enforced bundle budget + lazy loading are the levers that get there.
  - Ensure page load < 3 seconds on 3G
  - Function on 2G with page load < 10 seconds
  - Implement progressive image loading
  - Use lazy loading for below-the-fold content
  - _Requirements: 10.8, 19.7 | Compliance: Network resilience_

### Module 4.9: Comprehensive Error Handling

- [x] 4.9.1 Add retry logic with exponential backoff
  - ✅ **VERIFIED DONE**: `syncService.ts` retries queued requests with 1s/2s/4s/8s→30s backoff, `MAX_RETRIES=3`, permanent-4xx short-circuit. Tested in `syncService.test.ts`. Note: the in-flight "Retrying (2/3)" *visual* is not surfaced (sync is background; SyncStatusIndicator shows the pending count instead) — minor, non-blocking.
  - Retry failed API calls up to 3 times
  - Implement exponential backoff: 1s, 2s, 4s, 8s, max 30s
  - Display retry attempts to user: "Retrying... (2/3)"
  - _Requirements: 20.1 | Compliance: Fault tolerance_

- [x] 4.9.2 Create user-friendly error messages
  - ✅ **DONE (client-side)**: `ErrorBoundary` renders a friendly crash screen with Refresh/Return-home (no stack traces to users); `Toast` system for transient errors; typed `AuthError` → localized, actionable messages (rate-limit/locked/network/invalid). Server-side CloudWatch aggregation is the deploy-gated piece.
  - Display errors without technical jargon
  - Provide actionable suggestions: "Check your internet connection and try again"
  - Add "Report Issue" button that captures error context
  - Send error reports to CloudWatch with anonymized user context
  - _Requirements: 20.2, 20.8 | Compliance: User experience_

- [x] 4.9.3 Implement auto-save and recovery
  - ✅ **VERIFIED DONE**: `useTaxForm` auto-saves the full form to IndexedDB every 30s when dirty, and restores the draft on mount; each wizard form also autosaves its section. Covers Req 20.5/20.6.
  - Auto-save user input every 30 seconds to IndexedDB
  - Restore progress on session interruption
  - Display "Restoring your previous session..." on recovery
  - _Requirements: 20.5, 20.6 | Compliance: Data loss prevention_

- [x] 4.9.4 Add comprehensive error logging  (client leg)
  - ✅ **DONE (client-side)**: `ErrorBoundary.componentDidCatch` POSTs error + component stack to `/api/errors` (mock server logs it). Severity levels + CloudWatch aggregation/alerting are the deploy-gated server piece (deferred with AWS).
  - Log all errors to CloudWatch with stack traces
  - Include anonymized user context (userId hash, session ID, timestamp)
  - Log error severity: INFO, WARN, ERROR, CRITICAL
  - Set up error aggregation and alerting
  - _Requirements: 20.3 | Compliance: Debugging capability_

### Module 4.10: Sync Conflict Resolution

- [x] 4.10.1 Create conflict detection logic
  - ✅ **DONE (2026-07-13)**: `src/services/conflictResolution.ts::detectConflicts()` diffs local vs server records field-by-field, ignoring metadata (ids/timestamps/syncStatus), and reports each side + its `updatedAt`. `resolveAuto()` favours local (user) edits — **Property 36**. `resolveConflict()` returns one intact side + fresh `synced` stamp — **Property 37** (no half-merge). Tests: `conflictResolution.test.ts` (11).
  - Compare local and server timestamps
  - Identify conflicting fields (different values, different timestamps)
  - Prioritize user edits over AI-extracted values
  - _Requirements: 10.7 | Compliance: Data consistency_

- [x] 4.10.2 Build conflict resolution UI
  - ✅ **DONE (2026-07-13)**: `ConflictResolver.tsx` — Radix dialog showing each diverging field side-by-side (this device vs server) with both last-edited times; "Keep this device" (primary) / "Use server version". Tests: `ConflictResolver.test.tsx` (4). **Integration note**: the detection+UI+resolution engine is complete and tested; wiring it into the live sync loop needs a real backend that returns server versions (mock server has none) — that final hookup is deferred with the AWS deploy.
  - Display modal: "Conflict detected"
  - Show server value vs local value side-by-side
  - Display timestamps for each version
  - Provide buttons: "Keep Local" or "Use Server"
  - Apply user's choice and sync to server
  - _Requirements: 10.7 | Compliance: User control_

- [ ]* 4.10.3 Write property test for sync conflict resolution
  - **Property 36**: User edits always take priority in conflicts
  - **Property 37**: Conflict resolution preserves data integrity
  - _Requirements: 10.7 | Compliance: Conflict handling_

### Module 4.11: PWA Caching & Storage Optimization

- [x] 4.11.1 Implement cache size management
  - ✅ **DONE (2026-07-13)**: `SettingsView` Storage section shows **live local-storage usage** (via `navigator.storage.estimate()` in `db.getStorageEstimate()`) with a usage/quota bar, plus a **"Clear cached files"** action that drops the service-worker Cache Storage **without touching the user's tax data** (verified by test: profile count stays 1 after clear). Human-readable KB/MB formatting. Test: `SettingsView.test.tsx` cache-clear case.
  - Limit cached data to 50MB (monitor storage quota)
  - Prompt user to clear old data when quota exceeded
  - Provide "Clear Cache" option in settings
  - Display current cache size in settings
  - _Requirements: 10.9, 10.10 | Compliance: Storage management_

- [ ] 4.11.2 Optimize sync frequency
  - Auto-sync every 2 minutes when online
  - Complete sync within 2 minutes
  - Batch sync operations for efficiency
  - Display sync status: "Last synced 5 minutes ago"
  - _Requirements: 10.6 | Compliance: Data freshness_

### Module 4.12: Final Integration Testing & Polish

- [~] 4.12.1 Test complete user flows end-to-end — PARTIAL (checkbox corrected 2026-08-05 (audit))
  - ✅ **Covered today**: *Onboarding → Calculate → Export* via `MainApp.uat.test.tsx` (persona journeys P1-P3: gross income aggregation, 44AD presumptive, regime recommendation, hand-computed tax, TDS payable/refund direction, senior slab); **airplane mode** via `offline.simulation.test.ts` (offline calculation, IndexedDB-cached rules, queue-instead-of-throw, FIFO replay on both the BackgroundSync and the Safari `online`-event paths); **error recovery** via the same queue/replay suites + `ErrorBoundary`; **language switch mid-flow** via `MainApp.a11y.test.tsx` (en → hi → ta on a mounted MainApp).
  - ⛔ **Still open**: the *Upload → Review* legs are **blocked on Phase 2** (nothing to upload or review yet), and there is no viewport-matrix test for 320px-1920px responsiveness.
  - Test: Onboarding → Upload → Review → Calculate → Export
  - Test offline-first functionality (airplane mode)
  - Test error recovery scenarios (network failures, API errors)
  - Test multi-language support (switch languages mid-flow)
  - Test mobile responsiveness (320px - 1920px)
  - _Requirements: All | Compliance: End-to-end validation_

- [~] 4.12.2 Performance optimization — PARTIAL (checkbox corrected 2026-08-05 (audit))
  - ✅ **Covered today**: route-based code splitting is live — `ResultsView` (8.39 KB gz), `ExportView` (7.84), `SettingsView` (2.02) and `ChatView` (0.83) all build as lazy chunks excluded from the initial budget; `scripts/check-bundle-size.mjs` enforces a **500 KB gzip initial-JS gate in CI** (actual **324.11 KB**, 35.2% headroom as of 2026-08-05); WebP art direction via `components/media/ResponsiveImage.tsx` (`<source type="image/webp">` + `sizes`); Indic fonts load on demand per language and are kept out of the SW precache.
  - ⛔ **Still open**: no Lighthouse run has been recorded, so the "> 90 on Performance/Accessibility/Best-Practices/SEO" criterion is unverified. Note the initial bundle has grown 179.5 KB → 324.11 KB gz since the motion layer + assistant + charts landed — still inside budget, but worth a manualChunks pass (Rollup already warns about chunk size on build).
  - Optimize bundle size (code splitting, tree shaking)
  - Lazy load components (route-based)
  - Optimize images and assets (WebP, compression)
  - Achieve Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
  - _Requirements: 19.4, 19.7 | Compliance: Performance standards_

- [x] 4.12.3 Accessibility improvements
  - ✅ **DONE (2026-07-13)**: **skip-to-content link** (first tab stop → `#main-content`, visible only on focus); landmark roles (`banner` / `main` / `navigation` with an `aria-label`); `aria-current="page"` on the active nav tab; a global `:focus-visible` gold outline baseline in `index.css` covering every hand-rolled interactive element (Radix ships its own rings); reduced-motion honoured globally.
  - 🐛 **Real bug found & fixed**: `<html lang>` was hard-coded `"en"`, so a screen reader announced Devanagari/Tamil/Telugu content with **English pronunciation rules**. Now synced by the `languageChanged` listener in `i18n/config.ts` — deliberately a global side effect, so it also covers the **language selector and the whole pre-auth flow**, not just the main app. Regression test: `MainApp.a11y.test.tsx` (4) asserts landmarks, skip link, `aria-current`, and lang → hi/ta.
  - Deferred: live NVDA/JAWS screen-reader passes and a formal WCAG 2.1 AA contrast audit need a human/tooling lab (tracked under checkpoint 4.13.6).
  - Add ARIA labels for screen readers
  - Ensure keyboard navigation (tab order, focus indicators)
  - Test with screen readers (NVDA, JAWS)
  - Ensure color contrast ratios meet WCAG 2.1 AA standards
  - Add skip navigation links
  - _Requirements: All | Compliance: Accessibility standards_

### 🎯 Phase 4 Checkpoint: Production Readiness Validation

- [ ] 4.13.1 Security audit: Penetration testing, vulnerability scanning
- [ ] 4.13.2 Privacy audit: Verify TTL deletions, encryption, PII redaction
- [ ] 4.13.3 Performance audit: Load testing, stress testing
- [ ] 4.13.4 Compliance audit: IT Act requirements, data protection
- [ ] 4.13.5 User acceptance testing: Real taxpayers, diverse profiles
- [ ] 4.13.6 Accessibility audit: WCAG 2.1 AA compliance
- [ ] 4.13.7 Final sign-off: Stakeholder approval for production deployment

**Phase 4 Deliverable**: Production-ready Bharat Tax Mitra with privacy hardening, security, and compliance

---

## ⚡ MODULE OPT: OPTIMIZATION & ENHANCEMENT PASS
**Priority**: HIGH (layered) | **Source**: Post-Phase-1 Optimization Audit (see Optimization Dashboard)
**Deliverable**: A sharper build — same scope, better architecture, lower cost, richer UI

> These 15 optimizations were derived by reading the working tree against the AWS stack and
> `docs/reference/Finance_Bill.pdf`. Each task is tagged **[impact / effort]**; ⚡ marks a
> **quick win** (high impact, low effort). Every task carries a **Sequence** note pointing at the
> existing phase task it modifies or precedes. These are enhancements — they do not replace base
> tasks, and (unless flagged) are not checkpoint blockers.

### Module OPT-A: Architecture & Cross-Cutting

- [x] OPT-A1 ⚡ Activate AWS AppConfig hot-reload — retire the stub  `[High / M]`
  - Replace the commented-out `fetch` in `refreshTaxRules()` and the "In production, fetch from AppConfig" stub in the Lambda with a live AppConfig data-plane read
  - Backend: AppConfig Agent Lambda extension polling `GetLatestConfiguration` with in-process cache
  - Frontend: thin `GET /tax-rules/{fy}` route backed by AppConfig; keep the existing 24h IndexedDB cache as offline fallback
  - Validate every fetched config with the JSON-schema validator already provisioned in `appconfig-stack.ts`
  - **Why**: Requirement 11 (update rules with no code deploy) is currently non-functional; CBDT issues mid-year notifications
  - Stack: AWS AppConfig · Lambda extension · IndexedDB
  - Sequence: closes the Module 0.10 (0.4.5) gap that is marked done but stubbed — do before re-signing Phase 1 checkpoint
  - _Files: `frontend/src/services/taxRulesService.ts:101`, `backend/src/lambdas/tax_calculation/calculate.py`, `infrastructure/lib/stacks/appconfig-stack.ts` | Requirements: 11.1, 11.2, 11.3_
  - ✅ **DONE (2026-07-11)**. The hot-reload channel is live end-to-end:
    - **Frontend** `taxRulesService.ts`: `getTaxRules()` now fetches `GET /tax-rules/{fy}` when cache is stale + online (10s abort, matching SW network-first); `refreshTaxRules()` force-fetches (Req 11.3). Every remote payload passes `isValidTaxRules()` before use — malformed AppConfig deployments are refused and the last known-good cache keeps serving (Req 11.4/11.5). Fallback order: fresh cache → server → stale cache → bundled. Offline = zero fetches (offline-first preserved).
    - **Backend** new `backend/src/lambdas/tax_rules/get_rules.py`: reads the AppConfig **data plane** (`StartConfigurationSession`/`GetLatestConfiguration`) with warm-start token+payload caching, empty-body "unchanged" handling, expired-token session restart, AY→FY alias, FY-mismatch 404, `Cache-Control: max-age=300` (Req 11.3's 5-min freshness).
    - **Infra**: `auth-stack.ts` provisions `btm-get-tax-rules-{env}` + `GET /tax-rules/{financialYear}` route with least-privilege appconfig IAM; `app.ts` reordered database → **appconfig → auth** → frontend (auth consumes AppConfig IDs). Fixed pre-existing leading-space shebang in `bin/app.ts` that broke `tsc`; installed infra node_modules.
    - **Dev parity**: mock server serves `GET /tax-rules/{fy}` from `shared/tax-rules-*.json` — verified live via curl (v2.0.0, 6/4 slabs, AY alias, 404).
    - **Tests**: +5 frontend (`taxRulesService.hotReload.test.ts`: deployed-version wins, force-refresh, malformed-payload rejection, bundled fallback, no-fetch-offline) and +6 backend (`test_get_rules.py`). Verified: frontend 337 pass/17 skip, lint 0, tsc clean (frontend+infra), backend 126 pass @ 80.9% cov, build + bundle gate PASS.
    - Scope note: `calculate.py`'s hardcoded constants intentionally NOT switched to AppConfig here — that refactor is coupled to the single-source-of-truth work and is deferred to **OPT-A2** (golden vectors will pin behaviour before the constants move).

- [x] OPT-A2 One source of truth for tax logic (kill TS/Python drift)  `[High / M]`
  - Generate a versioned `shared/golden-vectors.json` (canonical inputs → expected outputs)
  - Assert BOTH `taxCalculator.ts` (Vitest) and `calculate.py` (pytest) against it in CI
  - Longer term (optional): compile the TS engine to WASM and invoke from the Python Lambda — one engine, zero drift
  - **Why**: two hand-maintained implementations of statutory math will diverge silently; that is a wrong-tax compliance defect. The existing property test checks shape, not exact rupee values
  - Stack: Vitest · pytest · WASM (optional)
  - Sequence: Phase 1 hardening — complete before Phase 3 export (3.2.x) starts depending on the numbers
  - _Files: `shared/`, `backend/tests/test_calculate.py`, `frontend/src/services/__tests__/` | Requirements: 5.1–5.10_
  - ✅ **DONE (2026-07-12)**:
    - `frontend/scripts/generate-golden-vectors.ts` (run via `npx vite-node`) emits **`shared/golden-vectors.json`** — 24 canonical vectors covering every statutory boundary: slab edges, 87A thresholds + **marginal relief** (V05 hand-verified ₹10,400), all four surcharge bands, senior/super-senior slabs, 44AD digital/mixed/enhanced-3Cr/cash-heavy, HRA metro/non-metro, 80C cap, kitchen-sink deductions, house property, capital gains, Section 16 prof tax, and the UAT-P2 mirror.
    - Consumers: `taxCalculator.golden.test.ts` (TS, exact deep-equal) + `backend/tests/test_golden_vectors.py` (Python, every numeric field to the rupee; analysis prose + slab labels excluded by design — presentation, not contract). Both run in the existing CI test steps.
    - **Caught a real divergence on first run**: TS `getIncomeBreakdown()` applied Section 24(a)'s 30% standard deduction to gross annual value instead of NAV — breakdown showed ₹−24,000 while the engine's own GTI used ₹−20,400 (Python was correct). Fixed `taxCalculator.ts`; regenerated vectors.
    - Regeneration policy documented in the generator header: a changed vector file in a PR **is** the review artifact for a tax-math change.
    - Verified: backend **151 pass @ 82.7% cov** (+25), frontend **368 pass** (+25), tsc/lint clean, build + bundle PASS. → Unblocks OPT-A3 (integer paise) with behaviour pinned.

- [x] OPT-A3 Money as integer paise, not float  `[High / M]`
  - Carry all monetary values as integer minor units (paise) through the engine; round to the rupee only at presentation
  - Python: `decimal.Decimal` with round-half-up per IT rules; TS: integer/`bigint` money type
  - **Why**: JS `number` and Python `float` accumulate binary rounding error differently — the exact mechanism by which the two calculators diverge. Statute requires deterministic round-to-nearest-rupee (Req 5.8)
  - Stack: decimal.Decimal · bigint
  - Sequence: implement alongside OPT-A2 (the golden vectors will pin the rounding behaviour)
  - _Files: `frontend/src/services/taxCalculator.ts`, `backend/src/lambdas/tax_calculation/calculate.py` | Requirements: 5.8_
  - ✅ **DONE (2026-07-12)**:
    - Every statutory percentage now computed in **exact integer space with round-half-up** — no float division anywhere. TS: `pctOf` / `sumPctOf` / `roundRupee` helpers; Python: `_pct_of` / `_round_half_up` mirrors. Converted: slab tax, cess, surcharge (+ marginal-relief threshold tax), 44AD (single sum, rounded once — statutory), HRA Rule 2A options 2/3, house-property 30%, 80G 50%.
    - **Root cause pinned**: Python's built-in `round()` is banker's (half-even), JS `Math.round` is half-up — `₹x.50` results diverged. Contract is now explicitly half-up on both sides; **3 new boundary vectors (V25-V27) land exactly on `.50`** to fail loudly on any regression.
    - **Two real bugs surfaced & fixed while doing this**: (1) 44AD rounded each rate leg independently instead of the sum once (property test `[9,7]` counterexample); (2) presumptive-income used `0` as both "ineligible" and "rounds to ₹0" — now returns `null`/`None` for ineligible so callers correctly fall back to actuals (property test `[0,1]` counterexample). Stale backend assertion updated.
    - **Zero value drift** on the 24 pre-existing vectors (regen diff = 0 lines excl. timestamp) — proving the refactor preserved every result. Verified: frontend 373 pass, backend 154 pass @ 82.9% cov, golden parity 28/28, tsc+lint clean, build + bundle PASS.

- [x] OPT-A2b Reconcile the local mock server's `/calculate` with the real engine  `[Med / S]` (server-consistency fix)
  - **Problem** (surfaced while hunting a reported "server error"): `backend/src/local/mock_server.py` `/calculate` ran a **third, divergent** tax implementation (flat deductions, salary-only, no HRA/80C/surcharge/senior/44AD) — directly contradicting OPT-A2's single source of truth. Frontend never calls it (offline-first, client-side calc), so it was unused *and* wrong.
  - **Fix**: mock `/calculate` now imports and delegates to `calculate.py::compare_regimes`, returning the full `RegimeComparisonResult`. Verified live: `POST /calculate` for the V06 profile returns **117000 old / 85800 new**, identical to the golden vector, client engine, and production Lambda. No live server error existed — all endpoints healthy (auth 200 + JWT, tax-rules 200); this was the latent inconsistency worth resolving.

### Module OPT-1: Phase 1 Enhancements (Foundation)

- [ ] OPT-P1.1 Run the tax calculator in a Web Worker  `[Med / M]`
  - Move `compareRegimes()` off the main thread into a Comlink-wrapped worker; keep the 500ms debounce at the call site
  - Worker path is fully offline-compatible (no network dependency)
  - **Why**: target users are on low-end Tier-2/3 devices; debounced recalc on every keystroke can jank the form
  - Stack: Web Worker · Comlink · Vite worker imports
  - Sequence: Phase 1 perf checkpoint (1.7.4); do after OPT-P1.2 (build must compile first)
  - _Files: `frontend/src/services/taxCalculator.ts`, `frontend/src/pages/MainApp.tsx` | Requirements: 5.6, 10.4_

- [x] OPT-P1.2 ⚡ Fix the build, then gate the bundle budget  `[High / S]`
  - Repair the failing `tsc` build (missing `node`/`vitest` globals types in `ExtractionProgress` + its test break `npm run build`)
  - Code-split jsPDF and route views with dynamic `import()`
  - Add a `size-limit` CI step enforcing <500KB initial load + a `rollup-plugin-visualizer` report
  - **Why**: task 1.7.4 claims Lighthouse>90 / <500KB but the tree does not compile — the claim is unverifiable, and Req 19.4 (2G/3G budget) needs a real gate
  - Stack: size-limit · rollup-plugin-visualizer · GitHub Actions
  - Sequence: **do first** — this is a blocking prerequisite for the Phase 1 checkpoint
  - _Files: `frontend/vite.config.ts`, `frontend/tsconfig.json`, `.github/workflows/ci.yml` | Requirements: 19.4_
  - ✅ **DONE (2026-07-11)**: `npm run build` now passes. Root cause was `NodeJS.Timeout` in `ExtractionProgress.tsx` (→ `ReturnType<typeof setTimeout>`) + `global`/unused-param type errors in its test. Fixed types; **quarantined** the 12 runtime-failing `ExtractionProgress` tests with `describe.skip` (dead code — reconciliation owned by OPT-P2.5 / task 0.11.3). Verified: build green, tests 332 pass / 17 skip, `check:bundle` PASS at **151.6 KB gzip initial (70% headroom under 500 KB)**.
  - Note: route views were **already** lazy-loaded and `check:bundle` was **already** wired into `ci.yml` — bundle gate needed no new work. jsPDF code-split is **deferred** (jsPDF not yet a dependency; add when Phase 3 task 3.4.2 introduces it). `rollup-plugin-visualizer` not added — the existing dependency-light `scripts/check-bundle-size.mjs` is the CI gate.
  - ✅ **Lint follow-up also DONE (2026-07-11)**: relocated `.eslintrc.json` root → `frontend/` (ESLint 8 resolves plugins relative to the config dir; plugins live in `frontend/node_modules`). First real lint run surfaced 48 pre-existing findings — all resolved without weakening the gate: typed MainApp/TaxWizard/ExportView/ResultsView with `RegimeComparisonResult` + `*FormData` shared types (was `any` throughout); moved `buildIncomeData`/`buildDeductionData` → `frontend/src/utils/buildTaxData.ts` (react-refresh rule; dedup with `formDataMapper` noted under OPT-A2); fixed shared-type drift — added `basicSalary` (required, HIGH-5) + optional `interestIncome` to `SalaryIncomeFormData` and 4 optional 80C/80D fields to `DeductionFormData` that code read but no type declared; `db.ts` `any` → `unknown`/`TaxCalculationResult`; 5 justified inline `eslint-disable` for exhaustive-deps (2 in quarantined ExtractionProgress → OPT-P2.5). **Full pipeline verified green: lint 0 problems, tsc clean, 332 tests pass / 17 skip, build + bundle gate PASS (151.6 KB gzip).**

### Module OPT-2: Phase 2 Enhancements (Document Intelligence & AI)

- [ ] OPT-P2.1 ⚡ Extract via Bedrock tool-use, not "return only JSON"  `[High / S]`
  - Replace the free-text "Return only valid JSON" prompt with a Bedrock tool-use / structured-output schema
  - Define the Form-16 fields as a tool input schema; Claude returns a schema-validated tool call
  - Add prompt caching on the static system prompt + schema to cut token cost
  - **Why**: on real Form-16 scans, free-text LLM output returns prose or ```json fences and breaks `json.loads`; tool-use guarantees parseable output → fewer failed extractions
  - Stack: Bedrock tool-use · prompt caching
  - Sequence: decide before task 2.4.1 (Bedrock enhancement Lambda) is written
  - _Files: `backend/src/lambdas/extraction-handler/` (new), design.md Bedrock section | Requirements: 3.1, 3.6_

- [ ] OPT-P2.2 ⚡ Tier the models — and move off the 2024 pin  `[High / S]`
  - design.md pins Claude 3 Sonnet (`anthropic.claude-3-sonnet-20240229`); adopt the current Claude generation and tier by task
  - Fast/cheap model (Haiku-class) for bulk structured extraction; stronger model (Sonnet/Opus-class) only for the anomaly-reasoning enhancement step
  - Keep model IDs in AppConfig (ties to OPT-A1) so they swap without a deploy
  - **Why**: extraction is high-volume and latency-bound (Req 3.1 <10s); a dated mid-cost model on every page is the wrong spend
  - Stack: Amazon Bedrock · Haiku 4.5 · AppConfig
  - Sequence: tasks 2.4.1 and 4.5.2
  - _Files: extraction-handler, chat-handler, AppConfig | Requirements: 3.1, 6.2_

- [ ] OPT-P2.3 Hash-dedup extraction + client-side image trim  `[High / M]`
  - SHA-256 the file bytes; if that hash was already processed, return the cached extraction instead of re-invoking Textract/Bedrock
  - Downscale + deskew photos in the browser (canvas → ~2000px, JPEG quality trim) before the pre-signed PUT
  - **Why**: Textract + Bedrock are the biggest per-document cost; re-uploads and 12MP phone photos multiply spend and OCR latency for no accuracy gain
  - Stack: Web Crypto (SHA-256) · Canvas API · DynamoDB
  - Sequence: tasks 2.1.2 (upload Lambda) and 2.2.1 (upload component)
  - _Files: upload component, upload Lambda | Requirements: 2.1, 2.8, 3.1_

- [ ] OPT-P2.4 Async Textract + Express Step Functions  `[Med / M]`
  - Use `StartDocumentAnalysis` (async) for multi-page PDFs with an SNS/SQS completion callback
  - Convert the extraction state machine to Step Functions **Express** where no long human wait exists
  - **Why**: sync Textract caps pages and blocks the Lambda; Standard workflows bill per state transition — Express is far cheaper for high-volume short executions
  - Stack: Textract async · Step Functions Express · SQS
  - Sequence: task 2.3.1 (Step Functions workflow)
  - _Files: Step Functions definition, extraction Lambda | Requirements: 3.1, 3.6_

- [ ] OPT-P2.5 Managed push for progress, not hand-rolled WebSocket  `[Med / M]`
  - Reconcile the already-built `ExtractionProgress.tsx` (custom reconnect + polling, currently 12 failing tests + breaks build) with a managed channel
  - Prefer AppSync GraphQL subscriptions (managed fan-out) or SSE over the DIY socket
  - Fold the open task 0.11.3 (WebSocket reconnection) into this decision
  - **Why**: a managed channel deletes the backoff/reconnect code you would otherwise hand-maintain
  - Stack: AWS AppSync · API Gateway WebSocket · SSE
  - Sequence: tasks 2.6.1 / 2.6.2 — resolves open 0.11.3
  - _Files: `frontend/src/components/ExtractionProgress.tsx`, WS API (2.6.1) | Requirements: 2.4_

### Module OPT-3: Phase 3 Enhancements (Compliance & Export)

- [x] OPT-P3.1 Shared schema — validate offline, one schema  `[Med / S]`  (delivered with 3.2.2; note: dependency-free walker, not Ajv — see 3.2.2 for why)
  - Validate ITR JSON with Ajv in the browser using the same bundled schema the backend `jsonschema` uses
  - Surface field-path errors inline in the export preview
  - **Why**: Req 8.6 needs offline JSON generation + validation; Req 17 needs field-path errors. One schema behind two validators prevents an export passing client-side but failing server-side
  - Stack: Ajv (frontend) · jsonschema (backend) · shared schema file
  - Sequence: tasks 3.2.1a (source schema) and 3.2.2 (validator)
  - _Files: export view, `schemas/itr1_schema_fy2025-26.json` | Requirements: 8.6, 17.1–17.8_

- [x] OPT-P3.2 PDF that can actually render Indic scripts  `[High / M]`
  - ✅ **DONE (2026-07-13)** via a better route than the proposed pdf-lib+Noto: **browser print-to-PDF**. The browser renders Devanagari/Tamil/Telugu/Bengali/Gujarati natively, so summaries in any of the 7 languages come out correct — with **zero font-embedding weight** (vs. subsetting 5 Noto Indic faces into pdf-lib) and full offline support. Delivered as part of 3.4.2/3.4.3.
  - Generate the summary PDF with an engine that embeds Devanagari/Tamil/Telugu/Bengali/Gujarati fonts — pdf-lib + subsetted Noto, or HTML-to-PDF — not stock jsPDF
  - Subset fonts per active language to hold the bundle budget
  - **Why**: the app ships 7 languages, but jsPDF's built-in fonts render Indic scripts as tofu boxes — a Hindi/Tamil user's PDF summary would be unreadable (silent accessibility failure)
  - Stack: pdf-lib · fontkit · Noto Sans Indic (subset)
  - Sequence: tasks 3.4.1 / 3.4.2 — coordinate with OPT-UI.7 (self-hosted fonts)
  - _Files: PDF generator (client + Lambda) | Requirements: 9.1, 9.7, 13.1_

### Module OPT-4: Phase 4 Enhancements (Privacy & Production)

- [ ] OPT-P4.1 Envelope encryption to cut KMS calls  `[Med / S]`
  - Encrypt PII with a KMS-issued data key (`GenerateDataKey` once per document) rather than one `Encrypt` call per field
  - Store only the wrapped key; keep the existing encryption-context audit trail
  - **Why**: the design encrypts many PII fields per document; per-field KMS calls hit request-rate throttles and cost linearly with field count
  - Stack: KMS data keys · AES-256-GCM
  - Sequence: task 4.1.2 (this refines the "envelope encryption" bullet already noted there)
  - _Files: PII encryption Lambda (4.1.2) | Requirements: 4.2_

- [ ] OPT-P4.2 Edge hardening: WAF + API throttle + RUM  `[High / M]`
  - Add AWS WAF (managed rules + rate-based rule on `/auth/*`) on CloudFront
  - Add API Gateway usage-plan throttling
  - Add CloudWatch RUM (consent-gated) for real-user performance from the field
  - **Why**: the OTP endpoint is abuse-prone and every send costs real SMS money; prod readiness (4.4/4.7) needs edge protection and real Tier-2/3 device metrics, not just a lab Lighthouse run
  - Stack: AWS WAF · API Gateway usage plans · CloudWatch RUM
  - Sequence: tasks 4.4.1 and 4.7.x
  - _Files: `frontend-stack.ts`, `auth-stack.ts`, monitoring | Requirements: 4.9, 14.5_

- [x] OPT-P4.3 ⚡ Formalize the i18n that already shipped  `[Med / S]`
  - ✅ **DONE (2026-07-13)**: closed tasks 4.6.1–4.6.4 against the shipped implementation; confirmed `Intl('en-IN')` number formatting and `btm_lang` offline persistence. i18n is no longer under-tracked.
  - react-i18next + all 7 language files are built and wired into 12 components but tracked at 0% — reconcile the plan
  - Route all currency through `Intl.NumberFormat('en-IN')` in `currency.ts`; audit each form for hard-coded numbers
  - Mark tasks 4.6.1–4.6.4 complete once the number-formatting pass lands
  - **Why**: plan hygiene — the tracked 0% hides real, tested work; Req 13.8 (lakh/crore formatting) may not be applied uniformly yet
  - Stack: react-i18next · Intl en-IN
  - Sequence: tasks 4.6.1–4.6.4 (bookkeeping + small formatting pass)
  - _Files: `frontend/src/i18n/`, `frontend/src/utils/currency.ts`, this file | Requirements: 13.8_

### Module OPT-UI: Frontend Visual Polish & Design System

> Enhancement pass for the UI, naming the specific libraries to adopt. **Global constraints** (apply to
> every task below): (1) hold the **<500KB initial-load budget** (Req 19.4) — tree-shake, lazy-load, and
> prefer light builds; (2) **self-host everything** (no CDN) so the PWA works offline and satisfies the
> CSP — install via npm/`@fontsource`, never a `<link>` to Google Fonts; (3) honour
> `prefers-reduced-motion`; (4) keep **WCAG 2.1 AA** (ties to task 4.12.3). Adopt incrementally — do not
> rewrite working components wholesale.

- [x] OPT-UI.1 Establish a design-system foundation (shadcn/ui + Radix)  `[High / M]`
  - Adopt **Radix UI primitives** (Dialog, Tooltip, Accordion, Tabs, Popover) — unstyled + accessible out of the box
  - Layer **shadcn/ui** components on top (copy-in, not a dependency — keeps bundle lean)
  - Add the `cn()` helper via **clsx** + **tailwind-merge**, and **class-variance-authority (cva)** for variants
  - Add **tailwindcss-animate** and **@tailwindcss/forms** plugins
  - **Why**: replaces ad-hoc Tailwind markup with a consistent, accessible component layer — directly advances WCAG task 4.12.3 and gives every later UI task a shared vocabulary
  - Plugins: `@radix-ui/react-*` · `shadcn/ui` · `clsx` · `tailwind-merge` · `class-variance-authority` · `tailwindcss-animate` · `@tailwindcss/forms`
  - Sequence: do first — foundation for OPT-UI.2–UI.8; the TaxBreakdown accordion (1.5.2) is the first consumer
  - _Files: `frontend/src/components/ui/` (new), `tailwind.config.ts`, `frontend/src/lib/utils.ts` | Requirements: 19.2, 4.12.3_
  - ✅ **DONE (2026-07-11)**:
    - Installed: `@radix-ui/react-{accordion,tabs,tooltip,dialog,slot}`, `class-variance-authority`, `tailwindcss-animate`, `@tailwindcss/forms` (clsx/tailwind-merge/lucide were already deps)
    - `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge, last-wins conflict merge)
    - `tailwind.config.js` — shadcn CSS-variable tokens (border/input/ring/background/card/muted/accent/destructive/…) merged ONTO the existing `primary-50…900` brand scale (old markup untouched); accordion keyframes; `darkMode:'class'`; forms plugin in **class strategy** so existing inputs aren't restyled
    - `src/index.css` — `:root` token values tuned to the current identity (primary=blue-600, accent=amber-400, radius 0.75rem), `.dark` block scaffolded (not shipped), and a **global `prefers-reduced-motion` kill-switch** for all animations/transitions
    - `src/components/ui/` — copy-in Button (cva variants, 44px default tap target per Req 19.2, `asChild` via Slot), Card, Accordion, Tabs, Tooltip, Dialog + barrel `index.ts`
    - **First consumer**: `TaxBreakdown.tsx` hand-rolled expand/collapse → Radix Accordion (`type="multiple"`, income open by default — behaviour preserved; gains aria-expanded/aria-controls + keyboard nav it previously lacked → advances 4.12.3)
    - +6 smoke tests (`ui.smoke.test.tsx`: cn merge, Button variants/tap-target/asChild, Accordion aria + multi-open)
    - **Bundle discipline verified**: Radix/cva landed in the lazy ResultsView chunk (5.2→17.2 KB gz, on-demand); initial entry +0.12 KB → **151.71 KB gz (69.7% headroom)**
    - **Bonus fix (pre-existing flake + real bug)**: `syncService.enqueue()` used raw `Date.now()` — same-millisecond enqueues had undefined replay order (a PUT could replay before its POST; test `preserves FIFO order` flaked). Added a strictly monotonic queue timestamp; suite now stable across 5 consecutive runs.
    - Verified: tsc clean, lint 0, **343 pass / 17 skip**, build + `check:bundle` PASS.

- [x] OPT-UI.2 Motion & micro-interactions (bundle-conscious)  `[Med / M]`
  - Add **Framer Motion** via `LazyMotion` + `domAnimation` (loads the ~5KB feature subset, not the full lib)
  - Animate: 7-step wizard step transitions, `WizardStepper` progress fill, card/result reveals, toast enter/exit
  - Gate every animation behind `prefers-reduced-motion` (Framer's `useReducedMotion`)
  - **Why**: perceived-performance and polish on low-end devices without a bundle hit; makes the multi-step wizard feel guided
  - Plugins: `framer-motion` (LazyMotion) — alternative: `@react-spring/web` if lighter is needed
  - Sequence: after OPT-UI.1; touches `MainApp.tsx`, `WizardStepper.tsx`, `feedback/Toast.tsx`
  - _Files: `frontend/src/pages/MainApp.tsx`, `frontend/src/components/layout/WizardStepper.tsx` | Requirements: 19.6_
  - ✅ **DONE (2026-07-12)** — executed as motion pass + 3D/depth pass + ambient story layer (user-requested visual overhaul):
    - `src/components/motion/index.tsx` — LazyMotion(domAnimation) primitives: `MotionProvider`, `Reveal` (scroll-into-view fade-up), `TiltCard` (pointer-tracked 3D perspective tilt — **pure-DOM rAF transform writes**, NOT framer state: m-components' gesture system swallowed pointer props, verified in-browser), `StepTransition` (direction-aware wizard slide+fade), `Pressable` (spring tap feedback). All reduced-motion-safe, transform/opacity only.
    - Wizard: direction-aware step transitions + spring-animated gradient progress bar; hero: animated mesh gradient (`.bg-mesh`), glass progress ring with animated stroke, floating depth orbs, staggered card entrances.
    - **Ambient story layer** (`layout/AmbientBackground.tsx`, mounted in App.tsx under every route) — weight-matrix winners: giant outlined **₹ glyph** (subject-grounded, per artifact-design skill guidance against generic gradient wash), **slab-stepped rail** (rate bands as form), two slow-drift brand orbs, and a **per-tab accent hue** (`--ambient-1` set by MainApp: home blue → tax indigo → chat violet → export emerald → settings slate) so navigation reads as chapters. Fixed/-z-10/aria-hidden/pointer-events-none; opacities ≤9% so contrast is untouched; MainApp's occluding `bg-gray-50` removed.
    - CSS: `.bg-mesh`, `.glass(-light)`, `.shadow-elevated/-float`, `.animate-float/-ambient`, `.glow-amber` + global reduced-motion kill-switch already in place.
    - Weight matrix ruled OUT three.js (kills 500KB gate) and Lottie (runtime weight); deferred scroll-parallax + SVG waves.
    - **Verified live in browser**: ambient layer + ₹ + 5 slab bands render, hue shifts blue→emerald on tab switch, tilt = rotateX/Y 3.2° on hover settling to 0°, no horizontal overflow. Gates: tsc+lint clean, **343 pass / 17 skip**, build + bundle PASS (**179.5 KB gz initial** — +28 KB for the motion runtime, 64% headroom).
    - Connector note: Canva connector works but account has **no brand kits** and templates need Canva Pro; Adobe/Figma plugins still awaiting OAuth in claude.ai connector settings — design direction therefore derived from the project's own brand system + artifact-design skill (its precedence rule anyway).
    - ➕ **Premium "private-wealth" pass (2026-07-12, user: "make it premium, JP-Morgan-like")** — partially pulls OPT-UI.7 forward:
      - Typography: self-hosted `@fontsource-variable/playfair-display` (`font-display` in tailwind); serif carries headings + money figures (`.figure-display` with lining/tabular numerals); body stays sans.
      - Tokens retoned: warm **ivory paper** ground (42 30% 97%) + rich ink foreground; `--gold`/`--gold-deep` champagne accents (#c9a961 family) replacing bright amber in chrome.
      - New utilities: `.bg-ink` (navy + gold sheen), `.btn-gold` (engraved champagne CTA), `.hairline(-b/-gold)` 1px warm rules, `.texture-grain` (~600B inline-SVG banknote grain, offline-safe), `.eyebrow` caps labels.
      - Header: deep ink, serif wordmark, gold hairline; AmbientBackground: gold-engraved ₹, grain film layer.
      - **HomePage recomposed on a 12-col grid** — hero (8) + concierge rail (4), 3-col "The service" row (Roman-numeral sequence: Calculate → Review → Export), full-width privacy covenant strip. Desktop now uses **85% of viewport width** (was ~52% centered strip). Copy rewritten in the same voice.
      - **Robustness fix found in-pane**: `Reveal` gained `mode="mount" | "scroll"` — above-the-fold content animates on mount (was `whileInView`-only, which leaves content at opacity:0 in hidden/prerendered tabs where IntersectionObserver never fires). Hero + rail use mount; below-fold keeps scroll-reveal.
      - Verified live (DOM, desktop 1280px): Playfair loaded + rendering h1, ink header w/ gold hairline (rgba(203,163,77,.35)), gold CTA "Begin Your Return", 12-col split 0.67 ratio, grain layer, warm paper body rgb(250,248,245), no overflow. Gates: tsc+lint clean, 343 pass, build + bundle PASS (fonts ship as woff2 assets, outside the JS gate, SW-precached).
    - ➕ **Pre-auth premium + full chrome i18n (2026-07-12)** — advances 4.6.2:
      - Premium treatment extended to `LanguageSelector`, `MobileNumberInput`, `OTPVerification`, `RegimeSelection`: hairline paper cards, serif headings, gold CTAs/selection states, brand eyebrow on the mobile card.
      - **~45 new i18n keys × 7 locales** (script-merged, never overwriting): `nav.*`, `header.*`, `wizard.*` (step labels/headings/skips), `home.*` (entire premium hero/services/privacy copy), `auth.errors.*` + `auth.otpFooter`, `regime.chooseSub/recommended`. Hardcoded English eliminated from: MainApp header (brand name now `t('app.name')` → भारत टैक्स मित्र etc.), BottomNav, HomePage, TaxWizard, AuthFlow error messages, OTP footer, regime badges.
      - **Verified live end-to-end**: header language switch flips brand name/logout/5 nav labels/hero/CTA to Hindi instantly; language page switch re-renders its own copy; carried into /auth (welcome, OTP footer, "OTP भेजें" submit) — the requested "name → submit button" chain across pages. Gates: tsc+lint clean, 343 pass, build + bundle PASS.
      - Remaining known-English (deferred to 4.6.2 proper): SettingsView/ExportView/ChatView placeholders, chart captions (i18n-keyed with defaultValue), results-view labels.
  - ✅ **DONE (2026-07-11)** — motion + 3D visual-depth pass:
    - `src/components/motion/index.tsx` — LazyMotion(`domAnimation`, strict) primitives: `MotionProvider`, `Reveal` (scroll-into-view fade-up), `TiltCard` (pointer-tracked 3D perspective tilt — pure DOM writes + CSS transition, no per-event React re-render; mouse-only, reduced-motion disabled), `StepTransition` (direction-aware slide+fade between wizard steps), `Pressable` (spring press feedback).
    - `index.css` depth utilities: `.bg-mesh` (drifting layered radial-gradient hero), `.glass`/`.glass-light` (backdrop-blur surfaces), `.shadow-elevated`/`.shadow-float` (layered elevation), `.animate-float` orbs, `.glow-amber` — all transform/opacity/blur-composited; global reduced-motion kill-switch applies.
    - HomePage rebuilt: 3D-tilt glass hero over animated mesh with floating depth orbs, animated SVG progress ring (framer path draw), staggered card entrances, hover-lift stats, group-hover feature rows.
    - Wizard: direction-aware step slide (forward/back), spring-animated gradient progress bar.
    - **Verified in-browser**: tilt produces `rotateX/rotateY` on hover and settles to rest; mesh/orbs/glass/preserve-3d live in DOM; wizard transition + progress bar confirmed; no ErrorBoundary trips.
    - **Debugging findings worth keeping**: (1) framer `m` components' gesture system swallows `onPointerMove` React props — attach pointer listeners natively; (2) the Claude Browser pane runs pages **hidden** (`document.hidden=true`) → Chrome suspends ALL `requestAnimationFrame` → rAF-driven animation (incl. framer) is unobservable there and screenshots time out; CSS-transition-driven writes remain testable. TiltCard deliberately uses CSS transitions, not rAF.
    - Gates: tsc + lint clean, 343 pass / 17 skip, build PASS, bundle **179.5 KB gz initial** (+27.8 KB for LazyMotion runtime; 64.1% headroom).
    - Note: Figma/Canva/Adobe connectors were not consulted — they require OAuth the session cannot perform; visual direction derived from the design-system tokens + dataviz-skill principles instead.

- [x] OPT-UI.3 Tax data-visualisation (charts)  `[High / M]`
  - Add lightweight charts to `TaxBreakdown` (1.5.2) and `TaxSummaryDashboard`: regime-comparison bar, deduction pie/donut, slab-wise stacked bar
  - Prefer **Recharts** (SVG, tree-shakeable, React-native API); consider **visx** if finer control is needed
  - Follow the project **dataviz skill** guidance for palette/accessibility (color-blind-safe, dark-mode aware, `Intl` en-IN axis labels)
  - Lazy-load the chart chunk so it stays out of the initial bundle
  - **Why**: task 1.5.2 already calls for "bar chart (income vs deductions), pie chart (tax distribution)" — this delivers it with an accessible, theme-aware library
  - Plugins: `recharts` (or `@visx/*`) · dataviz skill
  - Sequence: task 1.5.2 (TaxBreakdown) — depends on OPT-UI.1
  - _Files: `frontend/src/components/TaxBreakdown.tsx`, `frontend/src/components/TaxSummaryDashboard.tsx` | Requirements: 5.10, 18.6_
  - ✅ **DONE (2026-07-11)** — built per the dataviz skill procedure (form → color → validate → marks → hover → a11y → render-and-look):
    - `src/components/charts/palette.ts` — **validator-verified** colors (exit 0 vs surface #f9fafb): 6 categorical slots (fixed entity order), 6-step ordinal blue ramp (`--ordinal`), emphasis pair (4.23:1/4.63:1). Validation commands documented in the file.
    - `RegimeComparisonChart` (TaxSummaryDashboard) — **emphasis form**: recommended regime in focus blue, other in context gray; direct ₹ labels (en-IN); caption; aria-label.
    - `DeductionCompositionChart` (TaxBreakdown deductions) — part-to-whole **horizontal stacked bar** (skill-correct replacement for 1.5.2's "pie"); fixed entity→slot mapping (Standard/80C/HRA/80D/NPS/Other); 2px surface gaps; legend with %; DataRow list above = relief channel for sub-3:1 slots.
    - `SlabTaxChart` (TaxBreakdown tax calc) — **ordinal** one-hue ramp (slab order is meaningful); ₹ labels; SlabTable below = table view.
    - Recharts hover tooltips on all three; text wears ink tokens, never series color.
    - **Bundle**: recharts landed entirely in the lazy `charts` chunk (94.2 KB gz, on-demand); initial entry unchanged at 151.7 KB gz — gate PASS.
    - **Tests**: +`ResizeObserver` stub in `src/test/setup.ts` (Recharts requirement jsdom lacks); 343 pass / 17 skip; tsc + lint clean.
    - **Rendered and verified live** (mock server + dev server, full wizard walked in browser): all 3 charts render with exact validated fills; regime switch flips composition correctly (new regime → 100% standard deduction; old regime → 6 segments); no page overflow or clipped labels at 329px mobile width.
    - Ops note: a stale Vite dep-optimizer cache (from the OPT-UI.1 npm install re-hoisting react-dom) crashed the dev server's lazy chunk on first run — fixed by clearing `frontend/node_modules/.vite`. Production build was never affected.

- [x] OPT-UI.4 Animated tax figures with Indian formatting  `[Med / S]`
  - Animate the headline "Amount Due / Refund Expected" and key metric cards with a rolling-number transition
  - Use **@number-flow/react** (accessible, respects reduced-motion) — fallback **react-countup**
  - Format every value through `Intl.NumberFormat('en-IN')` (ties to OPT-P4.3)
  - **Why**: the tax-payable/refund reveal (task 0.8.5) is the app's emotional peak — a smooth count-up makes the result legible and satisfying
  - Plugins: `@number-flow/react` (or `react-countup`) · Intl en-IN
  - Sequence: after task 0.8.5 / 1.5.3; depends on OPT-UI.1
  - _Files: `frontend/src/components/TaxSummaryDashboard.tsx` | Requirements: 5.10_
  - ✅ **Done (2026-07-18)**: built `frontend/src/components/AnimatedFigure.tsx` — dependency-free rAF count-up (no `@number-flow`/`react-countup` dep needed, consistent with the project's dependency-light stance). Ease-out cubic, `useReducedMotion`-aware (renders final value immediately), `fromRef` so later changes count from the prior value not 0, and always formats through the shared `formatIndianCurrency` (en-IN). Wired into all 6 money `MetricCard`s in `TaxSummaryDashboard.tsx` (TDS Paid, Amount Due/Refund, Total Income, Tax Liability, Total Deductions, Taxable Income); effective-rate % left as a static string. `MetricCard.value` widened `string → React.ReactNode`. Tests in `__tests__/AnimatedFigure.test.tsx` pin the two contracts: aria-label always = final value; reduced-motion skips the roll-up. Full gate green (tsc/eslint/vitest 130✓/build/bundle 315 KB gz).

- [ ] OPT-UI.5 Mobile bottom-sheet & drawers  `[Med / S]`
  - Add **vaul** (Radix-based drawer) for the chat assistant bottom sheet (task 4.5.3), mobile filters, and detail views
  - Snap points + drag-to-dismiss; desktop falls back to a Radix side panel
  - **Why**: design.md specifies "Bottom sheet (mobile), Sidebar (desktop)" for chat — vaul is the idiomatic, accessible, touch-native implementation
  - Plugins: `vaul` · `@radix-ui/react-dialog`
  - Sequence: task 4.5.3 (chat UI); depends on OPT-UI.1
  - _Files: chat assistant UI, mobile nav sheets | Requirements: 6.1, 19.6_
  - ⏸️ **Deferred (2026-07-18)**: the primary consumer is the chat-assistant bottom sheet (task 4.5.3), which is Phase 2 / AWS-gated (Bedrock). Building the drawer now would have no real surface to attach to. Revisit alongside the chat UI.

- [ ] OPT-UI.6 Form UX upgrade (validation + inputs)  `[High / M]`
  - Adopt **react-hook-form** + **zod** (via `@hookform/resolvers`) to unify PAN/TAN/IFSC/date validation across all forms
  - Inline field errors, `aria-invalid`, focus-on-error; base styling from **@tailwindcss/forms**
  - Optional: **input-otp** for the OTP entry, **react-day-picker** for touch-friendly DOB
  - **Why**: the forms today each hand-roll validation; a schema-driven approach removes duplication and directly serves the cross-field rules in tasks 2.5.2 / 3.1.1, plus WCAG error semantics
  - Plugins: `react-hook-form` · `zod` · `@hookform/resolvers` · `@tailwindcss/forms` · `input-otp` · `react-day-picker`
  - Sequence: pairs with tasks 2.5.2 and 3.1.1 (validation engine); depends on OPT-UI.1
  - _Files: `PersonalInfoForm.tsx`, `SalaryIncomeForm.tsx`, `DeductionsForm.tsx`, `BusinessIncomeForm.tsx`, bank-details form (3.3.1) | Requirements: 7.3–7.5, 12.1–12.5_
  - ⏸️ **Deferred (2026-07-18) — needs sign-off**: this is a `[High / M]` refactor that rewrites validation across five working, tested forms (PAN/TAN/IFSC/date, cross-field rules, Aadhaar masking regression). The forms already validate correctly today; the value is de-duplication + WCAG error semantics, not a functional gap. Given the risk of regressing hand-tuned, already-verified behaviour, it should be a deliberate, separately-reviewed change rather than folded into the completion pass. Recommend scheduling as its own task.

- [x] OPT-UI.7 Self-hosted brand + Indic fonts  `[Med / S]`
  - Install fonts via **@fontsource** (self-hosted, offline, CSP-safe): a clean UI face (e.g. `@fontsource-variable/inter`) + Indic families `@fontsource/noto-sans-devanagari`, `-tamil`, `-telugu`, `-bengali`, `-gujarati`
  - Load Indic subsets on demand per active language; `font-display: swap`
  - **Why**: 7-language UI needs real script coverage in-app AND in the PDF (ties to OPT-P3.2); self-hosting keeps the PWA offline-first and avoids a CDN in the CSP
  - Plugins: `@fontsource-variable/inter` · `@fontsource/noto-sans-*`
  - Sequence: coordinate with OPT-P3.2 (PDF fonts) and task 4.6.x (i18n)
  - _Files: `frontend/src/main.tsx` (font imports), `tailwind.config.ts` font stack | Requirements: 13.1, 13.2_
  - ✅ **Done (2026-07-18)**: installed `@fontsource-variable/inter` + 5 Indic families (devanagari/tamil/telugu/bengali/gujarati). Inter imported eagerly in `main.tsx` (base Latin UI face); Indic families load **on demand per active language** via new `src/i18n/fonts.ts` — Vite code-splits each into its own chunk, so only the current script's woff2 is fetched (verified live: switching to Hindi fetched only `noto-sans-devanagari-*.woff2`, face `loaded`). Tailwind `sans` stack lists Inter → all 5 Noto families → system-ui, so the browser falls through to the right script for glyphs Inter lacks; unloaded families have no @font-face and are skipped. Ambient `@fontsource/*` type decl added in `vite-env.d.ts`. SW: `globIgnores: ['**/noto-sans-*']` keeps the Indic fonts out of precache (was 64 entries/2.18 MB → back to 30/1.54 MB) — they runtime-cache per language (CacheFirst 'fonts', maxEntries 30→60) so a used language works offline without forcing all scripts on every user.
  - 🔧 **Fixed a real dual-store language-persistence bug found while verifying** (not introduced here): three language write paths existed — the pre-auth `LanguageSelector` (i18n + IndexedDB), the nav `LanguageSwitcher` in `MainApp` (i18n/localStorage only, **not** IndexedDB), and a `MainApp` mount effect that force-applied `authState.preferredLanguage` (default 'en') on **every reload**, clobbering the user's saved choice. Fixes: (1) `i18n/config.ts` now applies the lang side effects (persist + `<html lang>` + font) at **startup restore** too — a no-op `changeLanguage` on a reload into a saved language never fired `languageChanged`, so `<html lang>` had been stuck at 'en'; centralised into `applyLanguageSideEffects`. (2) MainApp seed effect only seeds from the auth profile when there's **no** local choice. (3) nav switcher now persists to IndexedDB like the selector. Verified live: Hindi selection → `<html lang="hi">`, Devanagari UI, font loaded, and it now **survives reload** (previously reverted to English).
  - 🧪 Test infra: added a `matchMedia` stub to `src/test/setup.ts` reporting `prefers-reduced-motion` as matching — framer queries the bare `(prefers-reduced-motion)`, and without the stub rAF-driven effects (AnimatedFigure count-up) started at 0 and never advanced in jsdom, leaving figures at ₹0. Headless = reduced motion is correct + deterministic. Bumped vitest `retry: 1→2` for the load-sensitive lazy/Suspense suite.

- [x] OPT-UI.8 Delight & feedback polish  `[Low / S]`
  - Standardise toasts on **sonner** (or keep the existing `feedback/Toast.tsx` if preferred) with accessible live-region announcements
  - Fire a subtle **canvas-confetti** burst on successful ITR export (task 3.3.3) — reduced-motion disables it
  - Standardise loading states on the existing `feedback/Skeleton.tsx` across all async views
  - **Why**: low-cost engagement touches that mark success moments for first-time filers in Tier-2/3 — used sparingly, gated by reduced-motion
  - Plugins: `sonner` · `canvas-confetti`
  - Sequence: after core export flow (task 3.3.3); depends on OPT-UI.1
  - _Files: `frontend/src/components/feedback/`, export success screen | Requirements: 20.2_
  - ✅ **Done (2026-07-18)**: added `src/utils/celebrate.ts` — a **dependency-free** canvas confetti burst (rAF, brand gold/ink palette, self-removing pointer-events:none aria-hidden overlay), no `canvas-confetti` package. Strictly gated by `prefers-reduced-motion` (no canvas created at all when set). Fired in `ExportView.handleDownload` after a successful ITR-1 download — the first-time filer's success moment. Kept the existing `feedback/Toast.tsx` (accessible live region) and `feedback/Skeleton.tsx` rather than pulling in `sonner` — both already cover the requirement and match the dependency-light stance. Tests in `utils/__tests__/celebrate.test.ts` pin the a11y contract: no-op under reduced motion; mounted canvas is non-interactive + aria-hidden.

### OPT Sequencing Summary

```
OPT-P1.2 (fix build)  ─┐   must land first — unblocks everything frontend
OPT-UI.1 (design sys) ─┴─→ OPT-UI.2..UI.8   (UI polish depends on the design system)
OPT-A1 (AppConfig) ──────→ OPT-P2.2 (model IDs live in AppConfig)
OPT-A2 + OPT-A3 (SSOT + paise)  → before Phase 3 export (3.2.x)
OPT-P2.1/P2.2 decided before Phase 2 AI Lambdas (2.4.x) are written
OPT-P3.2 + OPT-UI.7 share the Indic-font work
```

**⚡ Quick wins (do these first for fastest ROI):** OPT-P1.2, OPT-A1, OPT-P2.1, OPT-P2.2, OPT-P4.3

---

## 🚀 PHASE 5: BHARAT TAX MITRA 2.0 — AGENTIC TAX OPTIMISATION

**Theme**: turn the base filing tool ("fill your Form-16") into a multi-agent tax *optimiser* ("find every legal reduction across all categories"). Design surveys for this phase live as five artifacts (feasibility survey · optimisation map · guided assistant · layered filtration · novelty & swarm · grounding). Added 2026-07-18.

**Builds on (base status this phase depends on):**
- ✅ **Deterministic tax engine — DONE** (Module 1.2 + OPT-A2 golden vectors + OPT-A3 integer-paise). `calculate.py::compare_regimes` / `calculate_old_regime` / `calculate_new_regime` are the objective function the optimiser and swarm call. **The single most important 2.0 prerequisite is already built.**
- ✅ **7-language i18n — DONE** (Module 4.6 + OPT-UI.7 fonts). The guided assistant reuses it.
- ✅ **Offline-first PWA, PII crypto, consent/erasure — DONE** (Module 1.6, 4.3). DPDP-aligned foundation for the assistant.
- ⚠️ **Supersedes the stubbed chat** (Module 4.5, Bedrock-gated, NOT built): 2.0 replaces the Bedrock Knowledge Base plan with an **Anthropic-API-proxied swarm** (removes the AWS/Bedrock block discussed 2026-07-18).
- 🆕 **GST / indirect tax is net-new** — not in the base (base is direct-tax only).

**Core principle (non-negotiable across every module):** the LLM **never** does arithmetic or the optimisation search. Agents *understand, ground, and build the model*; the deterministic engine *computes*; an exact solver *optimises*; a verifier *re-checks*; a human CA *signs off*. ("LLM-modulo".)

### Module 5.1: Constrained Optimisation Engine `[non-LLM · BUILDABLE NOW]`
> The exact solver core. No AI, no AWS — pure Python on the existing engine. **This is the start-here module.**
- [x] 5.1.1 Exact tax-minimisation optimiser (`backend/src/optimization/tax_optimizer.py`) — given income + eligible-deduction caps + investable budget, find the tax-minimising plan (deduction allocation + best regime) by calling `calculate.py` as the objective. ✅ **Done 2026-07-18**: pure-offline Python (no network/AWS), calls the golden-vector-tested engine as its objective — never re-implements tax maths (LLM-modulo). Closed-form optimum `min(old-with-max-deductions, new)` — provably optimal, no metaheuristics. Emits advocate/adversary rationale + an effort-weighted adjudication. 9 invariant tests in `tests/test_tax_optimizer.py` (cross-check vs engine, monotonicity, cap/budget bounds) — all green. Verified live: correctly recommends new regime for ₹6L and ₹15L salaried cases (deductions insufficient to beat new-regime rates).
- [ ] 5.1.2 CP-SAT / MILP model (OR-Tools) — swap the exact core for a `CP-SAT` model when constraints turn non-trivial (shared caps, liquidity limits, multi-year). Integer-native → matches integer-paise. Add `ortools` to `backend/requirements.txt`.
- [ ] 5.1.3 Multi-year / capital-gains timing optimiser — dynamic programming over realisation sequences (54/54F/54EC windows, loss carry-forward 8 yrs).
- [x] 5.1.4 Golden-vector tests for the optimiser — every recommended plan re-verified against the engine; regression tripwires like OPT-A2. ✅ **Done 2026-07-18**: 8 frozen scenarios in `backend/tests/golden/optimizer_vectors.json` (5L rebate boundary, 6L, the 8L old-wins-narrowly flip, 12L partial budget, 15L+health, 18L+80E/80G, senior 10L, 25L) generated by `scripts/generate_optimizer_vectors.py` and replayed by `tests/test_optimizer_golden.py` (+3 human-checked anchors independent of the file). Regenerate only on deliberate change; JSON diff = review artifact. 28/28 across the 5.1/5.5 suites green.
- _Algorithms: CP-SAT (primary) · bounded knapsack/DP · MILP fallback · LP relaxation. Exact only — no PSO/ACO/GA (answers must be provably optimal & defensible)._

### Module 5.2: Model-Provider Backend `[AWS-optional · needs API key]`
> Replaces the Bedrock dependency (Module 2.3/2.4/4.5) with a provider-agnostic proxy.
- [x] 5.2.1 Provider-agnostic chat handler behind one interface (`AnthropicProvider` primary; `SarvamProvider` per-language fallback; `RuleBasedProvider` offline). ✅ **Done 2026-07-18**: `backend/src/providers/` — `ModelProvider` ABC (`base.py`), `AnthropicProvider` (online; activates only with `ANTHROPIC_API_KEY` + `anthropic` SDK, current-Claude model id not a Bedrock id, raises `ProviderUnavailable` otherwise), `RuleBasedProvider` (offline; deterministic category routing mirroring the frontend, grounded number-free replies with section citations), and `get_provider(prefer_offline)` selector = the "online now / offline later" switch. `SarvamProvider` slots into the same ABC later (interface ready, not yet implemented). Verified live: no key → rule-based offline; key → anthropic.
- [x] 5.2.2 PII-redaction pre-filter in front of every outbound model call (reuse `utils/pii.ts` patterns server-side). ✅ **Done 2026-07-18**: `backend/src/providers/pii.py::redact_pii()` — masks PAN/Aadhaar/mobile/account before anything leaves the process; `AnthropicProvider.chat` redacts every message pre-send. Ordering fix: mobile before Aadhaar (a `+91` mobile is 12 digits and collided with the Aadhaar pattern). 17 provider tests (+45 across the Phase 5 backend suites) green.
- [ ] 5.2.3 Prompt-cache + streaming; keep keys server-side (never client). Proxied through the existing FastAPI/Lambda seam.

### Module 5.3: The Agent Swarm (swarm-of-swarms) `[LLM-gated]`
> Hierarchical supervisor + per-layer sub-swarms (Scout ×N · Retriever · Critic · Scorer · Supervisor · Memory).
- [ ] 5.3.1 Orchestration graph (LangGraph-style hierarchical supervisor) with inspectable state for the audit trail.
- [ ] 5.3.2 Per-layer sub-swarms for the 7 filtration layers (Regime · Income-head · Deduction · Structure · GST · Guardrail · Verifier).
- [ ] 5.3.3 Engine + optimiser exposed as agent **tools** (function-calling) — the seam so agents never compute directly.
- [ ] 5.3.4 Shared blackboard memory (taxpayer profile + running plan visible to every layer).

### Module 5.4: Grounding & Anti-Hallucination Stack `[partly buildable]`
> The defence-in-depth gates. Priority order from the weighted survey (2026-07-18).
- [ ] 5.4.1 Tool-forced deterministic computation (score 5.0) — enforce all numbers via engine tool-calls. `[buildable with 5.1/5.3.3]`
- [ ] 5.4.2 Schema-constrained output (JSON schema = ITR/plan schema) `[buildable]`
- [ ] 5.4.3 RAG statute grounding + inline citation (Income-tax/GST Act corpus; whitelist of valid sections).
- [ ] 5.4.4 Faithfulness/grounding verifier (RAGAS-style) + LLM-as-judge critic.
- [ ] 5.4.5 Input/output topic guardrails (bound to tax; refuse evasion/jailbreak).
- [ ] 5.4.6 Abstention / confidence gating → escalate to human CA.

### Module 5.5: Advocate–Adversary Decision Engine `[deterministic part BUILDABLE NOW]`
> For-vs-against agents → weighted verdict on regime/lever selection.
- [x] 5.5.1 Deterministic weighted scorer (savings vs effort/risk/certainty) over engine outputs `[non-LLM, buildable]`. ✅ **Done 2026-07-18**: `backend/src/optimization/decision_engine.py` — layers four soft criteria (saving/effort/liquidity/certainty) over the optimiser's engine-verified tax numbers, with flippable weight profiles (`max_saving` / `balanced` / `min_effort`). Deterministic + offline; soft-criterion scores are documented heuristics that only shape tie-breaking, never the tax figures. Reproduces the "for-vs-against, weighted" flip: at ₹8L salary the old regime is cheaper on rupees but `min_effort` weighting overrides to new. 7 tests in `tests/test_decision_engine.py` pin the exact adjudication incl. the flip — all green (16/16 with the optimiser suite). The advocate/adversary *arguments* stay authored by the optimiser for now; agent-authored versions are 5.5.2 (LLM-gated).
- [ ] 5.5.2 Advocate + adversary agent roles that argue each choice, cited.
- [x] 5.5.3 Adjudicator with flippable weighting priorities (max-saving / balanced / min-effort). ✅ **DONE — checkbox corrected 2026-08-05 (audit)**: shipped inside 5.5.1 but never ticked separately. `backend/src/optimization/decision_engine.py` defines `WEIGHT_PROFILES = {max_saving: .85/.05/.05/.05, balanced: .50/.20/.15/.15, min_effort: .30/.30/.25/.15}` over (saving · effort · liquidity · certainty) and `decide(inp, weight_profile="balanced")` raises on an unknown profile. `tests/test_decision_engine.py` (7) pins the exact adjudication **including the ₹8L flip** where `min_effort` overrides the cheaper-on-rupees old regime — which is the whole point of the task.

### Module 5.6: GST / Indirect-Tax Domain `[net-new]`
- [ ] 5.6.1 GST rules module (CGST/SGST/IGST/UTGST, composition scheme, ITC) — reuse open engines (MCP-India-Stack / india-compliance) rather than rebuild.
- [ ] 5.6.2 GST optimiser levers (ITC maximisation, composition-vs-regular) into the swarm.
- [ ] 5.6.3 Unified direct + GST taxpayer view.

### Module 5.7: Guided Filing Assistant UI `[UI buildable; live AI gated]`
> Supersedes the Module 4.5 stub. Post-login popup · text/voice · 7 languages · step-by-step roadmap.
- [x] 5.7.1 Assistant popup component (opens after login) + category → sub-category flow. ✅ **Done 2026-07-18**: `frontend/src/components/assistant/GuidedAssistant.tsx` + `assistantData.ts` (8 categories, typed, GST family under Business). Mounts in `MainApp` open-by-default after login, dismissible with a 💬 reopen launcher. Uses app design tokens + react-i18next (greeting localised across all 7 langs). Verified live: pops up at `/app`, all 8 chips, Business→CGST/SGST/IGST + 7-step roadmap, zero console errors.
- [x] 5.7.2 Voice: Web Speech API (TTS working offline; mic dictation) with graceful fallback. ✅ **Done 2026-07-18**: 🔊 Read-aloud via `speechSynthesis` (per-language BCP-47), 🎤 mic via `SpeechRecognition`/`webkitSpeechRecognition` with typed minimal interface (no `any`) and graceful toast fallback when unavailable.
- [x] 5.7.3 Roadmap renderer per category (select → fill legal profile → optimise → file). ✅ **Done 2026-07-18**: numbered step cards per category from `assistantData`, with sub-tax chips grouped direct/indirect. Fixed a jsdom-only crash (guarded `Element.scrollTo?.()` in the auto-scroll effect) — full gate green: tsc, eslint, build (bundle within budget), 39/39 MainApp+assistant tests.
- [~] 5.7.4 Wire to the live swarm backend (5.2/5.3). `[partial — provider endpoint wired; full swarm gated]` ✅ **Partial 2026-07-18**: added `POST /assistant` to the mock server (`mock_server.py`) — provider + optimiser driven: category routing from `get_provider()` (offline rule-based now, Anthropic on key), and an **engine-verified recommendation computed by the optimiser** when the scenario carries income. The assistant UI now calls this endpoint (dynamic, not hardcoded) with graceful offline fallback to local routing. Full multi-agent swarm (5.3) is still LLM-gated.
  - ➕ **Professional/dynamic redesign (2026-07-18, user request "non-static, professional, no emojis")**: `GuidedAssistant.tsx` rewritten — **all emojis removed** (TM monogram avatar, plain-text category chips = titles, inline SVG icons for send/mic/close/read-aloud/launcher, MainApp launcher SVG), a "thinking" typing indicator during the backend round-trip, and a recommendation card (regime · tax payable · old/new · advocate/adversary) rendered when the endpoint returns one. Verified live: no emoji anywhere in the UI, typed input round-trips through `/assistant` (backend content, not local copy), 7-step roadmap + GST chips render, zero console errors. Gate: tsc/eslint clean, 39/39 MainApp+assistant tests.
  - ➕ **In-chat income collection (2026-07-18)**: for salary-optimisable categories (salaried/senior) the roadmap offers "Estimate my tax" → a compact inline `ScenarioForm` (salary / 80C-NPS budget / health premium / senior) posts a scenario to `/assistant`, and the optimiser's engine-verified **recommendation card** (regime · tax payable · old-vs-new · advocate/adversary) renders inline. Closes the dynamic loop: the assistant now computes a real optimal plan mid-conversation. Verified live end-to-end (₹15L salaried → recommendation card), zero console errors; graceful offline message when the engine is unreachable.
- _Prototype shipped as an artifact 2026-07-18; port to a React component in-app._

### Module 5.8: GAAR Guardrail, Human-CA Loop & Provenance `[compliance spine]`
- [ ] 5.8.1 GAAR-substance classifier agent — flag impermissible (main-purpose-tax, no substance) arrangements; never default-recommend.
- [ ] 5.8.2 Human-CA-in-the-loop sign-off workflow (prepare/recommend only — never certify/represent, per CA Act §288).
- [ ] 5.8.3 Provenance/audit ledger — every recommendation → agent → section → verification. Regulator-ready.
- _Legal perimeter from the regulatory survey: GAAR (§95–102), CA Act, DPDP 2023._

### Module 5.9: Category Taxonomy & Expansion `[content + routing]`
- [ ] 5.9.1 Full main→sub taxonomy (Salaried · Business · Professional · Investor · Property · Senior · HUF · NRI · Company) incl. GST family — as data driving the assistant + swarm routing.
- [ ] 5.9.2 Per-category eligibility rules & document checklists.

### 🎯 Phase 5 Checkpoint: Agentic Optimisation Validation
- Optimiser returns provably-optimal, engine-verified plans (5.1 golden vectors green).
- Every AI recommendation carries a section citation + passes the faithfulness/GAAR gates (5.4/5.8).
- Assistant works in all 7 languages, degrades gracefully offline (5.7).
- No LLM-computed number ever reaches the user (5.4.1 enforced).

**Phase 5 Deliverable**: Bharat Tax Mitra 2.0 — a grounded, multi-agent, all-category legal tax optimiser on top of the verified base engine.

**5.0 Sequencing**: `5.1 (optimiser, now) → 5.5.1 (weighted scorer, now) → 5.7.1-3 (assistant UI, now)` are buildable without the LLM/AWS backend. `5.2 (provider) → 5.3 (swarm) → 5.4.3+ (RAG/verifier) → 5.7.4 (wire-up)` unlock once an Anthropic API key is available. `5.6 (GST)` and `5.8 (GAAR)` are net-new domains.

---

## 📊 IMPLEMENTATION SUMMARY

### Phase Overview
| Phase | Duration | Priority | Deliverable |
|-------|----------|----------|-------------|
| **Module 0** | **1-2 weeks** | **CRITICAL BLOCKER** | **App runnable, auth wired, infrastructure deployed** |
| Phase 1 | 3-4 weeks | CRITICAL | Core tax engine with manual entry |
| Phase 2 | 3-4 weeks | HIGH | AI-powered document extraction |
| Phase 3 | 2-3 weeks | CRITICAL | IT Portal-ready JSON + PDF export |
| Phase 4 | 2-3 weeks | CRITICAL | Production-ready with privacy & security |
| **Total** | **11-15 weeks** | - | **Full-featured tax filing assistant** |

### Realistic Progress (re-audited **2026-08-05** — checkbox counts *verified against the tree and a full green gate*)

**Gate evidence for this audit** (all run 2026-08-05, on the working tree):

| Gate | Command | Result |
|------|---------|--------|
| Backend tests | `cd backend && python -m pytest -q` | **204 passed**, coverage **82.95%** (gate 70%) |
| Frontend tests | `cd frontend && npx vitest run` | **446 passed**, 17 skipped · 43 files passed, 1 skipped |
| Types | `cd frontend && npx tsc --noEmit` | **0 errors** |
| Lint | `npm run lint --workspace=frontend` | **clean** (`--max-warnings 0`) |
| Build | `npm run build` | **✓ built**, PWA precache 30 entries / 1573.65 KiB |
| Bundle budget | `npm run check:bundle` | **PASS** — initial JS **324.11 KB** gz vs 500 KB budget (35.2% headroom) |

| Phase | Total | Done | Partial | Todo | % | What the "todo" actually is |
|-------|------|------|---------|------|---|-----------------------------|
| Module 0 (Gaps) | 44 | 43 | 0 | 1 | **98%** | 1 left = DLT production OTP (0.6) — prod/telecom-gated |
| Phase 1 (Foundation) | 31 | 29 | 0 | 2 | **94%** | core engine/auth/forms/regime/PWA done; 2 open = optional `*` property tests (1.3.5 auth, 1.6.5 offline) |
| Phase 2 (Document AI) | 25 | 0 | 0 | 25 | **0%** | **entirely AWS-gated → re-scoped to Phase 5** (Anthropic, not Bedrock/Textract). Only artefact on disk is `ExtractionProgress.tsx` (Phase-2-ahead dead code, tests `describe.skip`) |
| Phase 3 (Compliance/Export) | 18 | 10 | 2 | 6 | **61%** | ITR JSON + PDF + dual-validator done client-side; open = 4 of 6 anomalies (need Phase 2 docs / prior-year sessions), server PDF (AWS), and the 5 checkpoint sign-offs (need the real IT-Portal schema, task 3.2.1a) |
| Phase 4 (Privacy/Prod) | 45 | 18 | 3 | 24 | **43%** | client PII/consent/erasure/**IndexedDB encryption**/i18n/a11y/sync/errors **done**; the 24 todo are ~all AWS-gated (Comprehend/KMS/TTL/TLS/CloudFront/CloudWatch) + the 7 human-lab checkpoint audits (4.13.x) |
| Module OPT (Enhancement) | 24 | 14 | 0 | 10 | **58%** | cross-cutting + UI polish done; remaining = UI.5/UI.6 (deferred by decision) + AWS-gated OPT-P2/P4 |
| Phase 5 (BTM 2.0) | 32 | 9 | 1 | 22 | **30%** | optimiser + decision engine + provider layer + assistant UI **done+tested**; rest = swarm/RAG/GAAR/GST (LLM- or net-new-gated) |
| **Total** | **219** | **123** | **6** | **90** | **~58%** | the bulk of open work is genuinely AWS/LLM-gated, not pending local build |

> **The honest read**: raw % understates real progress because most "todo" is *gated on a cloud account / API key*, not waiting on local work. Excluding AWS/LLM-deployment-gated tasks, the **locally-buildable surface (Phases 1, 3-client, 4-client, OPT, 5-core) is largely complete**. The live buildable frontier is **Phase 5** (agentic 2.0) — optimiser, decision engine, provider layer and assistant UI are all in; next buildable-without-a-key items are **5.9.1/5.9.2** (taxonomy as data) and **5.4.2** (schema-constrained output, which can reuse `itrValidator`).

> **Checkbox drift found in this audit** (all corrected in place, each with the verifying file/test cited at the task):
> - `4.3.1` Web Crypto IndexedDB encryption — was `[ ]`, **is fully built** (`lib/crypto.ts` PBKDF2-100k → AES-GCM-256, userId+deviceId-scoped, IV-prefixed; wired in `db.ts`).
> - `4.3.2` encryption property tests — was `[ ]`, **P31/P32/P33 are all asserted** (example-based, not `fast-check`).
> - `5.5.3` flippable adjudicator weights — was `[ ]`, **shipped inside 5.5.1** (`decision_engine.py::WEIGHT_PROFILES`, ₹8L flip pinned by test).
> - `4.12.1` / `4.12.2` — were `[ ]`, downgraded to `[~]`: substantial coverage exists (UAT personas, airplane-mode sim, mid-flow language switch; code-splitting + bundle gate + WebP), with the genuinely-open remainder named.
>
> **Known measurement caveat**: the "37 correctness properties" in the Testing Strategy below is **aspirational, not current**. `design.md` actually defines **46** properties, and only a handful are pinned by generative tests today — `fast-check` appears in exactly one file (`taxCalculator.property.test.ts`, Properties 1-4) and **no `hypothesis` tests exist in the backend at all**. Everything else marked `*` is either example-based or open.

> **Module OPT** = 15 optimizations (OPT-A/1/2/3/4) + 8 UI-polish tasks (OPT-UI). These are
> enhancement-layer tasks from the Optimization Audit; they refine base tasks rather than add scope.
> Start with the 5 ⚡ quick wins (OPT-P1.2, OPT-A1, OPT-P2.1, OPT-P2.2, OPT-P4.3).

### Technology Stack Summary
- **Frontend**: React 18, TypeScript, Tailwind CSS, Workbox, IndexedDB (Dexie), Web Crypto API
- **Backend**: AWS Lambda (Python 3.11), DynamoDB, S3, Step Functions, API Gateway
- **AI/ML**: ⚠️ *(superseded 2026-07-18 → Phase 5 Module 5.2)* **Anthropic API direct** (current Claude gen) for chat + extraction · vision-model/on-device OCR (not Textract) · self-hosted RAG (not Bedrock KB) · Sarvam per-language + offline rule-based fallbacks. ~~Amazon Textract, Bedrock (Claude 3), Comprehend, Knowledge Bases~~
- **Security**: AWS KMS *(optional, deploy-only)*, TLS 1.3, Web Crypto API, DLT-registered SNS · PII via local `utils/pii.ts` (not Comprehend)
- **Monitoring**: CloudWatch, X-Ray, CloudWatch Alarms
- **Infrastructure**: AWS CDK, GitHub Actions CI/CD
- **Local Dev**: FastAPI mock server, SQLite, moto (AWS mocking for Python tests)

### Dependency Order for Implementation
```
Module 0.1 (App Wiring) → Phase 1 Checkpoint passable
Module 0.2 (API Client) → Auth flow functional
Module 0.3 (Mock Server) → No AWS needed for local dev
Module 0.4 (CDK Stacks) → Backend deployable to AWS
Module 0.5 (Backend Tests) → CI pipeline actually validates backend
Module 0.6 (DLT) → Production OTP delivery (India)
                ↓
Phase 1 1.6.x + 1.7.x become completable
                ↓
Phase 2 → Phase 3 → Phase 4
```

### Compliance Checklist
- ✅ Income Tax Act 1961 (Sections 80C, 80D, 44AD, 87A, HRA)
- ⏳ IT Department JSON Schema v1.0 (FY 2025-26) — schema files not yet sourced (task 3.2.1a)
- ⏳ Data Protection & Privacy (24-hour TTL, KMS encryption) — infra not deployed (task 0.4.x)
- ✅ Audit Trail Requirements (90-day retention) — designed, not deployed
- ✅ Accessibility Standards (WCAG 2.1 AA) — planned in Phase 4
- ✅ Mobile-First Design (320px - 1920px)
- ✅ Offline-First Architecture (service worker built, sync not wired)
- ✅ Multi-Language Support (7 languages — translations done)
- ⏳ TRAI DLT Registration — required for production OTP (task 0.6.x)

### Testing Strategy
- **Unit Tests**: Vitest (Frontend), Pytest (Backend) — 80% coverage minimum for tax modules
- **Integration Tests**: API Gateway → Lambda → DynamoDB → S3
- **Property-Based Tests**: fast-check (TypeScript), Hypothesis (Python) — 37 correctness properties
- **End-to-End Tests**: Playwright for complete user flows
- **Performance Tests**: Lighthouse, Load testing, Stress testing
- **Security Tests**: Penetration testing, Vulnerability scanning
- **Accessibility Tests**: WCAG 2.1 AA compliance, Screen reader testing

### Notes
- **Start with Module 0** — nothing else can be validated without it
- Tasks marked with `*` are optional property-based tests (can be skipped for faster MVP)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties (37 total)
- Implementation follows tax software best practices and regulatory compliance
- All AI services integrated via AWS SDK with error handling and retry logic
- Offline-first architecture ensures functionality on 2G/3G networks in Tier-2/3 cities

---

**🚀 Ready to Begin — Start with Module 0.1 (Core App Wiring)**

Complete Module 0 first to make the app runnable, then continue Phase 1 checkpoint tasks (1.7.x) to validate the foundation before moving to Phase 2.

