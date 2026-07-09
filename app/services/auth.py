from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models import Role, UserAccess
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.audit import write_audit_log


def login(db: Session, payload: LoginRequest) -> TokenResponse:
    user = db.scalar(
        select(UserAccess).where(UserAccess.employee_id == payload.employee_id).limit(1)
    )
    if not user or not user.is_active:
        write_audit_log(
            db, "LOGIN_FAILED", "USER", payload.employee_id,
            details={"reason": "user_not_found_or_inactive"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if not verify_password(payload.password, user.password_hash):
        write_audit_log(
            db, "LOGIN_FAILED", "USER", payload.employee_id,
            details={"reason": "wrong_password"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    role = db.scalar(select(Role).where(Role.role_id == user.role_id))
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role misconfigured",
        )

    token = create_access_token(str(user.useraccess_id), role.role_name)

    write_audit_log(
        db, "LOGIN", "USER", str(user.useraccess_id),
        user.useraccess_id,
        {"role": role.role_name},
    )
    db.commit()

    role_permissions = {
        "OPERATOR": ["view_inspections", "create_inspection", "submit_inspection"],
        "MANAGER": ["view_inspections", "approve_inspection", "reject_inspection", "view_dashboard", "view_reports"],
        "ADMIN": ["manage_users", "manage_roles", "manage_checklists", "view_audit", "view_reports", "view_health"],
    }

    return TokenResponse(
        access_token=token,
        role=role.role_name,
        employee_id=user.employee_id,
        display_name=user.full_name,
        active_mode=role.role_name,
        permissions=role_permissions.get(role.role_name, []),
        user={
            "useraccess_id": user.useraccess_id,
            "employee_id": user.employee_id,
            "full_name": user.full_name,
            "role": role.role_name,
        },
    )