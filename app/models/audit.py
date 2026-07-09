from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import CharBool


class AuditLog(Base):
    __tablename__ = "tcl_cam_audit_log"

    audit_log_id: Mapped[int] = mapped_column(primary_key=True)
    useraccess_id: Mapped[int | None] = mapped_column(
        ForeignKey("tcl_cam_useraccess.useraccess_id"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    old_value: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    details: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    is_read: Mapped[bool] = mapped_column(CharBool, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
