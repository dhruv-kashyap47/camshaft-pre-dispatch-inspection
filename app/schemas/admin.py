from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserCreateRequest(BaseModel):
    employee_id: str = Field(
        min_length=1, max_length=30, pattern=r"^[a-zA-Z0-9_\-]+$"
    )
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(pattern=r"^(OPERATOR|MANAGER|ADMIN)$")


class PasswordResetRequest(BaseModel):
    user_id: int = Field(gt=0)
    new_password: str = Field(min_length=8, max_length=128)


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int = Field(validation_alias="audit_log_id")
    action: str
    entity_name: str
    entity_id: str | None
    old_value: str | None = None
    new_value: str | None = None
    details: str | None
    created_at: datetime
