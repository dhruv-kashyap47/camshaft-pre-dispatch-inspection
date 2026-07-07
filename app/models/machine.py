from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Machine(Base):
    __tablename__ = "machines"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_machine_status"),
    )

    machine_id: Mapped[int] = mapped_column(primary_key=True)
    machine_code: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    machine_name: Mapped[str] = mapped_column(String(120), nullable=False)
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
