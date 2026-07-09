from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QrData(Base):
    __tablename__ = "tcl_cam_qr_data"

    qr_data_id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("tcl_cam_inspection.inspection_id"),
        nullable=False, unique=True, index=True
    )
    raw_qr: Mapped[str] = mapped_column(String(200), nullable=False)
    part_number: Mapped[int] = mapped_column(nullable=False)
    serial_number: Mapped[int] = mapped_column(nullable=False)
    vendor_code: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    inspection = relationship("Inspection", back_populates="qr_data")
