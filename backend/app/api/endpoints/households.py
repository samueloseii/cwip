import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.household import Household
from app.models.user import User, UserRole
from app.schemas.household import HouseholdCreate, HouseholdResponse, HouseholdUpdate

router = APIRouter(prefix="/households", tags=["households"])


@router.get("/", response_model=list[HouseholdResponse])
def list_households(
    community_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Household)
    if community_id:
        query = query.filter(Household.community_id == community_id)
    if status_filter:
        query = query.filter(Household.status == status_filter)
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
def create_household(
    payload: HouseholdCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN)
    ),
):
    household = Household(**payload.model_dump())
    db.add(household)
    db.commit()
    db.refresh(household)
    return household


@router.get("/{household_id}", response_model=HouseholdResponse)
def get_household(
    household_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return household


@router.patch("/{household_id}", response_model=HouseholdResponse)
def update_household(
    household_id: uuid.UUID,
    payload: HouseholdUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN)
    ),
):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(household, field, value)
    db.commit()
    db.refresh(household)
    return household
