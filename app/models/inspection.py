from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import CharBool


class Inspection(Base):
    __tablename__ = "tcl_cam_inspection"
    __table_args__ = (
        CheckConstraint(
            "status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')",
            name="ck_tcl_cam_inspection_status",
        ),
    )

    inspection_id: Mapped[int] = mapped_column(primary_key=True)
    inspection_no: Mapped[str] = mapped_column(
        String(40), unique=True, index=True, nullable=False
    )
    cam_name_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_name.cam_name_id"), nullable=False, index=True
    )
    operator_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_useraccess.useraccess_id"), nullable=False, index=True
    )
    checklist_header_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_checklist_header.checklist_header_id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="NOT_STARTED", nullable=False, index=True
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_pct: Mapped[float] = mapped_column(default=0.0, nullable=False)
    attendance_marked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approval_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    responses = relationship(
        "InspectionResponse", back_populates="inspection", cascade="all, delete-orphan"
    )
    photos = relationship(
        "Photo", back_populates="inspection", cascade="all, delete-orphan"
    )
    overrides = relationship(
        "Override", back_populates="inspection", cascade="all, delete-orphan"
    )
    qr_data = relationship(
        "QrData", back_populates="inspection", uselist=False, cascade="all, delete-orphan"
    )


class InspectionResponse(Base):
    __tablename__ = "tcl_cam_inspection_response"
    __table_args__ = (
        CheckConstraint("result IN ('OK', 'NOT_OK', 'NA')", name="ck_tcl_cam_resp_result"),
        UniqueConstraint(
            "inspection_id", "checklist_item_id", name="uq_tcl_cam_resp_insp_item"
        ),
    )

    inspection_response_id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False, index=True
    )
    checklist_item_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_checklist_item.checklist_item_id"), nullable=False, index=True
    )
    result: Mapped[str] = mapped_column(String(10), nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    inspection = relationship("Inspection", back_populates="responses")


class Photo(Base):
    __tablename__ = "tcl_cam_photo"

    photo_id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False, index=True
    )
    checklist_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("tcl_cam_checklist_item.checklist_item_id"), nullable=True
    )
    image_data: Mapped[bytes | None] = mapped_column(nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_name: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inspection = relationship("Inspection", back_populates="photos")


class Override(Base):
    __tablename__ = "tcl_cam_override"

    override_id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False, index=True
    )
    manager_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_useraccess.useraccess_id"), nullable=False, index=True
    )
    checklist_item_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_checklist_item.checklist_item_id"), nullable=False, index=True
    )
    original_result: Mapped[str] = mapped_column(String(10), nullable=False)
    override_result: Mapped[str] = mapped_column(String(10), nullable=False)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inspection = relationship("Inspection", back_populates="overrides")
