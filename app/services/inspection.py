import logging
from datetime import datetime, timezone
from pathlib import PureWindowsPath

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import ChecklistItem, Inspection, InspectionResponse, Machine, Photo, User
from app.schemas.inspection import ChecklistAnswer
from app.services.audit import write_audit_log

logger = logging.getLogger(__name__)


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


def get_machine_by_qr(db: Session, qr_code: str) -> Machine:
    machine = db.scalar(select(Machine).where(Machine.qr_code == qr_code))
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found"
        )
    if machine.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Machine is not active"
        )
    return machine


def checklist_for_machine(
    db: Session, machine_family: str = "CAMSHAFT"
) -> list[ChecklistItem]:
    items = list(
        db.scalars(
            select(ChecklistItem)
            .where(
                ChecklistItem.machine_family == machine_family,
                ChecklistItem.is_active == True,
            )
            .order_by(ChecklistItem.sequence_no)
        )
    )
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No checklist items found for this machine family",
        )
    return items


def mark_attendance(
    db: Session, inspection_no: str, operator: User
) -> Inspection:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_no == inspection_no)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
    if inspection.attendance_marked_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Attendance already marked"
        )
    if inspection.status not in ("IN_PROGRESS",):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only mark attendance for in-progress inspections",
        )

    old_value = (
        str(inspection.attendance_marked_at)
        if inspection.attendance_marked_at
        else "NOT_MARKED"
    )
    inspection.attendance_marked_at = datetime.now(timezone.utc)
    write_audit_log(
        db,
        "ATTENDANCE",
        "INSPECTION",
        inspection_no,
        operator.user_id,
        old_value=old_value,
        new_value=str(inspection.attendance_marked_at),
    )
    db.commit()
    db.refresh(inspection)
    return inspection


def start_inspection(
    db: Session, machine_code: str, operator: User
) -> Inspection:
    machine = db.scalar(
        select(Machine).where(Machine.machine_code == machine_code)
    )
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found"
        )
    if machine.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Machine is not active"
        )

    inspection_no = _next_inspection_no(db)
    inspection = Inspection(
        inspection_no=inspection_no,
        machine_id=machine.machine_id,
        operator_id=operator.user_id,
        status="IN_PROGRESS",
    )
    db.add(inspection)
    db.flush()
    write_audit_log(
        db,
        "INSPECTION_START",
        "INSPECTION",
        inspection_no,
        operator.user_id,
        {"machine_code": machine_code, "machine_name": machine.machine_name},
    )
    db.commit()
    db.refresh(inspection)
    return inspection


def save_photo_metadata(
    db: Session,
    inspection_id: int,
    checklist_item_id: int | None,
    file_name: str,
    user: User,
) -> Photo:
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

    lan_path = str(
        PureWindowsPath(settings.lan_image_root)
        / inspection.inspection_no
        / file_name
    )
    photo = Photo(
        inspection_id=inspection_id,
        checklist_item_id=checklist_item_id,
        file_name=file_name,
        lan_path=lan_path,
    )
    db.add(photo)
    db.flush()
    write_audit_log(
        db,
        "PHOTO_UPLOAD",
        "PHOTO",
        str(photo.photo_id),
        user.user_id,
        {
            "inspection_id": inspection_id,
            "file_name": file_name,
            "checklist_item_id": checklist_item_id,
        },
    )
    db.commit()
    db.refresh(photo)
    return photo


def submit_inspection(
    db: Session,
    inspection_id: int,
    answers: list[ChecklistAnswer],
    user: User,
) -> Inspection:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
    if inspection.operator_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit your own inspections",
        )
    if inspection.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inspection is already finalized",
        )

    for answer in answers:
        existing = db.scalar(
            select(InspectionResponse).where(
                InspectionResponse.inspection_id == inspection.inspection_id,
                InspectionResponse.checklist_item_id == answer.checklist_item_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Checklist item {answer.checklist_item_id} already has a response",
            )
        db.add(
            InspectionResponse(
                inspection_id=inspection.inspection_id,
                checklist_item_id=answer.checklist_item_id,
                result=answer.result,
                remarks=answer.remarks,
            )
        )

    old_status = inspection.status
    inspection.status = "SUBMITTED"
    inspection.submitted_at = datetime.now(timezone.utc)
    write_audit_log(
        db,
        "SUBMISSION",
        "INSPECTION",
        inspection.inspection_no,
        user.user_id,
        {"responses_count": len(answers)},
        old_value=old_status,
        new_value=inspection.status,
    )
    db.commit()
    db.refresh(inspection)
    return inspection
