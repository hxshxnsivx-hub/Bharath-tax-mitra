# Bharat Tax Mitra — Backend API Reference

## Authentication Endpoints

### POST /auth/send-otp
Send OTP to mobile number.

**Request**:
```json
{ "mobileNumber": "+919876543210" }
```
**Response 200**: `{ "message": "OTP sent" }`
**Response 429**: `{ "error": "Rate limit exceeded" }`

### POST /auth/verify-otp
Verify OTP and receive JWT tokens.

**Request**:
```json
{ "mobileNumber": "+919876543210", "otp": "123456" }
```
**Response 200**: `{ "accessToken": "...", "refreshToken": "...", "userId": "..." }`
**Response 401**: `{ "error": "Invalid OTP" }`

## Tax Calculation Endpoints (task 0.5.3, in progress)

### POST /calculate
Server-side tax calculation — mirrors frontend `taxCalculator.ts`.

**Request**: `IncomeData + DeductionData + PersonalInfo` (see `shared/types/tax-calculation.ts`)
**Response 200**: `RegimeComparisonResult`
