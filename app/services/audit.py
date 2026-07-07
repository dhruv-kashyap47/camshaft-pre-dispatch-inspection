import json

from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit_log(
    db: Session,
    action: str,
    entity_name: str,
    entity_id: str | None = None,
    user_id: int | None = None,
    details: dict | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
) -> None:
    row = AuditLog(
        user_id=user_id,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        details=json.dumps(details) if details else None,
    )
    db.add(row)
    db.flush()
