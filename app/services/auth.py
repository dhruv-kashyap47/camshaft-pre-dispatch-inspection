from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models import Role, User
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.audit import write_audit_log


def login(db: Session, payload: LoginRequest) -> TokenResponse:
    user = db.scalar(
        select(User).where(User.employee_id == payload.employee_id).limit(1)
    )
    if not user or not user.is_active:
        write_audit_log(
            db,
            "LOGIN_FAILED",
            "USER",
            payload.employee_id,
            details={"reason": "user_not_found_or_inactive"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if not verify_password(payload.password, user.password_hash):
        write_audit_log(
            db,
            "LOGIN_FAILED",
            "USER",
            payload.employee_id,
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

    if role.role_name != payload.role:
        write_audit_log(
            db,
            "LOGIN_DENIED",
            "USER",
            payload.employee_id,
            user.user_id,
            {
                "selected_role": payload.role,
                "actual_role": role.role_name,
            },
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Your role is {role.role_name}, not {payload.role}",
        )

    token = create_access_token(str(user.user_id), role.role_name)
    write_audit_log(
        db,
        "LOGIN",
        "USER",
        str(user.user_id),
        user.user_id,
        {"role": role.role_name},
    )
    db.commit()
    return TokenResponse(
        access_token=token, role=role.role_name, employee_id=user.employee_id
    )
