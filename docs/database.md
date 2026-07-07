# Database Design

## Tables

| Table | Description |
|-------|-------------|
| `roles` | Role definitions (OPERATOR, MANAGER, ADMIN) |
| `users` | System users with PBKDF2-hashed passwords |
| `machines` | Manufacturing machines with QR codes |
| `checklist_items` | Quality inspection checklist items |
| `inspections` | Inspection records with status lifecycle |
| `inspection_responses` | Per-checklist-item results |
| `photos` | Photo metadata (LAN path references) |
| `overrides` | Manager overrides with reasons |
| `audit_logs` | Partitioned audit trail |

## Sequences

All tables use Oracle sequences for ID generation:
`seq_roles_id`, `seq_users_id`, `seq_machines_id`,
`seq_checklist_items_id`, `seq_inspections_id`,
`seq_inspection_responses_id`, `seq_photos_id`,
`seq_overrides_id`, `seq_audit_logs_id`

## Views

| View | Purpose |
|------|---------|
| `vw_inspection_summary` | Complete inspection overview with machine/operator details |
| `vw_audit_trail` | Full audit trail with user and role info |
| `vw_daily_inspection_summary` | Daily production counts by status |
| `vw_operator_performance` | Operator productivity metrics |
| `vw_machine_summary` | Per-machine inspection history |
| `vw_shift_summary` | Shift-based production summary |
| `vw_override_summary` | Manager override activity |

## Stored Procedures

| Procedure | Purpose |
|-----------|---------|
| `pr_audit_log` | Generic audit log writer (autonomous) |
| `pr_login_attempt` | Validate login credentials |
| `pr_create_inspection` | Create inspection with generated number |
| `pr_submit_inspection` | Submit inspection with validation |
| `pr_approve_inspection` | Approve inspection |
| `pr_reject_inspection` | Reject inspection |
| `pr_override_response` | Manager override with validation |
| `pr_mark_attendance` | Mark operator attendance |
| `pr_report_inspection_timeline` | Generate inspection timeline |
| `pr_generate_inspection_report` | Comprehensive inspection report |

## Triggers

| Trigger | Purpose |
|---------|---------|
| `trg_users_audit` | Auto-audit user creation and updates |
| `trg_inspections_status_change` | Auto-audit status transitions |
| `trg_inspections_finalization_guard` | Prevent modification of finalized inspections |
| `trg_overrides_guard` | Validate override insertion |
| `trg_photos_audit` | Auto-audit photo uploads |

## Partitioning

`audit_logs` is partitioned by month using Oracle INTERVAL partitioning for query performance and data lifecycle management.

## Photo Storage

Photo binaries are stored on a LAN network share. The database stores the LAN path, file name, content type, and size. This keeps the database lean while maintaining full traceability.
