import uuid

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: str | None = None
    is_active: bool = True
    partner_id: str | None = None
    community_id: str | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: UserRole = UserRole.READER
    preferred_language: str = "es"
    partner_id: uuid.UUID | None = None
    community_id: uuid.UUID | None = None


class AccessRequest(BaseModel):
    """Someone asking an administrator for a login."""

    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    requested_role: UserRole = UserRole.OPERATOR


class ApprovalRequest(BaseModel):
    role: UserRole
    community_id: uuid.UUID | None = None
