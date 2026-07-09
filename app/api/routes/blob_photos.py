import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_operator_or_manager_mode
from app.models import UserAccess
from app.services.blob_engine import (
    generate_thumbnail,
    get_inspection_photos,
    get_photo_metadata,
    get_photo_stream,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/photo/{photo_id}")
def serve_photo(
    photo_id: int,
    thumbnail: bool = Query(default=False, description="Return thumbnail version"),
    db: Session = Depends(get_db),
    _=Depends(require_operator_or_manager_mode),
):
    data, mime, filename = get_photo_stream(db, photo_id)
    if thumbnail:
        thumb = generate_thumbnail(data)
        if thumb:
            data = thumb
    return Response(content=data, media_type=mime, headers={
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": f'inline; filename="{filename}"',
    })


@router.get("/photo/{photo_id}/metadata")
def photo_metadata(
    photo_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_operator_or_manager_mode),
):
    return get_photo_metadata(db, photo_id)


@router.get("/inspection/{inspection_id}/photos")
def inspection_photos(
    inspection_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_operator_or_manager_mode),
):
    return get_inspection_photos(db, inspection_id)
