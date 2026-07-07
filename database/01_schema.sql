-- ============================================================================
-- CamTrace Core Schema for Oracle 19c
-- Camshaft Pre-Dispatch Inspection & Traceability System
-- ============================================================================

-- Sequences (for compatibility with legacy systems and manual inserts)
CREATE SEQUENCE seq_roles_id         START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_users_id         START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_machines_id      START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_checklist_items_id START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_inspections_id   START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_inspection_responses_id START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_photos_id        START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_overrides_id     START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_audit_logs_id    START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- ============================================================================
-- ROLES
-- ============================================================================
CREATE TABLE roles (
    role_id     NUMBER DEFAULT seq_roles_id.NEXTVAL PRIMARY KEY,
    role_name   VARCHAR2(30) NOT NULL,
    description VARCHAR2(200) NOT NULL,
    created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_roles_name UNIQUE (role_name)
);

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE users (
    user_id       NUMBER DEFAULT seq_users_id.NEXTVAL PRIMARY KEY,
    employee_id   VARCHAR2(30) NOT NULL,
    full_name     VARCHAR2(120) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role_id       NUMBER NOT NULL,
    is_active     CHAR(1) DEFAULT 'Y' NOT NULL,
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at    TIMESTAMP,
    CONSTRAINT uq_users_employee_id UNIQUE (employee_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT ck_users_active CHECK (is_active IN ('Y', 'N'))
);

-- ============================================================================
-- MACHINES
-- ============================================================================
CREATE TABLE machines (
    machine_id   NUMBER DEFAULT seq_machines_id.NEXTVAL PRIMARY KEY,
    machine_code VARCHAR2(30) NOT NULL,
    machine_name VARCHAR2(120) NOT NULL,
    qr_code      VARCHAR2(80) NOT NULL,
    status       VARCHAR2(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_machines_code UNIQUE (machine_code),
    CONSTRAINT uq_machines_qr UNIQUE (qr_code),
    CONSTRAINT ck_machines_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- ============================================================================
-- CHECKLIST ITEMS
-- ============================================================================
CREATE TABLE checklist_items (
    checklist_item_id NUMBER DEFAULT seq_checklist_items_id.NEXTVAL PRIMARY KEY,
    machine_family    VARCHAR2(40) NOT NULL,
    item_code         VARCHAR2(30) NOT NULL,
    prompt            VARCHAR2(250) NOT NULL,
    sequence_no       NUMBER NOT NULL,
    requires_photo    CHAR(1) DEFAULT 'N' NOT NULL,
    is_active         CHAR(1) DEFAULT 'Y' NOT NULL,
    created_at        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_checklist_item_code UNIQUE (item_code),
    CONSTRAINT ck_requires_photo CHECK (requires_photo IN ('Y', 'N')),
    CONSTRAINT ck_checklist_active CHECK (is_active IN ('Y', 'N'))
);

-- ============================================================================
-- INSPECTIONS
-- ============================================================================
CREATE TABLE inspections (
    inspection_id         NUMBER DEFAULT seq_inspections_id.NEXTVAL PRIMARY KEY,
    inspection_no         VARCHAR2(40) NOT NULL,
    machine_id            NUMBER NOT NULL,
    operator_id           NUMBER NOT NULL,
    status                VARCHAR2(20) NOT NULL,
    attendance_marked_at  TIMESTAMP NULL,
    started_at            TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    submitted_at          TIMESTAMP NULL,
    approved_at           TIMESTAMP NULL,
    approval_note         VARCHAR2(1000) NULL,
    created_at            TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_inspections_no UNIQUE (inspection_no),
    CONSTRAINT fk_inspections_machine FOREIGN KEY (machine_id) REFERENCES machines(machine_id),
    CONSTRAINT fk_inspections_operator FOREIGN KEY (operator_id) REFERENCES users(user_id),
    CONSTRAINT ck_inspection_status CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'))
);

-- ============================================================================
-- INSPECTION RESPONSES
-- ============================================================================
CREATE TABLE inspection_responses (
    inspection_response_id NUMBER DEFAULT seq_inspection_responses_id.NEXTVAL PRIMARY KEY,
    inspection_id          NUMBER NOT NULL,
    checklist_item_id      NUMBER NOT NULL,
    result                 VARCHAR2(10) NOT NULL,
    remarks                VARCHAR2(500) NULL,
    created_at             TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_responses_inspection FOREIGN KEY (inspection_id) REFERENCES inspections(inspection_id),
    CONSTRAINT fk_responses_checklist FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(checklist_item_id),
    CONSTRAINT ck_response_result CHECK (result IN ('OK', 'NOT_OK')),
    CONSTRAINT uq_inspection_checklist UNIQUE (inspection_id, checklist_item_id)
);

-- ============================================================================
-- PHOTOS
-- ============================================================================
CREATE TABLE photos (
    photo_id          NUMBER DEFAULT seq_photos_id.NEXTVAL PRIMARY KEY,
    inspection_id     NUMBER NOT NULL,
    checklist_item_id NUMBER NULL,
    lan_path          VARCHAR2(500) NOT NULL,
    file_name         VARCHAR2(120) NOT NULL,
    file_size_bytes   NUMBER NULL,
    content_type      VARCHAR2(100) NULL,
    uploaded_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_photos_inspection FOREIGN KEY (inspection_id) REFERENCES inspections(inspection_id),
    CONSTRAINT fk_photos_checklist FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(checklist_item_id)
);

-- ============================================================================
-- OVERRIDES
-- ============================================================================
CREATE TABLE overrides (
    override_id       NUMBER DEFAULT seq_overrides_id.NEXTVAL PRIMARY KEY,
    inspection_id     NUMBER NOT NULL,
    manager_id        NUMBER NOT NULL,
    checklist_item_id NUMBER NOT NULL,
    original_result   VARCHAR2(10) NOT NULL,
    override_result   VARCHAR2(10) NOT NULL,
    reason            VARCHAR2(1000) NOT NULL,
    created_at        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_overrides_inspection FOREIGN KEY (inspection_id) REFERENCES inspections(inspection_id),
    CONSTRAINT fk_overrides_manager FOREIGN KEY (manager_id) REFERENCES users(user_id),
    CONSTRAINT fk_overrides_checklist FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(checklist_item_id),
    CONSTRAINT ck_override_original CHECK (original_result IN ('OK', 'NOT_OK')),
    CONSTRAINT ck_override_result CHECK (override_result IN ('OK', 'NOT_OK'))
);

-- ============================================================================
-- AUDIT LOGS (partitioned by month for performance)
-- ============================================================================
CREATE TABLE audit_logs (
    audit_log_id NUMBER DEFAULT seq_audit_logs_id.NEXTVAL PRIMARY KEY,
    user_id      NUMBER NULL,
    action       VARCHAR2(40) NOT NULL,
    entity_name  VARCHAR2(40) NOT NULL,
    entity_id    VARCHAR2(80) NULL,
    old_value    VARCHAR2(4000) NULL,
    new_value    VARCHAR2(4000) NULL,
    details      VARCHAR2(4000) NULL,
    created_at   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id)
)
PARTITION BY RANGE (created_at) INTERVAL (INTERVAL '1' MONTH)
(
    PARTITION p_audit_initial VALUES LESS THAN (TIMESTAMP '2026-01-01 00:00:00')
);

-- ============================================================================
-- GLOBAL INDEXES
-- ============================================================================
CREATE INDEX idx_users_role_id            ON users(role_id);
CREATE INDEX idx_users_employee_id        ON users(employee_id);
CREATE INDEX idx_machines_status          ON machines(status);
CREATE INDEX idx_checklist_family_seq     ON checklist_items(machine_family, sequence_no);
CREATE INDEX idx_checklist_active         ON checklist_items(is_active);
CREATE INDEX idx_inspections_status       ON inspections(status);
CREATE INDEX idx_inspections_machine      ON inspections(machine_id);
CREATE INDEX idx_inspections_operator     ON inspections(operator_id);
CREATE INDEX idx_inspections_started      ON inspections(started_at);
CREATE INDEX idx_responses_inspection     ON inspection_responses(inspection_id);
CREATE INDEX idx_responses_checklist      ON inspection_responses(checklist_item_id);
CREATE INDEX idx_photos_inspection        ON photos(inspection_id);
CREATE INDEX idx_overrides_inspection     ON overrides(inspection_id);
CREATE INDEX idx_overrides_manager        ON overrides(manager_id);
CREATE INDEX idx_audit_action             ON audit_logs(action);
CREATE INDEX idx_audit_entity             ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_created            ON audit_logs(created_at) LOCAL;

COMMIT;
