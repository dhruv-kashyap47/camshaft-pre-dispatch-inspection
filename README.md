# Camshaft Pre-Dispatch Inspection & Traceability

 A production-ready Manufacturing Execution / Quality Inspection platform for camshaft inspection and traceability at Cummins manufacturing facilities.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Database | Oracle 19c (with SQLite fallback for development) |
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18 + Material UI 6 |
| Auth | JWT (HS256) + PBKDF2 password hashing |
| Mobile | PWA with QR scanning and camera capture |
| Reports | Recharts (web), Oracle views (SQL) |

## Repository Layout

```
database/           Oracle DDL, procedures, triggers, views, seed data
app/                FastAPI backend application
frontend/           React PWA client
tests/              Automated backend tests
docs/               Architecture, API, database, deployment guides
scripts/            Utility scripts
```

## Quick Start

### Backend

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -e .[dev]
cp .env.example .env   # edit with your settings
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Default Users

| Employee ID | Password | Role |
|-------------|----------|------|
| operator1 | Cummins@123 | OPERATOR |
| manager1 | Cummins@123 | MANAGER |
| admin1 | Cummins@123 | ADMIN |

**Warning:** Change seed passwords before production deployment.

## Key Features

- **Inspection Lifecycle:** Start → Attendance → QR Scan → Checklist → Submit → Approve/Reject
- **RBAC:** Three-role security model (Operator, Manager, Admin)
- **Audit Trail:** Every action logged with timestamp, user, role, old/new values
- **QR Scanning:** Real-time QR code scanning for machine identification
- **Photo Capture:** Camera integration with LAN share storage
- **Reports:** Status distribution, daily summaries, machine performance
- **Investigation:** Full-text search on inspections with chronological timeline
- **PWA:** Installable on tablets, offline shell with service worker
- **Oracle Integration:** Stored procedures, triggers, views, partitioned tables

## Database Setup (Oracle)

Execute in order:

1. `database/01_schema.sql` — Tables, sequences, constraints
2. `database/02_indexes_views.sql` — Indexes and reporting views
3. `database/03_procedures_triggers.sql` — PL/SQL business logic
4. `database/04_seed_data.sql` — Initial data

## API Documentation

OpenAPI docs: http://localhost:8000/docs

See [docs/api.md](docs/api.md) for endpoint reference.
