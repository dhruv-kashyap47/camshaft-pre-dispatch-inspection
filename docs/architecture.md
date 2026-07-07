# CamTrace Architecture

## Layered Architecture

CamTrace follows a strict layered architecture:

```
┌─────────────────────────────────────────────┐
│            React PWA (Tablet UI)            │
├─────────────────────────────────────────────┤
│           FastAPI REST API Layer            │
├─────────────────────────────────────────────┤
│         Business Logic Services Layer       │
├─────────────────────────────────────────────┤
│    SQLAlchemy ORM / Oracle PL/SQL Layer     │
├─────────────────────────────────────────────┤
│           Oracle 19c Database               │
└─────────────────────────────────────────────┘
```

## Core Components

### Oracle 19c Database
- System of record for all manufacturing data
- Stored procedures for critical business operations
- Triggers for automatic audit trail generation
- Views for production reporting
- Partitioned audit_logs table for performance

### FastAPI Backend
- JWT authentication with PBKDF2 password hashing
- Role-based access control (OPERATOR, MANAGER, ADMIN)
- Inspection lifecycle management
- Photo upload to LAN share
- Report generation endpoints
- Investigation and search capability

### React PWA Frontend
- Tablet-optimized operator interface
- Manager review console
- IT/Admin control room
- Production reports dashboard
- Investigation console with timeline viewer
- QR code scanner integration
- Camera integration for photo capture
- Offline shell with service worker caching

## Data Flow

1. **Inspection Lifecycle:** Start → Attendance → Scan QR → Checklist → Submit → Review → Approve/Reject
2. **Traceability:** Every action is logged with timestamp, user, role, old/new values
3. **Photos:** Captured via device camera, stored on LAN share, metadata in Oracle
4. **Reports:** Consumed via Oracle views or API aggregation, rendered in charts

## Security Architecture

- JWT tokens with role claims for every request
- RBAC middleware on every protected endpoint
- PBKDF2 password hashing (600,000 iterations)
- Input validation via Pydantic schemas
- Oracle-level constraints and triggers prevent invalid state transitions
- Autonomous audit transactions ensure log persistence
- CORS restricted to known origins
- File upload validation (type, size, path traversal prevention)

## Deployment Topology

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Tablet  │────▶│  FastAPI │────▶│  Oracle  │
│  (PWA)   │     │  Server  │     │  19c DB  │
└──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  LAN     │
                 │  Share   │
                 │ (Photos) │
                 └──────────┘
```
