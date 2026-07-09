-- =============================================================================
-- CamTrace Production Views for Oracle 19c — V2 TCL Naming
-- =============================================================================

-- VW_CAM_INSPECTION_SUMMARY: Complete inspection overview for reporting
CREATE OR REPLACE VIEW vw_cam_inspection_summary AS
SELECT
    i.inspection_id,
    i.inspection_no,
    i.status,
    i.current_step,
    i.completion_pct,
    i.attendance_marked_at,
    i.started_at,
    i.submitted_at,
    i.approved_at,
    i.approval_note,
    n.cam_name_id,
    n.cam_code,
    n.cam_name,
    u.useraccess_id AS operator_user_id,
    u.employee_id AS operator_employee_id,
    u.full_name AS operator_name,
    r.role_name AS operator_role,
    EXTRACT(HOUR FROM i.started_at) AS shift_hour,
    TRUNC(i.started_at) AS inspection_date
FROM tcl_cam_inspection i
JOIN tcl_cam_name n ON n.cam_name_id = i.cam_name_id
JOIN tcl_cam_useraccess u ON u.useraccess_id = i.operator_id
JOIN tcl_cam_role r ON r.role_id = u.role_id;

-- VW_CAM_AUDIT_TRAIL: Complete audit trail with user details
CREATE OR REPLACE VIEW vw_cam_audit_trail AS
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
FROM tcl_cam_audit_log a
LEFT JOIN tcl_cam_useraccess u ON u.useraccess_id = a.useraccess_id
LEFT JOIN tcl_cam_role r ON r.role_id = u.role_id;

-- VW_CAM_DAILY_INSPECTION_SUMMARY: Daily production summary
CREATE OR REPLACE VIEW vw_cam_daily_inspection_summary AS
SELECT
    TRUNC(i.started_at) AS inspection_date,
    n.cam_code,
    n.cam_name,
    COUNT(*) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
    SUM(CASE WHEN i.status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_review,
    SUM(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress
FROM tcl_cam_inspection i
JOIN tcl_cam_name n ON n.cam_name_id = i.cam_name_id
GROUP BY TRUNC(i.started_at), n.cam_code, n.cam_name;

-- VW_CAM_OPERATOR_PERFORMANCE: Operator productivity metrics
CREATE OR REPLACE VIEW vw_cam_operator_performance AS
SELECT
    u.useraccess_id,
    u.employee_id,
    u.full_name,
    COUNT(i.inspection_id) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    ROUND(AVG(EXTRACT(DAY FROM (i.submitted_at - i.started_at)) * 24 * 60 +
              EXTRACT(HOUR FROM (i.submitted_at - i.started_at)) * 60 +
              EXTRACT(MINUTE FROM (i.submitted_at - i.started_at))), 2) AS avg_processing_minutes
FROM tcl_cam_useraccess u
LEFT JOIN tcl_cam_inspection i ON i.operator_id = u.useraccess_id
WHERE EXISTS (SELECT 1 FROM tcl_cam_role r WHERE r.role_id = u.role_id AND r.role_name = 'OPERATOR')
GROUP BY u.useraccess_id, u.employee_id, u.full_name;

-- VW_CAM_MACHINE_SUMMARY: Machine inspection history
CREATE OR REPLACE VIEW vw_cam_machine_summary AS
SELECT
    n.cam_name_id,
    n.cam_code,
    n.cam_name,
    n.status AS machine_status,
    COUNT(i.inspection_id) AS total_inspections,
    MAX(i.started_at) AS last_inspected_at,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count
FROM tcl_cam_name n
LEFT JOIN tcl_cam_inspection i ON i.cam_name_id = n.cam_name_id
GROUP BY n.cam_name_id, n.cam_code, n.cam_name, n.status;

-- VW_CAM_SHIFT_SUMMARY: Summary grouped by shift
CREATE OR REPLACE VIEW vw_cam_shift_summary AS
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
FROM tcl_cam_inspection i
GROUP BY TRUNC(i.started_at),
    CASE
        WHEN EXTRACT(HOUR FROM i.started_at) BETWEEN 6 AND 14 THEN 'SHIFT_A'
        WHEN EXTRACT(HOUR FROM i.started_at) BETWEEN 14 AND 22 THEN 'SHIFT_B'
        ELSE 'SHIFT_C'
    END;

-- VW_CAM_OVERRIDE_SUMMARY: Manager override activity
CREATE OR REPLACE VIEW vw_cam_override_summary AS
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
FROM tcl_cam_override o
JOIN tcl_cam_inspection i ON i.inspection_id = o.inspection_id
JOIN tcl_cam_useraccess m_u ON m_u.useraccess_id = o.manager_id
JOIN tcl_cam_checklist_item ci ON ci.checklist_item_id = o.checklist_item_id;
