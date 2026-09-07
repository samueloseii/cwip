import uuid
from datetime import datetime

from pydantic import BaseModel


class PartnerCreate(BaseModel):
    name: str
    country: str
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    description: str | None = None


class PartnerUpdate(BaseModel):
    name: str | None = None
    country: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    description: str | None = None


class PartnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    country: str
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    description: str | None
    created_at: datetime
    communities_count: int = 0

    class Config:
        from_attributes = True
