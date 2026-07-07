from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, require_role
from app.models import Inspection, InspectionResponse, Override, Photo
from app.schemas.inspection import (
    ApproveInspectionRequest,
    InspectionSummary,
    OverrideRequest,
    RejectInspectionRequest,
)
from app.services.manager import (
    approve_inspection,
    list_pending_inspections,
    override_response,
    reject_inspection,
)

router = APIRouter()


@router.get("/pending", response_model=list[InspectionSummary])
def pending(
    db: DBSession, user=Depends(require_role("MANAGER"))
):
    return list_pending_inspections(db)


@router.get("/inspections/{inspection_id}")
def inspection_detail(
    inspection_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
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
    overrides = db.scalars(
        select(Override).where(Override.inspection_id == inspection_id)
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
                "lan_path": p.lan_path,
                "uploaded_at": str(p.uploaded_at),
            }
            for p in photos
        ],
        "overrides": [
            {
                "id": o.override_id,
                "checklist_item_id": o.checklist_item_id,
                "original_result": o.original_result,
                "override_result": o.override_result,
                "reason": o.reason,
            }
            for o in overrides
        ],
    }


@router.post("/override")
def override(
    payload: OverrideRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return override_response(
        db,
        payload.inspection_id,
        payload.checklist_item_id,
        payload.override_result,
        payload.reason,
        user,
    )


@router.post("/approve")
def approve(
    payload: ApproveInspectionRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return approve_inspection(
        db, payload.inspection_id, user, payload.approval_note
    )


@router.post("/reject")
def reject(
    payload: RejectInspectionRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return reject_inspection(db, payload.inspection_id, user, payload.reason)
