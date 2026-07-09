from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import DBSession, get_db, require_role
from app.schemas.common import MessageResponse
from app.services.reports import audit_trail_report, daily_inspection_summary, inspection_status_report, machine_summary

router = APIRouter()


@router.get("/inspection-status")
def inspection_status(db: DBSession, user=Depends(require_role("MANAGER", "ADMIN"))):
    return inspection_status_report(db)


@router.get("/daily-summary")
def daily_summary(
    report_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(require_role("MANAGER", "ADMIN")),
):
    return daily_inspection_summary(db, report_date)


@router.get("/machine-summary")
def machine_report(db: Session = Depends(get_db), _=Depends(require_role("MANAGER", "ADMIN"))):
    return machine_summary(db)


@router.get("/audit-trail")
def audit_trail(db: Session = Depends(get_db), _=Depends(require_role("ADMIN"))):
    return audit_trail_report(db)


@router.get("/export", response_model=MessageResponse)
def export(db: DBSession, _=Depends(require_role("MANAGER", "ADMIN"))):
    return MessageResponse(message="Export endpoint ready")

