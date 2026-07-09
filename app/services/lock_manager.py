from datetime import datetime, timezone

from app.core.config import settings
from app.models import UserAccess


_LOCK_TIMEOUT_SECONDS = settings.inspection_lock_timeout_seconds

class _LockEntry:
    def __init__(self, operator_id: int, operator_name: str):
        self.operator_id = operator_id
        self.operator_name = operator_name
        self.acquired_at = datetime.now(timezone.utc)

    @property
    def is_expired(self) -> bool:
        elapsed = (datetime.now(timezone.utc) - self.acquired_at).total_seconds()
        return elapsed > _LOCK_TIMEOUT_SECONDS


_locks: dict[int, _LockEntry] = {}


def acquire_lock(inspection_id: int, operator: UserAccess) -> None:
    existing = _locks.get(inspection_id)
    if existing:
        if existing.is_expired:
            del _locks[inspection_id]
        elif existing.operator_id != operator.useraccess_id:
            elapsed = int((datetime.now(timezone.utc) - existing.acquired_at).total_seconds())
            raise PermissionError(
                f"Inspection {inspection_id} is being edited by "
                f"'{existing.operator_name}' (acquired {elapsed}s ago)"
            )

    _locks[inspection_id] = _LockEntry(operator.useraccess_id, operator.full_name)


def release_lock(inspection_id: int) -> None:
    _locks.pop(inspection_id, None)


def verify_lock(inspection_id: int, operator: UserAccess) -> None:
    entry = _locks.get(inspection_id)
    if not entry:
        return
    if entry.is_expired:
        _locks.pop(inspection_id, None)
        return
    if entry.operator_id != operator.useraccess_id:
        elapsed = int((datetime.now(timezone.utc) - entry.acquired_at).total_seconds())
        raise PermissionError(
            f"Inspection {inspection_id} is being edited by "
            f"'{entry.operator_name}' (acquired {elapsed}s ago)"
        )


def get_lock_info(inspection_id: int) -> dict | None:
    entry = _locks.get(inspection_id)
    if not entry or entry.is_expired:
        _locks.pop(inspection_id, None)
        return None
    return {
        "operator_id": entry.operator_id,
        "operator_name": entry.operator_name,
        "acquired_at": entry.acquired_at.isoformat(),
    }
