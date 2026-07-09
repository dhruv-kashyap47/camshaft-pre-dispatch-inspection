-- =============================================================================
-- CamTrace Seed Data for Oracle 19c — V2 TCL Naming
-- Password for all users: Cummins@123
-- Password hash: pbkdf2_sha256$600000$<salt>$<digest>
-- =============================================================================

SET DEFINE OFF;

-- ROLES
INSERT INTO tcl_cam_role (role_name, description) VALUES ('OPERATOR', 'Shop-floor inspection operator');
INSERT INTO tcl_cam_role (role_name, description) VALUES ('MANAGER', 'Quality approval manager');
INSERT INTO tcl_cam_role (role_name, description) VALUES ('ADMIN', 'IT and system administrator');

-- USERS
INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'operator1', 'Operator One', 'pbkdf2_sha256$600000$CK3-sC2X4ogQi6giwvZs0Q$KutjeGr_nTdZU-c9fKdxQjm3xE2_8Pu51WjB8Azw89E', role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'OPERATOR';

INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'operator2', 'Operator Two', 'pbkdf2_sha256$600000$CK3-sC2X4ogQi6giwvZs0Q$KutjeGr_nTdZU-c9fKdxQjm3xE2_8Pu51WjB8Azw89E', role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'OPERATOR';

INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'manager1', 'Manager One', 'pbkdf2_sha256$600000$mfbj47SVAQofNiUmrkfIXA$1WawDqVqVha8tOi804X1DwFa03SZ07hw8-TFHbeQ0pI', role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'MANAGER';

INSERT INTO tcl_cam_useraccess (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'admin1', 'Admin One', 'pbkdf2_sha256$600000$fIRf6Ru64aKLbxMLE1nslA$nzqUwq70R0rCury0kgoa8JSz7Sgqtzwo14rhRHDYiMU', role_id, 'Y'
FROM tcl_cam_role WHERE role_name = 'ADMIN';

-- MACHINES
INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1001', 'Camshaft Line A', 'CAM-1001', 'ACTIVE');

INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1002', 'Camshaft Line B', 'CAM-1002', 'ACTIVE');

INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1003', 'Camshaft Line C', 'CAM-1003', 'ACTIVE');

INSERT INTO tcl_cam_name (cam_code, cam_name, qr_code, status)
VALUES ('CAM-1004', 'Camshaft Line D', 'CAM-1004', 'INACTIVE');

-- CHECKLIST HEADER
INSERT INTO tcl_cam_checklist_header (checklist_name, version, description, is_active, effective_from)
VALUES ('CAMSHAFT_PDI_V1', 1, 'Camshaft Pre-Dispatch Inspection - 7 critical checkpoints', 'Y', SYSDATE);

-- CHECKLIST ITEMS
INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'LOBE_SURFACE', 'Cam Lobe Surface Finish — visual inspection for scoring, pitting, or wear on all cam lobes', 1, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'BASE_RUNOUT', 'Base Circle Runout — dial gauge measurement of base circle runout within 0.02mm tolerance', 2, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'JOURNAL_DIA', 'Journal Diameter — micrometer verification of all journal diameters to drawing specification', 3, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'KEYWAY_PIN', 'Keyway & Pin Alignment — check of keyway position and dowel pin alignment within 0.5°', 4, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'HARDNESS', 'Hardness Test (Rockwell) — hardness verification at specified locations per HRC specification', 5, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'MPI_CRACK', 'Magnetic Particle Inspection (MPI) — crack detection on all ground surfaces and fillet radii', 6, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'STRAIGHTNESS', 'Camshaft Straightness — V-block measurement for bend/straightness within 0.05mm', 7, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'OIL_HOLE', 'Oil Hole Cleanliness — verification of oil hole passage clearance and chamfer condition', 8, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'TIMING_ANGLE', 'Timing / Phase Angle — angular position check of all cam lobes relative to timing reference', 9, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'HARDEN_PATTERN', 'Induction Hardening Pattern — etch inspection for proper hardening depth and pattern consistency', 10, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'LOBE_PROFILE', 'Cam Lobe Profile Check — optical profile verification against master template', 11, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'JOURNAL_FINISH', 'Bearing Journal Surface Finish — Ra/Rz measurement on bearing journal surfaces', 12, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'SPLINE_GAUGE', 'Spline/Serration Gauging — go/no-go gauge check of spline dimensions', 13, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'END_PLAY', 'Axial End Play Measurement — feeler gauge measurement of axial clearance', 14, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'DYNAMIC_BAL', 'Dynamic Balance Verification — residual unbalance measurement within specification', 15, 'N', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'RUST_PREV', 'Rust Prevention & Preservation — anti-corrosion oil application and packaging check', 16, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

INSERT INTO tcl_cam_checklist_item (checklist_header_id, item_code, prompt, sequence_no, requires_photo, is_active)
SELECT checklist_header_id, 'LASER_MARK', 'Laser Marking Verification — legibility and accuracy of part number / serial number / date code', 17, 'Y', 'Y'
FROM tcl_cam_checklist_header WHERE checklist_name = 'CAMSHAFT_PDI_V1';

COMMIT;

SET DEFINE ON;
