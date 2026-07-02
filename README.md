# FLOW — Financial and Operational Water Management Platform

An open-source digital platform designed to help community-managed rural water systems reduce Non-Revenue Water (NRW) while strengthening financial sustainability, governance, and service reliability.

> **Prototype — Pilot Phase.** This is a working prototype developed for the RELX Environmental Challenge. It demonstrates core capabilities that will be evaluated during a 12-month pilot with 12 communities across Honduras, Nicaragua, and Ecuador.

## Architecture

```
backend/          API server and database layer
frontend/         Web application (works on phones, tablets, and computers)
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
- **Operator:** `operator@cwip.org` / `operator123`
- **Admin (view only):** `admin@cwip.org` / `admin123`

### Docker
```bash
docker-compose up -d
```

## Key Capabilities

| Capability | Benefit |
|------------|--------|
| **Meter reading collection** | Accurate consumption data for billing and loss detection |
| **Works without internet** | Operators can collect data anywhere; syncs automatically when connectivity returns |
| **Separate operator/admin roles** | Natural checks and balances that strengthen governance |
| **Payment and billing tracking** | Monitor arrears and revenue collection by household |
| **Community dashboard** | Real-time visibility into operational and financial status |
| **Consumption anomaly detection** | Identify unusual usage that may indicate leaks or meter errors |
| **Maintenance prioritization** | Recommendations to reduce breakdowns and extend system life |

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
