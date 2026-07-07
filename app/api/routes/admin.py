from fastapi import APIRouter, Depends

from app.api.deps import DBSession, require_role
from app.schemas.admin import AuditLogResponse, PasswordResetRequest, UserCreateRequest
from app.schemas.common import MessageResponse
from app.services.admin import (
    create_user,
    list_audits,
    list_users,
    reset_password,
    toggle_user_active,
)

router = APIRouter()


@router.post("/users")
def create_user_endpoint(
    payload: UserCreateRequest,
    db: DBSession,
    user=Depends(require_role("ADMIN")),
):
    return create_user(
        db, payload.employee_id, payload.full_name, payload.password, payload.role, user.user_id
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_endpoint(
    payload: PasswordResetRequest,
    db: DBSession,
    user=Depends(require_role("ADMIN")),
):
    reset_password(db, payload.user_id, payload.new_password, user.user_id)
    return MessageResponse(message="Password reset complete")


@router.get("/users")
def get_users(
    db: DBSession, user=Depends(require_role("ADMIN"))
):
    return list_users(db)


@router.post("/users/{user_id}/toggle-active", response_model=MessageResponse)
def toggle_active(
    user_id: int,
    db: DBSession,
    user=Depends(require_role("ADMIN")),
):
    toggle_user_active(db, user_id, user.user_id)
    return MessageResponse(message="User active status toggled")


@router.get("/audits", response_model=list[AuditLogResponse])
def audits(
    db: DBSession, user=Depends(require_role("ADMIN"))
):
    return list_audits(db)
