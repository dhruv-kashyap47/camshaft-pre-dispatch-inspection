import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models import UserAccess
from app.services.blob_engine import upload_photo

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/photo/{inspection_id}")
async def upload_photo_endpoint(
    inspection_id: int,
    file: UploadFile,
    checklist_item_id: int | None = None,
    db: Session = Depends(get_db),
    user: UserAccess = Depends(require_role("OPERATOR")),
):
    content = await file.read()
    photo = upload_photo(
        db, inspection_id, checklist_item_id,
        file.filename or "photo.jpg", file.content_type, content, user,
    )
    return {"photo_id": photo.photo_id, "file_name": photo.file_name}