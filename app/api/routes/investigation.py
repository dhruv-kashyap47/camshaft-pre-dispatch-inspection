import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import DBSession, get_db, require_role
from app.models import AuditLog, CamName, Inspection, InspectionResponse, Override, Photo, UserAccess

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/search", response_model=list[dict])
def search_inspections(
    inspection_no: str | None = Query(default=None, max_length=40),
    cam_code: str | None = Query(default=None, max_length=30),
    operator_id: int | None = Query(default=None, ge=1),
    status: str | None = Query(
        default=None, pattern=r"^(NOT_STARTED|IN_PROGRESS|SUBMITTED|APPROVED|REJECTED)$"
    ),
    date_from: str | None = Query(default=None, description="YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="YYYY-MM-DD"),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(require_role("MANAGER", "ADMIN")),
):
    query = select(
        Inspection.inspection_id.label("id"),
        Inspection.inspection_no,
        Inspection.status,
        Inspection.started_at,
        Inspection.submitted_at,
        Inspection.approved_at,
        CamName.cam_code,
        CamName.cam_name,
        UserAccess.employee_id,
        UserAccess.full_name,
    ).join(
        CamName, CamName.cam_name_id == Inspection.cam_name_id
    ).join(
        UserAccess, UserAccess.useraccess_id == Inspection.operator_id
    )

    if inspection_no:
        query = query.where(Inspection.inspection_no.like(f"%{inspection_no}%"))
    if cam_code:
        query = query.where(CamName.cam_code.like(f"%{cam_code}%"))
    if operator_id:
        query = query.where(Inspection.operator_id == operator_id)
    if status:
        query = query.where(Inspection.status == status)
    if date_from:
        query = query.where(Inspection.started_at >= date_from)
    if date_to:
        query = query.where(Inspection.started_at <= date_to + "T23:59:59")

    query = query.order_by(Inspection.started_at.desc()).limit(limit)
    rows = db.execute(query).all()
    return [dict(row._mapping) for row in rows]


@router.get("/timeline/{inspection_id}")
def get_timeline(
    inspection_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("MANAGER", "ADMIN", "OPERATOR")),
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    audit_logs = db.scalars(
        select(AuditLog)
        .where(
            or_(
                AuditLog.entity_id == str(inspection_id),
                AuditLog.entity_id == inspection.inspection_no,
            )
        )
        .order_by(AuditLog.created_at)
    ).all()

    return [
        {
            "timestamp": log.created_at.isoformat()
            if hasattr(log.created_at, "isoformat")
            else str(log.created_at),
            "action": log.action,
            "user_name": None,
            "user_role": None,
            "details": log.details,
        }
        for log in audit_logs
    ]


@router.get("/detail/{inspection_id}")
def investigation_detail(
    inspection_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("MANAGER", "ADMIN")),
):
    inspection = db.scalar(
        select(Inspection)
        .join(CamName, CamName.cam_name_id == Inspection.cam_name_id)
        .join(UserAccess, UserAccess.useraccess_id == Inspection.operator_id)
        .where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    cam = db.scalar(select(CamName).where(CamName.cam_name_id == inspection.cam_name_id))
    operator = db.scalar(select(UserAccess).where(UserAccess.useraccess_id == inspection.operator_id))
    responses = db.scalars(
        select(InspectionResponse).where(InspectionResponse.inspection_id == inspection_id)
    ).all()
    photos = db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all()
    overrides = db.scalars(
        select(Override).where(Override.inspection_id == inspection_id)
    ).all()
    audit_logs = db.scalars(
        select(AuditLog)
        .where(
            or_(
                AuditLog.entity_id == str(inspection_id),
                AuditLog.entity_id == inspection.inspection_no,
            )
        )
        .order_by(AuditLog.created_at)
    ).all()

    timeline = [
        {
            "timestamp": log.created_at.isoformat()
            if hasattr(log.created_at, "isoformat")
            else str(log.created_at),
            "action": log.action,
            "user_name": None,
            "user_role": None,
            "details": log.details,
        }
        for log in audit_logs
    ]

    return {
        "inspection": {
            "id": inspection.inspection_id,
            "inspection_no": inspection.inspection_no,
            "status": inspection.status,
            "started_at": inspection.started_at.isoformat()
            if hasattr(inspection.started_at, "isoformat")
            else str(inspection.started_at),
            "submitted_at": inspection.submitted_at.isoformat()
            if inspection.submitted_at and hasattr(inspection.submitted_at, "isoformat")
            else str(inspection.submitted_at) if inspection.submitted_at else None,
            "approved_at": inspection.approved_at.isoformat()
            if inspection.approved_at and hasattr(inspection.approved_at, "isoformat")
            else str(inspection.approved_at) if inspection.approved_at else None,
        },
        "cam": {
            "code": cam.cam_code if cam else None,
            "name": cam.cam_name if cam else None,
        } if cam else None,
        "operator": {
            "employee_id": operator.employee_id if operator else None,
            "name": operator.full_name if operator else None,
        } if operator else None,
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
        "timeline": timeline,
    }