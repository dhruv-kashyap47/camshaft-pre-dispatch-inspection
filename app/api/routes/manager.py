from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, require_role
from app.models import Inspection, InspectionResponse, Override, Photo
from app.schemas.inspection import ApproveInspectionRequest, OverrideRequest, RejectInspectionRequest
from app.services.manager import approve_inspection, list_pending_inspections, override_response, reject_inspection

router = APIRouter()


@router.get("/pending")
def pending(db: DBSession, user=Depends(require_role("MANAGER"))):
    return list_pending_inspections(db)


@router.get("/inspections/{inspection_id}")
def inspection_detail(inspection_id: int, db: DBSession, user=Depends(require_role("MANAGER"))):
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    responses = db.scalars(
        select(InspectionResponse).where(InspectionResponse.inspection_id == inspection_id)
    ).all()
    photos = db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all()
    overrides = db.scalars(
        select(Override).where(Override.inspection_id == inspection_id)
    ).all()
    return {
        "inspection": inspection,
        "responses": responses,
        "photos": photos,
        "overrides": overrides,
    }


@router.post("/override")
def override(payload: OverrideRequest, db: DBSession, user=Depends(require_role("MANAGER"))):
    return override_response(db, payload.inspection_id, payload.checklist_item_id, payload.override_result, payload.reason, user)


@router.post("/approve")
def approve(payload: ApproveInspectionRequest, db: DBSession, user=Depends(require_role("MANAGER"))):
    return approve_inspection(db, payload.inspection_id, user, payload.approval_note)


@router.post("/reject")
def reject(payload: RejectInspectionRequest, db: DBSession, user=Depends(require_role("MANAGER"))):
    return reject_inspection(db, payload.inspection_id, user, payload.reason)
