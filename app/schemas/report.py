from datetime import date, datetime

from pydantic import BaseModel, Field


class ReportRow(BaseModel):
    label: str
    value: int


class ReportFilter(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    machine_code: str | None = None
    operator_id: int | None = None
    shift: str | None = Field(default=None, pattern=r"^(SHIFT_A|SHIFT_B|SHIFT_C)$")


class InspectionTimelineEntry(BaseModel):
    timestamp: datetime
    action: str
    user_name: str | None = None
    user_role: str | None = None
    details: str | None = None


class InvestigationResult(BaseModel):
    inspection_id: int
    inspection_no: str
    status: str
    machine_code: str
    machine_name: str
    operator_name: str
    started_at: datetime
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    timeline: list[InspectionTimelineEntry]
    responses: list[dict]
    photos: list[dict]
    overrides: list[dict]
    audit_logs: list[dict]
