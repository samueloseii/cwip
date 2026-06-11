import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.maintenance import (
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceStatus,
)


class MaintenanceCreate(BaseModel):
    title: str
    description: str | None = None
    category: MaintenanceCategory = MaintenanceCategory.OTHER
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    reported_date: datetime
    cost: float = 0.0
    currency: str = "USD"
    reported_by: str | None = None
    photo_url: str | None = None
    notes: str | None = None
    community_id: uuid.UUID


class MaintenanceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: MaintenanceCategory | None = None
    priority: MaintenancePriority | None = None
    status: MaintenanceStatus | None = None
    resolved_date: datetime | None = None
    cost: float | None = None
    resolved_by: str | None = None
    notes: str | None = None


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    category: MaintenanceCategory
    priority: MaintenancePriority
    status: MaintenanceStatus
    reported_date: datetime
    resolved_date: datetime | None
    cost: float
    currency: str
    reported_by: str | None
    resolved_by: str | None
    photo_url: str | None
    notes: str | None
    community_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
