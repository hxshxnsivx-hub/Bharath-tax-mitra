# Requirements Document

## Introduction

Bharat Tax Mitra is an offline-first, AI-powered income tax filing assistant designed for Indian taxpayers in Tier-2 and Tier-3 cities. The system targets salaried employees, gig workers, and small-business taxpayers with limited bandwidth and mixed digital literacy. The primary goal is to simplify the tax filing process through AI-assisted data extraction, deterministic tax computation, and seamless integration with the Income Tax portal, while maintaining strong privacy guarantees and offline-first functionality.

## Glossary

- **System**: The Bharat Tax Mitra application (frontend + backend)
- **PWA**: Progressive Web Application component running in the user's browser
- **User**: An Indian taxpayer using the system to file income tax returns
- **Form_16**: TDS certificate issued by employers showing salary and tax deducted
- **AIS**: Annual Information Statement from Income Tax Department
- **Tax_Engine**: The deterministic calculation module for computing tax liability
- **Extraction_Service**: AI-powered OCR and data extraction service using Textract and Bedrock
- **IT_Portal**: Income Tax Department's official e-filing portal
- **PII**: Personally Identifiable Information (PAN, Aadhaar, name, address, bank details)
- **Regime**: Tax calculation framework (Old Regime with deductions vs New Regime with lower rates)
- **TTL**: Time-to-Live policy for automatic data deletion
- **Session**: A user's active interaction period with the application
- **Profile**: User's stored tax-related information and preferences
- **Validation_Engine**: Rule-based system for checking data completeness and correctness
- **JSON_Export**: ITR JSON file format required by IT_Portal for upload
- **Offline_Mode**: Application state when network connectivity is unavailable
- **Sync_Service**: Background service for synchronizing local and cloud data

## Requirements

### Requirement 1: User Onboarding and Authentication

**User Story:** As a taxpayer, I want to create an account with minimal friction, so that I can start filing my taxes quickly without complex registration processes.

#### Acceptance Criteria

1. WHEN a User accesses the application for the first time, THE System SHALL display language selection options (English, Hindi, and regional languages)
2. WHEN a User provides a mobile number, THE System SHALL send an OTP within 30 seconds
3. WHEN a User enters a valid OTP, THE System SHALL create a device-level Profile within 2 seconds
4. THE PWA SHALL store authentication tokens in IndexedDB with encryption
5. WHILE Offline_Mode is active, THE PWA SHALL allow access to previously authenticated Profile data
6. WHEN a User selects a tax Regime preference, THE System SHALL persist the choice in the Profile
7. IF authentication fails after 3 attempts, THEN THE System SHALL lock the account for 15 minutes and notify the User

### Requirement 2: Document Upload and Intake

**User Story:** As a taxpayer, I want to upload my tax documents easily, so that the system can extract information automatically without manual data entry.

#### Acceptance Criteria

1. THE System SHALL accept PDF uploads for Form_16, AIS, and bank statements up to 10MB per file
2. WHEN a User uploads a document in Offline_Mode, THE PWA SHALL queue the document in IndexedDB for later processing
3. WHEN network connectivity is restored, THE Sync_Service SHALL upload queued documents within 60 seconds
4. THE System SHALL display upload progress with percentage completion
5. WHEN a document upload fails, THE System SHALL retry up to 3 times with exponential backoff
6. WHERE a User cannot upload documents, THE System SHALL provide manual data entry forms as fallback
7. THE System SHALL support image formats (JPEG, PNG) in addition to PDF for document upload
8. WHEN a User uploads a document, THE System SHALL validate file type and size before accepting

### Requirement 3: AI-Powered Data Extraction

**User Story:** As a taxpayer, I want the system to automatically extract information from my documents, so that I don't have to manually type all the details.

#### Acceptance Criteria

1. WHEN a document is uploaded, THE Extraction_Service SHALL process it using Amazon Textract within 10 seconds
2. THE Extraction_Service SHALL identify and extract salary components, TDS amounts, employer details, and PAN from Form_16
3. THE Extraction_Service SHALL extract income sources, capital gains, and interest income from AIS documents
4. WHEN extraction confidence is below 85%, THE System SHALL flag the field for User review
5. THE Extraction_Service SHALL detect and extract bank transaction data for business income calculation
6. IF extraction fails completely, THEN THE System SHALL log the error and prompt User for manual entry
7. THE System SHALL display extracted data alongside original document images for User verification
8. WHEN extraction completes, THE System SHALL store extracted data in IndexedDB for offline access

### Requirement 4: Privacy and PII Protection

**User Story:** As a taxpayer, I want my personal and financial data to be protected, so that I can trust the system with sensitive information.

#### Acceptance Criteria

1. WHEN a document contains PII, THE System SHALL detect it using Amazon Comprehend before storage
2. THE System SHALL encrypt all PII data using AWS KMS before storing in DynamoDB
3. THE System SHALL apply 24-hour TTL to all uploaded documents in S3
4. THE System SHALL apply 24-hour TTL to extracted PII data in DynamoDB
5. WHEN displaying documents, THE System SHALL redact PII fields except the last 4 characters
6. THE System SHALL require explicit User consent before processing any document containing PII
7. WHEN TTL expires, THE System SHALL permanently delete data and confirm deletion in CloudWatch logs
8. THE PWA SHALL encrypt local IndexedDB data using Web Crypto API
9. THE System SHALL transmit all data over HTTPS with TLS 1.3 or higher
10. WHEN a User requests data deletion, THE System SHALL purge all associated data within 1 hour

### Requirement 5: Tax Calculation Engine

**User Story:** As a taxpayer, I want accurate tax calculations based on current rules, so that I can file correct returns and avoid notices.

#### Acceptance Criteria

1. THE Tax_Engine SHALL compute tax liability using FY 2025-26 Income Tax Act rules
2. THE Tax_Engine SHALL calculate deductions for Section 80C (up to ₹1.5 lakh), 80D (health insurance), and HRA
3. THE Tax_Engine SHALL apply Section 44AD presumptive taxation for business income
4. THE Tax_Engine SHALL apply Section 87A rebate (up to ₹12,500 for income below ₹5 lakh in New Regime)
5. THE Tax_Engine SHALL compute tax liability for both Old Regime and New Regime
6. WHEN User data changes, THE Tax_Engine SHALL recalculate tax within 1 second
7. THE Tax_Engine SHALL validate that total deductions do not exceed gross total income
8. THE Tax_Engine SHALL round final tax liability to the nearest rupee
9. WHILE Offline_Mode is active, THE PWA SHALL perform tax calculations locally using cached rules
10. THE Tax_Engine SHALL display regime comparison showing tax liability difference and recommended regime


### Requirement 6: AI Chat Assistant for Tax Guidance

**User Story:** As a taxpayer with limited tax knowledge, I want to ask questions about tax rules and form sections, so that I can understand what information is needed and why.

#### Acceptance Criteria

1. THE System SHALL provide a chat interface powered by Amazon Bedrock (Claude 3)
2. WHEN a User asks a tax-related question, THE System SHALL respond within 3 seconds using RAG from Bedrock Knowledge Bases
3. THE System SHALL answer questions about Sections 80C, 80D, HRA, 44AD, 87A, and regime comparison
4. THE System SHALL provide explanations in the User's selected language
5. WHEN a User clicks "explain this section" on any form field, THE System SHALL display contextual help
6. THE System SHALL detect questions about specific extracted values and provide anomaly explanations
7. IF a question is outside tax domain, THEN THE System SHALL politely decline and suggest relevant topics
8. THE System SHALL maintain conversation context for up to 10 message exchanges per Session
9. WHILE Offline_Mode is active, THE PWA SHALL display cached FAQ responses for common questions

### Requirement 7: Data Review and Correction

**User Story:** As a taxpayer, I want to review and correct AI-extracted data, so that I can ensure accuracy before filing.

#### Acceptance Criteria

1. THE System SHALL display extracted data side-by-side with User-edited values
2. WHEN a User modifies an extracted field, THE System SHALL highlight the change in a distinct color
3. THE Validation_Engine SHALL check for missing mandatory fields and display warnings
4. THE Validation_Engine SHALL flag anomalies such as TDS exceeding salary or negative income
5. WHEN validation detects an error, THE System SHALL display an error message with correction guidance
6. THE System SHALL allow Users to override validation warnings with explicit confirmation
7. THE System SHALL preserve both original extracted values and User corrections for audit trail
8. WHEN a User completes review, THE System SHALL display a completeness score (percentage of fields filled)
9. THE System SHALL prevent progression to export until all mandatory fields are completed or warnings acknowledged

### Requirement 8: JSON Export for IT Portal

**User Story:** As a taxpayer, I want to export my tax data in the correct format, so that I can upload it directly to the Income Tax portal without errors.

#### Acceptance Criteria

1. THE System SHALL generate ITR JSON files conforming to IT_Portal schema version 1.0 for FY 2025-26
2. WHEN a User requests export, THE System SHALL validate all data against IT_Portal schema rules
3. THE System SHALL include all mandatory fields required by IT_Portal in the JSON_Export
4. THE System SHALL generate JSON_Export within 5 seconds for typical returns
5. THE System SHALL allow Users to download JSON_Export to their device
6. WHILE Offline_Mode is active, THE PWA SHALL generate JSON_Export locally without server communication
7. THE System SHALL display a preview of key JSON fields before final export
8. WHEN JSON generation fails validation, THE System SHALL display specific field errors with line numbers
9. THE System SHALL digitally sign JSON_Export with User's credentials if provided

### Requirement 9: Summary PDF Generation

**User Story:** As a taxpayer, I want a human-readable summary of my tax filing, so that I can keep records and understand my tax liability.

#### Acceptance Criteria

1. THE System SHALL generate a PDF summary containing income sources, deductions, and final tax liability
2. THE System SHALL include regime comparison table showing tax under both regimes
3. THE System SHALL display tax savings breakdown by deduction category (80C, 80D, HRA)
4. THE System SHALL include a section-wise breakdown of ITR form fields
5. THE System SHALL redact sensitive PII in the PDF summary (show only last 4 digits of PAN/Aadhaar)
6. WHEN a User requests PDF generation, THE System SHALL create it within 10 seconds
7. THE System SHALL format PDF for A4 paper size with readable fonts (minimum 10pt)
8. WHILE Offline_Mode is active, THE PWA SHALL generate PDF locally using cached data

### Requirement 10: Offline-First Architecture

**User Story:** As a taxpayer in an area with poor connectivity, I want to use the application offline, so that I can complete my tax filing without interruption.

#### Acceptance Criteria

1. THE PWA SHALL cache all application assets using Service Workers for offline access
2. THE PWA SHALL store User Profile, extracted data, and tax calculations in IndexedDB
3. WHEN network connectivity is lost, THE PWA SHALL continue functioning without displaying errors
4. THE PWA SHALL display a connectivity indicator showing online/offline status
5. WHEN a User performs actions in Offline_Mode, THE PWA SHALL queue them for synchronization
6. WHEN network connectivity is restored, THE Sync_Service SHALL synchronize queued actions within 2 minutes
7. THE PWA SHALL resolve sync conflicts by prioritizing User-edited values over extracted values
8. THE System SHALL function on 2G networks with page load times under 10 seconds
9. THE PWA SHALL limit cached data to 50MB to avoid storage quota issues
10. WHEN storage quota is exceeded, THE PWA SHALL prompt User to clear old data or sync to cloud

### Requirement 11: Tax Rules Configuration Management

**User Story:** As a system administrator, I want to update tax rules without code deployment, so that the system stays current with annual tax law changes.

#### Acceptance Criteria

1. THE System SHALL load tax rules from AWS AppConfig at application startup
2. THE System SHALL support versioned tax rule configurations for different financial years
3. WHEN tax rules are updated in AppConfig, THE System SHALL refresh rules within 5 minutes
4. THE System SHALL validate tax rule configuration schema before applying updates
5. IF invalid tax rules are detected, THEN THE System SHALL rollback to the previous valid version
6. THE System SHALL log all tax rule changes to CloudWatch with timestamp and version number
7. THE PWA SHALL cache current tax rules in IndexedDB for offline calculation
8. WHEN PWA comes online, THE Sync_Service SHALL check for updated tax rules and refresh cache

### Requirement 12: Anomaly Detection and Warnings

**User Story:** As a taxpayer, I want to be warned about unusual values in my tax data, so that I can catch errors before filing.

#### Acceptance Criteria

1. WHEN TDS amount exceeds 50% of salary, THE System SHALL display a warning
2. WHEN claimed deductions exceed statutory limits, THE System SHALL prevent progression and display error
3. WHEN income sources in AIS do not match Form_16, THE System SHALL flag the discrepancy
4. WHEN HRA claimed exceeds 50% of basic salary, THE System SHALL display a warning
5. WHEN business income under 44AD is below ₹50 lakh but presumptive rate is not applied, THE System SHALL warn User
6. THE System SHALL detect duplicate income entries and prompt User to review
7. WHEN bank interest income is missing but AIS shows interest, THE System SHALL prompt User to add it
8. THE System SHALL compare current year income with previous year (if available) and flag variations above 50%

### Requirement 13: Multi-Language Support

**User Story:** As a taxpayer more comfortable in my regional language, I want to use the application in my preferred language, so that I can understand all instructions clearly.

#### Acceptance Criteria

1. THE System SHALL support English, Hindi, Tamil, Telugu, Marathi, Bengali, and Gujarati
2. WHEN a User selects a language, THE System SHALL display all UI text in that language within 1 second
3. THE System SHALL translate form labels, error messages, and help text to the selected language
4. THE System SHALL maintain tax terminology consistency across languages using a glossary
5. THE Chat Assistant SHALL respond in the User's selected language
6. THE System SHALL allow language switching at any time without losing entered data
7. THE PWA SHALL cache language packs in IndexedDB for offline access
8. THE System SHALL display numbers in Indian numbering format (lakhs and crores) for all languages

### Requirement 14: Admin Monitoring Dashboard

**User Story:** As a system administrator, I want to monitor extraction quality and system failures, so that I can identify and fix issues proactively.

#### Acceptance Criteria

1. THE System SHALL log all extraction attempts with confidence scores to CloudWatch
2. THE System SHALL track extraction failure rate by document type (Form_16, AIS, bank statements)
3. THE System SHALL alert administrators when extraction failure rate exceeds 10% over 1 hour
4. THE System SHALL display average extraction confidence scores on the dashboard
5. THE System SHALL track API latency for Textract and Bedrock services
6. THE System SHALL log all validation errors with field names and error types
7. THE System SHALL track JSON_Export success rate and common validation failures
8. THE System SHALL display active user count and session duration metrics
9. THE System SHALL monitor TTL policy execution and confirm data deletion
10. THE System SHALL track offline session count and sync success rate

### Requirement 15: Form-16 Parser and Pretty Printer

**User Story:** As a developer, I want to parse Form-16 PDFs reliably, so that salary and TDS data is extracted accurately.

#### Acceptance Criteria

1. WHEN a Form_16 PDF is uploaded, THE Parser SHALL extract employer name, PAN, TAN, and address
2. THE Parser SHALL extract salary components (basic, HRA, special allowance, gross salary)
3. THE Parser SHALL extract deductions (standard deduction, professional tax, total deductions)
4. THE Parser SHALL extract TDS amount and quarterly breakup
5. THE Parser SHALL extract employee PAN, name, and assessment year
6. WHEN parsing fails, THE Parser SHALL return descriptive error messages indicating the problematic section
7. THE Pretty_Printer SHALL format extracted Form_16 data into a human-readable summary
8. FOR ALL successfully extracted Form_16 data, parsing the Pretty_Printer output SHALL produce equivalent structured data (round-trip property)

### Requirement 16: AIS Parser and Pretty Printer

**User Story:** As a developer, I want to parse AIS PDFs reliably, so that all income sources reported to IT Department are captured.

#### Acceptance Criteria

1. WHEN an AIS PDF is uploaded, THE Parser SHALL extract all salary income entries with employer details
2. THE Parser SHALL extract interest income from banks and post offices
3. THE Parser SHALL extract dividend income and capital gains
4. THE Parser SHALL extract TDS deducted by each deductor with TAN
5. THE Parser SHALL extract tax payments (advance tax, self-assessment tax)
6. WHEN parsing fails, THE Parser SHALL return descriptive error messages indicating the problematic section
7. THE Pretty_Printer SHALL format extracted AIS data into a structured summary grouped by income type
8. FOR ALL successfully extracted AIS data, parsing the Pretty_Printer output SHALL produce equivalent structured data (round-trip property)

### Requirement 17: ITR JSON Schema Validator

**User Story:** As a developer, I want to validate generated JSON against IT Portal schema, so that exports are guaranteed to be accepted by the portal.

#### Acceptance Criteria

1. THE Validation_Engine SHALL validate JSON_Export against ITR-1, ITR-2, ITR-3, and ITR-4 schemas
2. WHEN validation fails, THE Validation_Engine SHALL return field path and error description
3. THE Validation_Engine SHALL check mandatory field presence for the selected ITR form type
4. THE Validation_Engine SHALL validate data types (string, number, date) for all fields
5. THE Validation_Engine SHALL validate field length constraints and pattern matching (PAN format, date format)
6. THE Validation_Engine SHALL validate cross-field dependencies (e.g., if HRA claimed, then rent paid must be present)
7. THE Validation_Engine SHALL validate numerical constraints (non-negative amounts, percentage ranges)
8. THE Validation_Engine SHALL validate enum values against IT_Portal allowed values

### Requirement 18: Regime Comparison Calculator

**User Story:** As a taxpayer, I want to see tax liability under both regimes, so that I can choose the regime that minimizes my tax.

#### Acceptance Criteria

1. THE Tax_Engine SHALL calculate tax liability under Old Regime with all applicable deductions
2. THE Tax_Engine SHALL calculate tax liability under New Regime with lower slab rates and no deductions
3. THE System SHALL display side-by-side comparison showing taxable income, tax liability, and effective tax rate
4. THE System SHALL highlight the regime with lower tax liability
5. THE System SHALL display the tax savings amount if User switches to the recommended regime
6. THE System SHALL show which deductions are available in Old Regime but not in New Regime
7. THE System SHALL allow User to toggle between regimes and see real-time recalculation
8. THE System SHALL persist User's regime choice in Profile for future sessions

### Requirement 19: Mobile-First Responsive Design

**User Story:** As a taxpayer using a smartphone, I want the application to work smoothly on my device, so that I can file taxes without needing a computer.

#### Acceptance Criteria

1. THE PWA SHALL render correctly on screen sizes from 320px to 1920px width
2. THE PWA SHALL use touch-friendly controls with minimum tap target size of 44x44 pixels
3. THE PWA SHALL display forms in single-column layout on mobile devices (width < 768px)
4. THE PWA SHALL optimize images and assets for mobile bandwidth (< 500KB per page)
5. THE PWA SHALL support pinch-to-zoom for document viewing on mobile devices
6. THE PWA SHALL use bottom navigation for primary actions on mobile devices
7. THE PWA SHALL load initial view within 3 seconds on 3G networks
8. THE PWA SHALL support both portrait and landscape orientations without layout breaking

### Requirement 20: Error Handling and Recovery

**User Story:** As a taxpayer, I want the system to handle errors gracefully, so that I don't lose my work if something goes wrong.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL retry up to 3 times with exponential backoff
2. WHEN a critical error occurs, THE System SHALL display a user-friendly error message without technical jargon
3. THE System SHALL log all errors to CloudWatch with stack traces and user context
4. WHEN extraction fails, THE System SHALL allow User to retry or switch to manual entry
5. THE PWA SHALL auto-save User input every 30 seconds to prevent data loss
6. WHEN a Session is interrupted, THE System SHALL restore User's progress on next login
7. IF Lambda function times out, THEN THE System SHALL notify User and queue the operation for retry
8. THE System SHALL provide a "Report Issue" button that captures error context and sends to support
9. WHEN sync fails repeatedly, THE System SHALL allow User to export data locally and continue offline

