-- ============================================================================
-- CamTrace Stored Procedures & Triggers for Oracle 19c
-- ============================================================================

-- ============================================================================
-- PROCEDURE: pr_audit_log
-- Generic audit log writer used by triggers and application
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_audit_log (
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
    INSERT INTO audit_logs (user_id, action, entity_name, entity_id, old_value, new_value, details)
    VALUES (p_user_id, p_action, p_entity_name, p_entity_id, p_old_value, p_new_value, p_details);
    COMMIT;
END pr_audit_log;
/

-- ============================================================================
-- PROCEDURE: pr_login_attempt
-- Validates login credentials and returns user info (called from FastAPI)
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_login_attempt (
    p_employee_id IN VARCHAR2,
    p_password    IN VARCHAR2,   -- Note: actual hash comparison happens in app
    p_role_name   IN VARCHAR2,
    p_user_id     OUT NUMBER,
    p_full_name   OUT VARCHAR2,
    p_role_id     OUT NUMBER,
    p_is_active   OUT CHAR
) AS
BEGIN
    SELECT u.user_id, u.full_name, u.role_id, u.is_active
    INTO p_user_id, p_full_name, p_role_id, p_is_active
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    WHERE u.employee_id = p_employee_id
      AND r.role_name = p_role_name
      AND ROWNUM = 1;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_user_id := NULL;
        p_full_name := NULL;
        p_role_id := NULL;
        p_is_active := 'N';
END pr_login_attempt;
/

-- ============================================================================
-- PROCEDURE: pr_create_inspection
-- Creates a new inspection record with generated inspection number
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_create_inspection (
    p_machine_id      IN NUMBER,
    p_operator_id     IN NUMBER,
    p_inspection_no   OUT VARCHAR2
) AS
    v_today     VARCHAR2(8);
    v_count     NUMBER;
BEGIN
    v_today := TO_CHAR(SYSTIMESTAMP, 'YYYYMMDD');

    SELECT COUNT(*) + 1 INTO v_count
    FROM inspections
    WHERE inspection_no LIKE 'INSP-' || v_today || '%';

    p_inspection_no := 'INSP-' || v_today || '-' || LPAD(v_count, 5, '0');

    INSERT INTO inspections (inspection_no, machine_id, operator_id, status)
    VALUES (p_inspection_no, p_machine_id, p_operator_id, 'IN_PROGRESS');
END pr_create_inspection;
/

-- ============================================================================
-- PROCEDURE: pr_submit_inspection
-- Submits an inspection with validation
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_submit_inspection (
    p_inspection_id   IN NUMBER,
    p_operator_id     IN NUMBER,
    p_response_count  IN NUMBER
) AS
    v_status inspections.status%TYPE;
    v_operator inspections.operator_id%TYPE;
BEGIN
    SELECT status, operator_id INTO v_status, v_operator
    FROM inspections WHERE inspection_id = p_inspection_id;

    IF v_status != 'IN_PROGRESS' THEN
        RAISE_APPLICATION_ERROR(-20003, 'Cannot submit: inspection status is ' || v_status);
    END IF;

    IF v_operator != p_operator_id THEN
        RAISE_APPLICATION_ERROR(-20004, 'Cannot submit: inspection belongs to another operator');
    END IF;

    IF p_response_count = 0 THEN
        RAISE_APPLICATION_ERROR(-20005, 'Cannot submit: no checklist responses provided');
    END IF;

    UPDATE inspections
    SET status = 'SUBMITTED',
        submitted_at = SYSTIMESTAMP
    WHERE inspection_id = p_inspection_id;
END pr_submit_inspection;
/

-- ============================================================================
-- PROCEDURE: pr_approve_inspection
-- Approves a submitted inspection
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_approve_inspection (
    p_inspection_id IN NUMBER,
    p_manager_id    IN NUMBER,
    p_approval_note IN VARCHAR2 DEFAULT NULL
) AS
    v_status inspections.status%TYPE;
BEGIN
    SELECT status INTO v_status FROM inspections WHERE inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20006, 'Cannot approve: inspection is not submitted');
    END IF;

    UPDATE inspections
    SET status = 'APPROVED',
        approved_at = SYSTIMESTAMP,
        approval_note = p_approval_note
    WHERE inspection_id = p_inspection_id;

    pr_audit_log(p_manager_id, 'APPROVAL', 'INSPECTION', TO_CHAR(p_inspection_id),
                 v_status, 'APPROVED', p_approval_note);
END pr_approve_inspection;
/

-- ============================================================================
-- PROCEDURE: pr_reject_inspection
-- Rejects a submitted inspection
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_reject_inspection (
    p_inspection_id IN NUMBER,
    p_manager_id    IN NUMBER,
    p_reason        IN VARCHAR2
) AS
    v_status inspections.status%TYPE;
BEGIN
    SELECT status INTO v_status FROM inspections WHERE inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20007, 'Cannot reject: inspection is not submitted');
    END IF;

    UPDATE inspections
    SET status = 'REJECTED',
        approval_note = p_reason
    WHERE inspection_id = p_inspection_id;

    pr_audit_log(p_manager_id, 'REJECTION', 'INSPECTION', TO_CHAR(p_inspection_id),
                 v_status, 'REJECTED', p_reason);
END pr_reject_inspection;
/

-- ============================================================================
-- PROCEDURE: pr_override_response
-- Records a manager override for a checklist response
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_override_response (
    p_inspection_id     IN NUMBER,
    p_manager_id        IN NUMBER,
    p_checklist_item_id IN NUMBER,
    p_override_result   IN VARCHAR2,
    p_reason            IN VARCHAR2
) AS
    v_status        inspections.status%TYPE;
    v_original      inspection_responses.result%TYPE;
    v_submitted_at  inspections.submitted_at%TYPE;
    v_window_hours  NUMBER := 12;
    v_override_count NUMBER;
BEGIN
    SELECT i.status, i.submitted_at
    INTO v_status, v_submitted_at
    FROM inspections i WHERE i.inspection_id = p_inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20008, 'Overrides allowed only for submitted inspections');
    END IF;

    IF v_submitted_at IS NOT NULL AND
       (SYSTIMESTAMP - v_submitted_at) * 24 > v_window_hours THEN
        RAISE_APPLICATION_ERROR(-20009, 'Override window of ' || v_window_hours || ' hours has expired');
    END IF;

    SELECT result INTO v_original
    FROM inspection_responses
    WHERE inspection_id = p_inspection_id AND checklist_item_id = p_checklist_item_id;

    SELECT COUNT(*) INTO v_override_count
    FROM overrides
    WHERE inspection_id = p_inspection_id AND checklist_item_id = p_checklist_item_id;

    IF v_override_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Checklist item already has an override');
    END IF;

    INSERT INTO overrides (inspection_id, manager_id, checklist_item_id, original_result, override_result, reason)
    VALUES (p_inspection_id, p_manager_id, p_checklist_item_id, v_original, p_override_result, p_reason);

    UPDATE inspection_responses
    SET result = p_override_result
    WHERE inspection_id = p_inspection_id AND checklist_item_id = p_checklist_item_id;

    pr_audit_log(p_manager_id, 'OVERRIDE', 'INSPECTION', TO_CHAR(p_inspection_id),
                 v_original, p_override_result, p_reason);
END pr_override_response;
/

-- ============================================================================
-- PROCEDURE: pr_mark_attendance
-- Marks operator attendance for an inspection
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_mark_attendance (
    p_inspection_no IN VARCHAR2,
    p_operator_id   IN NUMBER,
    p_inspection_id OUT NUMBER
) AS
    v_attended_at inspections.attendance_marked_at%TYPE;
BEGIN
    SELECT inspection_id, attendance_marked_at
    INTO p_inspection_id, v_attended_at
    FROM inspections WHERE inspection_no = p_inspection_no;

    IF v_attended_at IS NOT NULL THEN
        RAISE_APPLICATION_ERROR(-20011, 'Attendance already marked for this inspection');
    END IF;

    UPDATE inspections
    SET attendance_marked_at = SYSTIMESTAMP
    WHERE inspection_no = p_inspection_no;

    pr_audit_log(p_operator_id, 'ATTENDANCE', 'INSPECTION', p_inspection_no,
                 'NOT_MARKED', TO_CHAR(SYSTIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'));
END pr_mark_attendance;
/

-- ============================================================================
-- TRIGGER: trg_users_audit
-- Automatically audit user creation and updates
-- ============================================================================
CREATE OR REPLACE TRIGGER trg_users_audit
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        pr_audit_log(:NEW.user_id, 'USER_CREATE', 'USER', TO_CHAR(:NEW.user_id),
                     NULL, :NEW.employee_id || ' (' || :NEW.full_name || ')');
    ELSIF UPDATING THEN
        IF :OLD.is_active != :NEW.is_active THEN
            pr_audit_log(:NEW.user_id, 'USER_STATUS_CHANGE', 'USER', TO_CHAR(:NEW.user_id),
                         :OLD.is_active, :NEW.is_active);
        END IF;
        IF :OLD.password_hash != :NEW.password_hash THEN
            pr_audit_log(:NEW.user_id, 'PASSWORD_CHANGE', 'USER', TO_CHAR(:NEW.user_id));
        END IF;
    END IF;
END;
/

-- ============================================================================
-- TRIGGER: trg_inspections_status_change
-- Automatically audit inspection status changes
-- ============================================================================
CREATE OR REPLACE TRIGGER trg_inspections_status_change
AFTER UPDATE OF status ON inspections
FOR EACH ROW
BEGIN
    IF :OLD.status != :NEW.status THEN
        pr_audit_log(:NEW.operator_id, 'STATUS_CHANGE_' || :NEW.status, 'INSPECTION',
                     :NEW.inspection_no, :OLD.status, :NEW.status);
    END IF;
END;
/

-- ============================================================================
-- TRIGGER: trg_inspections_finalization_guard
-- Prevent modification of finalized inspections (APPROVED/REJECTED)
-- ============================================================================
CREATE OR REPLACE TRIGGER trg_inspections_finalization_guard
BEFORE UPDATE ON inspections
FOR EACH ROW
BEGIN
    IF :OLD.status IN ('APPROVED', 'REJECTED') THEN
        RAISE_APPLICATION_ERROR(-20001, 'Finalized inspections cannot be modified');
    END IF;

    IF :NEW.status NOT IN ('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED') THEN
        RAISE_APPLICATION_ERROR(-20002, 'Invalid inspection status transition');
    END IF;
END;
/

-- ============================================================================
-- TRIGGER: trg_overrides_guard
-- Validate override insertion criteria
-- ============================================================================
CREATE OR REPLACE TRIGGER trg_overrides_guard
BEFORE INSERT ON overrides
FOR EACH ROW
DECLARE
    v_status inspections.status%TYPE;
BEGIN
    SELECT status INTO v_status
    FROM inspections WHERE inspection_id = :NEW.inspection_id;

    IF v_status != 'SUBMITTED' THEN
        RAISE_APPLICATION_ERROR(-20002, 'Overrides allowed only for submitted inspections');
    END IF;
END;
/

-- ============================================================================
-- TRIGGER: trg_photos_audit
-- Automatically audit photo uploads
-- ============================================================================
CREATE OR REPLACE TRIGGER trg_photos_audit
AFTER INSERT ON photos
FOR EACH ROW
BEGIN
    pr_audit_log(NULL, 'PHOTO_UPLOAD', 'PHOTO', TO_CHAR(:NEW.photo_id),
                 NULL, :NEW.file_name, 'inspection_id: ' || :NEW.inspection_id);
END;
/

-- ============================================================================
-- PROCEDURE: pr_report_inspection_timeline
-- Generates chronological timeline for an inspection
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_report_inspection_timeline (
    p_inspection_id IN NUMBER,
    p_cursor        OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_cursor FOR
        SELECT a.created_at, a.action, u.full_name, r.role_name, a.details
        FROM audit_logs a
        LEFT JOIN users u ON u.user_id = a.user_id
        LEFT JOIN roles r ON r.role_id = u.role_id
        WHERE (a.entity_name = 'INSPECTION' AND a.entity_id = TO_CHAR(p_inspection_id))
           OR (a.entity_name = 'INSPECTION' AND a.entity_id IN (
                SELECT inspection_no FROM inspections WHERE inspection_id = p_inspection_id
              ))
        ORDER BY a.created_at;
END pr_report_inspection_timeline;
/

-- ============================================================================
-- PROCEDURE: pr_generate_inspection_report
-- Comprehensive inspection report
-- ============================================================================
CREATE OR REPLACE PROCEDURE pr_generate_inspection_report (
    p_inspection_id IN NUMBER,
    p_cursor        OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_cursor FOR
        SELECT
            i.inspection_id,
            i.inspection_no,
            i.status,
            i.started_at,
            i.submitted_at,
            i.approved_at,
            i.attendance_marked_at,
            m.machine_code,
            m.machine_name,
            u.employee_id,
            u.full_name as operator_name,
            (SELECT COUNT(*) FROM inspection_responses ir WHERE ir.inspection_id = i.inspection_id) as response_count,
            (SELECT COUNT(*) FROM photos p WHERE p.inspection_id = i.inspection_id) as photo_count,
            (SELECT COUNT(*) FROM overrides o WHERE o.inspection_id = i.inspection_id) as override_count
        FROM inspections i
        JOIN machines m ON m.machine_id = i.machine_id
        JOIN users u ON u.user_id = i.operator_id
        WHERE i.inspection_id = p_inspection_id;
END pr_generate_inspection_report;
/
