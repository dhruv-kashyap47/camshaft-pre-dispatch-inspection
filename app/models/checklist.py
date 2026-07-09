from datetime import datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import CharBool


class ChecklistHeader(Base):
    __tablename__ = "tcl_cam_checklist_header"
    __table_args__ = (
        Index("uq_tcl_cam_chk_header_version", "checklist_name", "version", unique=True),
    )

    checklist_header_id: Mapped[int] = mapped_column(primary_key=True)
    checklist_name: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(CharBool, default=True, nullable=False)
    effective_from: Mapped[datetime] = mapped_column(Date, nullable=False)
    effective_to: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    items = relationship("ChecklistItem", back_populates="header", cascade="all, delete-orphan")


class ChecklistItem(Base):
    __tablename__ = "tcl_cam_checklist_item"
    __table_args__ = (
        Index("uq_tcl_cam_chk_item_code", "checklist_header_id", "item_code", unique=True),
        Index("uq_tcl_cam_chk_item_seq", "checklist_header_id", "sequence_no", unique=True),
    )

    checklist_item_id: Mapped[int] = mapped_column(primary_key=True)
    checklist_header_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_checklist_header.checklist_header_id"), nullable=False, index=True
    )
    item_code: Mapped[str] = mapped_column(String(30), nullable=False)
    prompt: Mapped[str] = mapped_column(String(250), nullable=False)
    sequence_no: Mapped[int] = mapped_column(nullable=False, index=True)
    requires_photo: Mapped[bool] = mapped_column(
        CharBool, default=False, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(CharBool, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    header = relationship("ChecklistHeader", back_populates="items")
