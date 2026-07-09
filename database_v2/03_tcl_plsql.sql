-- =============================================================================
-- TCL V2 Stored Procedures, Functions & Triggers for Oracle 19c
-- =============================================================================

-- =============================================================================
-- PROCEDURE: pr_tcl_audit_log
-- Generic autonomous audit log writer
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_audit_log (
    p_useraccess_id IN NUMBER,
    p_action        IN VARCHAR2,
    p_entity_name   IN VARCHAR2,
    p_entity_id     IN VARCHAR2 DEFAULT NULL,
    p_old_value     IN VARCHAR2 DEFAULT NULL,
    p_new_value     IN VARCHAR2 DEFAULT NULL,
    p_details       IN VARCHAR2 DEFAULT NULL
) AS
    PRAGMA AUTONOMOUS_TRANSACTION;
BEGIN
    INSERT INTO tcl_cam_audit_log (
        useraccess_id, action, entity_name, entity_id,
        old_value, new_value, details
    ) VALUES (
        p_useraccess_id, p_action, p_entity_name, p_entity_id,
        p_old_value, p_new_value, p_details
    );
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
END pr_tcl_audit_log;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_login_attempt
-- Validates login credentials, returns user info
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_login_attempt (
    p_employee_id   IN  VARCHAR2,
    p_password      IN  VARCHAR2,
    p_role_name     IN  VARCHAR2,
    p_useraccess_id OUT NUMBER,
    p_full_name     OUT VARCHAR2,
    p_role_id       OUT NUMBER,
    p_is_active     OUT CHAR
) AS
BEGIN
    SELECT u.useraccess_id, u.full_name, u.role_id, u.is_active
    INTO p_useraccess_id, p_full_name, p_role_id, p_is_active
    FROM tcl_cam_useraccess u
    JOIN tcl_cam_role r ON r.role_id = u.role_id
    WHERE u.employee_id = p_employee_id
      AND r.role_name = p_role_name
      AND ROWNUM = 1;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_useraccess_id := NULL;
        p_full_name := NULL;
        p_role_id := NULL;
        p_is_active := 'N';
END pr_tcl_login_attempt;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_create_inspection
-- Creates a new inspection with auto-generated inspection number
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_create_inspection (
    p_cam_name_id         IN  NUMBER,
    p_operator_id         IN  NUMBER,
    p_checklist_header_id IN  NUMBER,
    p_inspection_no       OUT VARCHAR2,
    p_inspection_id       OUT NUMBER
) AS
    v_today VARCHAR2(8);
    v_count NUMBER;
BEGIN
    v_today := TO_CHAR(SYSTIMESTAMP, 'YYYYMMDD');

    SELECT COUNT(*) + 1 INTO v_count
    FROM tcl_cam_inspection
    WHERE inspection_no LIKE 'INSP-' || v_today || '%';

    p_inspection_no := 'INSP-' || v_today || '-' || LPAD(v_count, 5, '0');

    INSERT INTO tcl_cam_inspection (
        inspection_no, cam_name_id, operator_id,
        checklist_header_id, status
    ) VALUES (
        p_inspection_no, p_cam_name_id, p_operator_id,
        p_checklist_header_id, 'NOT_STARTED'
    )
    RETURNING inspection_id INTO p_inspection_id;
END pr_tcl_create_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_start_inspection
-- Transitions inspection from NOT_STARTED to IN_PROGRESS
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_start_inspection (
    p_inspection_id IN NUMBER,
    p_operator_id   IN NUMBER
) AS
    v_status tcl_cam_inspection.status%TYPE;
    v_operator tcl_cam_inspection.operator_id%TYPE;
BEGIN
    SELECT status, operator_id INTO v_status, v_operator
    FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'NOT_STARTED' THEN
        RAISE_APPLICATION_ERROR(-20020, 'Cannot start: inspection status is ' || v_status);
    END IF;

    IF v_operator != p_operator_id THEN
        RAISE_APPLICATION_ERROR(-20021, 'Cannot start: inspection belongs to another operator');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'IN_PROGRESS',
        started_at = SYSTIMESTAMP,
        current_step = 1
    WHERE inspection_id = p_inspection_id;
END pr_tcl_start_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_update_progress
-- Updates inspection progress (current step + completion %)
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_update_progress (
    p_inspection_id IN NUMBER,
    p_current_step  IN NUMBER,
    p_completion_pct IN NUMBER
) AS
BEGIN
    UPDATE tcl_cam_inspection
    SET current_step = p_current_step,
        completion_pct = p_completion_pct
    WHERE inspection_id = p_inspection_id;
END pr_tcl_update_progress;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_submit_inspection
-- Submits inspection with validation
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_submit_inspection (
    p_inspection_id  IN NUMBER,
    p_operator_id    IN NUMBER,
    p_response_count IN NUMBER
) AS
    v_status   tcl_cam_inspection.status%TYPE;
    v_operator tcl_cam_inspection.operator_id%TYPE;
BEGIN
    SELECT status, operator_id INTO v_status, v_operator
    FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'IN_PROGRESS' THEN
        RAISE_APPLICATION_ERROR(-20003, 'Cannot submit: inspection status is ' || v_status);
    END IF;

    IF v_operator != p_operator_id THEN
        RAISE_APPLICATION_ERROR(-20004, 'Cannot submit: inspection belongs to another operator');
    END IF;

    IF p_response_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20005, 'Cannot submit: no checklist responses provided');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'SUBMITTED',
        submitted_at = SYSTIMESTAMP,
        completion_pct = 100
    WHERE inspection_id = p_inspection_id;
END pr_tcl_submit_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_approve_inspection
-- Approves a submitted inspection
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_approve_inspection (
    p_inspection_id IN NUMBER,
    p_manager_id    IN NUMBER,
    p_approval_note IN VARCHAR2 DEFAULT NULL
) AS
    v_status tcl_cam_inspection.status%TYPE;
BEGIN
    SELECT status INTO v_status
    FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20006, 'Cannot approve: inspection is not submitted');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'APPROVED',
        approved_at = SYSTIMESTAMP,
        approval_note = p_approval_note
    WHERE inspection_id = p_inspection_id;

    pr_tcl_audit_log(
        p_manager_id, 'APPROVAL', 'INSPECTION',
        TO_CHAR(p_inspection_id), v_status, 'APPROVED', p_approval_note
    );
END pr_tcl_approve_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_reject_inspection
-- Rejects a submitted inspection
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_reject_inspection (
    p_inspection_id IN NUMBER,
    p_manager_id    IN NUMBER,
    p_reason        IN VARCHAR2
) AS
    v_status tcl_cam_inspection.status%TYPE;
BEGIN
    SELECT status INTO v_status
    FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20007, 'Cannot reject: inspection is not submitted');
    END IF;

    UPDATE tcl_cam_inspection
    SET status = 'REJECTED',
        approval_note = p_reason
    WHERE inspection_id = p_inspection_id;

    pr_tcl_audit_log(
        p_manager_id, 'REJECTION', 'INSPECTION',
        TO_CHAR(p_inspection_id), v_status, 'REJECTED', p_reason
    );
END pr_tcl_reject_inspection;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_override_response
-- Records a manager override for a checklist response
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_override_response (
    p_inspection_id     IN NUMBER,
    p_manager_id        IN NUMBER,
    p_checklist_item_id IN NUMBER,
    p_override_result   IN VARCHAR2,
    p_reason            IN VARCHAR2
) AS
    v_status       tcl_cam_inspection.status%TYPE;
    v_original     tcl_cam_inspection_response.result%TYPE;
    v_submitted_at tcl_cam_inspection.submitted_at%TYPE;
    v_window_hours NUMBER := 12;
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
        RAISE_APPLICATION_ERROR(
            -20009,
            'Override window of ' || v_window_hours || ' hours has expired'
        );
    END IF;

    SELECT result INTO v_original
    FROM tcl_cam_inspection_response
    WHERE inspection_id = p_inspection_id
      AND checklist_item_id = p_checklist_item_id;

    SELECT COUNT(*) INTO v_override_count
    FROM tcl_cam_override
    WHERE inspection_id = p_inspection_id
      AND checklist_item_id = p_checklist_item_id;

    IF v_override_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Checklist item already has an override');
    END IF;

    INSERT INTO tcl_cam_override (
        inspection_id, manager_id, checklist_item_id,
        original_result, override_result, reason
    ) VALUES (
        p_inspection_id, p_manager_id, p_checklist_item_id,
        v_original, p_override_result, p_reason
    );

    UPDATE tcl_cam_inspection_response
    SET result = p_override_result
    WHERE inspection_id = p_inspection_id
      AND checklist_item_id = p_checklist_item_id;

    pr_tcl_audit_log(
        p_manager_id, 'OVERRIDE', 'INSPECTION',
        TO_CHAR(p_inspection_id), v_original, p_override_result, p_reason
    );
END pr_tcl_override_response;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_mark_attendance
-- Marks operator attendance for an inspection
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_mark_attendance (
    p_inspection_no IN VARCHAR2,
    p_operator_id   IN NUMBER,
    p_inspection_id OUT NUMBER
) AS
    v_attended_at tcl_cam_inspection.attendance_marked_at%TYPE;
BEGIN
    SELECT inspection_id, attendance_marked_at
    INTO p_inspection_id, v_attended_at
    FROM tcl_cam_inspection WHERE inspection_no = p_inspection_no;

    IF v_attended_at IS NOT NULL THEN
        RAISE_APPLICATION_ERROR(-20011, 'Attendance already marked for this inspection');
    END IF;

    UPDATE tcl_cam_inspection
    SET attendance_marked_at = SYSTIMESTAMP
    WHERE inspection_no = p_inspection_no;

    pr_tcl_audit_log(
        p_operator_id, 'ATTENDANCE', 'INSPECTION', p_inspection_no,
        'NOT_MARKED', TO_CHAR(SYSTIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
    );
END pr_tcl_mark_attendance;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_report_timeline
-- Generates chronological timeline for an inspection
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_report_timeline (
    p_inspection_id IN NUMBER,
    p_cursor        OUT SYS_REFCURSOR
) AS
    v_inspection_no tcl_cam_inspection.inspection_no%TYPE;
BEGIN
    SELECT inspection_no INTO v_inspection_no
    FROM tcl_cam_inspection WHERE inspection_id = p_inspection_id;

    OPEN p_cursor FOR
        SELECT a.created_at, a.action, u.full_name, r.role_name, a.details
        FROM tcl_cam_audit_log a
        LEFT JOIN tcl_cam_useraccess u ON u.useraccess_id = a.useraccess_id
        LEFT JOIN tcl_cam_role r       ON r.role_id = u.role_id
        WHERE (a.entity_name = 'INSPECTION'
               AND a.entity_id IN (TO_CHAR(p_inspection_id), v_inspection_no))
        ORDER BY a.created_at;
END pr_tcl_report_timeline;
/

-- =============================================================================
-- PROCEDURE: pr_tcl_generate_inspection_report
-- Comprehensive inspection report
-- =============================================================================
CREATE OR REPLACE PROCEDURE pr_tcl_generate_inspection_report (
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
            c.cam_code,
            c.cam_name,
            u.employee_id,
            u.full_name AS operator_name,
            h.checklist_name,
            h.version AS checklist_version,
            q.part_number,
            q.serial_number,
            q.vendor_code,
            (SELECT COUNT(*)
             FROM tcl_cam_inspection_response ir
             WHERE ir.inspection_id = i.inspection_id) AS response_count,
            (SELECT COUNT(*)
             FROM tcl_cam_photo p
             WHERE p.inspection_id = i.inspection_id) AS photo_count,
            (SELECT COUNT(*)
             FROM tcl_cam_override o
             WHERE o.inspection_id = i.inspection_id) AS override_count
        FROM tcl_cam_inspection i
        JOIN tcl_cam_name c              ON c.cam_name_id = i.cam_name_id
        JOIN tcl_cam_useraccess u        ON u.useraccess_id = i.operator_id
        JOIN tcl_cam_checklist_header h  ON h.checklist_header_id = i.checklist_header_id
        LEFT JOIN tcl_cam_qr_data q      ON q.inspection_id = i.inspection_id
        WHERE i.inspection_id = p_inspection_id;
END pr_tcl_generate_inspection_report;
/

-- =============================================================================
-- TRIGGER: trg_tcl_useraccess_audit
-- Auto-audit user creation and updates
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_useraccess_audit
    AFTER INSERT OR UPDATE ON tcl_cam_useraccess
    FOR EACH ROW
BEGIN
    IF INSERTING THEN
        pr_tcl_audit_log(
            :NEW.useraccess_id, 'USER_CREATE', 'USERACCESS',
            TO_CHAR(:NEW.useraccess_id), NULL,
            :NEW.employee_id || ' (' || :NEW.full_name || ')'
        );
    ELSIF UPDATING THEN
        IF :OLD.is_active != :NEW.is_active THEN
            pr_tcl_audit_log(
                :NEW.useraccess_id, 'USER_STATUS_CHANGE', 'USERACCESS',
                TO_CHAR(:NEW.useraccess_id), :OLD.is_active, :NEW.is_active
            );
        END IF;
        IF :OLD.password_hash != :NEW.password_hash THEN
            pr_tcl_audit_log(
                :NEW.useraccess_id, 'PASSWORD_CHANGE', 'USERACCESS',
                TO_CHAR(:NEW.useraccess_id)
            );
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
/

-- =============================================================================
-- TRIGGER: trg_tcl_inspection_status_change
-- Auto-audit inspection status transitions
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_inspection_status_change
    AFTER UPDATE OF status ON tcl_cam_inspection
    FOR EACH ROW
BEGIN
    IF :OLD.status != :NEW.status THEN
        pr_tcl_audit_log(
            :NEW.operator_id, 'STATUS_CHANGE_' || :NEW.status, 'INSPECTION',
            :NEW.inspection_no, :OLD.status, :NEW.status
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
/

-- =============================================================================
-- TRIGGER: trg_tcl_inspection_finalization_guard
-- Prevent modification of finalized inspections
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_inspection_finalization_guard
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
-- TRIGGER: trg_tcl_override_guard
-- Validate override insertion criteria
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_override_guard
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
-- TRIGGER: trg_tcl_photo_audit
-- Auto-audit photo uploads
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_photo_audit
    AFTER INSERT ON tcl_cam_photo
    FOR EACH ROW
BEGIN
    pr_tcl_audit_log(
        NULL, 'PHOTO_UPLOAD', 'PHOTO', TO_CHAR(:NEW.photo_id),
        NULL, :NEW.file_name,
        'inspection_id: ' || :NEW.inspection_id
    );
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
/

-- =============================================================================
-- FUNCTION: fn_tcl_calc_completion_pct
-- Calculates completion percentage for an inspection
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_tcl_calc_completion_pct (
    p_inspection_id IN NUMBER
) RETURN NUMBER
IS
    v_total   NUMBER;
    v_answered NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM tcl_cam_inspection i
    JOIN tcl_cam_checklist_item ci ON ci.checklist_header_id = i.checklist_header_id
    WHERE i.inspection_id = p_inspection_id AND ci.is_active = 'Y';

    SELECT COUNT(*) INTO v_answered
    FROM tcl_cam_inspection_response
    WHERE inspection_id = p_inspection_id;

    IF v_total = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((v_answered / v_total) * 100, 2);
END fn_tcl_calc_completion_pct;
/

-- =============================================================================
-- TRIGGER: trg_tcl_cam_resp_update_progress
-- Auto-update inspection progress when a response is inserted
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_cam_resp_update_progress
    AFTER INSERT ON tcl_cam_inspection_response
    FOR EACH ROW
BEGIN
    UPDATE tcl_cam_inspection
    SET completion_pct = fn_tcl_calc_completion_pct(:NEW.inspection_id),
        current_step = (
            SELECT NVL(MAX(ci.sequence_no), 0)
            FROM tcl_cam_inspection_response ir
            JOIN tcl_cam_checklist_item ci
                ON ci.checklist_item_id = ir.checklist_item_id
            WHERE ir.inspection_id = :NEW.inspection_id
        )
    WHERE inspection_id = :NEW.inspection_id;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
/
