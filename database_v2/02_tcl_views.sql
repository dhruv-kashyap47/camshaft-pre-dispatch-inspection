-- =============================================================================
-- TCL V2 Production Views for Oracle 19c
-- =============================================================================

-- VW_TCL_INSPECTION_SUMMARY
CREATE OR REPLACE VIEW vw_tcl_inspection_summary AS
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
    c.cam_name_id,
    c.cam_code,
    c.cam_name,
    u.useraccess_id AS operator_useraccess_id,
    u.employee_id   AS operator_employee_id,
    u.full_name     AS operator_name,
    r.role_name     AS operator_role,
    h.checklist_header_id,
    h.checklist_name,
    h.version       AS checklist_version,
    q.part_number,
    q.serial_number,
    q.vendor_code,
    EXTRACT(HOUR FROM i.started_at) AS shift_hour,
    TRUNC(i.started_at) AS inspection_date
FROM tcl_cam_inspection i
JOIN tcl_cam_name c              ON c.cam_name_id = i.cam_name_id
JOIN tcl_cam_useraccess u        ON u.useraccess_id = i.operator_id
JOIN tcl_cam_role r              ON r.role_id = u.role_id
JOIN tcl_cam_checklist_header h  ON h.checklist_header_id = i.checklist_header_id
LEFT JOIN tcl_cam_qr_data q      ON q.inspection_id = i.inspection_id;

-- VW_TCL_AUDIT_TRAIL
CREATE OR REPLACE VIEW vw_tcl_audit_trail AS
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
LEFT JOIN tcl_cam_useraccess u  ON u.useraccess_id = a.useraccess_id
LEFT JOIN tcl_cam_role r        ON r.role_id = u.role_id;

-- VW_TCL_DAILY_INSPECTION_SUMMARY
CREATE OR REPLACE VIEW vw_tcl_daily_inspection_summary AS
SELECT
    TRUNC(NVL(i.started_at, i.created_at)) AS inspection_date,
    c.cam_code,
    c.cam_name,
    COUNT(*) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
    SUM(CASE WHEN i.status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_review,
    SUM(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
    SUM(CASE WHEN i.status = 'NOT_STARTED' THEN 1 ELSE 0 END) AS not_started
FROM tcl_cam_inspection i
JOIN tcl_cam_name c ON c.cam_name_id = i.cam_name_id
GROUP BY TRUNC(NVL(i.started_at, i.created_at)), c.cam_code, c.cam_name;

-- VW_TCL_OPERATOR_PERFORMANCE
CREATE OR REPLACE VIEW vw_tcl_operator_performance AS
SELECT
    u.useraccess_id,
    u.employee_id,
    u.full_name,
    COUNT(i.inspection_id) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    ROUND(AVG(
        EXTRACT(DAY FROM (i.submitted_at - i.started_at)) * 1440 +
        EXTRACT(HOUR FROM (i.submitted_at - i.started_at)) * 60 +
        EXTRACT(MINUTE FROM (i.submitted_at - i.started_at))
    ), 2) AS avg_processing_minutes
FROM tcl_cam_useraccess u
LEFT JOIN tcl_cam_inspection i ON i.operator_id = u.useraccess_id
WHERE EXISTS (
    SELECT 1 FROM tcl_cam_role r
    WHERE r.role_id = u.role_id AND r.role_name = 'OPERATOR'
)
GROUP BY u.useraccess_id, u.employee_id, u.full_name;

-- VW_TCL_CAM_SUMMARY
CREATE OR REPLACE VIEW vw_tcl_cam_summary AS
SELECT
    c.cam_name_id,
    c.cam_code,
    c.cam_name,
    c.status AS cam_status,
    COUNT(i.inspection_id) AS total_inspections,
    MAX(NVL(i.started_at, i.created_at)) AS last_inspected_at,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count
FROM tcl_cam_name c
LEFT JOIN tcl_cam_inspection i ON i.cam_name_id = c.cam_name_id
GROUP BY c.cam_name_id, c.cam_code, c.cam_name, c.status;

-- VW_TCL_SHIFT_SUMMARY
CREATE OR REPLACE VIEW vw_tcl_shift_summary AS
SELECT
    TRUNC(NVL(i.started_at, i.created_at)) AS inspection_date,
    CASE
        WHEN EXTRACT(HOUR FROM NVL(i.started_at, i.created_at)) BETWEEN 6 AND 14 THEN 'SHIFT_A'
        WHEN EXTRACT(HOUR FROM NVL(i.started_at, i.created_at)) BETWEEN 14 AND 22 THEN 'SHIFT_B'
        ELSE 'SHIFT_C'
    END AS shift,
    COUNT(*) AS total_inspections,
    SUM(CASE WHEN i.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN i.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
FROM tcl_cam_inspection i
GROUP BY TRUNC(NVL(i.started_at, i.created_at)),
    CASE
        WHEN EXTRACT(HOUR FROM NVL(i.started_at, i.created_at)) BETWEEN 6 AND 14 THEN 'SHIFT_A'
        WHEN EXTRACT(HOUR FROM NVL(i.started_at, i.created_at)) BETWEEN 14 AND 22 THEN 'SHIFT_B'
        ELSE 'SHIFT_C'
    END;

-- VW_TCL_OVERRIDE_SUMMARY
CREATE OR REPLACE VIEW vw_tcl_override_summary AS
SELECT
    o.override_id,
    o.inspection_id,
    i.inspection_no,
    o.manager_id,
    m_u.employee_id AS manager_employee_id,
    m_u.full_name   AS manager_name,
    o.checklist_item_id,
    ci.item_code,
    ci.prompt,
    o.original_result,
    o.override_result,
    o.reason,
    o.created_at
FROM tcl_cam_override o
JOIN tcl_cam_inspection i         ON i.inspection_id = o.inspection_id
JOIN tcl_cam_useraccess m_u       ON m_u.useraccess_id = o.manager_id
JOIN tcl_cam_checklist_item ci    ON ci.checklist_item_id = o.checklist_item_id;

-- VW_TCL_INSPECTION_PROGRESS
CREATE OR REPLACE VIEW vw_tcl_inspection_progress AS
SELECT
    i.inspection_id,
    i.inspection_no,
    i.status,
    i.current_step,
    i.completion_pct,
    h.checklist_name,
    h.version AS checklist_version,
    (
        SELECT COUNT(*) FROM tcl_cam_checklist_item ci
        WHERE ci.checklist_header_id = h.checklist_header_id AND ci.is_active = 'Y'
    ) AS total_items,
    (
        SELECT COUNT(*) FROM tcl_cam_inspection_response ir
        WHERE ir.inspection_id = i.inspection_id
    ) AS answered_items
FROM tcl_cam_inspection i
JOIN tcl_cam_checklist_header h ON h.checklist_header_id = i.checklist_header_id;

-- VW_TCL_QR_LOOKUP
CREATE OR REPLACE VIEW vw_tcl_qr_lookup AS
SELECT
    q.qr_data_id,
    q.inspection_id,
    q.raw_qr,
    q.part_number,
    q.serial_number,
    q.vendor_code,
    i.inspection_no,
    i.status AS inspection_status,
    c.cam_code,
    c.cam_name
FROM tcl_cam_qr_data q
JOIN tcl_cam_inspection i ON i.inspection_id = q.inspection_id
JOIN tcl_cam_name c       ON c.cam_name_id = i.cam_name_id;
