import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.meter import Meter, MeterReading
from app.models.user import User, UserRole
from app.schemas.meter import MeterCreate, MeterReadingCreate, MeterReadingResponse, MeterResponse

router = APIRouter(prefix="/meters", tags=["meters"])


@router.get("/", response_model=list[MeterResponse])
def list_meters(
    household_id: uuid.UUID | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Meter)
    if household_id:
        query = query.filter(Meter.household_id == household_id)
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=MeterResponse, status_code=status.HTTP_201_CREATED)
def create_meter(
    payload: MeterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.OPERATOR)
    ),
):
    meter = Meter(**payload.model_dump())
    db.add(meter)
    db.commit()
    db.refresh(meter)
    return meter


@router.post("/readings", response_model=MeterReadingResponse, status_code=status.HTTP_201_CREATED)
def create_reading(
    payload: MeterReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.OPERATOR)
    ),
):
    meter = db.query(Meter).filter(Meter.id == payload.meter_id).first()
    if not meter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")

    previous_value = meter.last_reading_value
    consumption = max(0, payload.reading_value - previous_value)

    reading = MeterReading(
        reading_value=payload.reading_value,
        previous_value=previous_value,
        consumption_m3=consumption,
        reading_date=payload.reading_date,
        photo_url=payload.photo_url,
        notes=payload.notes,
        is_estimated=payload.is_estimated,
        recorded_by=payload.recorded_by,
        meter_id=payload.meter_id,
    )
    db.add(reading)

    meter.last_reading_value = payload.reading_value
    meter.last_reading_date = payload.reading_date

    db.commit()
    db.refresh(reading)
    return reading


@router.get("/readings", response_model=list[MeterReadingResponse])
def list_readings(
    meter_id: uuid.UUID | None = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MeterReading)
    if meter_id:
        query = query.filter(MeterReading.meter_id == meter_id)
    return query.order_by(MeterReading.reading_date.desc()).offset(skip).limit(limit).all()
