import csv
import io
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import DBSession, require_role
from app.models import CamName, Inspection, InspectionResponse, Override, UserAccess
from app.schemas.export import ExportResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _csv_response(rows: list[list], headers: list[str], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _format_dt(val):
    if val is None:
        return ""
    return val.isoformat() if hasattr(val, "isoformat") else str(val)


@router.post("/inspection/{inspection_id}/summary")
def export_inspection_summary(
    inspection_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER", "ADMIN")),
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    cam = db.scalar(select(CamName).where(CamName.cam_name_id == inspection.cam_name_id))
    operator = db.scalar(select(UserAccess).where(UserAccess.useraccess_id == inspection.operator_id))
    responses = db.scalars(
        select(InspectionResponse).where(InspectionResponse.inspection_id == inspection_id)
    ).all()

    rows = [["Field", "Value"]]
    rows.append(["Inspection No", inspection.inspection_no or ""])
    rows.append(["Status", inspection.status or ""])
    rows.append(["Machine", f"{cam.cam_code} - {cam.cam_name}" if cam else ""])
    rows.append(["Operator", f"{operator.employee_id} - {operator.full_name}" if operator else ""])
    rows.append(["Started", _format_dt(inspection.started_at)])
    rows.append(["Submitted", _format_dt(inspection.submitted_at)])
    rows.append(["Approved", _format_dt(inspection.approved_at)])
    rows.append(["Completion %", str(inspection.completion_pct or 0)])
    rows.append([])
    rows.append(["Item", "Result", "Remarks"])
    for r in responses:
        rows.append([str(r.checklist_item_id), r.result or "", r.remarks or ""])

    filename = f"inspection_{inspection.inspection_no or inspection_id}_summary.csv"
    return _csv_response(rows, ["Field", "Value"], filename)


@router.post("/inspection/{inspection_id}/csv")
def export_inspection_csv(
    inspection_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER", "ADMIN")),
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    cam = db.scalar(select(CamName).where(CamName.cam_name_id == inspection.cam_name_id))
    operator = db.scalar(select(UserAccess).where(UserAccess.useraccess_id == inspection.operator_id))
    responses = db.scalars(
        select(InspectionResponse).where(InspectionResponse.inspection_id == inspection_id)
    ).all()
    overrides = db.scalars(
        select(Override).where(Override.inspection_id == inspection_id)
    ).all()

    rows = []
    for r in responses:
        rows.append([
            inspection.inspection_no or "",
            inspection.status or "",
            cam.cam_code if cam else "",
            cam.cam_name if cam else "",
            operator.employee_id if operator else "",
            operator.full_name if operator else "",
            str(r.checklist_item_id),
            r.result or "",
            r.remarks or "",
            _format_dt(inspection.started_at),
            _format_dt(inspection.submitted_at),
            _format_dt(inspection.approved_at),
        ])

    headers = ["Inspection No", "Status", "Machine Code", "Machine Name",
                "Operator ID", "Operator Name", "Checklist Item", "Result",
                "Remarks", "Started At", "Submitted At", "Approved At"]

    if not rows:
        rows.append([inspection.inspection_no or "", inspection.status or "",
                      cam.cam_code if cam else "", cam.cam_name if cam else "",
                      operator.employee_id if operator else "", operator.full_name if operator else "",
                      "", "", "", _format_dt(inspection.started_at),
                      _format_dt(inspection.submitted_at), _format_dt(inspection.approved_at)])

    return _csv_response(rows, headers, f"inspection_{inspection.inspection_no or inspection_id}.csv")


@router.post("/audits/csv")
def export_audits_csv(
    db: DBSession,
    user=Depends(require_role("ADMIN")),
):
    rows = db.execute(
        select(
            AuditLog.audit_log_id,
            AuditLog.action,
            AuditLog.entity_name,
            AuditLog.entity_id,
            AuditLog.created_at,
            AuditLog.details,
            UserAccess.full_name,
            UserAccess.employee_id,
        )
        .outerjoin(UserAccess, UserAccess.useraccess_id == AuditLog.useraccess_id)
        .order_by(AuditLog.created_at.desc())
    ).all()

    headers = ["ID", "Action", "Entity", "Entity ID", "User", "Employee ID", "Timestamp", "Details"]
    data = [
        [
            row.audit_log_id,
            row.action,
            row.entity_name,
            row.entity_id,
            row.full_name,
            row.employee_id,
            _format_dt(row.created_at),
            row.details,
        ]
        for row in rows
    ]

    return _csv_response(data, headers, "audit_log_export.csv")



