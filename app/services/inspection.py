import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CamName, ChecklistHeader, ChecklistItem, Inspection, InspectionResponse, UserAccess
from app.schemas.inspection import ChecklistAnswer
from app.services.audit import write_audit_log

logger = logging.getLogger(__name__)


def _default_checklist_header(db: Session) -> ChecklistHeader:
    header = db.scalar(
        select(ChecklistHeader).where(ChecklistHeader.is_active == True).limit(1)
    )
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active checklist header found",
        )
    return header


def _next_inspection_no(db: Session) -> str:
    today = datetime.now(timezone.utc)
    prefix = f"INSP-{today:%Y%m%d}"
    count = (
        db.scalar(
            select(func.count(Inspection.inspection_id)).where(
                Inspection.inspection_no.like(f"{prefix}%")
            )
        )
        or 0
    )
    return f"{prefix}-{count + 1:05d}"


def checklist_for_machine(
    db: Session, machine_family: str = None
) -> list[ChecklistItem]:
    header = _default_checklist_header(db)
    items = list(
        db.scalars(
            select(ChecklistItem)
            .where(
                ChecklistItem.checklist_header_id == header.checklist_header_id,
                ChecklistItem.is_active == True,
            )
            .order_by(ChecklistItem.sequence_no)
        )
    )
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No checklist items found",
        )
    return items


def save_photo_metadata(
    db: Session,
    inspection_id: int,
    checklist_item_id: int | None,
    file_name: str,
    user: UserAccess,
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
    if inspection.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot upload photos to a finalized inspection",
        )

    from app.models import Photo
    photo = Photo(
        inspection_id=inspection_id,
        checklist_item_id=checklist_item_id,
        file_name=file_name,
    )
    db.add(photo)
    db.flush()
    write_audit_log(
        db, "PHOTO_UPLOAD", "PHOTO", str(photo.photo_id),
        user.useraccess_id,
        {"inspection_id": inspection_id, "file_name": file_name, "checklist_item_id": checklist_item_id},
    )
    db.commit()
    db.refresh(photo)
    return photo