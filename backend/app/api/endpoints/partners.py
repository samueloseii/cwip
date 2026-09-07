import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.community import Community
from app.models.partner import Partner
from app.models.user import User, UserRole
from app.schemas.partner import PartnerCreate, PartnerResponse, PartnerUpdate

router = APIRouter(prefix="/partners", tags=["partners"])


def _response(db: Session, partner: Partner) -> PartnerResponse:
    count = db.query(Community).filter(Community.partner_id == partner.id).count()
    return PartnerResponse(
        id=partner.id,
        name=partner.name,
        country=partner.country,
        contact_name=partner.contact_name,
        contact_email=partner.contact_email,
        contact_phone=partner.contact_phone,
        description=partner.description,
        created_at=partner.created_at,
        communities_count=count,
    )


@router.get("/", response_model=list[PartnerResponse])
def list_partners(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Partner)
    if current_user.role is not UserRole.SUPER_ADMIN and current_user.partner_id:
        query = query.filter(Partner.id == current_user.partner_id)
    return [_response(db, p) for p in query.order_by(Partner.name).all()]


@router.post("/", response_model=PartnerResponse, status_code=status.HTTP_201_CREATED)
def create_partner(
    payload: PartnerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    if db.query(Partner).filter(Partner.name == payload.name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An organization with that name already exists",
        )
    partner = Partner(**payload.model_dump())
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return _response(db, partner)


@router.patch("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: uuid.UUID,
    payload: PartnerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN)),
):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(partner, field, value)
    db.commit()
    db.refresh(partner)
    return _response(db, partner)
