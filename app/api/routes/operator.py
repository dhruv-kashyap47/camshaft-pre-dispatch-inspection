from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, require_role
from app.models import Inspection, InspectionResponse, Photo, UserAccess
from app.schemas.common import MessageResponse
from app.schemas.inspection import (
    ChecklistItemResponse,
    InspectionSummary,
    PhotoMetadataRequest,
    QRScanRequest,
)
from app.services.audit import write_audit_log
from app.services.inspection import checklist_for_machine, save_photo_metadata

router = APIRouter()


@router.get("/checklist", response_model=list[ChecklistItemResponse])
def get_checklist(
    db: DBSession, user=Depends(require_role("OPERATOR"))
):
    return checklist_for_machine(db)


@router.post("/photo")
def register_photo(
    payload: PhotoMetadataRequest,
    db: DBSession,
    user=Depends(require_role("OPERATOR")),
):
    return save_photo_metadata(
        db, payload.inspection_id, payload.checklist_item_id, payload.file_name, user
    )


@router.get("/inspections/{inspection_id}", response_model=InspectionSummary)
def get_inspection(
    inspection_id: int,
    db: DBSession,
    user=Depends(require_role("OPERATOR")),
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


@router.get("/inspections/{inspection_id}/detail")
def get_inspection_detail(
    inspection_id: int,
    db: DBSession,
    user=Depends(require_role("OPERATOR")),
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    responses = db.scalars(
        select(InspectionResponse).where(
            InspectionResponse.inspection_id == inspection_id
        )
    ).all()
    photos = db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all()
    return {
        "inspection": {
            "id": inspection.inspection_id,
            "inspection_no": inspection.inspection_no,
            "status": inspection.status,
            "started_at": inspection.started_at.isoformat() if hasattr(inspection.started_at, "isoformat") else str(inspection.started_at),
            "submitted_at": inspection.submitted_at.isoformat() if inspection.submitted_at and hasattr(inspection.submitted_at, "isoformat") else str(inspection.submitted_at) if inspection.submitted_at else None,
            "approved_at": inspection.approved_at.isoformat() if inspection.approved_at and hasattr(inspection.approved_at, "isoformat") else str(inspection.approved_at) if inspection.approved_at else None,
        },
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
                "file_name": p.file_name,
                "content_type": p.content_type,
                "file_size": p.file_size,
                "created_at": str(p.created_at),
            }
            for p in photos
        ],
    }


@router.post("/logout", response_model=MessageResponse)
def logout(
    db: DBSession, user=Depends(require_role("OPERATOR"))
):
    write_audit_log(
        db, "LOGOUT", "USER", str(user.useraccess_id), user.useraccess_id
    )
    db.commit()
    return MessageResponse(message="Logged out successfully")