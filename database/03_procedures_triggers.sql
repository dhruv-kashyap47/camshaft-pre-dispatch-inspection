-- =============================================================================
-- CamTrace Stored Procedures & Triggers for Oracle 19c — V2 TCL Naming
-- =============================================================================
-- Deployed alongside application. Application layer handles most business
-- logic; these procedures provide database-level safety nets.
-- =============================================================================

-- =============================================================================
-- PROCEDURE: pr_cam_audit_log
-- Generic audit log writer (called from application layer fallback)
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_audit_log (
    p_user_id     IN NUMBER,
    p_action      IN VARCHAR2,
    p_entity_name IN VARCHAR2,
    p_entity_id   IN VARCHAR2 DEFAULT NULL,
    p_old_value   IN VARCHAR2 DEFAULT NULL,
    p_new_value   IN VARCHAR2 DEFAULT NULL,
    p_details     IN VARCHAR2 DEFAULT NULL
) AS
    PRAGMA AUTONOMOUS_TRANSACTION;
BEGIN
    INSERT INTO tcl_cam_audit_log (useraccess_id, action, entity_name, entity_id, old_value, new_value, details)
    VALUES (p_user_id, p_action, p_entity_name, p_entity_id, p_old_value, p_new_value, p_details);
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
END pr_cam_audit_log;
/

-- =============================================================================
-- PROCEDURE: pr_cam_create_inspection
-- Creates a new inspection record with generated inspection number
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_create_inspection (
    p_cam_name_id             IN NUMBER,
    p_operator_id             IN NUMBER,
    p_checklist_header_id     IN NUMBER,
    p_inspection_no           OUT VARCHAR2
) AS
    v_today     VARCHAR2(8);
    v_count     NUMBER;
BEGIN
    v_today := TO_CHAR(SYSTIMESTAMP, 'YYYYMMDD');

    SELECT COUNT(*) + 1 INTO v_count
    FROM tcl_cam_inspection
    WHERE inspection_no LIKE 'INSP-' || v_today || '%';

    p_inspection_no := 'INSP-' || v_today || '-' || LPAD(v_count, 5, '0');

    INSERT INTO tcl_cam_inspection (inspection_no, cam_name_id, operator_id, checklist_header_id, status, current_step, started_at)
    VALUES (p_inspection_no, p_cam_name_id, p_operator_id, p_checklist_header_id, 'IN_PROGRESS', 1, SYSTIMESTAMP);
END pr_cam_create_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_cam_submit_inspection
-- Submits an inspection with validation
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_submit_inspection (
    p_inspection_id   IN NUMBER,
    p_operator_id     IN NUMBER
) AS
    v_status      tcl_cam_inspection.status%TYPE;
    v_operator    tcl_cam_inspection.operator_id%TYPE;
    v_resp_count  NUMBER;
BEGIN
    SELECT status, operator_id INTO v_status, v_operator
    FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'IN_PROGRESS' THEN
        RAISE_APPLICATION_ERROR(-20003, 'Cannot submit: inspection status is ' || v_status);
    END IF;

    IF v_operator != p_operator_id THEN
        RAISE_APPLICATION_ERROR(-20004, 'Cannot submit: inspection belongs to another operator');
    END IF;

    SELECT COUNT(*) INTO v_resp_count
    FROM tcl_cam_inspection_response
    WHERE inspection_id = p_inspection_id;

    IF v_resp_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20005, 'Cannot submit: no checklist responses provided');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'SUBMITTED',
        submitted_at = SYSTIMESTAMP,
        completion_pct = 100
    WHERE inspection_id = p_inspection_id;

    pr_cam_audit_log(p_operator_id, 'INSPECTION_SUBMITTED', 'INSPECTION',
                     TO_CHAR(p_inspection_id), v_status, 'SUBMITTED',
                     'Responses: ' || v_resp_count);
END pr_cam_submit_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_cam_approve_inspection
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_approve_inspection (
    p_inspection_id IN NUMBER,
    p_manager_id    IN NUMBER,
    p_approval_note IN VARCHAR2 DEFAULT NULL
) AS
    v_status tcl_cam_inspection.status%TYPE;
BEGIN
    SELECT status INTO v_status FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20006, 'Cannot approve: inspection is not submitted');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'APPROVED',
        approved_at = SYSTIMESTAMP,
        approval_note = p_approval_note
    WHERE inspection_id = p_inspection_id;

    pr_cam_audit_log(p_manager_id, 'APPROVAL', 'INSPECTION', TO_CHAR(p_inspection_id),
                     v_status, 'APPROVED', p_approval_note);
END pr_cam_approve_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_cam_reject_inspection
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_reject_inspection (
    p_inspection_id IN NUMBER,
    p_manager_id    IN NUMBER,
    p_reason        IN VARCHAR2
) AS
    v_status tcl_cam_inspection.status%TYPE;
BEGIN
    SELECT status INTO v_status FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20007, 'Cannot reject: inspection is not submitted');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'REJECTED',
        approval_note = p_reason
    WHERE inspection_id = p_inspection_id;

    pr_cam_audit_log(p_manager_id, 'REJECTION', 'INSPECTION', TO_CHAR(p_inspection_id),
                     v_status, 'REJECTED', p_reason);
END pr_cam_reject_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_cam_override_response
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_override_response (
    p_inspection_id     IN NUMBER,
    p_manager_id        IN NUMBER,
    p_checklist_item_id IN NUMBER,
    p_override_result   IN VARCHAR2,
    p_reason            IN VARCHAR2
) AS
    v_status        tcl_cam_inspection.status%TYPE;
    v_original      tcl_cam_inspection_response.result%TYPE;
    v_submitted_at  tcl_cam_inspection.submitted_at%TYPE;
    v_window_hours  NUMBER := 12;
    v_override_count NUMBER;
BEGIN
    SELECT i.status, i.submitted_at
    INTO v_status, v_submitted_at
    FROM tcl_cam_inspection i WHERE i.inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20008, 'Overrides allowed only for submitted inspections');
    END IF;

    IF v_submitted_at IS NOT NULL AND
       (SYSTIMESTAMP - v_submitted_at) * 24 > v_window_hours THEN
        RAISE_APPLICATION_ERROR(-20009, 'Override window of ' || v_window_hours || ' hours has expired');
    END IF;

    SELECT result INTO v_original
    FROM tcl_cam_inspection_response
    WHERE inspection_id = p_inspection_id AND checklist_item_id = p_checklist_item_id;

    SELECT COUNT(*) INTO v_override_count
    FROM tcl_cam_override
    WHERE inspection_id = p_inspection_id AND checklist_item_id = p_checklist_item_id;

    IF v_override_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Checklist item already has an override');
    END IF;

    INSERT INTO tcl_cam_override (inspection_id, manager_id, checklist_item_id, original_result, override_result, reason)
    VALUES (p_inspection_id, p_manager_id, p_checklist_item_id, v_original, p_override_result, p_reason);

    UPDATE tcl_cam_inspection_response
    SET result = p_override_result
    WHERE inspection_id = p_inspection_id AND checklist_item_id = p_checklist_item_id;

    pr_cam_audit_log(p_manager_id, 'OVERRIDE', 'INSPECTION', TO_CHAR(p_inspection_id),
                     v_original, p_override_result, p_reason);
END pr_cam_override_response;
/

-- =============================================================================
-- TRIGGER: trg_tcl_cam_inspections_finalization_guard
-- Prevent modification of finalized inspections (APPROVED/REJECTED)
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_cam_insp_final_guard
    BEFORE UPDATE ON tcl_cam_inspection
    FOR EACH ROW
BEGIN
    IF :OLD.status IN ('APPROVED', 'REJECTED') THEN
        RAISE_APPLICATION_ERROR(-20001, 'Finalized inspections cannot be modified');
    END IF;

    IF :NEW.status NOT IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED') THEN
        RAISE_APPLICATION_ERROR(-20002, 'Invalid inspection status transition');
    END IF;
END;
/

-- =============================================================================
-- TRIGGER: trg_tcl_cam_overrides_guard
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_cam_overrides_guard
    BEFORE INSERT ON tcl_cam_override
    FOR EACH ROW
DECLARE
    v_status tcl_cam_inspection.status%TYPE;
BEGIN
    SELECT status INTO v_status
    FROM tcl_cam_inspection WHERE inspection_id = :NEW.inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20002, 'Overrides allowed only for submitted inspections');
    END IF;
END;
/

-- =============================================================================
-- PROCEDURE: pr_cam_report_inspection_timeline
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_report_inspection_timeline (
    p_inspection_id IN NUMBER,
    p_cursor        OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_cursor FOR
        SELECT a.created_at, a.action, u.full_name, r.role_name, a.details
        FROM tcl_cam_audit_log a
        LEFT JOIN tcl_cam_useraccess u ON u.useraccess_id = a.useraccess_id
        LEFT JOIN tcl_cam_role r ON r.role_id = u.role_id
        WHERE (a.entity_name = 'INSPECTION' AND a.entity_id = TO_CHAR(p_inspection_id))
           OR (a.entity_name = 'INSPECTION' AND a.entity_id IN (
                SELECT inspection_no FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id
              ))
        ORDER BY a.created_at;
END pr_cam_report_inspection_timeline;
/

-- =============================================================================
-- PROCEDURE: pr_cam_generate_inspection_report
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_cam_generate_inspection_report (
    p_inspection_id IN NUMBER,
    p_cursor        OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_cursor FOR
        SELECT
            i.inspection_id,
            i.inspection_no,
            i.status,
            i.current_step,
            i.completion_pct,
            i.started_at,
            i.submitted_at,
            i.approved_at,
            i.attendance_marked_at,
            n.cam_code,
            n.cam_name,
            u.employee_id,
            u.full_name AS operator_name,
            (SELECT COUNT(*) FROM tcl_cam_inspection_response ir WHERE ir.inspection_id = i.inspection_id) AS response_count,
            (SELECT COUNT(*) FROM tcl_cam_photo p WHERE p.inspection_id = i.inspection_id) AS photo_count,
            (SELECT COUNT(*) FROM tcl_cam_override o WHERE o.inspection_id = i.inspection_id) AS override_count
        FROM tcl_cam_inspection i
        JOIN tcl_cam_name n ON n.cam_name_id = i.cam_name_id
        JOIN tcl_cam_useraccess u ON u.useraccess_id = i.operator_id
        WHERE i.inspection_id = p_inspection_id;
END pr_cam_generate_inspection_report;
/
