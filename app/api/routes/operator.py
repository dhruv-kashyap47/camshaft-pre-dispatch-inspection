from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, require_role
from app.models import Inspection, InspectionResponse, Photo
from app.schemas.common import MessageResponse
from app.schemas.inspection import (
    AttendanceRequest,
    InspectionStartRequest,
    InspectionSummary,
    PhotoMetadataRequest,
    QRScanRequest,
    SubmitInspectionRequest,
)
from app.services.audit import write_audit_log
from app.services.inspection import (
    checklist_for_machine,
    get_machine_by_qr,
    mark_attendance,
    save_photo_metadata,
    start_inspection,
    submit_inspection,
)

router = APIRouter()


@router.post("/attendance", response_model=InspectionSummary)
def attendance(payload: AttendanceRequest, db: DBSession, user=Depends(require_role("OPERATOR"))):
    return mark_attendance(db, payload.inspection_no, user)


@router.post("/scan")
def scan_machine(payload: QRScanRequest, db: DBSession, user=Depends(require_role("OPERATOR"))):
    machine = get_machine_by_qr(db, payload.qr_code)
    write_audit_log(db, "QR_SCAN", "MACHINE", machine.machine_code, user.id)
    db.commit()
    return {"machine_code": machine.machine_code, "machine_name": machine.machine_name, "status": machine.status}


@router.get("/checklist")
def get_checklist(db: DBSession, user=Depends(require_role("OPERATOR"))):
    return checklist_for_machine(db)


@router.post("/start", response_model=InspectionSummary)
def start(payload: InspectionStartRequest, db: DBSession, user=Depends(require_role("OPERATOR"))):
    return start_inspection(db, payload.machine_code, user)


@router.post("/photo")
def register_photo(payload: PhotoMetadataRequest, db: DBSession, user=Depends(require_role("OPERATOR"))):
    return save_photo_metadata(db, payload.inspection_id, payload.checklist_item_id, payload.file_name, user)


@router.post("/submit", response_model=InspectionSummary)
def submit(payload: SubmitInspectionRequest, db: DBSession, user=Depends(require_role("OPERATOR"))):
    return submit_inspection(db, payload.inspection_id, payload.answers, user)


@router.get("/inspections/{inspection_id}", response_model=InspectionSummary)
def get_inspection(inspection_id: int, db: DBSession, user=Depends(require_role("OPERATOR"))):
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


@router.get("/inspections/{inspection_id}/detail")
def get_inspection_detail(inspection_id: int, db: DBSession, user=Depends(require_role("OPERATOR"))):
    inspection = db.scalar(select(Inspection).where(Inspection.id == inspection_id))
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    responses = db.scalars(
        select(InspectionResponse).where(InspectionResponse.inspection_id == inspection_id)
    ).all()
    photos = db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all()
    return {
        "inspection": inspection,
        "responses": responses,
        "photos": photos,
    }


@router.post("/logout", response_model=MessageResponse)
def logout(db: DBSession, user=Depends(require_role("OPERATOR"))):
    write_audit_log(db, "LOGOUT", "USER", str(user.id), user.id)
    db.commit()
    return MessageResponse(message="Logged out successfully")
