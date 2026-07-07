from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_log_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    old_value: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    details: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
