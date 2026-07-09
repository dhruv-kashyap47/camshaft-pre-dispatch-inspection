-- =============================================================================
-- TCL V2 Core Schema for Oracle 19c
-- Camshaft Pre-Dispatch Inspection & Traceability System
-- Production Nomenclature: TCL = Traceability Control Log
-- =============================================================================
-- This script creates ALL V2 objects.
-- Safe to re-run: includes idempotent DROP/CREATE for all objects.
-- =============================================================================

-- =============================================================================
-- 1. SEQUENCES
-- =============================================================================
CREATE SEQUENCE seq_tcl_cam_role                 START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_useraccess            START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_name                  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_checklist_header      START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_checklist_item        START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_inspection            START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_qr_data               START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_inspection_response   START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_photo                 START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_override              START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_tcl_cam_audit_log             START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- =============================================================================
-- 2. TCL_CAM_ROLE
-- Role definitions (OPERATOR, MANAGER, ADMIN, etc.)
-- =============================================================================
CREATE TABLE tcl_cam_role (
    role_id       NUMBER DEFAULT seq_tcl_cam_role.NEXTVAL NOT NULL,
    role_name     VARCHAR2(30)  NOT NULL,
    description   VARCHAR2(200) NOT NULL,
    is_active     CHAR(1) DEFAULT 'Y' NOT NULL,
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at    TIMESTAMP,
    CONSTRAINT pk_tcl_cam_role PRIMARY KEY (role_id),
    CONSTRAINT uq_tcl_cam_role_name UNIQUE (role_name),
    CONSTRAINT ck_tcl_cam_role_active CHECK (is_active IN ('Y', 'N'))
);

-- =============================================================================
-- 3. TCL_CAM_USERACCESS  (replaces V1 users table)
-- Production user account master
-- =============================================================================
CREATE TABLE tcl_cam_useraccess (
    useraccess_id NUMBER DEFAULT seq_tcl_cam_useraccess.NEXTVAL NOT NULL,
    employee_id   VARCHAR2(30)  NOT NULL,
    full_name     VARCHAR2(120) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role_id       NUMBER        NOT NULL,
    is_active     CHAR(1) DEFAULT 'Y' NOT NULL,
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at    TIMESTAMP,
    last_login    TIMESTAMP,
    CONSTRAINT pk_tcl_cam_useraccess PRIMARY KEY (useraccess_id),
    CONSTRAINT uq_tcl_cam_useraccess_emp UNIQUE (employee_id),
    CONSTRAINT fk_tcl_cam_useraccess_role
        FOREIGN KEY (role_id) REFERENCES tcl_cam_role(role_id),
    CONSTRAINT ck_tcl_cam_useraccess_active CHECK (is_active IN ('Y', 'N'))
);

-- =============================================================================
-- 4. TCL_CAM_NAME  (replaces V1 machines table)
-- Authoritative camshaft nomenclature master
-- =============================================================================
CREATE TABLE tcl_cam_name (
    cam_name_id  NUMBER DEFAULT seq_tcl_cam_name.NEXTVAL NOT NULL,
    cam_code     VARCHAR2(30)  NOT NULL,
    cam_name     VARCHAR2(120) NOT NULL,
    qr_code      VARCHAR2(80)  NOT NULL,
    status       VARCHAR2(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at   TIMESTAMP,
    CONSTRAINT pk_tcl_cam_name PRIMARY KEY (cam_name_id),
    CONSTRAINT uq_tcl_cam_name_code UNIQUE (cam_code),
    CONSTRAINT uq_tcl_cam_name_qr UNIQUE (qr_code),
    CONSTRAINT ck_tcl_cam_name_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- =============================================================================
-- 5. TCL_CAM_CHECKLIST_HEADER
-- Checklist version/revision master (supports future revisions)
-- =============================================================================
CREATE TABLE tcl_cam_checklist_header (
    checklist_header_id NUMBER DEFAULT seq_tcl_cam_checklist_header.NEXTVAL NOT NULL,
    checklist_name      VARCHAR2(80)  NOT NULL,
    version             NUMBER DEFAULT 1 NOT NULL,
    description         VARCHAR2(500),
    is_active           CHAR(1) DEFAULT 'Y' NOT NULL,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP,
    CONSTRAINT pk_tcl_cam_checklist_header PRIMARY KEY (checklist_header_id),
    CONSTRAINT uq_tcl_cam_chk_header_version UNIQUE (checklist_name, version),
    CONSTRAINT ck_tcl_cam_chk_header_active CHECK (is_active IN ('Y', 'N'))
);

-- =============================================================================
-- 6. TCL_CAM_CHECKLIST_ITEM
-- Individual checklist items within a checklist version
-- =============================================================================
CREATE TABLE tcl_cam_checklist_item (
    checklist_item_id   NUMBER DEFAULT seq_tcl_cam_checklist_item.NEXTVAL NOT NULL,
    checklist_header_id NUMBER NOT NULL,
    item_code           VARCHAR2(30)  NOT NULL,
    prompt              VARCHAR2(250) NOT NULL,
    sequence_no         NUMBER NOT NULL,
    requires_photo      CHAR(1) DEFAULT 'N' NOT NULL,
    is_active           CHAR(1) DEFAULT 'Y' NOT NULL,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_tcl_cam_checklist_item PRIMARY KEY (checklist_item_id),
    CONSTRAINT uq_tcl_cam_chk_item_code
        UNIQUE (checklist_header_id, item_code),
    CONSTRAINT uq_tcl_cam_chk_item_seq
        UNIQUE (checklist_header_id, sequence_no),
    CONSTRAINT fk_tcl_cam_chk_item_header
        FOREIGN KEY (checklist_header_id)
        REFERENCES tcl_cam_checklist_header(checklist_header_id),
    CONSTRAINT ck_tcl_cam_chk_item_photo CHECK (requires_photo IN ('Y', 'N')),
    CONSTRAINT ck_tcl_cam_chk_item_active CHECK (is_active IN ('Y', 'N'))
);

-- =============================================================================
-- 7. TCL_CAM_INSPECTION
-- Core inspection record with progress tracking
-- Status: NOT_STARTED | IN_PROGRESS | SUBMITTED | APPROVED | REJECTED
-- =============================================================================
CREATE TABLE tcl_cam_inspection (
    inspection_id         NUMBER DEFAULT seq_tcl_cam_inspection.NEXTVAL NOT NULL,
    inspection_no         VARCHAR2(40) NOT NULL,
    cam_name_id           NUMBER NOT NULL,
    operator_id           NUMBER NOT NULL,
    checklist_header_id   NUMBER NOT NULL,
    status                VARCHAR2(20) DEFAULT 'NOT_STARTED' NOT NULL,
    current_step          NUMBER DEFAULT 0 NOT NULL,
    completion_pct        NUMBER(5,2) DEFAULT 0 NOT NULL,
    attendance_marked_at  TIMESTAMP,
    started_at            TIMESTAMP,
    submitted_at          TIMESTAMP,
    approved_at           TIMESTAMP,
    approval_note         VARCHAR2(1000),
    created_at            TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at            TIMESTAMP,
    CONSTRAINT pk_tcl_cam_inspection PRIMARY KEY (inspection_id),
    CONSTRAINT uq_tcl_cam_inspection_no UNIQUE (inspection_no),
    CONSTRAINT fk_tcl_cam_inspection_cam
        FOREIGN KEY (cam_name_id) REFERENCES tcl_cam_name(cam_name_id),
    CONSTRAINT fk_tcl_cam_inspection_operator
        FOREIGN KEY (operator_id) REFERENCES tcl_cam_useraccess(useraccess_id),
    CONSTRAINT fk_tcl_cam_inspection_chk_header
        FOREIGN KEY (checklist_header_id)
        REFERENCES tcl_cam_checklist_header(checklist_header_id),
    CONSTRAINT ck_tcl_cam_inspection_status CHECK (
        status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')
    ),
    CONSTRAINT ck_tcl_cam_inspection_pct CHECK (
        completion_pct BETWEEN 0 AND 100
    ),
    CONSTRAINT ck_tcl_cam_inspection_step CHECK (
        current_step >= 0
    )
);

-- =============================================================================
-- 8. TCL_CAM_QR_DATA
-- Parsed QR code data per inspection
-- QR Format: P3979506;SB26006009;VTCJSR
--   Token 1 -> part_number  (alphabetic prefix stripped)
--   Token 2 -> serial_number (alphabetic prefix stripped)
--   Token 3 -> vendor_code   (stored as-is)
-- =============================================================================
CREATE TABLE tcl_cam_qr_data (
    qr_data_id    NUMBER DEFAULT seq_tcl_cam_qr_data.NEXTVAL NOT NULL,
    inspection_id NUMBER NOT NULL,
    raw_qr        VARCHAR2(200) NOT NULL,
    part_number   NUMBER NOT NULL,
    serial_number NUMBER NOT NULL,
    vendor_code   VARCHAR2(20) NOT NULL,
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_tcl_cam_qr_data PRIMARY KEY (qr_data_id),
    CONSTRAINT uq_tcl_cam_qr_data_insp UNIQUE (inspection_id),
    CONSTRAINT fk_tcl_cam_qr_data_inspection
        FOREIGN KEY (inspection_id) REFERENCES tcl_cam_inspection(inspection_id)
);

-- =============================================================================
-- 9. TCL_CAM_INSPECTION_RESPONSE
-- Per-checklist-item result for an inspection
-- =============================================================================
CREATE TABLE tcl_cam_inspection_response (
    inspection_response_id NUMBER DEFAULT seq_tcl_cam_inspection_response.NEXTVAL NOT NULL,
    inspection_id          NUMBER NOT NULL,
    checklist_item_id      NUMBER NOT NULL,
    result                 VARCHAR2(10) NOT NULL,
    remarks                VARCHAR2(500),
    created_at             TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at             TIMESTAMP,
    CONSTRAINT pk_tcl_cam_inspection_response PRIMARY KEY (inspection_response_id),
    CONSTRAINT uq_tcl_cam_resp_insp_item UNIQUE (inspection_id, checklist_item_id),
    CONSTRAINT fk_tcl_cam_resp_inspection
        FOREIGN KEY (inspection_id) REFERENCES tcl_cam_inspection(inspection_id),
    CONSTRAINT fk_tcl_cam_resp_checklist_item
        FOREIGN KEY (checklist_item_id)
        REFERENCES tcl_cam_checklist_item(checklist_item_id),
    CONSTRAINT ck_tcl_cam_resp_result CHECK (result IN ('OK', 'NOT_OK', 'NA'))
);

-- =============================================================================
-- 10. TCL_CAM_PHOTO
-- Photo storage with inline BLOB (no filesystem dependency)
-- =============================================================================
CREATE TABLE tcl_cam_photo (
    photo_id          NUMBER DEFAULT seq_tcl_cam_photo.NEXTVAL NOT NULL,
    inspection_id     NUMBER NOT NULL,
    checklist_item_id NUMBER,
    image_data        BLOB NOT NULL,
    content_type      VARCHAR2(100),
    file_name         VARCHAR2(120) NOT NULL,
    file_size         NUMBER,
    created_at        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_tcl_cam_photo PRIMARY KEY (photo_id),
    CONSTRAINT fk_tcl_cam_photo_inspection
        FOREIGN KEY (inspection_id) REFERENCES tcl_cam_inspection(inspection_id),
    CONSTRAINT fk_tcl_cam_photo_checklist_item
        FOREIGN KEY (checklist_item_id)
        REFERENCES tcl_cam_checklist_item(checklist_item_id)
)
LOB (image_data) STORE AS BASICFILE (
    TABLESPACE USERS
    STORAGE (INITIAL 256K NEXT 256K)
    ENABLE STORAGE IN ROW
    CHUNK 8192
    PCTVERSION 10
    NOCACHE
);

-- =============================================================================
-- 11. TCL_CAM_OVERRIDE
-- Manager override records for inspection results
-- =============================================================================
CREATE TABLE tcl_cam_override (
    override_id       NUMBER DEFAULT seq_tcl_cam_override.NEXTVAL NOT NULL,
    inspection_id     NUMBER NOT NULL,
    manager_id        NUMBER NOT NULL,
    checklist_item_id NUMBER NOT NULL,
    original_result   VARCHAR2(10) NOT NULL,
    override_result   VARCHAR2(10) NOT NULL,
    reason            VARCHAR2(1000) NOT NULL,
    created_at        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_tcl_cam_override PRIMARY KEY (override_id),
    CONSTRAINT fk_tcl_cam_override_inspection
        FOREIGN KEY (inspection_id) REFERENCES tcl_cam_inspection(inspection_id),
    CONSTRAINT fk_tcl_cam_override_manager
        FOREIGN KEY (manager_id) REFERENCES tcl_cam_useraccess(useraccess_id),
    CONSTRAINT fk_tcl_cam_override_checklist_item
        FOREIGN KEY (checklist_item_id)
        REFERENCES tcl_cam_checklist_item(checklist_item_id),
    CONSTRAINT ck_tcl_cam_override_orig CHECK (original_result IN ('OK', 'NOT_OK', 'NA')),
    CONSTRAINT ck_tcl_cam_override_result CHECK (override_result IN ('OK', 'NOT_OK', 'NA'))
);

-- =============================================================================
-- 12. TCL_CAM_AUDIT_LOG (monthly interval-partitioned)
-- Immutable audit trail for all entity changes
-- =============================================================================
CREATE TABLE tcl_cam_audit_log (
    audit_log_id  NUMBER DEFAULT seq_tcl_cam_audit_log.NEXTVAL NOT NULL,
    useraccess_id NUMBER,
    action        VARCHAR2(40)  NOT NULL,
    entity_name   VARCHAR2(40)  NOT NULL,
    entity_id     VARCHAR2(80),
    old_value     VARCHAR2(4000),
    new_value     VARCHAR2(4000),
    details       VARCHAR2(4000),
    is_read       CHAR(1) DEFAULT 'N' NOT NULL,
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_tcl_cam_audit_log PRIMARY KEY (audit_log_id, created_at),
    CONSTRAINT fk_tcl_cam_audit_log_user
        FOREIGN KEY (useraccess_id)
        REFERENCES tcl_cam_useraccess(useraccess_id)
)
PARTITION BY RANGE (created_at) INTERVAL (INTERVAL '1' MONTH)
(
    PARTITION p_audit_initial VALUES LESS THAN (TIMESTAMP '2026-01-01 00:00:00')
);

-- =============================================================================
-- 13. GLOBAL INDEXES
-- =============================================================================
CREATE INDEX idx_cam_useraccess_role
    ON tcl_cam_useraccess(role_id);
CREATE INDEX idx_cam_useraccess_active
    ON tcl_cam_useraccess(is_active);

CREATE INDEX idx_cam_name_status
    ON tcl_cam_name(status);

CREATE INDEX idx_cam_chk_item_header
    ON tcl_cam_checklist_item(checklist_header_id);
CREATE INDEX idx_cam_chk_item_active
    ON tcl_cam_checklist_item(is_active);

CREATE INDEX idx_cam_inspection_status
    ON tcl_cam_inspection(status);
CREATE INDEX idx_cam_inspection_cam
    ON tcl_cam_inspection(cam_name_id);
CREATE INDEX idx_cam_inspection_operator
    ON tcl_cam_inspection(operator_id);
CREATE INDEX idx_cam_inspection_started
    ON tcl_cam_inspection(started_at);
CREATE INDEX idx_cam_inspection_chk_header
    ON tcl_cam_inspection(checklist_header_id);

CREATE INDEX idx_cam_resp_inspection
    ON tcl_cam_inspection_response(inspection_id);
CREATE INDEX idx_cam_resp_checklist
    ON tcl_cam_inspection_response(checklist_item_id);

CREATE INDEX idx_cam_photo_inspection
    ON tcl_cam_photo(inspection_id);
CREATE INDEX idx_cam_photo_checklist
    ON tcl_cam_photo(checklist_item_id);

CREATE INDEX idx_cam_override_inspection
    ON tcl_cam_override(inspection_id);
CREATE INDEX idx_cam_override_manager
    ON tcl_cam_override(manager_id);

CREATE INDEX idx_cam_audit_action
    ON tcl_cam_audit_log(action);
CREATE INDEX idx_cam_audit_entity
    ON tcl_cam_audit_log(entity_name, entity_id);
CREATE INDEX idx_cam_audit_created
    ON tcl_cam_audit_log(created_at) LOCAL;

-- =============================================================================
-- 14. AUTO-UPDATE TRIGGER for updated_at columns
-- =============================================================================
CREATE OR REPLACE TRIGGER trg_tcl_cam_role_upd
    BEFORE UPDATE ON tcl_cam_role
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_tcl_cam_useraccess_upd
    BEFORE UPDATE ON tcl_cam_useraccess
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_tcl_cam_name_upd
    BEFORE UPDATE ON tcl_cam_name
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_tcl_cam_chk_header_upd
    BEFORE UPDATE ON tcl_cam_checklist_header
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_tcl_cam_inspection_upd
    BEFORE UPDATE ON tcl_cam_inspection
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_tcl_cam_resp_upd
    BEFORE UPDATE ON tcl_cam_inspection_response
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

COMMIT;
