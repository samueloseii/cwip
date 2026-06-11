import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.community import Community
from app.models.user import User, UserRole
from app.schemas.community import CommunityCreate, CommunityResponse, CommunityUpdate

router = APIRouter(prefix="/communities", tags=["communities"])


@router.get("/", response_model=list[CommunityResponse])
def list_communities(
    partner_id: uuid.UUID | None = Query(None),
    country: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Community)
    if current_user.role == UserRole.PARTNER_ADMIN and current_user.partner_id:
        query = query.filter(Community.partner_id == current_user.partner_id)
    elif current_user.role == UserRole.COMMUNITY_ADMIN and current_user.community_id:
        query = query.filter(Community.id == current_user.community_id)
    if partner_id:
        query = query.filter(Community.partner_id == partner_id)
    if country:
        query = query.filter(Community.country == country)
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
def create_community(
    payload: CommunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN)),
):
    community = Community(**payload.model_dump())
    db.add(community)
    db.commit()
    db.refresh(community)
    return community


@router.get("/{community_id}", response_model=CommunityResponse)
def get_community(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    return community


@router.patch("/{community_id}", response_model=CommunityResponse)
def update_community(
    community_id: uuid.UUID,
    payload: CommunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN)),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(community, field, value)
    db.commit()
    db.refresh(community)
    return community
