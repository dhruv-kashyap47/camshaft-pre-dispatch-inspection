from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CamName(Base):
    __tablename__ = "tcl_cam_name"

    cam_name_id: Mapped[int] = mapped_column(primary_key=True)
    cam_code: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    cam_name: Mapped[str] = mapped_column(String(120), nullable=False)
    qr_code: Mapped[str] = mapped_column(
        String(80), unique=True, index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="ACTIVE", nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
