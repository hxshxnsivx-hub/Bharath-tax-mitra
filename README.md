# Bharat Tax Mitra

Offline-first, AI-powered income tax filing assistant for Indian taxpayers in Tier-2 and Tier-3 cities.

## 🎯 Project Overview

Bharat Tax Mitra simplifies income tax filing through:
- **Offline-First PWA**: Works on 2G/3G networks with full offline capability
- **AI-Powered Extraction**: Automatic data extraction from Form-16 and AIS using Amazon Textract and Bedrock
- **Deterministic Tax Calculation**: Accurate tax computation following Income Tax Act 1961
- **IT Portal Integration**: One-click JSON export ready for Income Tax portal upload
- **Multi-Language Support**: 7 Indian languages (English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati)
- **Privacy-First**: 24-hour TTL, KMS encryption, PII detection and redaction

## 📁 Project Structure

```
bharat-tax-mitra/
├── frontend/          # React 18 + TypeScript PWA
├── backend/           # Python Lambda functions
├── infrastructure/    # AWS CDK infrastructure as code
├── shared/            # Shared types and utilities
└── .kiro/specs/       # Project specifications and tasks
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Python >= 3.11
- AWS CLI configured
- AWS CDK CLI

### Installation

```bash
# Install dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies (Python)
cd backend && pip install -r requirements.txt

# Install infrastructure dependencies
cd infrastructure && npm install
```

### Development

```bash
# Start frontend development server
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Local Development (Mock Server — no AWS required)

The frontend talks to a local FastAPI mock backend (no AWS needed). If the
mock server is not running, API calls such as **Send OTP** fail with
"Network error" — so both halves must run together.

**One command (recommended)** — starts the mock API (:3001) and the Vite
frontend (:3000) together, with combined logs; Ctrl+C stops both:

```bash
# One-time: install the mock server's Python deps
pip install -r backend/src/local/requirements_local.txt

# From the repo root — runs mock API + frontend together
npm run dev:local
```

Then open http://localhost:3000.

The frontend already defaults its API base URL to `http://localhost:3001`,
and `frontend/.env.development` makes this explicit for `vite dev`. **Do not**
copy `.env.example` to `.env` for local work — it points at the (not yet
deployed) production URL and will cause "Network error".

**Manual / two-terminal alternative:**

```bash
# Terminal 1 — mock backend on :3001
cd backend
uvicorn src.local.mock_server:app --reload --port 3001

# Terminal 2 — frontend on :3000
npm run dev --workspace=frontend
```

**Mock OTP bypass**: Any 6-digit OTP starting with `123` (e.g. `123456`) is
automatically accepted without a real SMS. Otherwise, the real OTP is printed
in the mock server console (look for a `[MOCK SMS]` line).


## 📋 Implementation Phases

### Phase 1: Foundation & Core Tax Engine (Current)
- ✅ Project structure and development environment
- 🔄 Tax calculation engine (Old & New Regime)
- 🔄 User authentication (OTP-based)
- 🔄 Manual data entry forms
- 🔄 Regime comparison UI
- 🔄 Offline-first PWA architecture

### Phase 2: Document Intelligence & AI Extraction
- AI-powered Form-16/AIS extraction
- Data review and correction UI
- Real-time extraction updates

### Phase 3: Compliance & Export
- ITR JSON export (IT Portal schema)
- PDF summary generation
- Advanced validation

### Phase 4: Privacy, Security & Production Readiness
- PII detection and protection
- Multi-language support
- Admin monitoring dashboard
- Production deployment

## 🛠️ Technology Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Workbox (Service Worker)
- IndexedDB (Dexie.js)
- React Router
- Recharts (Data visualization)

### Backend
- AWS Lambda (Python 3.11)
- Amazon DynamoDB
- Amazon S3
- AWS Step Functions
- Amazon API Gateway

### AI/ML
- Amazon Textract (OCR)
- Amazon Bedrock (Claude 3)
- Amazon Comprehend (PII detection)
- Bedrock Knowledge Bases (RAG)

### Infrastructure
- AWS CDK
- CloudWatch (Monitoring)
- AWS KMS (Encryption)
- AWS AppConfig (Tax rules)

## 📝 License

MIT License - see LICENSE file for details

## 👥 Team

Bharat Tax Mitra Development Team

## 📞 Support

For issues and questions, please open an issue in the repository.
