import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AuditLog, Inspection, InspectionResponse, Override, Role, UserAccess
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
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
    return inspection


def override_response(
    db: Session,
    inspection_id: int,
    checklist_item_id: int,
    override_result: str,
    reason: str,
    manager: UserAccess,
) -> Override:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
    if inspection.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Overrides are only allowed on submitted inspections",
        )
    if inspection.submitted_at and inspection.submitted_at < datetime.now(
        timezone.utc
    ) - timedelta(hours=settings.default_manager_override_window_hours):
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection response not found",
        )

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
        manager_id=manager.useraccess_id,
        checklist_item_id=checklist_item_id,
        original_result=response.result,
        override_result=override_result,
        reason=reason,
    )
    response.result = override_result
    db.add(row)
    db.flush()
    write_audit_log(
        db,
        "OVERRIDE",
        "INSPECTION",
        inspection.inspection_no,
        manager.useraccess_id,
        {
            "checklist_item_id": checklist_item_id,
            "original": row.original_result,
            "override": override_result,
            "reason": reason,
        },
    )
    db.commit()
    db.refresh(row)
    return row


def approve_inspection(
    db: Session,
    inspection_id: int,
    manager: UserAccess,
    approval_note: str | None,
) -> Inspection:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
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
        db,
        "APPROVAL",
        "INSPECTION",
        inspection.inspection_no,
        manager.useraccess_id,
        {"approval_note": approval_note},
        old_value=old_status,
        new_value=inspection.status,
    )
    db.commit()
    db.refresh(inspection)
    return inspection


def reject_inspection(
    db: Session,
    inspection_id: int,
    manager: UserAccess,
    reason: str,
) -> Inspection:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found"
        )
    if inspection.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reject inspection in status '{inspection.status}'",
        )

    old_status = inspection.status
    inspection.status = "REJECTED"
    inspection.approval_note = reason
    write_audit_log(
        db,
        "REJECTION",
        "INSPECTION",
        inspection.inspection_no,
        manager.useraccess_id,
        {"reason": reason},
        old_value=old_status,
        new_value=inspection.status,
    )
    db.commit()
    db.refresh(inspection)
    return inspection


def get_manager_dashboard(db: Session) -> dict:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    pending_approvals = db.scalar(
        select(func.count(Inspection.inspection_id)).where(
            Inspection.status == "SUBMITTED"
        )
    ) or 0

    approved_today = db.scalar(
        select(func.count(Inspection.inspection_id)).where(
            Inspection.approved_at >= today_start
        )
    ) or 0

    rejected_today = db.scalar(
        select(func.count(Inspection.inspection_id)).where(
            Inspection.status == "REJECTED",
            Inspection.updated_at >= today_start,
        )
    ) or 0

    in_progress = db.scalar(
        select(func.count(Inspection.inspection_id)).where(
            Inspection.status == "IN_PROGRESS"
        )
    ) or 0

    total_today = db.scalar(
        select(func.count(Inspection.inspection_id)).where(
            Inspection.created_at >= today_start
        )
    ) or 0

    if settings.is_oracle:
        stmt = text("""
            SELECT AVG((CAST(submitted_at AS DATE) - CAST(started_at AS DATE)) * 86400)
            FROM tcl_cam_inspection
            WHERE submitted_at IS NOT NULL
              AND started_at IS NOT NULL
              AND created_at >= :today_start
        """)
        avg_time_result = db.execute(stmt, {"today_start": today_start}).scalar()
    else:
        avg_time_result = db.execute(
            select(
                func.avg(
                    func.strftime("%s", Inspection.submitted_at) -
                    func.strftime("%s", Inspection.started_at)
                )
            ).where(
                Inspection.submitted_at.isnot(None),
                Inspection.started_at.isnot(None),
                Inspection.created_at >= today_start,
            )
        ).scalar()
    avg_inspection_time_minutes = round((avg_time_result or 0) / 60.0, 1)

    active_operators = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role, Role.role_id == UserAccess.role_id)
        .where(Role.role_name == "OPERATOR", UserAccess.is_active == True)
    ) or 0

    return {
        "pending_approvals": pending_approvals,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "in_progress": in_progress,
        "total_today": total_today,
        "avg_inspection_time_minutes": avg_inspection_time_minutes,
        "active_operators": active_operators,
    }


def get_recent_activity(db: Session, limit: int = 20) -> list[dict]:
    logs = db.execute(
        select(
            AuditLog.audit_log_id,
            AuditLog.action,
            AuditLog.entity_name,
            AuditLog.entity_id,
            AuditLog.created_at,
            AuditLog.details,
            UserAccess.full_name,
        )
        .outerjoin(UserAccess, UserAccess.useraccess_id == AuditLog.useraccess_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": row.audit_log_id,
            "action": row.action,
            "entity_name": row.entity_name,
            "entity_id": row.entity_id,
            "user_name": row.full_name,
            "timestamp": row.created_at.isoformat() if hasattr(row.created_at, 'isoformat') else str(row.created_at),
            "details": row.details,
        }
        for row in logs
    ]
