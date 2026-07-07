import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Inspection, InspectionResponse, Override, User
from app.services.audit import write_audit_log

logger = logging.getLogger(__name__)


def list_pending_inspections(db: Session) -> list[Inspection]:
    return list(
        db.scalars(
            select(Inspection)
            .where(Inspection.status == "SUBMITTED")
            .order_by(Inspection.submitted_at.desc())
        )
    )


def get_inspection_detail(db: Session, inspection_id: int) -> Inspection:
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    return inspection


def override_response(
    db: Session,
    inspection_id: int,
    checklist_item_id: int,
    override_result: str,
    reason: str,
    manager: User,
) -> Override:
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    if inspection.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Overrides are only allowed on submitted inspections",
        )
    if inspection.submitted_at and inspection.submitted_at < datetime.now(timezone.utc) - timedelta(
        hours=settings.default_manager_override_window_hours
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Override window of {settings.default_manager_override_window_hours} hours has expired",
        )

    response = db.scalar(
        select(InspectionResponse).where(
            InspectionResponse.inspection_id == inspection_id,
            InspectionResponse.checklist_item_id == checklist_item_id,
        )
    )
    if not response:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection response not found")

    existing_override = db.scalar(
        select(Override).where(
            Override.inspection_id == inspection_id,
            Override.checklist_item_id == checklist_item_id,
        )
    )
    if existing_override:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This checklist item already has an override",
        )

    row = Override(
        inspection_id=inspection_id,
        manager_id=manager.id,
        checklist_item_id=checklist_item_id,
        original_result=response.result,
        override_result=override_result,
        reason=reason,
    )
    response.result = override_result
    db.add(row)
    db.flush()
    write_audit_log(
        db, "OVERRIDE", "INSPECTION", inspection.inspection_no, manager.id,
        {"checklist_item_id": checklist_item_id, "original": row.original_result, "override": override_result, "reason": reason},
    )
    db.commit()
    db.refresh(row)
    return row


def approve_inspection(
    db: Session,
    inspection_id: int,
    manager: User,
    approval_note: str | None,
) -> Inspection:
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    if inspection.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot approve inspection in status '{inspection.status}'",
        )

    old_status = inspection.status
    inspection.status = "APPROVED"
    inspection.approved_at = datetime.now(timezone.utc)
    inspection.approval_note = approval_note
    write_audit_log(
        db, "APPROVAL", "INSPECTION", inspection.inspection_no, manager.id,
        {"approval_note": approval_note},
        old_value=old_status, new_value=inspection.status,
    )
    db.commit()
    db.refresh(inspection)
    return inspection


def reject_inspection(
    db: Session,
    inspection_id: int,
    manager: User,
    reason: str,
) -> Inspection:
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    if inspection.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reject inspection in status '{inspection.status}'",
        )

    old_status = inspection.status
    inspection.status = "REJECTED"
    inspection.approval_note = reason
    write_audit_log(
        db, "REJECTION", "INSPECTION", inspection.inspection_no, manager.id,
        {"reason": reason},
        old_value=old_status, new_value=inspection.status,
    )
    db.commit()
    db.refresh(inspection)
    return inspection
