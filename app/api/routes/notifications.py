import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, get_current_user
from app.models import AuditLog, UserAccess

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/notifications")
def get_notifications(
    db: DBSession,
    current_user: UserAccess = Depends(get_current_user),
):
    recent = db.scalars(
        select(AuditLog)
        .where(AuditLog.useraccess_id == current_user.useraccess_id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    ).all()

    return [
        {
            "id": log.audit_log_id,
            "action": log.action,
            "entity_name": log.entity_name,
            "entity_id": log.entity_id,
            "details": log.details,
            "timestamp": log.created_at.isoformat() if hasattr(log.created_at, 'isoformat') else str(log.created_at),
            "read": log.is_read,
        }
        for log in recent
    ]


@router.post("/notifications/mark-read/{notification_id}")
def mark_notification_read(
    notification_id: int,
    db: DBSession,
    current_user: UserAccess = Depends(get_current_user),
):
    log = db.scalar(
        select(AuditLog).where(
            AuditLog.audit_log_id == notification_id,
            AuditLog.useraccess_id == current_user.useraccess_id,
        )
    )
    if not log:
        raise HTTPException(status_code=404, detail="Notification not found")

    log.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
