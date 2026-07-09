from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import (
    ChecklistItem,
    Inspection,
    InspectionResponse,
    Photo,
)


class ValidationError:
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message

    def to_dict(self) -> dict:
        return {"field": self.field, "message": self.message}


def validate_inspection_for_submit(
    db: Session, inspection_id: int
) -> list[dict]:
    errors: list[ValidationError] = []

    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        return [{"field": "inspection_id", "message": "Inspection not found"}]

    if inspection.status != "IN_PROGRESS":
        return [{
            "field": "status",
            "message": f"Inspection is {inspection.status}, not IN_PROGRESS",
        }]

    checklist_items = list(
        db.scalars(
            select(ChecklistItem)
            .where(
                ChecklistItem.checklist_header_id == inspection.checklist_header_id,
                ChecklistItem.is_active == True,
            )
            .order_by(ChecklistItem.sequence_no)
        )
    )

    if not checklist_items:
        return [{"field": "checklist", "message": "No active checklist items found"}]

    existing_responses = {
        r.checklist_item_id: r
        for r in db.scalars(
            select(InspectionResponse).where(
                InspectionResponse.inspection_id == inspection_id
            )
        ).all()
    }

    photos_by_item: dict[int, list[Photo]] = {}
    for photo in db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all():
        cid = photo.checklist_item_id or 0
        if cid not in photos_by_item:
            photos_by_item[cid] = []
        photos_by_item[cid].append(photo)

    for item in checklist_items:
        response = existing_responses.get(item.checklist_item_id)

        if not response:
            errors.append(ValidationError(
                field=f"item_{item.sequence_no}",
                message=f"Checklist item '{item.item_code}' (step {item.sequence_no}) has no response",
            ))
            continue

        if response.result in ("NOT_OK",) and not response.remarks:
            errors.append(ValidationError(
                field=f"remarks_{item.sequence_no}",
                message=f"Checklist item '{item.item_code}' requires a remark for NOT_OK result",
            ))

        if item.requires_photo:
            item_photos = photos_by_item.get(item.checklist_item_id, [])
            if not item_photos:
                errors.append(ValidationError(
                    field=f"photo_{item.sequence_no}",
                    message=f"Checklist item '{item.item_code}' requires at least one photo",
                ))

    answered_count = len(existing_responses)
    total_count = len(checklist_items)
    actual_pct = round((answered_count / total_count) * 100, 2) if total_count > 0 else 0

    if actual_pct < 100:
        missing = total_count - answered_count
        errors.append(ValidationError(
            field="completion",
            message=f"Inspection is {actual_pct}% complete. {missing} item(s) still need answers.",
        ))

    return [e.to_dict() for e in errors]
