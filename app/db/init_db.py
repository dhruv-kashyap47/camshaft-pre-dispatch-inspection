import logging

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import ChecklistItem, Machine, Role, User

logger = logging.getLogger(__name__)


def initialize_database() -> None:
    if str(engine.url).startswith("sqlite"):
        _init_sqlite()
    else:
        _verify_oracle()


def _init_sqlite() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(User.id).limit(1)):
            return

        roles = [
            Role(name="OPERATOR", description="Shop-floor inspection operator"),
            Role(name="MANAGER", description="Quality approval manager"),
            Role(name="ADMIN", description="IT and system administrator"),
        ]
        db.add_all(roles)
        db.flush()

        users = [
            User(employee_id="operator1", full_name="Operator One", password_hash=hash_password("Cummins@123"), role_id=roles[0].id, is_active=True),
            User(employee_id="manager1", full_name="Manager One", password_hash=hash_password("Cummins@123"), role_id=roles[1].id, is_active=True),
            User(employee_id="admin1", full_name="Admin One", password_hash=hash_password("Cummins@123"), role_id=roles[2].id, is_active=True),
        ]
        machines = [
            Machine(machine_code="CAM-1001", machine_name="Camshaft Line A", qr_code="CAM-1001", status="ACTIVE"),
            Machine(machine_code="CAM-1002", machine_name="Camshaft Line B", qr_code="CAM-1002", status="ACTIVE"),
        ]
        checklist = [
            ChecklistItem(machine_family="CAMSHAFT", item_code="LOBE_SURFACE", prompt="Cam Lobe Surface Finish — visual inspection for scoring, pitting, or wear on all cam lobes", sequence_no=1, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="BASE_RUNOUT", prompt="Base Circle Runout — dial gauge measurement of base circle runout within 0.02mm tolerance", sequence_no=2, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="JOURNAL_DIA", prompt="Journal Diameter — micrometer verification of all journal diameters to drawing specification", sequence_no=3, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="KEYWAY_PIN", prompt="Keyway & Pin Alignment — check of keyway position and dowel pin alignment within 0.5°", sequence_no=4, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="HARDNESS", prompt="Hardness Test (Rockwell) — hardness verification at specified locations per HRC specification", sequence_no=5, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="MPI_CRACK", prompt="Magnetic Particle Inspection (MPI) — crack detection on all ground surfaces and fillet radii", sequence_no=6, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="STRAIGHTNESS", prompt="Camshaft Straightness — V-block measurement for bend/straightness within 0.05mm", sequence_no=7, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="OIL_HOLE", prompt="Oil Hole Cleanliness — verification of oil hole passage clearance and chamfer condition", sequence_no=8, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="TIMING_ANGLE", prompt="Timing / Phase Angle — angular position check of all cam lobes relative to timing reference", sequence_no=9, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="HARDEN_PATTERN", prompt="Induction Hardening Pattern — etch inspection for proper hardening depth and pattern consistency", sequence_no=10, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="LOBE_PROFILE", prompt="Cam Lobe Profile Check — optical profile verification against master template", sequence_no=11, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="JOURNAL_FINISH", prompt="Bearing Journal Surface Finish — Ra/Rz measurement on bearing journal surfaces", sequence_no=12, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="SPLINE_GAUGE", prompt="Spline/Serration Gauging — go/no-go gauge check of spline dimensions", sequence_no=13, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="END_PLAY", prompt="Axial End Play Measurement — feeler gauge measurement of axial clearance", sequence_no=14, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="DYNAMIC_BAL", prompt="Dynamic Balance Verification — residual unbalance measurement within specification", sequence_no=15, requires_photo=False, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="RUST_PREV", prompt="Rust Prevention & Preservation — anti-corrosion oil application and packaging check", sequence_no=16, requires_photo=True, is_active=True),
            ChecklistItem(machine_family="CAMSHAFT", item_code="LASER_MARK", prompt="Laser Marking Verification — legibility and accuracy of part number / serial number / date code", sequence_no=17, requires_photo=True, is_active=True),
        ]
        db.add_all(users + machines + checklist)
        db.commit()
        logger.info("SQLite database initialized with seed data")


def _verify_oracle() -> None:
    try:
        with engine.connect() as conn:
            conn.execute(select(1))
            logger.info("Oracle connection verified")
    except Exception as e:
        logger.error("Oracle connection failed: %s", e)
        raise
