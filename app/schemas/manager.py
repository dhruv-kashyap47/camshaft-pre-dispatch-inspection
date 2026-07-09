from datetime import datetime

from pydantic import BaseModel, Field


class ManagerDashboardResponse(BaseModel):
    pending_approvals: int = 0
    approved_today: int = 0
    rejected_today: int = 0
    in_progress: int = 0
    total_today: int = 0
    avg_inspection_time_minutes: float = 0.0
    active_operators: int = 0


class RecentActivityItem(BaseModel):
    id: int
    action: str
    entity_name: str
    entity_id: str | None = None
    user_name: str | None = None
    timestamp: datetime
    details: str | None = None


class ModeSwitchRequest(BaseModel):
    mode: str = Field(pattern=r"^(MANAGER_MODE|OPERATOR_MODE)$")
