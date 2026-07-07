from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    employee_id: str = Field(min_length=1, max_length=30, description="Operator/Manager/Admin employee ID")
    password: str = Field(min_length=1, max_length=128, description="Account password")
    role: str = Field(pattern=r"^(OPERATOR|MANAGER|ADMIN)$", description="Login role")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    employee_id: str
