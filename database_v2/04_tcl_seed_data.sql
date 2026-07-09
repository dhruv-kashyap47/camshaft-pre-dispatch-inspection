-- =============================================================================
-- TCL V2 Seed Data for Oracle 19c
-- =============================================================================

SET DEFINE OFF;

-- =============================================================================
-- 1. TCL_CAM_ROLE
-- =============================================================================
INSERT INTO tcl_cam_role (role_name, description)
VALUES ('OPERATOR', 'Shop-floor inspection operator');

INSERT INTO tcl_cam_role (role_name, description)
VALUES ('MANAGER', 'Quality approval manager');

INSERT INTO tcl_cam_role (role_name, description)
VALUES ('ADMIN', 'IT and system administrator');

-- =============================================================================
-- 2. TCL_CAM_USERACCESS  (password: Cummins@123)
-- =============================================================================
INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'operator1', 'Operator One',
       'pbkdf2_sha256$600000$CK3-sC2X4ogQi6giwvZs0Q$KutjeGr_nTdZU-c9fKdxQjm3xE2_8Pu51WjB8Azw89E',
       role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'OPERATOR';

INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'operator2', 'Operator Two',
       'pbkdf2_sha256$600000$CK3-sC2X4ogQi6giwvZs0Q$KutjeGr_nTdZU-c9fKdxQjm3xE2_8Pu51WjB8Azw89E',
       role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'OPERATOR';

INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'manager1', 'Manager One',
       'pbkdf2_sha256$600000$mfbj47SVAQofNiUmrkfIXA$1WawDqVqVha8tOi804X1DwFa03SZ07hw8-TFHbeQ0pI',
       role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'MANAGER';

INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'admin1', 'Admin One',
       'pbkdf2_sha256$600000$fIRf6Ru64aKLbxMLE1nslA$nzqUwq70R0rCury0kgoa8JSz7Sgqtzwo14rhRHDYiMU',
       role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'ADMIN';

-- =============================================================================
-- 3. TCL_CAM_NAME
-- =============================================================================
INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1001', 'Camshaft Line A', 'CAM-1001', 'ACTIVE');

INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1002', 'Camshaft Line B', 'CAM-1002', 'ACTIVE');

INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1003', 'Camshaft Line C', 'CAM-1003', 'ACTIVE');

INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1004', 'Camshaft Line D', 'CAM-1004', 'INACTIVE');

-- =============================================================================
-- 4. TCL_CAM_CHECKLIST_HEADER  (V1 — 7 production items)
-- =============================================================================
INSERT INTO tcl_cam_checklist_header (
    checklist_name, version, description, is_active, effective_from
) VALUES (
    'CAMSHAFT_PDI_V1', 1,
    'Camshaft Pre-Dispatch Inspection — 7 critical checkpoints',
    'Y', DATE '2026-01-01'
);

-- =============================================================================
-- 5. TCL_CAM_CHECKLIST_ITEM  (7 production items)
-- =============================================================================
INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'LOBE_SURFACE', 'Cam Lobe Surface Finish — visual inspection for scoring, pitting, or wear on all cam lobes', 1, 'Y', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'BASE_RUNOUT', 'Base Circle Runout — dial gauge measurement of base circle runout within 0.02mm tolerance', 2, 'N', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'JOURNAL_DIA', 'Journal Diameter — micrometer verification of all journal diameters to drawing specification', 3, 'N', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'HARDNESS', 'Hardness Test (Rockwell) — hardness verification at specified locations per HRC specification', 4, 'N', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'MPI_CRACK', 'Magnetic Particle Inspection (MPI) — crack detection on all ground surfaces and fillet radii', 5, 'Y', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'STRAIGHTNESS', 'Camshaft Straightness — V-block measurement for bend/straightness within 0.05mm', 6, 'N', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

INSERT INTO tcl_cam_checklist_item (
    checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active
)
SELECT ch.checklist_header_id, 'LASER_MARK', 'Laser Marking Verification — legibility and accuracy of part number / serial number / date code', 7, 'Y', 'Y'
FROM tcl_cam_checklist_header ch WHERE ch.checklist_name = 'CAMSHAFT_PDI_V1' AND ch.version = 1;

COMMIT;

SET DEFINE ON;
