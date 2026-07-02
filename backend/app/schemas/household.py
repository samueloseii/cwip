import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.household import HouseholdStatus


class HouseholdCreate(BaseModel):
    account_number: str
    head_of_household: str
    address: str | None = None
    phone: str | None = None
    members_count: int = 1
    status: HouseholdStatus = HouseholdStatus.ACTIVE
    has_meter: bool = False
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None
    community_id: uuid.UUID


class HouseholdUpdate(BaseModel):
    head_of_household: str | None = None
    address: str | None = None
    phone: str | None = None
    members_count: int | None = None
    status: HouseholdStatus | None = None
    has_meter: bool | None = None
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    account_number: str
    head_of_household: str
    address: str | None
    phone: str | None
    members_count: int
    status: HouseholdStatus
    has_meter: bool
    outstanding_balance: float
    latitude: float | None
    longitude: float | None
    notes: str | None
    community_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
