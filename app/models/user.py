from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import CharBool


class UserAccess(Base):
    __tablename__ = "tcl_cam_useraccess"

    useraccess_id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_role.role_id"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(
        CharBool, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    role = relationship("Role", back_populates="users")
