from fastapi import APIRouter, Depends, Query

from app.api.deps import DBSession, require_role
from app.schemas.admin import AuditLogResponse, PasswordResetRequest, UserCreateRequest
from app.schemas.common import MessageResponse
from app.services.admin import (
    create_user,
    get_admin_dashboard,
    get_inspection_status_breakdown,
    get_inspection_trend,
    get_latest_audits,
    get_latest_logins,
    get_latest_users,
    get_operator_performance,
    get_recent_activity,
    get_system_health,
    get_vendor_distribution,
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
        db, payload.employee_id, payload.full_name, payload.password, payload.role, user.useraccess_id
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_endpoint(
    payload: PasswordResetRequest,
    db: DBSession,
    user=Depends(require_role("ADMIN")),
):
    reset_password(db, payload.user_id, payload.new_password, user.useraccess_id)
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
    toggle_user_active(db, user_id, user.useraccess_id)
    return MessageResponse(message="User active status toggled")


@router.get("/audits", response_model=list[AuditLogResponse])
def audits(
    db: DBSession, user=Depends(require_role("ADMIN"))
):
    return list_audits(db)


@router.get("/dashboard")
def admin_dashboard(
    db: DBSession, user=Depends(require_role("ADMIN"))
):
    return get_admin_dashboard(db)


@router.get("/recent-activity")
def admin_recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_recent_activity(db, limit)


@router.get("/latest-users")
def admin_latest_users(
    limit: int = Query(default=10, ge=1, le=50),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_latest_users(db, limit)


@router.get("/latest-logins")
def admin_latest_logins(
    limit: int = Query(default=10, ge=1, le=50),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_latest_logins(db, limit)


@router.get("/latest-audits")
def admin_latest_audits(
    limit: int = Query(default=10, ge=1, le=50),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_latest_audits(db, limit)


@router.get("/system-health")
def admin_system_health(
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_system_health(db)


@router.get("/dashboard/inspection-trend")
def admin_inspection_trend(
    days: int = Query(default=14, ge=1, le=90),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_inspection_trend(db, days)


@router.get("/dashboard/inspection-status-breakdown")
def admin_inspection_status_breakdown(
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_inspection_status_breakdown(db)


@router.get("/dashboard/vendor-distribution")
def admin_vendor_distribution(
    limit: int = Query(default=10, ge=1, le=50),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_vendor_distribution(db, limit)


@router.get("/dashboard/operator-performance")
def admin_operator_performance(
    limit: int = Query(default=10, ge=1, le=50),
    db: DBSession = None,
    user=Depends(require_role("ADMIN")),
):
    return get_operator_performance(db, limit)
