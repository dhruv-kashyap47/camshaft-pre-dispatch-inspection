import logging
from datetime import date

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import CamName, ChecklistHeader, ChecklistItem, Role, UserAccess

logger = logging.getLogger(__name__)


def initialize_database() -> None:
    if str(engine.url).startswith("sqlite"):
        _init_sqlite()
    else:
        _verify_oracle()


def _init_sqlite() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(UserAccess.useraccess_id).limit(1)):
            return

        roles = [
            Role(role_name="OPERATOR", description="Shop-floor inspection operator"),
            Role(role_name="MANAGER", description="Quality approval manager"),
            Role(role_name="ADMIN", description="IT and system administrator"),
        ]
        db.add_all(roles)
        db.flush()

        users = [
            UserAccess(
                employee_id="operator1", full_name="Operator One",
                password_hash=hash_password("Cummins@123"),
                role_id=roles[0].role_id, is_active=True,
            ),
            UserAccess(
                employee_id="operator2", full_name="Operator Two",
                password_hash=hash_password("Cummins@123"),
                role_id=roles[0].role_id, is_active=True,
            ),
            UserAccess(
                employee_id="manager1", full_name="Manager One",
                password_hash=hash_password("Cummins@123"),
                role_id=roles[1].role_id, is_active=True,
            ),
            UserAccess(
                employee_id="admin1", full_name="Admin One",
                password_hash=hash_password("Cummins@123"),
                role_id=roles[2].role_id, is_active=True,
            ),
        ]
        db.add_all(users)
        db.flush()

        cam_names = [
            CamName(cam_code="CAM-1001", cam_name="Camshaft Line A", qr_code="CAM-1001", status="ACTIVE"),
            CamName(cam_code="CAM-1002", cam_name="Camshaft Line B", qr_code="CAM-1002", status="ACTIVE"),
        ]
        db.add_all(cam_names)
        db.flush()

        header = ChecklistHeader(
            checklist_name="CAMSHAFT_PDI_V1", version=1,
            description="Camshaft Pre-Dispatch Inspection - 7 critical checkpoints",
            is_active=True, effective_from=date.today(),
        )
        db.add(header)
        db.flush()

        items = [
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="LOBE_SURFACE",
                prompt="Cam Lobe Surface Finish — visual inspection for scoring, pitting, or wear on all cam lobes",
                sequence_no=1, requires_photo=True, is_active=True),
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="BASE_RUNOUT",
                prompt="Base Circle Runout — dial gauge measurement of base circle runout within 0.02mm tolerance",
                sequence_no=2, requires_photo=False, is_active=True),
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="JOURNAL_DIA",
                prompt="Journal Diameter — micrometer verification of all journal diameters to drawing specification",
                sequence_no=3, requires_photo=False, is_active=True),
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="HARDNESS",
                prompt="Hardness Test (Rockwell) — hardness verification at specified locations per HRC specification",
                sequence_no=4, requires_photo=False, is_active=True),
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="MPI_CRACK",
                prompt="Magnetic Particle Inspection (MPI) — crack detection on all ground surfaces and fillet radii",
                sequence_no=5, requires_photo=True, is_active=True),
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="STRAIGHTNESS",
                prompt="Camshaft Straightness — V-block measurement for bend/straightness within 0.05mm",
                sequence_no=6, requires_photo=False, is_active=True),
            ChecklistItem(checklist_header_id=header.checklist_header_id, item_code="LASER_MARK",
                prompt="Laser Marking Verification — legibility and accuracy of part number / serial number / date code",
                sequence_no=7, requires_photo=True, is_active=True),
        ]
        db.add_all(items)
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