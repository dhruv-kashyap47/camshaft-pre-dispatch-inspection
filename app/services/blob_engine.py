import hashlib
import io
import logging
import struct
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Inspection, Photo, UserAccess
from app.services.audit import write_audit_log

# Starlette 0.42+ renamed some status codes; use new names with fallback
HTTP_413_CONTENT_TOO_LARGE = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
HTTP_422_UNPROCESSABLE_CONTENT = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", status.HTTP_422_UNPROCESSABLE_ENTITY)

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB


def _detect_mime_from_bytes(data: bytes) -> str | None:
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _compute_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sanitize_filename(filename: str) -> str:
    import re
    clean = re.sub(r'[^\w\-_.() ]', '', filename)
    clean = clean.strip()
    if not clean:
        clean = "untitled"
    return clean[:120]


def validate_image(content_type: str | None, data: bytes) -> tuple[str, bytes]:
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty upload - no image data received",
        )
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )
    detected = _detect_mime_from_bytes(data)
    if detected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unrecognized image format. Allowed: JPEG, PNG, WebP",
        )
    if detected not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type: {detected}. Allowed: {', '.join(ALLOWED_CONTENT_TYPES.keys())}",
        )
    if content_type and content_type != detected:
        logger.warning(
            "Client MIME '%s' does not match detected '%s'",
            content_type, detected,
        )
    return detected, data


def _check_inspection_active(db: Session, inspection_id: int) -> Inspection:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        )
    if inspection.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot upload photos to a finalized inspection",
        )
    return inspection


def _check_item_exists(db: Session, checklist_item_id: int | None) -> None:
    if checklist_item_id is None:
        return
    from app.models import ChecklistItem
    item = db.scalar(
        select(ChecklistItem).where(
            ChecklistItem.checklist_item_id == checklist_item_id
        )
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Checklist item {checklist_item_id} not found",
        )


def upload_photo(
    db: Session,
    inspection_id: int,
    checklist_item_id: int | None,
    file_name: str,
    content_type: str | None,
    data: bytes,
    user: UserAccess,
) -> Photo:
    validated_mime, validated_data = validate_image(content_type, data)
    _check_inspection_active(db, inspection_id)
    _check_item_exists(db, checklist_item_id)

    ext = ALLOWED_CONTENT_TYPES[validated_mime]
    import uuid
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_size = len(validated_data)

    existing = db.scalar(
        select(Photo).where(
            Photo.inspection_id == inspection_id,
            Photo.checklist_item_id == checklist_item_id,
            Photo.file_name == unique_name,
        )
    )

    if existing:
        old_hash = _compute_hash(existing.image_data) if existing.image_data else ""
        existing.image_data = validated_data
        existing.content_type = validated_mime
        existing.file_size = file_size
        existing.file_name = unique_name
        db.flush()
        write_audit_log(
            db,
            "PHOTO_REPLACED",
            "PHOTO",
            str(existing.photo_id),
            user.useraccess_id,
            {
                "inspection_id": inspection_id,
                "file_name": unique_name,
                "content_type": validated_mime,
                "file_size": file_size,
                "old_hash": old_hash,
                "new_hash": _compute_hash(validated_data),
            },
        )
        db.commit()
        db.refresh(existing)
        return existing

    photo = Photo(
        inspection_id=inspection_id,
        checklist_item_id=checklist_item_id,
        file_name=unique_name,
        image_data=validated_data,
        content_type=validated_mime,
        file_size=file_size,
    )
    db.add(photo)
    db.flush()
    write_audit_log(
        db,
        "PHOTO_UPLOAD",
        "PHOTO",
        str(photo.photo_id),
        user.useraccess_id,
        {
            "inspection_id": inspection_id,
            "checklist_item_id": checklist_item_id,
            "file_name": unique_name,
            "content_type": validated_mime,
            "file_size": file_size,
            "hash": _compute_hash(validated_data),
        },
    )
    db.commit()
    db.refresh(photo)
    return photo


def get_photo(db: Session, photo_id: int) -> Photo:
    photo = db.scalar(
        select(Photo).where(Photo.photo_id == photo_id)
    )
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )
    return photo


def get_photo_stream(db: Session, photo_id: int) -> tuple[bytes, str, str]:
    photo = get_photo(db, photo_id)
    if not photo.image_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo has no image data",
        )
    mime = photo.content_type or "image/jpeg"
    filename = photo.file_name or f"photo_{photo_id}.jpg"
    return photo.image_data, mime, filename


def get_photo_metadata(db: Session, photo_id: int) -> dict:
    photo = get_photo(db, photo_id)
    return {
        "photo_id": photo.photo_id,
        "inspection_id": photo.inspection_id,
        "checklist_item_id": photo.checklist_item_id,
        "file_name": photo.file_name,
        "content_type": photo.content_type,
        "file_size": photo.file_size,
        "created_at": photo.created_at.isoformat() if photo.created_at else None,
    }


def get_inspection_photos(db: Session, inspection_id: int) -> list[dict]:
    inspection = db.scalar(
        select(Inspection).where(Inspection.inspection_id == inspection_id)
    )
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        )
    photos = db.scalars(
        select(Photo).where(Photo.inspection_id == inspection_id)
    ).all()
    return [
        {
            "id": p.photo_id,
            "checklist_item_id": p.checklist_item_id,
            "file_name": p.file_name,
            "content_type": p.content_type,
            "file_size": p.file_size,
            "created_at": str(p.created_at),
        }
        for p in photos
    ]


def generate_thumbnail(data: bytes, max_size: tuple[int, int] = (300, 300)) -> bytes | None:
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        img = Image.open(io.BytesIO(data))
        img.thumbnail(max_size, Image.LANCZOS)
        buf = io.BytesIO()
        fmt = img.format or "JPEG"
        img.save(buf, format=fmt, quality=85)
        return buf.getvalue()
    except Exception as e:
        logger.warning("Thumbnail generation failed: %s", e)
        return None


def delete_photo(db: Session, photo_id: int, user: UserAccess) -> None:
    photo = get_photo(db, photo_id)
    write_audit_log(
        db,
        "PHOTO_DELETED",
        "PHOTO",
        str(photo_id),
        user.useraccess_id,
        {
            "inspection_id": photo.inspection_id,
            "file_name": photo.file_name,
            "content_type": photo.content_type,
        },
    )
    db.delete(photo)
    db.commit()
