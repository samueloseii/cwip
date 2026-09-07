import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLES, get_current_user, require_role
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    AccessRequest,
    ApprovalRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        phone=user.phone,
        is_active=user.is_active,
        partner_id=str(user.partner_id) if user.partner_id else None,
        community_id=str(user.community_id) if user.community_id else None,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your access request is waiting for administrator approval",
        )
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token)


@router.post(
    "/access-requests", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def request_access(payload: AccessRequest, db: Session = Depends(get_db)):
    """Anyone can ask for a login; an administrator decides the role and activates it."""
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account or request already exists for this email",
        )
    user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.requested_role,
        is_active=False,
        notes=f"Requested {payload.requested_role.value} access",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/users/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: uuid.UUID,
    payload: ApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = payload.role
    user.is_active = True
    user.community_id = payload.community_id or user.community_id or current_user.community_id
    user.partner_id = user.partner_id or current_user.partner_id
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    query = db.query(User)
    if current_user.role is UserRole.COMMUNITY_ADMIN or current_user.role is UserRole.TREASURER:
        query = query.filter(
            or_(User.community_id == current_user.community_id, User.is_active.is_(False))
        )
    elif current_user.role is UserRole.PARTNER_ADMIN:
        query = query.filter(
            or_(User.partner_id == current_user.partner_id, User.is_active.is_(False))
        )
    return [_user_response(user) for user in query.order_by(User.full_name).all()]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """Only administrators create logins; there is no public sign-up."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        preferred_language=payload.preferred_language,
        partner_id=payload.partner_id or current_user.partner_id,
        community_id=payload.community_id or current_user.community_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_response(user)
