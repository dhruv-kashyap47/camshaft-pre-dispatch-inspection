import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    CamName,
    ChecklistItem,
    Inspection,
    InspectionResponse,
    Photo,
    QrData,
    UserAccess,
)
from app.schemas.inspection import QrParseResult
from app.services.audit import write_audit_log
from app.services.inspection import _default_checklist_header, _next_inspection_no
from app.services.lock_manager import acquire_lock, release_lock, verify_lock
from app.services.qr_parser import parse_qr_code
from app.services.validation import validate_inspection_for_submit

# Starlette compatibility
HTTP_422_UNPROCESSABLE_CONTENT = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", status.HTTP_422_UNPROCESSABLE_ENTITY)

logger = logging.getLogger(__name__)


def _default_cam_name_id(db: Session) -> int:
    cam = db.scalar(
        select(CamName.cam_name_id)
        .where(CamName.status == "ACTIVE")
        .limit(1)
    )
    return cam if cam is not None else 1


def _inspection_to_detail_dict(inspection: Inspection, responses: list, photos: list) -> dict:
    return {
        "id": inspection.inspection_id,
        "inspection_no": inspection.inspection_no,
        "status": inspection.status,
        "current_step": inspection.current_step,
        "completion_pct": inspection.completion_pct,
        "started_at": inspection.started_at.isoformat() if inspection.started_at else None,
        "submitted_at": inspection.submitted_at.isoformat() if inspection.submitted_at else None,
        "approved_at": inspection.approved_at.isoformat() if inspection.approved_at else None,
        "attendance_marked_at": inspection.attendance_marked_at.isoformat()
        if inspection.attendance_marked_at else None,
        "responses": [
            {
                "id": r.inspection_response_id,
                "checklist_item_id": r.checklist_item_id,
                "result": r.result,
                "remarks": r.remarks,
            }
            for r in responses
        ],
        "photos": [
            {
                "id": p.photo_id,
                "checklist_item_id": p.checklist_item_id,
                "file_name": p.file_name,
                "content_type": p.content_type,
                "created_at": str(p.created_at),
            }
            for p in photos
        ],
    }


def resume_or_create_inspection(
    db: Session, raw_qr: str, operator: UserAccess
) -> dict:
    qr_result: QrParseResult = parse_qr_code(raw_qr)
    header = _default_checklist_header(db)

    existing_inspection = db.scalar(
        select(Inspection)
        .join(QrData, QrData.inspection_id == Inspection.inspection_id)
        .where(
            Inspection.status == "IN_PROGRESS",
            QrData.part_number == qr_result.part_number,
            QrData.serial_number == qr_result.serial_number,
        )
        .order_by(Inspection.created_at.desc())
        .limit(1)
    )

    if existing_inspection:
        try:
            acquire_lock(existing_inspection.inspection_id, operator)
        except PermissionError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            )

        if existing_inspection.operator_id != operator.useraccess_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This inspection was started by another operator",
            )

        responses = list(
            db.scalars(
                select(InspectionResponse).where(
                    InspectionResponse.inspection_id == existing_inspection.inspection_id
                )
            ).all()
        )
        photos = list(
            db.scalars(
                select(Photo).where(
                    Photo.inspection_id == existing_inspection.inspection_id
                )
            ).all()
        )

        write_audit_log(
            db,
            "INSPECTION_RESUMED",
            "INSPECTION",
            existing_inspection.inspection_no,
            operator.useraccess_id,
            {
                "part_number": qr_result.part_number,
                "serial_number": qr_result.serial_number,
                "existing_responses": len(responses),
            },
        )
        db.commit()

        return {
            "action": "resumed",
            "inspection": _inspection_to_detail_dict(existing_inspection, responses, photos),
            "qr_data": {
                "part_number": qr_result.part_number,
                "serial_number": qr_result.serial_number,
                "vendor_code": qr_result.vendor_code,
            },
        }

    inspection_no = _next_inspection_no(db)
    cam_name_id = _default_cam_name_id(db)
    inspection = Inspection(
        inspection_no=inspection_no,
        cam_name_id=cam_name_id,
        operator_id=operator.useraccess_id,
        checklist_header_id=header.checklist_header_id,
        status="IN_PROGRESS",
        started_at=datetime.now(timezone.utc),
        current_step=1,
    )
    db.add(inspection)
    db.flush()

    qr_data = QrData(
        inspection_id=inspection.inspection_id,
        raw_qr=qr_result.raw_qr,
        part_number=qr_result.part_number,
        serial_number=qr_result.serial_number,
        vendor_code=qr_result.vendor_code,
    )
    db.add(qr_data)
    db.flush()

    acquire_lock(inspection.inspection_id, operator)

    write_audit_log(
        db,
        "INSPECTION_CREATED",
        "INSPECTION",
        inspection_no,
        operator.useraccess_id,
        {
            "part_number": qr_result.part_number,
            "serial_number": qr_result.serial_number,
            "vendor_code": qr_result.vendor_code,
        },
    )
    db.commit()
    db.refresh(inspection)

    return {
        "action": "created",
        "inspection": _inspection_to_detail_dict(inspection, [], []),
        "qr_data": {
            "part_number": qr_result.part_number,
            "serial_number": qr_result.serial_number,
            "vendor_code": qr_result.vendor_code,
        },
    }


def save_answer(
    db: Session,
    inspection_id: int,
    checklist_item_id: int,
    result: str,
    remarks: str | None,
    operator: UserAccess,
) -> dict:
    try:
        verify_lock(inspection_id, operator)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if inspection.operator_id != operator.useraccess_id:
        raise HTTPException(status_code=403, detail="Not your inspection")
    if inspection.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=409,
            detail="Cannot modify a finalized inspection",
        )

    existing = db.scalar(
        select(InspectionResponse).where(
            InspectionResponse.inspection_id == inspection_id,
            InspectionResponse.checklist_item_id == checklist_item_id,
        )
    )

    if existing:
        old_result = existing.result
        old_remarks = existing.remarks
        existing.result = result
        existing.remarks = remarks
        existing.updated_at = datetime.now(timezone.utc)
        audit_action = "STEP_UPDATED"
        audit_details = {
            "checklist_item_id": checklist_item_id,
            "old_result": old_result,
            "new_result": result,
            "old_remarks": old_remarks,
            "new_remarks": remarks,
        }
    else:
        db.add(
            InspectionResponse(
                inspection_id=inspection_id,
                checklist_item_id=checklist_item_id,
                result=result,
                remarks=remarks,
            )
        )
        audit_action = "STEP_COMPLETED"
        audit_details = {
            "checklist_item_id": checklist_item_id,
            "result": result,
            "remarks": remarks,
        }

    db.flush()

    answered_count = db.scalar(
        select(func.count(InspectionResponse.inspection_response_id)).where(
            InspectionResponse.inspection_id == inspection_id
        )
    ) or 0

    total_items = db.scalar(
        select(func.count(ChecklistItem.checklist_item_id)).where(
            ChecklistItem.checklist_header_id == inspection.checklist_header_id,
            ChecklistItem.is_active == True,
        )
    ) or 1

    max_seq = db.scalar(
        select(func.max(ChecklistItem.sequence_no)).where(
            ChecklistItem.checklist_header_id == inspection.checklist_header_id,
            ChecklistItem.is_active == True,
        )
    ) or 1

    max_answered_seq = db.scalar(
        select(func.max(ChecklistItem.sequence_no))
        .join(InspectionResponse, InspectionResponse.checklist_item_id == ChecklistItem.checklist_item_id)
        .where(
            InspectionResponse.inspection_id == inspection_id,
            ChecklistItem.checklist_header_id == inspection.checklist_header_id,
        )
    ) or 0

    completion_pct = round((answered_count / total_items) * 100, 2)
    current_step = min(max_answered_seq + 1, max_seq)

    inspection.current_step = current_step
    inspection.completion_pct = completion_pct

    write_audit_log(
        db,
        audit_action,
        "INSPECTION",
        inspection.inspection_no,
        operator.useraccess_id,
        audit_details,
    )
    db.commit()

    return {
        "inspection_id": inspection_id,
        "checklist_item_id": checklist_item_id,
        "result": result,
        "remarks": remarks,
        "current_step": current_step,
        "completion_pct": completion_pct,
        "answered_count": answered_count,
        "total_items": total_items,
    }


def save_remark(
    db: Session,
    inspection_id: int,
    checklist_item_id: int,
    remarks: str | None,
    operator: UserAccess,
) -> dict:
    try:
        verify_lock(inspection_id, operator)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if inspection.operator_id != operator.useraccess_id:
        raise HTTPException(status_code=403, detail="Not your inspection")
    if inspection.status != "IN_PROGRESS":
        raise HTTPException(status_code=409, detail="Cannot modify a finalized inspection")

    response = db.scalar(
        select(InspectionResponse).where(
            InspectionResponse.inspection_id == inspection_id,
            InspectionResponse.checklist_item_id == checklist_item_id,
        )
    )
    if not response:
        raise HTTPException(
            status_code=404,
            detail="No response exists for this checklist item. Save an answer first.",
        )

    old_remarks = response.remarks
    response.remarks = remarks
    response.updated_at = datetime.now(timezone.utc)

    write_audit_log(
        db,
        "REMARK_UPDATED",
        "INSPECTION",
        inspection.inspection_no,
        operator.useraccess_id,
        {
            "checklist_item_id": checklist_item_id,
            "old_remarks": old_remarks,
            "new_remarks": remarks,
        },
    )
    db.commit()

    return {
        "inspection_id": inspection_id,
        "checklist_item_id": checklist_item_id,
        "remarks": remarks,
    }


def complete_step(
    db: Session,
    inspection_id: int,
    sequence_no: int,
    operator: UserAccess,
) -> dict:
    try:
        verify_lock(inspection_id, operator)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    current = inspection.current_step
    if sequence_no < current:
        pass
    elif sequence_no > current + 1:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot skip to step {sequence_no}. Current step is {current}.",
        )

    inspection.current_step = sequence_no

    write_audit_log(
        db,
        "STEP_COMPLETED",
        "INSPECTION",
        inspection.inspection_no,
        operator.useraccess_id,
        {"step": sequence_no},
    )
    db.commit()

    return {
        "inspection_id": inspection_id,
        "current_step": sequence_no,
        "completion_pct": inspection.completion_pct,
    }


def restart_inspection(
    db: Session,
    inspection_id: int,
    operator: UserAccess,
) -> dict:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if inspection.operator_id != operator.useraccess_id:
        raise HTTPException(status_code=403, detail="Not your inspection")
    if inspection.status not in ("IN_PROGRESS", "SUBMITTED", "REJECTED"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot restart inspection in status '{inspection.status}'",
        )

    db.execute(
        InspectionResponse.__table__.delete().where(
            InspectionResponse.inspection_id == inspection_id
        )
    )
    db.execute(
        Photo.__table__.delete().where(
            Photo.inspection_id == inspection_id
        )
    )
    db.execute(
        QrData.__table__.delete().where(
            QrData.inspection_id == inspection_id
        )
    )

    inspection.status = "IN_PROGRESS"
    inspection.current_step = 1
    inspection.completion_pct = 0.0
    inspection.started_at = datetime.now(timezone.utc)
    inspection.submitted_at = None
    inspection.approved_at = None
    inspection.approval_note = None
    inspection.attendance_marked_at = None

    write_audit_log(
        db,
        "INSPECTION_RESTARTED",
        "INSPECTION",
        inspection.inspection_no,
        operator.useraccess_id,
    )
    db.commit()
    db.refresh(inspection)

    return {
        "id": inspection.inspection_id,
        "inspection_no": inspection.inspection_no,
        "status": inspection.status,
        "current_step": inspection.current_step,
        "completion_pct": inspection.completion_pct,
    }


def engine_submit_inspection(
    db: Session,
    inspection_id: int,
    operator: UserAccess,
) -> dict:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if inspection.operator_id != operator.useraccess_id:
        raise HTTPException(status_code=403, detail="Not your inspection")
    if inspection.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=409,
            detail="Inspection is not in progress",
        )

    errors = validate_inspection_for_submit(db, inspection_id)
    if errors:
        raise HTTPException(
            status_code=HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"errors": errors},
        )

    old_status = inspection.status
    inspection.status = "SUBMITTED"
    inspection.submitted_at = datetime.now(timezone.utc)
    inspection.completion_pct = 100.0

    responses = list(
        db.scalars(
            select(InspectionResponse).where(
                InspectionResponse.inspection_id == inspection_id
            )
        ).all()
    )

    write_audit_log(
        db,
        "INSPECTION_SUBMITTED",
        "INSPECTION",
        inspection.inspection_no,
        operator.useraccess_id,
        {
            "responses_count": len(responses),
            "completion_pct": 100.0,
        },
        old_value=old_status,
        new_value="SUBMITTED",
    )
    db.commit()
    release_lock(inspection_id)

    return {
        "id": inspection.inspection_id,
        "inspection_no": inspection.inspection_no,
        "status": inspection.status,
        "current_step": inspection.current_step,
        "completion_pct": inspection.completion_pct,
        "submitted_at": inspection.submitted_at.isoformat() if inspection.submitted_at else None,
    }
