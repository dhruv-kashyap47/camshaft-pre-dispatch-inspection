-- ============================================================================
-- CamTrace Seed Data for Oracle 19c
-- ============================================================================

SET DEFINE OFF;

-- ROLES
INSERT INTO roles (role_name, description) VALUES ('OPERATOR', 'Shop-floor inspection operator');
INSERT INTO roles (role_name, description) VALUES ('MANAGER', 'Quality approval manager');
INSERT INTO roles (role_name, description) VALUES ('ADMIN', 'IT and system administrator');

-- USERS (password: Cummins@123)
-- Password hash is pbkdf2_sha256$600000$<salt>$<digest>
INSERT INTO users (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'operator1', 'Operator One', 'pbkdf2_sha256$600000$CK3-sC2X4ogQi6giwvZs0Q$KutjeGr_nTdZU-c9fKdxQjm3xE2_8Pu51WjB8Azw89E', role_id, 'Y'
FROM roles WHERE role_name = 'OPERATOR';

INSERT INTO users (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'manager1', 'Manager One', 'pbkdf2_sha256$600000$mfbj47SVAQofNiUmrkfIXA$1WawDqVqVha8tOi804X1DwFa03SZ07hw8-TFHbeQ0pI', role_id, 'Y'
FROM roles WHERE role_name = 'MANAGER';

INSERT INTO users (employee_id, full_name, password_hash, role_id, is_active)
SELECT 'admin1', 'Admin One', 'pbkdf2_sha256$600000$fIRf6Ru64aKLbxMLE1nslA$nzqUwq70R0rCury0kgoa8JSz7Sgqtzwo14rhRHDYiMU', role_id, 'Y'
FROM roles WHERE role_name = 'ADMIN';

-- MACHINES
INSERT INTO machines (machine_code, machine_name, qr_code, status)
VALUES ('CAM-1001', 'Camshaft Line A', 'CAM-1001', 'ACTIVE');

INSERT INTO machines (machine_code, machine_name, qr_code, status)
VALUES ('CAM-1002', 'Camshaft Line B', 'CAM-1002', 'ACTIVE');

INSERT INTO machines (machine_code, machine_name, qr_code, status)
VALUES ('CAM-1003', 'Camshaft Line C', 'CAM-1003', 'ACTIVE');

INSERT INTO machines (machine_code, machine_name, qr_code, status)
VALUES ('CAM-1004', 'Camshaft Line D', 'CAM-1004', 'INACTIVE');

-- CHECKLIST ITEMS (17 realistic Tata Cummins camshaft PDI checks)
INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'LOBE_SURFACE', 'Cam Lobe Surface Finish — visual inspection for scoring, pitting, or wear on all cam lobes', 1, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'BASE_RUNOUT', 'Base Circle Runout — dial gauge measurement of base circle runout within 0.02mm tolerance', 2, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'JOURNAL_DIA', 'Journal Diameter — micrometer verification of all journal diameters to drawing specification', 3, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'KEYWAY_PIN', 'Keyway & Pin Alignment — check of keyway position and dowel pin alignment within 0.5°', 4, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'HARDNESS', 'Hardness Test (Rockwell) — hardness verification at specified locations per HRC specification', 5, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'MPI_CRACK', 'Magnetic Particle Inspection (MPI) — crack detection on all ground surfaces and fillet radii', 6, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'STRAIGHTNESS', 'Camshaft Straightness — V-block measurement for bend/straightness within 0.05mm', 7, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'OIL_HOLE', 'Oil Hole Cleanliness — verification of oil hole passage clearance and chamfer condition', 8, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'TIMING_ANGLE', 'Timing / Phase Angle — angular position check of all cam lobes relative to timing reference', 9, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'HARDEN_PATTERN', 'Induction Hardening Pattern — etch inspection for proper hardening depth and pattern consistency', 10, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'LOBE_PROFILE', 'Cam Lobe Profile Check — optical profile verification against master template', 11, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'JOURNAL_FINISH', 'Bearing Journal Surface Finish — Ra/Rz measurement on bearing journal surfaces', 12, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'SPLINE_GAUGE', 'Spline/Serration Gauging — go/no-go gauge check of spline dimensions', 13, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'END_PLAY', 'Axial End Play Measurement — feeler gauge measurement of axial clearance', 14, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'DYNAMIC_BAL', 'Dynamic Balance Verification — residual unbalance measurement within specification', 15, 'N', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'RUST_PREV', 'Rust Prevention & Preservation — anti-corrosion oil application and packaging check', 16, 'Y', 'Y');

INSERT INTO checklist_items (machine_family, item_code, prompt, sequence_no, requires_photo, is_active)
VALUES ('CAMSHAFT', 'LASER_MARK', 'Laser Marking Verification — legibility and accuracy of part number / serial number / date code', 17, 'Y', 'Y');

COMMIT;

SET DEFINE ON;
