from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import AuditLog, Role, User
from app.services.audit import write_audit_log


def create_user(
    db: Session,
    employee_id: str,
    full_name: str,
    password: str,
    role_name: str,
    admin_user_id: int,
) -> User:
    if db.scalar(select(User).where(User.employee_id == employee_id)):
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

    user = User(
        employee_id=employee_id,
        full_name=full_name,
        password_hash=hash_password(password),
        role_id=role.role_id,
        is_active=True,
    )
    db.add(user)
    db.flush()
    write_audit_log(
        db,
        "USER_CREATE",
        "USER",
        str(user.user_id),
        admin_user_id,
        {"employee_id": employee_id, "role": role.role_name},
    )
    db.commit()
    db.refresh(user)
    return user


def reset_password(
    db: Session, user_id: int, new_password: str, admin_user_id: int
) -> None:
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    user.password_hash = hash_password(new_password)
    write_audit_log(
        db, "PASSWORD_RESET", "USER", str(user.user_id), admin_user_id
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
            User.user_id,
            User.employee_id,
            User.full_name,
            Role.role_name.label("role"),
            User.is_active,
        )
        .join(Role, Role.role_id == User.role_id)
        .order_by(User.employee_id)
    ).all()
    return [dict(row._mapping) for row in rows]


def toggle_user_active(
    db: Session, user_id: int, admin_user_id: int
) -> User:
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    old_value = "ACTIVE" if user.is_active else "INACTIVE"
    user.is_active = not user.is_active
    new_value = "ACTIVE" if user.is_active else "INACTIVE"
    write_audit_log(
        db,
        "USER_TOGGLE_ACTIVE",
        "USER",
        str(user.user_id),
        admin_user_id,
        old_value=old_value,
        new_value=new_value,
    )
    db.commit()
    db.refresh(user)
    return user
