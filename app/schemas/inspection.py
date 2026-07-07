from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AttendanceRequest(BaseModel):
    inspection_no: str = Field(min_length=1, max_length=40)


class QRScanRequest(BaseModel):
    qr_code: str = Field(min_length=1, max_length=80)


class InspectionStartRequest(BaseModel):
    machine_code: str = Field(min_length=1, max_length=30)


class ChecklistAnswer(BaseModel):
    checklist_item_id: int = Field(gt=0)
    result: str = Field(pattern=r"^(OK|NOT_OK)$")
    remarks: str | None = Field(default=None, max_length=500)

    @field_validator("checklist_item_id")
    @classmethod
    def validate_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("checklist_item_id must be positive")
        return v


class PhotoMetadataRequest(BaseModel):
    inspection_id: int = Field(gt=0)
    checklist_item_id: int | None = Field(default=None, gt=0)
    file_name: str = Field(
        min_length=1,
        max_length=120,
        pattern=r"^[\w\-\.]+\.(jpg|jpeg|png|gif|bmp|webp)$",
    )


class SubmitInspectionRequest(BaseModel):
    inspection_id: int = Field(gt=0)
    answers: list[ChecklistAnswer] = Field(min_length=1, max_length=100)


class OverrideRequest(BaseModel):
    inspection_id: int = Field(gt=0)
    checklist_item_id: int = Field(gt=0)
    override_result: str = Field(pattern=r"^(OK|NOT_OK)$")
    reason: str = Field(min_length=1, max_length=1000)


class ApproveInspectionRequest(BaseModel):
    inspection_id: int = Field(gt=0)
    approval_note: str | None = Field(default=None, max_length=500)


class RejectInspectionRequest(BaseModel):
    inspection_id: int = Field(gt=0)
    reason: str = Field(min_length=1, max_length=500)


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int = Field(validation_alias="checklist_item_id")
    item_code: str
    prompt: str
    requires_photo: bool
    sequence_no: int


class InspectionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int = Field(validation_alias="inspection_id")
    inspection_no: str
    status: str
    started_at: datetime
    submitted_at: datetime | None = None
