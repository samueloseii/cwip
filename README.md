# CWIP — Community Water Intelligence Platform

A digital open-source operating system for rural community-managed water systems. Combines offline-first data collection, financial management, asset tracking, maintenance management, governance reporting, and AI-supported decision-making.

## Architecture

```
backend/          FastAPI + PostgreSQL + SQLAlchemy
  app/
    api/          REST endpoints (auth, communities, households, meters, billing, maintenance, dashboard, analytics)
    ai/           AI analytics module (payment risk, anomaly detection, maintenance prioritization)
    models/       SQLAlchemy ORM models
    schemas/      Pydantic request/response schemas
    core/         Config, security, JWT auth
    db/           Database session, seed data
frontend/         React + TypeScript + Tailwind CSS + Vite
  src/
    components/   Dashboard, communities, households, meters, billing, maintenance, analytics pages
    contexts/     Auth context
    services/     API client (axios)
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL if needed

# Start the server (auto-creates tables)
uvicorn app.main:app --reload --port 8000

# Seed demo data
python -m app.db.seed
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev   # starts on http://localhost:3000
```

### Demo Login
- **Email:** `admin@cwip.org`
- **Password:** `admin123`

### Docker
```bash
docker-compose up -d
```

## Key Features

| Module | Description |
|--------|-------------|
| **Communities** | Register and manage water systems across countries |
| **Households** | Track connections, account status, outstanding balances |
| **Meters** | Record readings, calculate consumption |
| **Billing** | Generate invoices, record payments, track collection rates |
| **Maintenance** | Log issues, prioritize by urgency, track resolution |
| **AI Analytics** | Payment risk scoring, consumption anomaly detection, maintenance prioritization, financial sustainability alerts |
| **Dashboard** | System-wide, partner-level, and community-level KPIs |

## Pilot Scope

- 12 communities across Nicaragua, Ecuador, and Honduras
- 4 local partners: FEDICAMP, ALTROPICO, AVODEC, ASOMAINCUPACO
- ~2,000 household connections
- Configurable tariffs and multi-currency support (USD, NIO, HNL)

## API Documentation

With the backend running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

Open source — MIT License.
