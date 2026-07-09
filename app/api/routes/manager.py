from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps import DBSession, require_role
from app.models import CamName, ChecklistHeader, Inspection, InspectionResponse, Override, Photo
from app.schemas.common import MessageResponse
from pydantic import BaseModel, Field
from app.schemas.inspection import (
    ApproveInspectionRequest,
    InspectionSummary,
    OverrideRequest,
    RejectInspectionRequest,
)
from app.schemas.manager import (
    ManagerDashboardResponse,
    ModeSwitchRequest,
    RecentActivityItem,
)
from app.services.admin import (
    create_checklist_header,
    list_checklist_headers,
    toggle_checklist_active,
)
from app.services.audit import write_audit_log
from app.services.manager import (
    approve_inspection,
    get_manager_dashboard,
    get_recent_activity,
    list_pending_inspections,
    override_response,
    reject_inspection,
)

router = APIRouter()


@router.get("/pending", response_model=list[InspectionSummary])
def pending(
    db: DBSession, user=Depends(require_role("MANAGER"))
):
    return list_pending_inspections(db)


@router.get("/inspections/{inspection_id}")
def inspection_detail(
    inspection_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    responses = db.scalars(
        select(InspectionResponse).where(
            InspectionResponse.inspection_id == inspection_id
        )
    ).all()
    photos = db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all()
    overrides = db.scalars(
        select(Override).where(Override.inspection_id == inspection_id)
    ).all()
    cam = db.scalar(
        select(CamName).where(CamName.cam_name_id == inspection.cam_name_id)
    )
    return {
        "inspection": {
            "id": inspection.inspection_id,
            "inspection_no": inspection.inspection_no,
            "status": inspection.status,
            "current_step": inspection.current_step,
            "completion_pct": inspection.completion_pct,
            "started_at": inspection.started_at.isoformat() if inspection.started_at else None,
            "submitted_at": inspection.submitted_at.isoformat() if inspection.submitted_at else None,
            "approved_at": inspection.approved_at.isoformat() if inspection.approved_at else None,
        },
        "machine": {
            "code": cam.cam_code if cam else None,
            "name": cam.cam_name if cam else None,
        },
        "responses": [
            {
                "id": r.inspection_response_id,
                "checklist_item_id": r.checklist_item_id,
                "result": r.result,
                "remarks": r.remarks,
            }
            for r in responses
        ],
        "photos": [
            {
                "id": p.photo_id,
                "file_name": p.file_name,
                "created_at": str(p.created_at),
            }
            for p in photos
        ],
        "overrides": [
            {
                "id": o.override_id,
                "checklist_item_id": o.checklist_item_id,
                "original_result": o.original_result,
                "override_result": o.override_result,
                "reason": o.reason,
            }
            for o in overrides
        ],
    }


@router.post("/override")
def override(
    payload: OverrideRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return override_response(
        db,
        payload.inspection_id,
        payload.checklist_item_id,
        payload.override_result,
        payload.reason,
        user,
    )


@router.post("/approve")
def approve(
    payload: ApproveInspectionRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return approve_inspection(
        db, payload.inspection_id, user, payload.approval_note
    )


@router.post("/reject")
def reject(
    payload: RejectInspectionRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return reject_inspection(db, payload.inspection_id, user, payload.reason)


@router.get("/dashboard", response_model=ManagerDashboardResponse)
def dashboard(
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return get_manager_dashboard(db)


@router.get("/recent-activity", response_model=list[RecentActivityItem])
def recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    db: DBSession = None,
    user=Depends(require_role("MANAGER")),
):
    return get_recent_activity(db, limit)


@router.post("/mode-switch", response_model=MessageResponse)
def mode_switch(
    payload: ModeSwitchRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    write_audit_log(
        db,
        "MODE_SWITCH",
        "USERACCESS",
        str(user.useraccess_id),
        user.useraccess_id,
        {"switched_to": payload.mode},
    )
    db.commit()
    return MessageResponse(message=f"Mode switched to {payload.mode}")


class ManagerChecklistCreateItem(BaseModel):
    item_code: str = Field(min_length=1, max_length=30)
    prompt: str = Field(min_length=1, max_length=250)
    sequence_no: int = Field(gt=0)
    requires_photo: bool = False


class ManagerChecklistCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    items: list[ManagerChecklistCreateItem] = Field(default_factory=list)


class ManagerChecklistItemUpdateRequest(BaseModel):
    item_code: str | None = Field(default=None, min_length=1, max_length=30)
    prompt: str | None = Field(default=None, min_length=1, max_length=250)
    sequence_no: int | None = Field(default=None, gt=0)
    requires_photo: bool | None = Field(default=None)
    is_active: bool | None = Field(default=None)


@router.get("/checklists")
def get_checklists(
    db: DBSession, user=Depends(require_role("MANAGER"))
):
    return list_checklist_headers(db)


@router.post("/checklists")
def create_checklist_endpoint(
    payload: ManagerChecklistCreateRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    return create_checklist_header(db, payload.name, payload.description, [i.model_dump() for i in payload.items], user.useraccess_id)


@router.post("/checklists/{header_id}/toggle-active", response_model=MessageResponse)
def toggle_checklist(
    header_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    toggle_checklist_active(db, header_id, user.useraccess_id)
    return MessageResponse(message="Checklist active status toggled")


@router.get("/checklists/{header_id}/items")
def get_checklist_items(
    header_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    from sqlalchemy import select
    from app.models import ChecklistItem
    items = db.scalars(
        select(ChecklistItem).where(ChecklistItem.checklist_header_id == header_id).order_by(ChecklistItem.sequence_no)
    ).all()
    return [
        {
            "id": i.checklist_item_id,
            "item_code": i.item_code,
            "prompt": i.prompt,
            "sequence_no": i.sequence_no,
            "requires_photo": i.requires_photo,
            "is_active": i.is_active,
        }
        for i in items
    ]


@router.put("/checklists/items/{item_id}", response_model=MessageResponse)
def update_checklist_item(
    item_id: int,
    payload: ManagerChecklistItemUpdateRequest,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    from app.models import ChecklistItem
    from fastapi import HTTPException
    item = db.scalar(select(ChecklistItem).where(ChecklistItem.checklist_item_id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    changes = {}
    if payload.item_code is not None:
        changes["item_code"] = {"old": item.item_code, "new": payload.item_code}
        item.item_code = payload.item_code
    if payload.prompt is not None:
        changes["prompt"] = {"old": item.prompt, "new": payload.prompt}
        item.prompt = payload.prompt
    if payload.sequence_no is not None:
        changes["sequence_no"] = {"old": item.sequence_no, "new": payload.sequence_no}
        item.sequence_no = payload.sequence_no
    if payload.requires_photo is not None:
        changes["requires_photo"] = {"old": item.requires_photo, "new": payload.requires_photo}
        item.requires_photo = payload.requires_photo
    if payload.is_active is not None:
        changes["is_active"] = {"old": item.is_active, "new": payload.is_active}
        item.is_active = payload.is_active

    if changes:
        write_audit_log(
            db, "CHECKLIST_ITEM_UPDATE", "CHECKLIST_ITEM", str(item_id),
            user.useraccess_id, details=changes,
        )
        db.commit()
        from app.services.admin import list_checklist_headers
        return MessageResponse(message="Checklist item updated")
    return MessageResponse(message="No changes made")


@router.delete("/checklists/items/{item_id}", response_model=MessageResponse)
def delete_checklist_item(
    item_id: int,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    from app.models import ChecklistItem
    from fastapi import HTTPException
    item = db.scalar(select(ChecklistItem).where(ChecklistItem.checklist_item_id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    db.delete(item)
    write_audit_log(
        db, "CHECKLIST_ITEM_DELETE", "CHECKLIST_ITEM", str(item_id),
        user.useraccess_id, {"item_code": item.item_code},
    )
    db.commit()
    return MessageResponse(message="Checklist item deleted")


@router.post("/checklists/{header_id}/items", response_model=MessageResponse)
def add_checklist_item(
    header_id: int,
    payload: ManagerChecklistCreateItem,
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    from app.models import ChecklistItem
    from datetime import datetime, timezone
    from fastapi import HTTPException
    from sqlalchemy import func

    header = db.scalar(select(ChecklistHeader).where(ChecklistHeader.checklist_header_id == header_id))
    if not header:
        raise HTTPException(status_code=404, detail="Checklist header not found")

    max_seq = db.scalar(
        select(func.max(ChecklistItem.sequence_no)).where(
            ChecklistItem.checklist_header_id == header_id
        )
    ) or 0

    item = ChecklistItem(
        checklist_header_id=header_id,
        item_code=payload.item_code,
        prompt=payload.prompt,
        sequence_no=payload.sequence_no or max_seq + 1,
        requires_photo=payload.requires_photo,
        is_active=True,
    )
    db.add(item)
    db.flush()
    write_audit_log(
        db, "CHECKLIST_ITEM_CREATE", "CHECKLIST_ITEM", str(item.checklist_item_id),
        user.useraccess_id, {"item_code": item.item_code, "header_id": header_id},
    )
    db.commit()
    return MessageResponse(message="Checklist item added")


@router.put("/checklists/{header_id}/reorder", response_model=MessageResponse)
def reorder_checklist_items(
    header_id: int,
    payload: list[dict],
    db: DBSession,
    user=Depends(require_role("MANAGER")),
):
    from app.models import ChecklistItem
    from fastapi import HTTPException

    for entry in payload:
        item_id = entry.get("id")
        seq = entry.get("sequence_no")
        if not item_id or not seq:
            continue
        item = db.scalar(
            select(ChecklistItem).where(
                ChecklistItem.checklist_item_id == item_id,
                ChecklistItem.checklist_header_id == header_id,
            )
        )
        if item:
            item.sequence_no = seq
    write_audit_log(
        db, "CHECKLIST_REORDER", "CHECKLIST_HEADER", str(header_id),
        user.useraccess_id, {"reordered": True},
    )
    db.commit()
    return MessageResponse(message="Checklist reordered")
