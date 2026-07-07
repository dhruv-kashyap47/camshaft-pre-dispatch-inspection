-- ============================================================================
-- CamTrace Production Views for Oracle 19c
-- ============================================================================

-- VW_INSPECTION_SUMMARY: Complete inspection overview for reporting
CREATE OR REPLACE VIEW vw_inspection_summary AS
SELECT
    i.inspection_id,
    i.inspection_no,
    i.status,
    i.attendance_marked_at,
    i.started_at,
    i.submitted_at,
    i.approved_at,
    i.approval_note,
    m.machine_id,
    m.machine_code,
    m.machine_name,
    u.user_id AS operator_user_id,
    u.employee_id AS operator_employee_id,
    u.full_name AS operator_name,
    r.role_name AS operator_role,
    EXTRACT(HOUR FROM i.started_at) AS shift_hour,
    TRUNC(i.started_at) AS inspection_date
FROM inspections i
JOIN machines m ON m.machine_id = i.machine_id
JOIN users u ON u.user_id = i.operator_id
JOIN roles r ON r.role_id = u.role_id;

-- VW_AUDIT_TRAIL: Complete audit trail with user details
CREATE OR REPLACE VIEW vw_audit_trail AS
SELECT
    a.audit_log_id,
    a.action,
    a.entity_name,
    a.entity_id,
    a.old_value,
    a.new_value,
    a.details,
    a.created_at,
    u.employee_id,
    u.full_name,
    r.role_name
FROM audit_logs a
LEFT JOIN users u ON u.user_id = a.user_id
LEFT JOIN roles r ON r.role_id = u.role_id;

-- VW_DAILY_INSPECTION_SUMMARY: Daily production summary
CREATE OR REPLACE VIEW vw_daily_inspection_summary AS
SELECT
    TRUNC(i.started_at) AS inspection_date,
    m.machine_code,
    m.machine_name,
    COUNT(*) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
    SUM(CASE WHEN i.status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_review,
    SUM(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress
FROM inspections i
JOIN machines m ON m.machine_id = i.machine_id
GROUP BY TRUNC(i.started_at), m.machine_code, m.machine_name;

-- VW_OPERATOR_PERFORMANCE: Operator productivity metrics
CREATE OR REPLACE VIEW vw_operator_performance AS
SELECT
    u.user_id,
    u.employee_id,
    u.full_name,
    COUNT(i.inspection_id) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    ROUND(AVG(EXTRACT(DAY FROM (i.submitted_at - i.started_at)) * 24 * 60 +
              EXTRACT(HOUR FROM (i.submitted_at - i.started_at)) * 60 +
              EXTRACT(MINUTE FROM (i.submitted_at - i.started_at))), 2) AS avg_processing_minutes
FROM users u
LEFT JOIN inspections i ON i.operator_id = u.user_id
WHERE EXISTS (SELECT 1 FROM roles r WHERE r.role_id = u.role_id AND r.role_name = 'OPERATOR')
GROUP BY u.user_id, u.employee_id, u.full_name;

-- VW_MACHINE_SUMMARY: Machine inspection history
CREATE OR REPLACE VIEW vw_machine_summary AS
SELECT
    m.machine_id,
    m.machine_code,
    m.machine_name,
    m.status AS machine_status,
    COUNT(i.inspection_id) AS total_inspections,
    MAX(i.started_at) AS last_inspected_at,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count
FROM machines m
LEFT JOIN inspections i ON i.machine_id = m.machine_id
GROUP BY m.machine_id, m.machine_code, m.machine_name, m.status;

-- VW_SHIFT_SUMMARY: Summary grouped by shift
CREATE OR REPLACE VIEW vw_shift_summary AS
SELECT
    TRUNC(i.started_at) AS inspection_date,
    CASE
        WHEN EXTRACT(HOUR FROM i.started_at) BETWEEN 6 AND 14 THEN 'SHIFT_A'
        WHEN EXTRACT(HOUR FROM i.started_at) BETWEEN 14 AND 22 THEN 'SHIFT_B'
        ELSE 'SHIFT_C'
    END AS shift,
    COUNT(*) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
FROM inspections i
GROUP BY TRUNC(i.started_at),
    CASE
        WHEN EXTRACT(HOUR FROM i.started_at) BETWEEN 6 AND 14 THEN 'SHIFT_A'
        WHEN EXTRACT(HOUR FROM i.started_at) BETWEEN 14 AND 22 THEN 'SHIFT_B'
        ELSE 'SHIFT_C'
    END;

-- VW_OVERRIDE_SUMMARY: Manager override activity
CREATE OR REPLACE VIEW vw_override_summary AS
SELECT
    o.override_id,
    o.inspection_id,
    i.inspection_no,
    o.manager_id,
    m_u.employee_id AS manager_employee_id,
    m_u.full_name AS manager_name,
    o.checklist_item_id,
    ci.item_code,
    ci.prompt,
    o.original_result,
    o.override_result,
    o.reason,
    o.created_at
FROM overrides o
JOIN inspections i ON i.inspection_id = o.inspection_id
JOIN users m_u ON m_u.user_id = o.manager_id
JOIN checklist_items ci ON ci.checklist_item_id = o.checklist_item_id;
