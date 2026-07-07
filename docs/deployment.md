# Deployment Guide

## Prerequisites

- Oracle 19c or later (production)
- Python 3.11+
- Node.js 20+
- Windows Server or Linux for backend
- LAN file share for photo storage

## Database Setup

1. Run the Oracle SQL scripts in order:

```sql
-- Create tables and sequences
@database/01_schema.sql

-- Create indexes and views
@database/02_indexes_views.sql

-- Create procedures and triggers
@database/03_procedures_triggers.sql

-- Seed initial data
@database/04_seed_data.sql
```

2. Create a dedicated Oracle user:

```sql
CREATE USER camtrace_app IDENTIFIED BY <strong_password>;
GRANT CONNECT, RESOURCE TO camtrace_app;
GRANT CREATE VIEW, CREATE PROCEDURE, CREATE TRIGGER TO camtrace_app;
ALTER USER camtrace_app QUOTA UNLIMITED ON USERS;
```

## Backend Deployment

1. Create Python virtual environment:
```powershell
python -m venv venv
.\venv\Scripts\activate
```

2. Install dependencies:
```powershell
pip install -e .[dev]
```

3. Configure `.env` file:
```
SECRET_KEY=<generate-a-64-char-random-key>
ORACLE_DSN=oracle+oracledb://camtrace_app:password@host:1521/?service_name=CAMTRACEPDB
LAN_IMAGE_ROOT=\\fileserver\camtrace\inspection_photos
CORS_ORIGINS=http://tablet-host:5173,http://tablet-host
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

4. Run with uvicorn:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Frontend Deployment

1. Install dependencies:
```powershell
cd frontend
npm install
```

2. Configure environment:
```powershell
$env:VITE_API_URL="http://backend-host:8000/api/v1"
```

3. Build for production:
```powershell
npm run build
```

4. Serve `frontend/dist/` from IIS, Nginx, or a static file server.

## Production Checklist

- [ ] SECRET_KEY is at least 64 characters, generated via `secrets.token_hex(32)`
- [ ] ALLOW_DEV_SQLITE_FALLBACK is set to `false`
- [ ] Oracle user has least-privilege grants
- [ ] CORS_ORIGINS is restricted to known tablet IPs
- [ ] LAN_IMAGE_ROOT is on a secured network share
- [ ] HTTPS is configured on the backend
- [ ] Backend is not exposed to the internet
- [ ] Seed passwords have been changed
- [ ] Oracle TNS listener is properly secured
- [ ] Backend runs as a Windows service or Linux systemd unit
- [ ] Regular Oracle RMAN backups are configured
- [ ] Audit log retention policy is defined
- [ ] File upload size limits are configured in the reverse proxy

## Monitoring

- Backend health: `GET /health`
- OpenAPI docs: `http://backend-host:8000/docs`
- Oracle alerts for audit_log partition management
- LAN share disk space monitoring

## Troubleshooting

**Backend won't start:**
- Check Oracle connectivity with `tnsping`
- Verify `.env` file exists and has correct values
- Check Python version: `python --version` (3.11+ required)

**Frontend shows blank screen:**
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Ensure CORS is configured for the frontend origin
- Clear browser cache and reload

**QR scanner not working:**
- Ensure HTTPS is enabled (camera requires secure context)
- Grant camera permissions in the browser
- Use Chrome or Edge on tablets

**Login failing:**
- Verify user exists in Oracle
- Check that the role matches
- Password hash algorithm must match (PBKDF2_SHA256 with 600000 iterations)
