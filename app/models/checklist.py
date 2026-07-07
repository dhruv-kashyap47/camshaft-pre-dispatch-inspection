from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import CharBool


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    __table_args__ = (
        Index("uq_checklist_item_code", "item_code", unique=True),
        Index("idx_checklist_family_seq", "machine_family", "sequence_no"),
        Index("idx_checklist_active", "is_active"),
    )

    checklist_item_id: Mapped[int] = mapped_column(primary_key=True)
    machine_family: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
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
