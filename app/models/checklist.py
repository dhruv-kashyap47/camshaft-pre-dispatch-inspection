from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    machine_family: Mapped[str] = mapped_column(String(40), index=True)
    item_code: Mapped[str] = mapped_column(String(30), unique=True)
    prompt: Mapped[str] = mapped_column(String(250))
    sequence_no: Mapped[int] = mapped_column(index=True)
    requires_photo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
