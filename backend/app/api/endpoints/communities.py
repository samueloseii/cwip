import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import assert_community_access, get_current_user, require_role
from app.db.session import get_db
from app.models.community import Community
from app.models.household import Household
from app.models.meter import Meter, MeterReading
from app.models.user import User, UserRole
from app.schemas.community import (
    CommunityCreate,
    CommunityResponse,
    CommunityUpdate,
    HouseholdRecord,
)

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
    elif (
        current_user.role in (UserRole.COMMUNITY_ADMIN, UserRole.TREASURER, UserRole.OPERATOR)
        and current_user.community_id
    ):
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
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.OPERATOR)),
):
    community = Community(**payload.model_dump())
    db.add(community)
    db.commit()
    db.refresh(community)
    # Auto-assign community to operator
    if current_user.role == UserRole.OPERATOR and not current_user.community_id:
        current_user.community_id = community.id
        db.commit()
    return community


@router.get("/{community_id}/records", response_model=list[HouseholdRecord])
def list_community_records(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return each household in a community with its latest meter reading.

    Community admins and treasurers may only view their own community's records.
    """
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    assert_community_access(current_user, community.id)

    households = (
        db.query(Household)
        .filter(Household.community_id == community_id)
        .order_by(Household.account_number)
        .all()
    )
    records: list[HouseholdRecord] = []
    for hh in households:
        meter = db.query(Meter).filter(Meter.household_id == hh.id).first()
        latest = None
        if meter is not None:
            latest = (
                db.query(MeterReading)
                .filter(MeterReading.meter_id == meter.id)
                .order_by(MeterReading.reading_date.desc())
                .first()
            )
        records.append(
            HouseholdRecord(
                household_id=hh.id,
                account_number=hh.account_number,
                head_of_household=hh.head_of_household,
                status=hh.status.value,
                outstanding_balance=hh.outstanding_balance,
                meter_id=meter.id if meter else None,
                latest_reading_id=latest.id if latest else None,
                latest_reading_value=latest.reading_value if latest else None,
                latest_reading_date=latest.reading_date if latest else None,
                latest_consumption_m3=latest.consumption_m3 if latest else None,
            )
        )
    return records


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
    current_user: User = Depends(
        require_role(
            UserRole.SUPER_ADMIN,
            UserRole.PARTNER_ADMIN,
            UserRole.COMMUNITY_ADMIN,
            UserRole.TREASURER,
        )
    ),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    assert_community_access(current_user, community.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(community, field, value)
    db.commit()
    db.refresh(community)
    return community
