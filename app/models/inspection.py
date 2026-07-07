from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Inspection(Base):
    __tablename__ = "inspections"
    __table_args__ = (
        CheckConstraint("status IN ('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')", name="ck_inspection_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_no: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=False, index=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="IN_PROGRESS", nullable=False, index=True)
    attendance_marked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approval_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    responses = relationship("InspectionResponse", back_populates="inspection", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="inspection", cascade="all, delete-orphan")
    overrides = relationship("Override", back_populates="inspection", cascade="all, delete-orphan")


class InspectionResponse(Base):
    __tablename__ = "inspection_responses"
    __table_args__ = (
        CheckConstraint("result IN ('OK', 'NOT_OK')", name="ck_response_result"),
        UniqueConstraint("inspection_id", "checklist_item_id", name="uq_inspection_checklist"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id"), nullable=False, index=True)
    checklist_item_id: Mapped[int] = mapped_column(ForeignKey("checklist_items.id"), nullable=False, index=True)
    result: Mapped[str] = mapped_column(String(10), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    inspection = relationship("Inspection", back_populates="responses")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id"), nullable=False, index=True)
    checklist_item_id: Mapped[int | None] = mapped_column(ForeignKey("checklist_items.id"), nullable=True)
    lan_path: Mapped[str] = mapped_column(String(300), nullable=False)
    file_name: Mapped[str] = mapped_column(String(120), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    inspection = relationship("Inspection", back_populates="photos")


class Override(Base):
    __tablename__ = "overrides"

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(ForeignKey("inspections.id"), nullable=False, index=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    checklist_item_id: Mapped[int] = mapped_column(ForeignKey("checklist_items.id"), nullable=False, index=True)
    original_result: Mapped[str] = mapped_column(String(10), nullable=False)
    override_result: Mapped[str] = mapped_column(String(10), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    inspection = relationship("Inspection", back_populates="overrides")
