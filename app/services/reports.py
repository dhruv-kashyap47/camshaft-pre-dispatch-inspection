from datetime import date

from sqlalchemy import case as sa_case, func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, CamName, Inspection, UserAccess
from app.schemas.report import ReportRow


def inspection_status_report(db: Session) -> list[ReportRow]:
    rows = db.execute(
        select(Inspection.status, func.count(Inspection.inspection_id)).group_by(
            Inspection.status
        )
    ).all()
    return [ReportRow(label=status, value=count) for status, count in rows]


def daily_inspection_summary(
    db: Session, report_date: date | None = None
) -> list[dict]:
    target = report_date or date.today()
    rows = db.execute(
        select(
            Inspection.status,
            func.count(Inspection.inspection_id).label("count"),
        )
        .where(func.date(Inspection.started_at) == target)
        .group_by(Inspection.status)
    ).all()
    return [{"status": row.status, "count": row.count} for row in rows]


def machine_summary(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            CamName.cam_code,
            CamName.cam_name,
            func.count(Inspection.inspection_id).label("total_inspections"),
            func.sum(
                sa_case((Inspection.status == "APPROVED", 1), else_=0)
            ).label("approved"),
        )
        .outerjoin(
            Inspection, Inspection.cam_name_id == CamName.cam_name_id
        )
        .group_by(
            CamName.cam_name_id, CamName.cam_code, CamName.cam_name
        )
    ).all()
    return [dict(row._mapping) for row in rows]


def audit_trail_report(db: Session, limit: int = 500) -> list[dict]:
    rows = db.execute(
        select(
            AuditLog.created_at,
            AuditLog.action,
            AuditLog.entity_name,
            AuditLog.entity_id,
            AuditLog.old_value,
            AuditLog.new_value,
            UserAccess.employee_id,
            UserAccess.full_name,
        )
        .outerjoin(UserAccess, UserAccess.useraccess_id == AuditLog.useraccess_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()
    return [dict(row._mapping) for row in rows]