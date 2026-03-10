# Implementation Plan: Bharat Tax Mitra
## Professional Tax Filing System - Phased Development Approach

## Executive Summary

This implementation plan structures the Bharat Tax Mitra development into **4 Strategic Phases** with **12 Professional Modules**, following industry best practices for tax software development, regulatory compliance, and enterprise-grade architecture.

**Implementation Stack**: 
- **Backend**: Python 3.11 (Lambda) - Tax calculation, compliance, audit
- **Frontend**: React 18 + TypeScript - Professional UI/UX
- **Infrastructure**: AWS Serverless (CDK) - Scalable, secure
- **AI/ML**: Bedrock, Textract, Comprehend - Document intelligence

**Compliance Framework**: 
- Income Tax Act 1961 (Sections 80C, 80D, 44AD, 87A, HRA)
- IT Department JSON Schema v1.0 (FY 2025-26)
- Data Protection & Privacy (24-hour TTL, KMS encryption)
- Audit Trail Requirements (90-day retention)

---

## 📋 PHASE 1: FOUNDATION & CORE TAX ENGINE
**Duration**: 3-4 weeks | **Priority**: CRITICAL
**Deliverable**: Functional tax calculator with manual entry

### Module 1.1: Project Infrastructure & Development Environment

- [-] 1.1.1 Initialize professional project structure
  - Create monorepo: `/frontend`, `/backend`, `/infrastructure`, `/shared`
  - Set up React 18 PWA with TypeScript, Tailwind CSS, Vite
  - Initialize AWS CDK with multi-environment support
  - Configure ESLint, Prettier, Husky for code quality
  - Set up Jest + React Testing Library + Pytest
  - _Requirements: All | Compliance: Audit-ready structure_

- [ ] 1.1.2 Establish CI/CD pipeline with quality gates
  - Configure GitHub Actions for automated builds
  - Set up automated testing on every commit
  - Implement code coverage thresholds (80% for tax modules)
  - Configure security scanning (Snyk, AWS Security Hub)
  - Set up staging environment
  - _Requirements: All | Compliance: Change management_

### Module 1.2: Tax Calculation Engine (Core Business Logic)


- [ ] 1.2.1 Implement FY 2025-26 tax rules configuration
  - Create AWS AppConfig integration for dynamic rules
  - Define Old Regime JSON schema (5 slabs + surcharge + cess)
  - Define New Regime JSON schema (6 slabs + rebate 87A)
  - Implement versioning and rollback capability
  - Cache rules in IndexedDB for offline calculation
  - _Requirements: 11.1, 11.2, 11.7, 5.1 | Compliance: Section-wise accuracy_

- [ ] 1.2.2 Build Old Regime tax calculator
  - Implement slab-wise calculation algorithm
  - **Section 80C**: Deductions up to ₹1.5L (LIC, PPF, ELSS, NSC)
  - **Section 80D**: Health insurance (₹25k self, ₹50k senior, ₹25k parents)
  - **HRA Exemption**: Min of 3 options (actual, rent-10%, 50%/40% metro)
  - **Standard Deduction**: ₹50,000 for salaried
  - Apply surcharge tiers (5%, 10%, 15%, 25%)
  - Calculate 4% Health & Education Cess
  - Round final tax to nearest rupee
  - _Requirements: 5.1, 5.2, 5.7, 5.8, 18.1 | Compliance: Income Tax Act 1961_

- [ ] 1.2.3 Build New Regime tax calculator
  - Implement 6-slab calculation (0%, 5%, 10%, 15%, 20%, 30%)
  - **Section 87A Rebate**: Up to ₹25,000 for income ≤ ₹7L
  - **Standard Deduction**: ₹50,000 (only deduction allowed)
  - Apply surcharge and cess
  - _Requirements: 5.1, 5.4, 5.8, 18.2 | Compliance: Finance Act 2023_

- [ ] 1.2.4 Implement HRA exemption calculator
  - **Option 1**: Actual HRA received
  - **Option 2**: Rent paid minus 10% of basic salary
  - **Option 3**: 50% basic (metro) or 40% (non-metro)
  - Return minimum of three options
  - Handle edge cases: no rent, HRA not received
  - _Requirements: 5.2 | Compliance: Rule 2A of IT Rules_

- [ ] 1.2.5 Implement Section 44AD presumptive taxation
  - Calculate: 8% of digital receipts + 6% of cash
  - Validate ₹2 crore turnover threshold
  - Handle mixed digital + cash receipts
  - _Requirements: 5.3 | Compliance: Section 44AD for businesses < ₹2 Cr_

- [ ] 1.2.6 Build regime comparison engine
  - Calculate tax under both regimes simultaneously
  - Compute effective tax rate (tax/gross income × 100)
  - Calculate tax savings if switching regimes
  - Identify deductions lost in new regime
  - Recommend optimal regime
  - _Requirements: 5.10, 18.1-18.5 | Compliance: Taxpayer optimization_

- [ ]* 1.2.7 Write property-based tests for tax correctness
  - **Property 1**: Tax liability always non-negative
  - **Property 2**: Deductions never exceed gross income
  - **Property 3**: Higher income → higher/equal tax (monotonicity)
  - **Property 4**: Slab rate application correct at boundaries
  - Use Hypothesis (Python) with 1000+ test cases
  - _Requirements: 5.1, 5.2, 5.7 | Compliance: Calculation accuracy_

### Module 1.3: User Authentication & Profile Management

- [ ] 1.3.1 Build language selection interface (7 languages)
  - Create selector: English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati
  - Display in native scripts (हिंदी, தமிழ், తెలుగు, मराठी, বাংলা, ગુજરાતી)
  - Auto-detect device locale
  - Persist preference in IndexedDB (encrypted)
  - _Requirements: 1.1, 13.1, 13.2 | Compliance: Tier-2/3 accessibility_

- [ ] 1.3.2 Implement OTP-based authentication UI
  - Create mobile number input (+91, 10-digit validation)
  - Build OTP verification (6-digit, auto-focus)
  - Add countdown timer (30s) with resend
  - Implement regime selection screen
  - Add visual progress indicators
  - _Requirements: 1.2, 1.3, 1.6 | Compliance: Secure identification_

- [ ] 1.3.3 Create backend OTP Lambda functions
  - **send-OTP Lambda**: Generate 6-digit OTP, store in DynamoDB (5-min TTL)
  - Integrate Amazon SNS for SMS delivery
  - Implement rate limiting: Max 3 OTP/15 min per mobile
  - Log attempts to CloudWatch for audit
  - **verify-OTP Lambda**: Validate OTP, generate JWT tokens
  - Create user profile with encrypted mobile number
  - Implement lockout after 3 failed attempts (15-min cooldown)
  - _Requirements: 1.2, 1.3, 1.7 | Compliance: Authentication audit trail_

- [ ] 1.3.4 Set up IndexedDB for offline profile storage
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

- [ ] 1.4.1 Create personal information form
  - Build fields: PAN (AAAAA9999A), Full Name, DOB, Address, Email
  - Implement PAN format validation with real-time feedback
  - Add Aadhaar input (optional, masked: XXXX-XXXX-1234)
  - Validate DOB (age 18-100, DD/MM/YYYY)
  - Auto-save every 30 seconds to IndexedDB
  - Show "Last saved" timestamp
  - _Requirements: 7.1, 7.8, 20.5 | Compliance: PAN mandatory for ITR_

- [ ] 1.4.2 Create salary income form (Form-16 equivalent)
  - **Income**: Gross Salary, HRA, Special Allowance, Other Allowances
  - **Deductions**: Standard Deduction (₹50k auto), Professional Tax, Others
  - **TDS**: TDS Deducted (quarterly), Employer TAN
  - Implement numeric validation (non-negative, max 10 crores)
  - Add Indian number formatting (₹12,34,567 - lakhs/crores)
  - Display calculated "Net Taxable Salary" in real-time
  - Add contextual help tooltips
  - _Requirements: 7.1, 7.2, 13.8 | Compliance: Salary income reporting_

- [ ] 1.4.3 Create deductions form (Chapter VI-A)
  - **Section 80C**: LIC, PPF, ELSS, NSC, Home Loan Principal (max ₹1.5L)
  - **Section 80D**: Health insurance - Self (₹25k/₹50k), Parents (₹25k/₹50k)
  - **HRA**: Rent paid, landlord PAN (if > ₹1L/year), metro/non-metro
  - **Other**: 80CCD(1B) NPS (₹50k), 80G Donations, 80E Education Loan
  - Implement limit validation with visual warnings
  - Show remaining limit (e.g., "₹50,000 remaining in 80C")
  - Add anomaly detection: Warn if deductions > 50% of gross
  - _Requirements: 7.3, 7.4, 12.2 | Compliance: Deduction eligibility & limits_

- [ ] 1.4.4 Create business income form (Section 44AD)
  - Input: Gross Receipts (Digital), Gross Receipts (Cash), Business Type
  - Auto-calculate presumptive income: 8% (digital) + 6% (cash)
  - Validate ₹2 crore threshold for 44AD eligibility
  - Show warning if receipts exceed threshold
  - _Requirements: 5.3 | Compliance: Presumptive taxation scheme_

### Module 1.5: Regime Comparison & Tax Summary UI

- [ ] 1.5.1 Build regime comparison component (side-by-side)
  - Create two cards: "Old Regime" vs "New Regime"
  - Display for each: Gross Income, Deductions, Taxable Income, Tax Liability, Effective Rate, Take-Home
  - Highlight recommended regime with green border + badge
  - Show savings: "Save ₹XX,XXX by choosing New Regime"
  - Add toggle button to switch regime
  - Trigger real-time recalculation (debounced 500ms)
  - _Requirements: 5.10, 18.3-18.5 | Compliance: Informed regime choice_

- [ ] 1.5.2 Create tax breakdown component (detailed view)
  - Build expandable accordion sections:
    - Income Breakdown: Salary, House Property, Business, Capital Gains, Others
    - Deductions Breakdown: 80C, 80D, HRA, Standard Deduction, Others
    - Tax Calculation: Slab-wise tax, Surcharge, Cess, Rebate 87A, Final Tax
  - Add visual charts: Bar chart (income vs deductions), Pie chart (tax distribution)
  - Display slab-wise calculation table with color-coded slabs
  - Show "How is my tax calculated?" explainer
  - _Requirements: 5.10, 18.6 | Compliance: Transparency in calculation_

- [ ] 1.5.3 Create tax summary dashboard (overview)
  - Display key metrics in card layout:
    - Total Income, Total Deductions, Taxable Income, Tax Liability, TDS Paid, Refund/Tax Payable
  - Add progress indicator: "Your return is 85% complete"
  - Show regime recommendation with one-click switch
  - _Requirements: 5.10, 7.8 | Compliance: User-friendly summary_

### Module 1.6: Offline-First PWA Architecture

- [ ] 1.6.1 Set up Workbox Service Worker with caching
  - **App Shell**: Cache-first for HTML, CSS, JS (precache on install)
  - **API Calls**: Network-first (10s timeout), fallback to cache
  - **Static Assets**: Cache-first for images, fonts (stale-while-revalidate)
  - **Tax Rules**: Cache-first with background update (24h refresh)
  - Configure cache expiration: 7 days app shell, 24h API responses
  - Implement cache versioning for clean updates
  - _Requirements: 10.1, 10.3 | Compliance: Offline accessibility_

- [ ] 1.6.2 Implement background sync for offline operations
  - Register Background Sync API for queued operations
  - Queue failed API calls in IndexedDB `pendingRequests`
  - Trigger sync when network restored
  - Implement exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - Show sync status: "3 operations pending sync"
  - Complete sync within 2 minutes of coming online
  - _Requirements: 10.5, 10.6, 20.1 | Compliance: Data integrity_

- [ ] 1.6.3 Enable offline tax calculation (client-side)
  - Cache tax rules in IndexedDB on first load
  - Implement client-side calculation using cached rules
  - Display "Calculated Offline" badge when network unavailable
  - Add connectivity indicator: Green (online), Yellow (slow), Red (offline)
  - Ensure calculation accuracy matches server-side
  - _Requirements: 5.9, 10.2, 10.4 | Compliance: Consistent calculation_

- [ ] 1.6.4 Optimize for 2G/3G networks (Tier-2/3 cities)
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

- [ ] 1.7.1 Run comprehensive test suite (unit + integration + property)
- [ ] 1.7.2 Validate calculations against IT Department test cases
- [ ] 1.7.3 Test offline functionality (airplane mode simulation)
- [ ] 1.7.4 Performance audit: Lighthouse score > 90, bundle < 500KB
- [ ] 1.7.5 User acceptance testing with sample taxpayer profiles

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
  - **Salary Components**: Gross Salary, HRA, Special Allowance, Allowances
  - **Deductions**: Standard Deduction, Professional Tax, Other Deductions
  - **TDS**: Quarterly TDS breakup (Q1, Q2, Q3, Q4), Total TDS
  - **Assessment Year**: Extract FY and AY
  - Map extracted fields to internal tax data schema
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

- [ ] 3.1.1 Implement cross-field validation rules
  - **HRA vs Rent**: If HRA claimed, rent paid must be present
  - **Deductions vs Income**: Total deductions ≤ Gross Total Income
  - **TDS vs Salary**: TDS ≤ Gross Salary
  - **80C Limit**: Total 80C deductions ≤ ₹1.5L
  - **80D Limit**: Self (₹25k/₹50k) + Parents (₹25k/₹50k)
  - Display validation errors with field highlighting
  - _Requirements: 5.7, 12.4, 12.5 | Compliance: IT Act validation rules_

- [ ] 3.1.2 Add anomaly detection and warnings
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

- [ ] 3.2.1 Create ITR-1 JSON generator
  - Map tax data to ITR-1 schema structure (IT Portal v1.0 FY 2025-26)
  - **Personal Info**: Name, PAN, DOB, Aadhaar, Address, Mobile, Email
  - **Filing Status**: Return type, residential status, filing category
  - **Income & Deductions**: Salary, deductions (80C, 80D, HRA, Standard)
  - **Tax Computation**: Tax on total income, rebate 87A, surcharge, cess, total tax
  - **Taxes Paid**: TDS on salary, advance tax, self-assessment tax
  - **Refund**: Refund due, bank account details (IFSC, account number)
  - Generate all mandatory fields per IT Portal requirements
  - _Requirements: 8.1, 8.2, 8.3 | Compliance: ITR-1 schema conformance_

- [ ] 3.2.2 Implement JSON schema validator
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

- [ ] 3.2.3 Add offline JSON generation capability
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

- [ ] 3.3.1 Create bank details form for refund
  - Build IFSC code input with bank name lookup (API integration)
  - Add account number with confirmation field (re-enter to confirm)
  - Validate IFSC format (AAAA0999999)
  - Display bank name and branch after IFSC validation
  - _Requirements: 8.1 | Compliance: Refund processing_

- [ ] 3.3.2 Create JSON preview component
  - Display key fields from generated JSON in readable format
  - Show: Personal Info, Income Summary, Deductions, Tax Liability, Refund/Payable
  - Display file size and validation status (✓ Valid / ✗ Invalid)
  - Add "Download JSON" button
  - Provide "How to upload to IT Portal" instructions
  - _Requirements: 8.7 | Compliance: User guidance_

- [ ] 3.3.3 Implement file download functionality
  - Trigger browser download for JSON file (filename: ITR1_PAN_AY2026-27.json)
  - Add success confirmation screen with next steps
  - Provide step-by-step guide for IT Portal upload
  - Add "Download PDF Summary" option
  - _Requirements: 8.5 | Compliance: Export delivery_

### Module 3.4: PDF Summary Generation

- [ ] 3.4.1 Create PDF generator Lambda (server-side)
  - Generate PDF with income, deductions, tax liability using ReportLab (Python)
  - Include regime comparison table (Old vs New)
  - Add section-wise ITR breakdown (Income, Deductions, Tax Calculation)
  - Display tax savings breakdown by deduction category (80C, 80D, HRA)
  - Redact PII: Show only last 4 digits of PAN/Aadhaar
  - Format for A4 paper with readable fonts (minimum 10pt)
  - _Requirements: 9.1-9.7 | Compliance: Taxpayer record-keeping_

- [ ] 3.4.2 Add offline PDF generation (client-side)
  - Use jsPDF library for client-side PDF generation
  - Generate PDF from cached data in IndexedDB
  - Match server-side PDF layout and content
  - Display "Generated Offline" watermark
  - _Requirements: 9.8 | Compliance: Offline export capability_

- [ ] 3.4.3 Implement PDF download
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

- [ ] 4.1.3 Add PII redaction in UI
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

- [ ] 4.3.1 Add Web Crypto API encryption for IndexedDB
  - Generate device-specific encryption key using PBKDF2 (100k iterations)
  - Derive key from device ID + user salt
  - Encrypt IndexedDB data before storage using AES-GCM-256
  - Implement decryption on retrieval
  - Store IV (Initialization Vector) with encrypted data
  - _Requirements: 4.8 | Compliance: Client-side data protection_

- [ ]* 4.3.2 Write property test for client-side encryption
  - **Property 31**: IndexedDB data is encrypted before storage
  - **Property 32**: Encrypted data can be decrypted correctly
  - **Property 33**: Encryption key is device-specific
  - _Requirements: 4.8 | Compliance: Encryption validation_

- [ ] 4.3.3 Implement user-initiated data deletion
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
  - Create chat interface: Bottom sheet (mobile), Sidebar (desktop)
  - Implement message bubbles with streaming responses
  - Add suggested questions chips
  - Place "?" icon next to form fields for contextual help
  - Auto-generate field-specific questions
  - Display responses in chat overlay
  - Cache common questions and responses in IndexedDB
  - Serve cached responses when offline
  - Display "You're offline" message with cached FAQ access
  - _Requirements: 6.1, 6.2, 6.5, 6.9 | Compliance: Accessible guidance_

- [ ]* 4.5.4 Write property test for offline FAQ access
  - **Property 34**: Cached FAQs accessible offline
  - **Property 35**: FAQ cache updated when online
  - _Requirements: 6.9 | Compliance: Offline assistance_

### Module 4.6: Multi-Language Support (i18n)

- [ ] 4.6.1 Create translation infrastructure
  - Set up react-i18next framework
  - Create translation files for 7 languages (JSON format)
  - Implement language switching without page reload
  - Persist language preference in IndexedDB
  - _Requirements: 13.1, 13.2, 13.3, 13.6 | Compliance: Linguistic accessibility_

- [ ] 4.6.2 Translate all UI text
  - Translate form labels, error messages, help text, tooltips
  - Maintain tax terminology consistency using glossary
  - Translate chat assistant responses
  - Translate validation messages
  - _Requirements: 13.3, 13.4, 13.5 | Compliance: Consistent terminology_

- [ ] 4.6.3 Cache language packs for offline access
  - Store translations in IndexedDB `languagePacks` store
  - Enable offline language switching
  - Update language packs when online (background sync)
  - _Requirements: 13.7 | Compliance: Offline language support_

- [ ] 4.6.4 Implement Indian number formatting
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

- [ ] 4.8.1 Implement responsive design (320px - 1920px)
  - Ensure correct rendering across all screen sizes
  - Use touch-friendly controls (44x44px minimum tap targets)
  - Optimize for mobile bandwidth (< 500KB per page)
  - Implement single-column layout on mobile (< 768px)
  - _Requirements: 19.1, 19.2, 19.4 | Compliance: Mobile-first design_

- [ ] 4.8.2 Add mobile-specific features
  - Support pinch-to-zoom for document viewing
  - Use bottom navigation for primary actions on mobile
  - Support portrait and landscape orientations
  - Add haptic feedback for button presses (mobile)
  - _Requirements: 19.5, 19.6, 19.8 | Compliance: Mobile UX_

- [ ] 4.8.3 Optimize for low bandwidth (2G/3G)
  - Ensure page load < 3 seconds on 3G
  - Function on 2G with page load < 10 seconds
  - Implement progressive image loading
  - Use lazy loading for below-the-fold content
  - _Requirements: 10.8, 19.7 | Compliance: Network resilience_

### Module 4.9: Comprehensive Error Handling

- [ ] 4.9.1 Add retry logic with exponential backoff
  - Retry failed API calls up to 3 times
  - Implement exponential backoff: 1s, 2s, 4s, 8s, max 30s
  - Display retry attempts to user: "Retrying... (2/3)"
  - _Requirements: 20.1 | Compliance: Fault tolerance_

- [ ] 4.9.2 Create user-friendly error messages
  - Display errors without technical jargon
  - Provide actionable suggestions: "Check your internet connection and try again"
  - Add "Report Issue" button that captures error context
  - Send error reports to CloudWatch with anonymized user context
  - _Requirements: 20.2, 20.8 | Compliance: User experience_

- [ ] 4.9.3 Implement auto-save and recovery
  - Auto-save user input every 30 seconds to IndexedDB
  - Restore progress on session interruption
  - Display "Restoring your previous session..." on recovery
  - _Requirements: 20.5, 20.6 | Compliance: Data loss prevention_

- [ ] 4.9.4 Add comprehensive error logging
  - Log all errors to CloudWatch with stack traces
  - Include anonymized user context (userId hash, session ID, timestamp)
  - Log error severity: INFO, WARN, ERROR, CRITICAL
  - Set up error aggregation and alerting
  - _Requirements: 20.3 | Compliance: Debugging capability_

### Module 4.10: Sync Conflict Resolution

- [ ] 4.10.1 Create conflict detection logic
  - Compare local and server timestamps
  - Identify conflicting fields (different values, different timestamps)
  - Prioritize user edits over AI-extracted values
  - _Requirements: 10.7 | Compliance: Data consistency_

- [ ] 4.10.2 Build conflict resolution UI
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

- [ ] 4.11.1 Implement cache size management
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

- [ ] 4.12.1 Test complete user flows end-to-end
  - Test: Onboarding → Upload → Review → Calculate → Export
  - Test offline-first functionality (airplane mode)
  - Test error recovery scenarios (network failures, API errors)
  - Test multi-language support (switch languages mid-flow)
  - Test mobile responsiveness (320px - 1920px)
  - _Requirements: All | Compliance: End-to-end validation_

- [ ] 4.12.2 Performance optimization
  - Optimize bundle size (code splitting, tree shaking)
  - Lazy load components (route-based)
  - Optimize images and assets (WebP, compression)
  - Achieve Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
  - _Requirements: 19.4, 19.7 | Compliance: Performance standards_

- [ ] 4.12.3 Accessibility improvements
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

## 📊 IMPLEMENTATION SUMMARY

### Phase Overview
| Phase | Duration | Priority | Deliverable |
|-------|----------|----------|-------------|
| Phase 1 | 3-4 weeks | CRITICAL | Core tax engine with manual entry |
| Phase 2 | 3-4 weeks | HIGH | AI-powered document extraction |
| Phase 3 | 2-3 weeks | CRITICAL | IT Portal-ready JSON + PDF export |
| Phase 4 | 2-3 weeks | CRITICAL | Production-ready with privacy & security |
| **Total** | **10-14 weeks** | - | **Full-featured tax filing assistant** |

### Technology Stack Summary
- **Frontend**: React 18, TypeScript, Tailwind CSS, Workbox, IndexedDB, Web Crypto API
- **Backend**: AWS Lambda (Python 3.11), DynamoDB, S3, Step Functions, API Gateway
- **AI/ML**: Amazon Textract, Bedrock (Claude 3), Comprehend, Knowledge Bases
- **Security**: AWS KMS, Comprehend PII, TLS 1.3, Web Crypto API
- **Monitoring**: CloudWatch, X-Ray, CloudWatch Alarms
- **Infrastructure**: AWS CDK, GitHub Actions CI/CD

### Compliance Checklist
- ✅ Income Tax Act 1961 (Sections 80C, 80D, 44AD, 87A, HRA)
- ✅ IT Department JSON Schema v1.0 (FY 2025-26)
- ✅ Data Protection & Privacy (24-hour TTL, KMS encryption)
- ✅ Audit Trail Requirements (90-day retention)
- ✅ Accessibility Standards (WCAG 2.1 AA)
- ✅ Mobile-First Design (320px - 1920px)
- ✅ Offline-First Architecture (2G/3G support)
- ✅ Multi-Language Support (7 Indian languages)

### Testing Strategy
- **Unit Tests**: Jest (Frontend), Pytest (Backend) - 80% coverage minimum
- **Integration Tests**: API Gateway → Lambda → DynamoDB → S3
- **Property-Based Tests**: Hypothesis (Python), fast-check (TypeScript) - 37 properties
- **End-to-End Tests**: Cypress for complete user flows
- **Performance Tests**: Lighthouse, Load testing, Stress testing
- **Security Tests**: Penetration testing, Vulnerability scanning
- **Accessibility Tests**: WCAG 2.1 AA compliance, Screen reader testing

### Notes
- Tasks marked with `*` are optional property-based tests (can be skipped for faster MVP)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties (37 total)
- Implementation follows tax software best practices and regulatory compliance
- All AI services integrated via AWS SDK with error handling and retry logic
- Offline-first architecture ensures functionality on 2G/3G networks in Tier-2/3 cities

---

**🚀 Ready to Begin Implementation!**

The spec is complete with requirements, design, and professionally structured implementation tasks. You can now begin executing tasks phase-by-phase, starting with Phase 1: Foundation & Core Tax Engine.

