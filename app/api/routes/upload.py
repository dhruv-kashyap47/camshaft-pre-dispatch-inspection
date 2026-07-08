import logging
import os
import uuid
from pathlib import Path, PureWindowsPath

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.core.config import settings
from app.models import Inspection
from app.services.inspection import save_photo_metadata

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

_STORAGE_ROOT_CACHE = None


def _resolve_storage_root() -> PureWindowsPath | Path:
    global _STORAGE_ROOT_CACHE

    if _STORAGE_ROOT_CACHE is not None:
        return _STORAGE_ROOT_CACHE

    primary = PureWindowsPath(settings.lan_image_root)

    try:
        os.makedirs(str(primary), exist_ok=True)
        logger.info("Using production storage: %s", primary)
        _STORAGE_ROOT_CACHE = primary
        return primary
    except OSError as e:
        logger.warning(
            "Production share unavailable: %s\n"
            "Falling back to local storage: %s\n"
            "Reason: %s",
            primary,
            settings.local_image_root,
            e,
        )

    fallback = Path(settings.local_image_root).resolve()
    os.makedirs(str(fallback), exist_ok=True)
    logger.info("Using local development storage: %s", fallback)
    _STORAGE_ROOT_CACHE = fallback
    return fallback


@router.post("/photo/{inspection_id}")
async def upload_photo(
    inspection_id: int,
    file: UploadFile,
    checklist_item_id: int | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_role("OPERATOR")),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: {', '.join(ALLOWED_CONTENT_TYPES.keys())}",
        )

    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    ext = ALLOWED_CONTENT_TYPES[file.content_type]
    unique_name = f"{uuid.uuid4().hex}{ext}"

    storage_root = _resolve_storage_root()
    inspection_dir = storage_root / inspection.inspection_no

    try:
        os.makedirs(str(inspection_dir), exist_ok=True)
        dest_path = inspection_dir / unique_name
        with open(str(dest_path), "wb") as f:
            f.write(content)
    except OSError as e:
        logger.error("Failed to save photo to %s: %s", inspection_dir, e)
        raise HTTPException(
            status_code=500, detail="Failed to save photo to storage"
        )

    photo = save_photo_metadata(
        db, inspection_id, checklist_item_id, unique_name, user
    )
    return {
        "photo_id": photo.photo_id,
        "file_name": unique_name,
        "lan_path": str(dest_path),
    }
