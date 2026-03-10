# Implementation Plan: Bharat Tax Mitra

## Overview

This implementation plan breaks down the Bharat Tax Mitra feature into 6 milestones, following an incremental approach from core PWA functionality to full AI-powered tax filing assistant. Each milestone builds on the previous one, ensuring early validation of core functionality.

**Implementation Language**: Python (backend), TypeScript/React (frontend)

**Architecture**: 
- Frontend: React 18 + TypeScript PWA with offline-first capabilities
- Backend: AWS Lambda (Python 3.11), DynamoDB, S3, Step Functions
- AI Services: Amazon Textract, Bedrock (Claude 3), Comprehend

## Tasks

### Milestone 1: Core PWA + Local Calculator (No AI, Manual Entry Only)

- [ ] 1. Set up project structure and development environment
  - Create React PWA project with TypeScript and Tailwind CSS
  - Set up AWS CDK project for infrastructure as code
  - Configure development, staging, and production environments
  - Set up CI/CD pipeline with GitHub Actions
  - _Requirements: All_

- [ ] 2. Implement frontend authentication flow
  - [ ] 2.1 Create language selection component
    - Build language selector with 7 languages (English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati)
    - Implement language persistence in IndexedDB
    - _Requirements: 1.1, 13.1, 13.2_
  
  - [ ] 2.2 Implement OTP-based authentication UI
    - Create mobile number input component with validation
    - Build OTP verification component with countdown timer
    - Implement regime selection screen
    - _Requirements: 1.2, 1.3, 1.6_
  
  - [ ] 2.3 Set up IndexedDB for offline profile storage
    - Create IndexedDB schema for profiles, sessions, and drafts
    - Implement encryption for auth tokens using Web Crypto API
    - _Requirements: 1.4, 1.5_

- [ ] 3. Implement backend authentication Lambda functions
  - [ ] 3.1 Create send-OTP Lambda function
    - Implement OTP generation and storage in DynamoDB
    - Integrate with SNS for SMS delivery
    - Add rate limiting (3 attempts per 15 minutes)
    - _Requirements: 1.2, 1.7_
  
  - [ ] 3.2 Create verify-OTP Lambda function
    - Implement OTP validation logic
    - Generate JWT access and refresh tokens
    - Create user profile in DynamoDB
    - _Requirements: 1.3, 1.7_
  
  - [ ]* 3.3 Write property test for authentication token encryption
    - **Property 1: Authentication Token Encryption**
    - **Validates: Requirements 1.4**
  
  - [ ]* 3.4 Write property test for profile persistence round-trip
    - **Property 2: Profile Persistence Round-Trip**
    - **Validates: Requirements 1.6**

- [ ] 4. Build manual data entry forms
  - [ ] 4.1 Create personal information form
    - Build form with PAN, name, address, DOB fields
    - Implement field validation (PAN format, date validation)
    - Add auto-save every 30 seconds to IndexedDB
    - _Requirements: 7.1, 7.8, 20.5_
  
  - [ ] 4.2 Create salary income form
    - Build form for gross salary, HRA, special allowance, deductions
    - Implement numeric input validation
    - Add field-level help tooltips
    - _Requirements: 7.1, 7.2_
  
  - [ ] 4.3 Create deductions form
    - Build form for Section 80C, 80D, HRA, standard deduction
    - Implement deduction limit validation
    - Add anomaly detection warnings
    - _Requirements: 7.3, 7.4, 12.2_

- [ ] 5. Implement local tax calculation engine
  - [ ] 5.1 Create tax rules configuration module
    - Load tax rules from AppConfig for FY 2025-26
    - Implement tax rules caching in IndexedDB
    - Add tax rules versioning support
    - _Requirements: 11.1, 11.2, 11.7_
  
  - [ ] 5.2 Implement Old Regime tax calculation
    - Write Python function for Old Regime slab calculation
    - Implement deduction application logic (80C, 80D, HRA)
    - Calculate surcharge and cess
    - _Requirements: 5.1, 5.2, 5.7, 5.8, 18.1_
  
  - [ ] 5.3 Implement New Regime tax calculation
    - Write Python function for New Regime slab calculation
    - Implement Section 87A rebate logic
    - Calculate surcharge and cess
    - _Requirements: 5.1, 5.4, 5.8, 18.2_
  
  - [ ] 5.4 Implement HRA exemption calculator
    - Write function for HRA exemption calculation (3 options)
    - Handle metro vs non-metro city logic
    - _Requirements: 5.2_
  
  - [ ]* 5.5 Write property tests for tax calculation
    - **Property 12: Tax Calculation Non-Negativity**
    - **Property 13: Deduction Limit Enforcement**
    - **Property 14: Slab Rate Monotonicity**
    - **Validates: Requirements 5.1, 5.2, 5.7**

- [ ] 6. Build regime comparison UI
  - [ ] 6.1 Create regime comparison component
    - Build side-by-side comparison cards
    - Display tax liability, effective rate, and savings
    - Add regime toggle with real-time recalculation
    - _Requirements: 5.10, 18.3, 18.4, 18.5_
  
  - [ ] 6.2 Create tax breakdown component
    - Build accordion sections for income, deductions, tax calculation
    - Add visual charts (bar/pie) for tax breakdown
    - Display detailed slab-wise calculation
    - _Requirements: 5.10, 18.6_

- [ ] 7. Implement Service Worker for offline functionality
  - [ ] 7.1 Set up Workbox for PWA caching
    - Configure cache-first strategy for app shell
    - Configure network-first strategy for API calls
    - Implement background sync for queued operations
    - _Requirements: 10.1, 10.3, 10.6_
  
  - [ ] 7.2 Implement offline calculation capability
    - Enable tax calculation using cached rules
    - Add offline indicator in UI
    - _Requirements: 5.9, 10.4_
  
  - [ ]* 7.3 Write property test for offline profile access
    - **Property 3: Offline Profile Access**
    - **Validates: Requirements 1.5**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Milestone 2: Textract + Bedrock Integration + Basic Extraction

- [ ] 9. Implement document upload infrastructure
  - [ ] 9.1 Create S3 buckets with lifecycle policies
    - Create raw documents bucket with 24-hour TTL
    - Create redacted documents bucket with 24-hour TTL
    - Configure KMS encryption for both buckets
    - _Requirements: 4.3_
  
  - [ ] 9.2 Create upload Lambda function
    - Generate pre-signed S3 upload URLs
    - Validate file type and size
    - Store document metadata in DynamoDB
    - _Requirements: 2.1, 2.7, 2.8_
  
  - [ ]* 9.3 Write property test for file size validation
    - **Property 4: File Size Validation**
    - **Validates: Requirements 2.1, 2.7, 2.8**

- [ ] 10. Build document upload UI
  - [ ] 10.1 Create file upload component
    - Build dropzone with camera and gallery options
    - Implement upload progress indicator
    - Add offline queueing for uploads
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ] 10.2 Implement upload queue management
    - Store queued uploads in IndexedDB
    - Implement background sync when online
    - Add retry logic with exponential backoff
    - _Requirements: 2.2, 2.3, 2.5, 20.1_
  
  - [ ]* 10.3 Write property test for offline document queueing
    - **Property 5: Offline Document Queueing**
    - **Validates: Requirements 2.2**

- [ ] 11. Implement Step Functions document processing workflow
  - [ ] 11.1 Create Step Functions state machine
    - Define workflow: Upload → Textract → PII Detection → Enhancement → Storage
    - Add error handling and retry logic
    - Configure CloudWatch logging
    - _Requirements: 3.1, 3.6_
  
  - [ ] 11.2 Create Textract extraction Lambda
    - Invoke Textract AnalyzeDocument with FORMS and TABLES features
    - Parse Textract response into structured data
    - Calculate field-level confidence scores
    - _Requirements: 3.1, 3.4_
  
  - [ ] 11.3 Implement Form-16 parser
    - Extract employer details (name, PAN, TAN)
    - Extract employee details (name, PAN)
    - Extract salary components and deductions
    - Extract quarterly TDS breakup
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ] 11.4 Implement AIS parser
    - Extract salary income entries
    - Extract interest, dividend, and capital gains
    - Extract TDS by deductor
    - Extract tax payments
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [ ]* 11.5 Write property test for Form-16 required fields extraction
    - **Property 6: Form-16 Required Fields Extraction**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
  
  - [ ]* 11.6 Write property test for AIS required fields extraction
    - **Property 7: AIS Required Fields Extraction**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

- [ ] 12. Integrate Amazon Bedrock for AI enhancement
  - [ ] 12.1 Create Bedrock enhancement Lambda
    - Invoke Claude 3 Sonnet to validate extracted data
    - Enhance key-value pairs with context
    - Handle extraction errors gracefully
    - _Requirements: 3.1, 3.6_
  
  - [ ] 12.2 Implement confidence scoring
    - Calculate field-level confidence scores
    - Flag fields below 85% confidence for review
    - Store confidence metadata in DynamoDB
    - _Requirements: 3.4, 3.8_
  
  - [ ]* 12.3 Write property test for low confidence field flagging
    - **Property 8: Low Confidence Field Flagging**
    - **Validates: Requirements 3.4**

- [ ] 13. Build data review and correction UI
  - [ ] 13.1 Create split-view review component
    - Display original document with pinch-to-zoom
    - Show extracted fields with confidence indicators
    - Implement field editing with change tracking
    - _Requirements: 7.1, 7.2, 7.7_
  
  - [ ] 13.2 Implement validation engine
    - Check for missing mandatory fields
    - Validate field formats (PAN, dates, amounts)
    - Detect anomalies (TDS > 50% salary, etc.)
    - _Requirements: 7.3, 7.4, 7.5, 12.1, 12.2, 12.3_
  
  - [ ] 13.3 Add completeness scoring
    - Calculate percentage of fields filled
    - Display progress bar at top of review screen
    - Enable "Calculate Tax" button when >80% complete
    - _Requirements: 7.8, 7.9_
  
  - [ ]* 13.4 Write property test for extraction data offline storage
    - **Property 9: Extraction Data Offline Storage**
    - **Validates: Requirements 3.8**

- [ ] 14. Implement WebSocket for real-time extraction updates
  - [ ] 14.1 Create WebSocket API Gateway
    - Configure WebSocket routes for connection and messaging
    - Implement connection management Lambda
    - Add authentication for WebSocket connections
    - _Requirements: 2.4_
  
  - [ ] 14.2 Send extraction progress updates
    - Emit progress events from Step Functions
    - Send stage updates (Textract, PII, Enhancement)
    - Notify client on completion or error
    - _Requirements: 2.4_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Milestone 3: Deterministic Python Rule Engine + Export JSON

- [ ] 16. Implement Section 44AD presumptive taxation
  - [ ] 16.1 Create presumptive income calculator
    - Calculate 8% for digital receipts, 6% for cash
    - Validate ₹2 crore threshold
    - _Requirements: 5.3_
  
  - [ ]* 16.2 Write property tests for presumptive taxation
    - **Property 15: Presumptive Taxation Rate Application**
    - **Validates: Requirements 5.3**

- [ ] 17. Enhance validation engine with cross-field rules
  - [ ] 17.1 Implement cross-field validation
    - Validate HRA vs rent paid relationship
    - Check deductions don't exceed gross income
    - Validate TDS vs salary relationship
    - _Requirements: 5.7, 12.4, 12.5_
  
  - [ ] 17.2 Add anomaly detection
    - Detect income discrepancies between Form-16 and AIS
    - Flag duplicate income entries
    - Detect missing bank interest when AIS shows interest
    - _Requirements: 12.3, 12.6, 12.7, 12.8_

- [ ] 18. Implement ITR JSON export functionality
  - [ ] 18.1 Create ITR-1 JSON generator
    - Map tax data to ITR-1 schema structure
    - Generate all mandatory fields
    - Include bank details for refund
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 18.2 Implement JSON schema validator
    - Load ITR Portal schema for FY 2025-26
    - Validate generated JSON against schema
    - Return specific field errors with paths
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [ ] 18.3 Add offline JSON generation
    - Enable JSON generation using cached data
    - Store generated JSON in IndexedDB
    - _Requirements: 8.6_
  
  - [ ]* 18.4 Write property tests for ITR JSON validation
    - **Property 16: ITR JSON Schema Conformance**
    - **Property 17: Mandatory Fields Presence**
    - **Validates: Requirements 8.1, 8.2, 8.3, 17.1, 17.2, 17.3**

- [ ] 19. Build export UI
  - [ ] 19.1 Create bank details form
    - Build IFSC code input with bank name lookup
    - Add account number with confirmation field
    - Validate IFSC format
    - _Requirements: 8.1_
  
  - [ ] 19.2 Create JSON preview component
    - Display key fields from generated JSON
    - Show file size and validation status
    - Add download button
    - _Requirements: 8.7_
  
  - [ ] 19.3 Implement file download
    - Trigger browser download for JSON file
    - Add success confirmation screen
    - Provide next steps guide for IT Portal
    - _Requirements: 8.5_

- [ ] 20. Implement PDF summary generation
  - [ ] 20.1 Create PDF generator Lambda
    - Generate PDF with income, deductions, tax liability
    - Include regime comparison table
    - Add section-wise ITR breakdown
    - Redact PII (show last 4 digits only)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 20.2 Add offline PDF generation
    - Use client-side PDF library (jsPDF)
    - Generate PDF from cached data
    - _Requirements: 9.8_
  
  - [ ] 20.3 Implement PDF download
    - Trigger browser download
    - Format for A4 paper with readable fonts
    - _Requirements: 9.6, 9.7_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Milestone 4: Privacy Hardening (Comprehend, KMS, TTL)

- [ ] 22. Implement PII detection and protection
  - [ ] 22.1 Create PII detection Lambda
    - Invoke Amazon Comprehend DetectPiiEntities
    - Identify PAN, Aadhaar, name, address, bank details
    - Store PII entity metadata
    - _Requirements: 4.1_
  
  - [ ] 22.2 Implement PII encryption
    - Encrypt PII fields using KMS customer-managed keys
    - Store encrypted data in DynamoDB
    - Implement decryption for display
    - _Requirements: 4.2_
  
  - [ ] 22.3 Add PII redaction in UI
    - Redact PII fields (show last 4 characters only)
    - Implement explicit consent flow before processing
    - _Requirements: 4.5, 4.6_
  
  - [ ]* 22.4 Write property test for PII detection and encryption
    - **Property 10: PII Detection and Encryption**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 23. Implement TTL policies
  - [ ] 23.1 Configure DynamoDB TTL
    - Set 24-hour TTL on sessions table
    - Set 24-hour TTL on documents table
    - Set 90-day TTL on audit events table
    - _Requirements: 4.3, 4.4_
  
  - [ ] 23.2 Configure S3 lifecycle policies
    - Set 24-hour deletion for raw documents bucket
    - Set 24-hour deletion for redacted documents bucket
    - Set 7-day deletion for exports bucket
    - _Requirements: 4.3_
  
  - [ ] 23.3 Create TTL verification Lambda
    - Run daily to verify TTL deletions
    - Log deletion confirmations to CloudWatch
    - Alert on TTL policy failures
    - _Requirements: 4.7_
  
  - [ ]* 23.4 Write property test for TTL application
    - **Property 11: TTL Application**
    - **Validates: Requirements 4.3, 4.4**

- [ ] 24. Implement client-side encryption
  - [ ] 24.1 Add Web Crypto API encryption
    - Generate device-specific encryption key
    - Encrypt IndexedDB data before storage
    - Implement decryption on retrieval
    - _Requirements: 4.8_
  
  - [ ]* 24.2 Write property test for client-side encryption
    - **Property 18: Client-Side Data Encryption**
    - **Validates: Requirements 4.8**

- [ ] 25. Implement data deletion functionality
  - [ ] 25.1 Create data deletion Lambda
    - Delete user data from DynamoDB
    - Delete documents from S3
    - Delete cached data from CloudFront
    - _Requirements: 4.10_
  
  - [ ] 25.2 Add user-initiated deletion UI
    - Create "Delete My Data" button in settings
    - Show confirmation dialog
    - Display deletion confirmation
    - _Requirements: 4.10_

- [ ] 26. Implement HTTPS and TLS enforcement
  - [ ] 26.1 Configure CloudFront with TLS 1.3
    - Set up CloudFront distribution
    - Configure TLS 1.3 minimum version
    - Add security headers (HSTS, CSP)
    - _Requirements: 4.9_

- [ ] 27. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Milestone 5: RAG-Based Chat Assistant

- [ ] 28. Set up Bedrock Knowledge Base
  - [ ] 28.1 Create knowledge base with tax documentation
    - Upload Income Tax Act sections (80C, 80D, HRA, 44AD, 87A)
    - Add regime comparison guides
    - Include ITR form instructions
    - _Requirements: 6.3_
  
  - [ ] 28.2 Configure vector embeddings
    - Set up embeddings model for semantic search
    - Index knowledge base documents
    - Test retrieval accuracy

- [ ] 29. Implement chat assistant backend
  - [ ] 29.1 Create chat Lambda function
    - Invoke Bedrock with RAG from Knowledge Base
    - Implement conversation context management (10 messages)
    - Add language-specific responses
    - _Requirements: 6.1, 6.2, 6.4, 6.8_
  
  - [ ] 29.2 Implement contextual help
    - Extract field context from user request
    - Provide field-specific explanations
    - Detect anomaly explanation requests
    - _Requirements: 6.5, 6.6_
  
  - [ ] 29.3 Add domain filtering
    - Detect out-of-domain questions
    - Politely decline and suggest relevant topics
    - _Requirements: 6.7_

- [ ] 30. Build chat assistant UI
  - [ ] 30.1 Create chat interface component
    - Build bottom sheet (mobile) or sidebar (desktop)
    - Implement message bubbles with streaming
    - Add suggested questions chips
    - _Requirements: 6.1, 6.2_
  
  - [ ] 30.2 Add contextual help buttons
    - Place "?" icon next to form fields
    - Auto-generate field-specific questions
    - Display responses in chat overlay
    - _Requirements: 6.5_
  
  - [ ] 30.3 Implement FAQ caching
    - Cache common questions and responses in IndexedDB
    - Serve cached responses when offline
    - _Requirements: 6.9_
  
  - [ ]* 30.4 Write property test for offline FAQ access
    - **Property 19: Offline FAQ Cache Access**
    - **Validates: Requirements 6.9**

- [ ] 31. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Milestone 6: Optimization and Polish (Metrics, Performance, UX)

- [ ] 32. Implement multi-language support
  - [ ] 32.1 Create translation infrastructure
    - Set up i18n framework (react-i18next)
    - Create translation files for 7 languages
    - Implement language switching
    - _Requirements: 13.1, 13.2, 13.3, 13.6_
  
  - [ ] 32.2 Translate all UI text
    - Translate form labels and error messages
    - Translate help text and tooltips
    - Maintain tax terminology consistency
    - _Requirements: 13.3, 13.4_
  
  - [ ] 32.3 Cache language packs
    - Store translations in IndexedDB
    - Enable offline language switching
    - _Requirements: 13.7_
  
  - [ ] 32.4 Implement Indian number formatting
    - Display numbers in lakhs and crores format
    - Apply to all languages
    - _Requirements: 13.8_

- [ ] 33. Implement admin monitoring dashboard
  - [ ] 33.1 Create CloudWatch dashboard
    - Display extraction confidence scores
    - Show extraction failure rate by document type
    - Track API latency for Textract and Bedrock
    - _Requirements: 14.1, 14.2, 14.4, 14.5_
  
  - [ ] 33.2 Set up CloudWatch alarms
    - Alert when extraction failure rate > 10% over 1 hour
    - Alert on high API latency
    - Alert on TTL policy failures
    - _Requirements: 14.3_
  
  - [ ] 33.3 Add metrics logging
    - Log validation errors with field names
    - Track JSON export success rate
    - Monitor active user count and session duration
    - Track offline session count and sync success rate
    - _Requirements: 14.6, 14.7, 14.8, 14.9, 14.10_

- [ ] 34. Optimize mobile performance
  - [ ] 34.1 Implement responsive design
    - Ensure correct rendering from 320px to 1920px
    - Use touch-friendly controls (44x44px minimum)
    - Optimize for mobile bandwidth (<500KB per page)
    - _Requirements: 19.1, 19.2, 19.4_
  
  - [ ] 34.2 Add mobile-specific features
    - Support pinch-to-zoom for documents
    - Use bottom navigation on mobile
    - Support portrait and landscape orientations
    - _Requirements: 19.5, 19.6, 19.8_
  
  - [ ] 34.3 Optimize for low bandwidth
    - Ensure page load < 3 seconds on 3G
    - Function on 2G with page load < 10 seconds
    - _Requirements: 10.8, 19.7_

- [ ] 35. Implement comprehensive error handling
  - [ ] 35.1 Add retry logic with exponential backoff
    - Retry failed API calls up to 3 times
    - Implement exponential backoff (1s, 2s, 4s, 8s, max 30s)
    - _Requirements: 20.1_
  
  - [ ] 35.2 Create user-friendly error messages
    - Display errors without technical jargon
    - Provide actionable suggestions
    - Add "Report Issue" button with context capture
    - _Requirements: 20.2, 20.8_
  
  - [ ] 35.3 Implement auto-save and recovery
    - Auto-save user input every 30 seconds
    - Restore progress on session interruption
    - _Requirements: 20.5, 20.6_
  
  - [ ] 35.4 Add error logging
    - Log all errors to CloudWatch with stack traces
    - Include user context (anonymized)
    - _Requirements: 20.3_

- [ ] 36. Implement sync conflict resolution
  - [ ] 36.1 Create conflict detection logic
    - Compare local and server timestamps
    - Identify conflicting fields
    - _Requirements: 10.7_
  
  - [ ] 36.2 Build conflict resolution UI
    - Display server value vs local value
    - Show timestamps for each version
    - Provide "Keep Local" or "Use Server" buttons
    - _Requirements: 10.7_
  
  - [ ]* 36.3 Write property test for sync conflict resolution
    - **Property 20: User Edit Priority in Sync Conflicts**
    - **Validates: Requirements 10.7**

- [ ] 37. Optimize PWA caching and storage
  - [ ] 37.1 Implement cache size management
    - Limit cached data to 50MB
    - Prompt user to clear old data when quota exceeded
    - _Requirements: 10.9, 10.10_
  
  - [ ] 37.2 Optimize sync frequency
    - Auto-sync every 2 minutes when online
    - Complete sync within 2 minutes
    - _Requirements: 10.6_

- [ ] 38. Final integration testing and polish
  - [ ] 38.1 Test complete user flows
    - Test onboarding → upload → review → calculate → export flow
    - Test offline-first functionality
    - Test error recovery scenarios
    - _Requirements: All_
  
  - [ ] 38.2 Performance optimization
    - Optimize bundle size
    - Lazy load components
    - Optimize images and assets
    - _Requirements: 19.4, 19.7_
  
  - [ ] 38.3 Accessibility improvements
    - Add ARIA labels
    - Ensure keyboard navigation
    - Test with screen readers
    - _Requirements: All_

- [ ] 39. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each milestone
- Property tests validate universal correctness properties
- Implementation uses Python for backend Lambda functions and TypeScript/React for frontend
- AWS CDK is used for infrastructure as code
- All AI services (Textract, Bedrock, Comprehend) are integrated via AWS SDK
