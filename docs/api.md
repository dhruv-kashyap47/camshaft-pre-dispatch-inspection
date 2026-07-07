# CamTrace API Reference

Base path: `/api/v1`

## Authentication

All endpoints except `/auth/login` require a Bearer JWT token in the `Authorization` header.

```
Authorization: Bearer <token>
```

### `POST /auth/login`

Authenticates a user and returns a JWT token.

**Request:**
```json
{
  "employee_id": "operator1",
  "password": "Cummins@123",
  "role": "OPERATOR"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "role": "OPERATOR",
  "employee_id": "operator1"
}
```

## Operator Endpoints

### `POST /operator/attendance`

Mark attendance for an inspection.

### `POST /operator/scan`

Scan a machine QR code and return machine details.

### `GET /operator/checklist`

Return all active checklist items for the default machine family.

### `POST /operator/start`

Start a new inspection for a given machine code.

### `POST /operator/photo`

Register photo metadata for an inspection.

### `POST /upload/photo/{inspection_id}`

Upload a photo file (multipart) for an inspection.

### `POST /operator/submit`

Submit inspection with checklist responses.

### `GET /operator/inspections/{inspection_id}`

Get a single inspection summary.

### `GET /operator/inspections/{inspection_id}/detail`

Get inspection with responses and photos.

### `POST /operator/logout`

Log out the current operator session.

## Manager Endpoints

### `GET /manager/pending`

List submitted inspections pending review.

### `GET /manager/inspections/{inspection_id}`

Get full inspection detail including responses, photos, and overrides.

### `POST /manager/override`

Override a checklist response with mandatory reason.

### `POST /manager/approve`

Approve a submitted inspection.

### `POST /manager/reject`

Reject a submitted inspection with reason.

## Admin Endpoints

### `POST /admin/users`

Create a new user. Requires admin role.

### `POST /admin/reset-password`

Reset a user's password.

### `GET /admin/users`

List all users.

### `POST /admin/users/{user_id}/toggle-active`

Toggle user active/inactive status.

### `GET /admin/audits`

List recent audit log entries.

## Reports

### `GET /reports/inspection-status`

Returns counts grouped by inspection status.

### `GET /reports/daily-summary?report_date=YYYY-MM-DD`

Returns daily inspection counts by status.

### `GET /reports/machine-summary`

Returns per-machine inspection statistics.

### `GET /reports/audit-trail`

Returns the full audit trail (admin only).

## Investigation

### `GET /investigation/search`

Search inspections by inspection number, machine code, operator, status, and date range.

**Query parameters:** `inspection_no`, `machine_code`, `operator_id`, `status`, `date_from`, `date_to`, `limit`

### `GET /investigation/timeline/{inspection_id}`

Returns chronological timeline of events for an inspection.

### `GET /investigation/detail/{inspection_id}`

Returns complete inspection detail with responses, photos, overrides, and timeline.

## Error Responses

- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Business rule violation (e.g., already submitted)
- `422 Validation Error` - Request body validation failure
- `500 Internal Server Error` - Unexpected server error
