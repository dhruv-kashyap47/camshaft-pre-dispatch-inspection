from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    employee_id: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    employee_id: str
    display_name: str | None = None
    active_mode: str | None = None
    permissions: list[str] = []
    user: dict | None = None
