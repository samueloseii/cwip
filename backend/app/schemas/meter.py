import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.meter import MeterStatus


class MeterCreate(BaseModel):
    serial_number: str
    brand: str | None = None
    model: str | None = None
    install_date: datetime | None = None
    household_id: uuid.UUID


class MeterReadingCreate(BaseModel):
    reading_value: float
    reading_date: datetime
    photo_url: str | None = None
    notes: str | None = None
    is_estimated: bool = False
    recorded_by: str | None = None
    meter_id: uuid.UUID


class MeterResponse(BaseModel):
    id: uuid.UUID
    serial_number: str
    brand: str | None
    model: str | None
    status: MeterStatus
    install_date: datetime | None
    last_reading_value: float
    last_reading_date: datetime | None
    avg_consumption_m3: float
    household_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MeterReadingResponse(BaseModel):
    id: uuid.UUID
    reading_value: float
    previous_value: float
    consumption_m3: float
    reading_date: datetime
    photo_url: str | None
    notes: str | None
    is_estimated: bool
    recorded_by: str | None
    flag_reason: str | None
    meter_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ReadingContext(BaseModel):
    """A meter an operator may read, plus the context needed to sanity-check it."""

    household_id: uuid.UUID
    account_number: str
    head_of_household: str
    address: str | None
    community_id: uuid.UUID
    meter_id: uuid.UUID
    serial_number: str
    last_reading_value: float
    last_reading_date: datetime | None
    avg_consumption_m3: float
