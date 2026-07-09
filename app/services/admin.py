from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import AuditLog, ChecklistHeader, ChecklistItem, Inspection, Photo, QrData, Role, UserAccess
from app.services.audit import write_audit_log


def create_user(
    db: Session,
    employee_id: str,
    full_name: str,
    password: str,
    role_name: str,
    admin_user_id: int,
) -> UserAccess:
    if db.scalar(select(UserAccess).where(UserAccess.employee_id == employee_id)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists"
        )

    role = db.scalar(
        select(Role).where(Role.role_name == role_name.upper())
    )
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    user = UserAccess(
        employee_id=employee_id,
        full_name=full_name,
        password_hash=hash_password(password),
        role_id=role.role_id,
        is_active=True,
    )
    db.add(user)
    db.flush()

    write_audit_log(
        db, "USER_CREATE", "USER", str(user.useraccess_id),
        admin_user_id,
        {"employee_id": employee_id, "role": role.role_name},
    )
    db.commit()
    db.refresh(user)
    return user


def reset_password(
    db: Session, user_id: int, new_password: str, admin_user_id: int
) -> None:
    user = db.scalar(select(UserAccess).where(UserAccess.useraccess_id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.password_hash = hash_password(new_password)
    write_audit_log(
        db, "PASSWORD_RESET", "USER", str(user.useraccess_id), admin_user_id
    )
    db.commit()


def list_audits(db: Session, limit: int = 200) -> list[AuditLog]:
    return list(
        db.scalars(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
    )


def list_users(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            UserAccess.useraccess_id,
            UserAccess.employee_id,
            UserAccess.full_name,
            Role.role_name.label("role"),
            UserAccess.is_active,
            UserAccess.last_login,
            UserAccess.created_at,
        )
        .join(Role, Role.role_id == UserAccess.role_id)
        .order_by(UserAccess.employee_id)
    ).all()
    return [dict(row._mapping) for row in rows]


def toggle_user_active(
    db: Session, user_id: int, admin_user_id: int
) -> UserAccess:
    user = db.scalar(select(UserAccess).where(UserAccess.useraccess_id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    old_value = "ACTIVE" if user.is_active else "INACTIVE"
    user.is_active = not user.is_active
    new_value = "ACTIVE" if user.is_active else "INACTIVE"

    write_audit_log(
        db, "USER_TOGGLE_ACTIVE", "USER", str(user.useraccess_id),
        admin_user_id,
        old_value=old_value, new_value=new_value,
    )
    db.commit()
    db.refresh(user)
    return user


def create_checklist_header(
    db: Session,
    name: str,
    description: str | None,
    items: list[dict],
    created_by: int,
) -> ChecklistHeader:
    from datetime import date
    header = ChecklistHeader(
        checklist_name=name,
        description=description,
        is_active=True,
        version=1,
        effective_from=date.today(),
    )
    db.add(header)
    db.flush()

    for i, item_data in enumerate(items, start=1):
        db.add(ChecklistItem(
            checklist_header_id=header.checklist_header_id,
            item_code=item_data.get("item_code", f"ITEM-{i}"),
            prompt=item_data.get("prompt", ""),
            sequence_no=item_data.get("sequence_no", i),
            requires_photo=item_data.get("requires_photo", False),
            is_active=True,
        ))

    write_audit_log(
        db, "CHECKLIST_CREATE", "CHECKLIST_HEADER", str(header.checklist_header_id),
        created_by, {"name": name, "items_count": len(items)},
    )
    db.commit()
    db.refresh(header)
    return header


def list_checklist_headers(db: Session) -> list[ChecklistHeader]:
    return list(
        db.scalars(
            select(ChecklistHeader)
            .order_by(ChecklistHeader.created_at.desc())
        )
    )


def toggle_checklist_active(
    db: Session, header_id: int, user_id: int
) -> ChecklistHeader:
    header = db.scalar(
        select(ChecklistHeader).where(ChecklistHeader.checklist_header_id == header_id)
    )
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Checklist header not found"
        )
    header.is_active = not header.is_active
    write_audit_log(
        db, "CHECKLIST_TOGGLE_ACTIVE", "CHECKLIST_HEADER", str(header_id),
        user_id, {"is_active": header.is_active},
    )
    db.commit()
    db.refresh(header)
    return header


def get_admin_dashboard(db: Session) -> dict:
    total_users = db.scalar(select(func.count(UserAccess.useraccess_id))) or 0
    operators = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role)
        .where(Role.role_name == "OPERATOR")
    ) or 0
    managers = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role)
        .where(Role.role_name == "MANAGER")
    ) or 0
    admins = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role)
        .where(Role.role_name == "ADMIN")
    ) or 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total_today = db.scalar(
        select(func.count(Inspection.inspection_id)).where(Inspection.created_at >= today_start)
    ) or 0
    pending_approvals = db.scalar(
        select(func.count(Inspection.inspection_id)).where(Inspection.status == "SUBMITTED")
    ) or 0
    total_photos = db.scalar(select(func.count(Photo.photo_id))) or 0

    return {
        "total_users": total_users,
        "operators": operators,
        "managers": managers,
        "admins": admins,
        "total_today": total_today,
        "pending_approvals": pending_approvals,
        "total_photos": total_photos,
        "oracle_storage_bytes": 0,
    }


def get_recent_activity(db: Session, limit: int = 20) -> list[dict]:
    logs = db.execute(
        select(
            AuditLog.audit_log_id,
            AuditLog.action,
            AuditLog.entity_name,
            AuditLog.entity_id,
            AuditLog.created_at,
            UserAccess.full_name,
            UserAccess.employee_id,
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
            "user_name": row.full_name or row.employee_id or "",
            "employee_id": row.employee_id or "",
            "timestamp": row.created_at.isoformat() if hasattr(row.created_at, 'isoformat') else str(row.created_at),
        }
        for row in logs
    ]


def get_latest_users(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(
        select(
            UserAccess.useraccess_id,
            UserAccess.employee_id,
            UserAccess.full_name,
            Role.role_name.label("role"),
            UserAccess.is_active,
            UserAccess.created_at,
        )
        .join(Role, Role.role_id == UserAccess.role_id)
        .order_by(UserAccess.created_at.desc())
        .limit(limit)
    ).all()
    return [dict(row._mapping) for row in rows]


def get_latest_logins(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(
        select(
            UserAccess.useraccess_id,
            UserAccess.employee_id,
            UserAccess.full_name,
            UserAccess.last_login,
        )
        .where(UserAccess.last_login.isnot(None))
        .order_by(UserAccess.last_login.desc())
        .limit(limit)
    ).all()
    return [dict(row._mapping) for row in rows]


def get_latest_audits(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(
        select(
            AuditLog.audit_log_id,
            AuditLog.action,
            AuditLog.entity_name,
            AuditLog.entity_id,
            AuditLog.created_at,
            UserAccess.employee_id,
        )
        .outerjoin(UserAccess, UserAccess.useraccess_id == AuditLog.useraccess_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()
    return [dict(row._mapping) for row in rows]


def get_system_health(db: Session) -> dict:
    total_inspections = db.scalar(select(func.count(Inspection.inspection_id))) or 0
    total_photos = db.scalar(select(func.count(Photo.photo_id))) or 0
    pending_inspections = db.scalar(
        select(func.count(Inspection.inspection_id)).where(Inspection.status == "SUBMITTED")
    ) or 0
    total_users = db.scalar(select(func.count(UserAccess.useraccess_id))) or 0
    operators = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role)
        .where(Role.role_name == "OPERATOR")
    ) or 0
    managers = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role)
        .where(Role.role_name == "MANAGER")
    ) or 0
    admins = db.scalar(
        select(func.count(UserAccess.useraccess_id))
        .join(Role)
        .where(Role.role_name == "ADMIN")
    ) or 0

    active_header = db.scalar(
        select(ChecklistHeader).where(ChecklistHeader.is_active == True).limit(1)
    )

    from app.core.config import settings
    return {
        "oracle_status": True,
        "api_status": True,
        "total_inspections": total_inspections,
        "total_photos": total_photos,
        "pending_inspections": pending_inspections,
        "oracle_storage_bytes": 0,
        "active_checklist_version": str(active_header.version) if active_header else "—",
        "api_version": "1.0.0",
        "total_users": total_users,
        "operators": operators,
        "managers": managers,
        "admins": admins,
    }


def get_inspection_trend(db: Session, days: int = 14) -> list[dict]:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    results = []
    for i in range(days - 1, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = db.scalar(
            select(func.count(Inspection.inspection_id)).where(
                Inspection.created_at >= day,
                Inspection.created_at < next_day,
            )
        ) or 0
        results.append({"date": day.strftime("%m/%d"), "count": count})
    return results


def get_inspection_status_breakdown(db: Session) -> list[dict]:
    statuses = ["SUBMITTED", "APPROVED", "REJECTED", "IN_PROGRESS"]
    results = []
    for status in statuses:
        count = db.scalar(
            select(func.count(Inspection.inspection_id)).where(Inspection.status == status)
        ) or 0
        if count > 0:
            results.append({"status": status, "count": count})
    if not results:
        results.append({"status": "No data", "count": 1})
    return results


def get_vendor_distribution(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(
        select(
            QrData.vendor_code,
            func.count(QrData.qr_data_id).label("count"),
        )
        .group_by(QrData.vendor_code)
        .order_by(func.count(QrData.qr_data_id).desc())
        .limit(limit)
    ).all()
    return [{"label": row.vendor_code or "Unknown", "count": row.count} for row in rows]


def get_operator_performance(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(
        select(
            UserAccess.employee_id,
            func.count(Inspection.inspection_id).label("total"),
            func.sum(
                case((Inspection.status == "APPROVED", 1), else_=0)
            ).label("approved"),
        )
        .join(Inspection, Inspection.operator_id == UserAccess.useraccess_id)
        .group_by(UserAccess.employee_id)
        .order_by(func.count(Inspection.inspection_id).desc())
        .limit(limit)
    ).all()
    return [
        {
            "employee_id": row.employee_id,
            "total": row.total,
            "approved": row.approved or 0,
        }
        for row in rows
    ]