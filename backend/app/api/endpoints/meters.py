import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLES, READING_ROLES, get_current_user, require_role
from app.db.session import get_db
from app.models.household import Household, HouseholdStatus
from app.models.meter import Meter, MeterReading, MeterStatus
from app.models.user import User
from app.schemas.meter import (
    MeterCreate,
    MeterReadingCreate,
    MeterReadingResponse,
    MeterResponse,
    ReadingContext,
)
from app.services.readings import record_reading

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


@router.get("/reading-context", response_model=list[ReadingContext])
def reading_context(
    community_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Everything the field app needs to read meters, cacheable for offline use."""
    query = (
        db.query(Household, Meter)
        .join(Meter, Meter.household_id == Household.id)
        .filter(Household.status == HouseholdStatus.ACTIVE)
        .filter(Meter.status == MeterStatus.ACTIVE)
    )
    if community_id:
        query = query.filter(Household.community_id == community_id)
    elif current_user.community_id:
        query = query.filter(Household.community_id == current_user.community_id)

    rows = query.order_by(Household.account_number).all()
    return [
        ReadingContext(
            household_id=household.id,
            account_number=household.account_number,
            head_of_household=household.head_of_household,
            address=household.address,
            community_id=household.community_id,
            meter_id=meter.id,
            serial_number=meter.serial_number,
            last_reading_value=meter.last_reading_value,
            last_reading_date=meter.last_reading_date,
            avg_consumption_m3=meter.avg_consumption_m3,
        )
        for household, meter in rows
    ]


@router.post("/", response_model=MeterResponse, status_code=status.HTTP_201_CREATED)
def create_meter(
    payload: MeterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    if household.meter:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This household already has a meter",
        )
    meter = Meter(**payload.model_dump())
    db.add(meter)
    household.has_meter = True
    db.commit()
    db.refresh(meter)
    return meter


@router.post("/readings", response_model=MeterReadingResponse, status_code=status.HTTP_201_CREATED)
def create_reading(
    payload: MeterReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*READING_ROLES)),
):
    meter = db.query(Meter).filter(Meter.id == payload.meter_id).first()
    if not meter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meter not found")

    reading = record_reading(
        db,
        meter,
        reading_value=payload.reading_value,
        reading_date=payload.reading_date,
        notes=payload.notes,
        is_estimated=payload.is_estimated,
        recorded_by=payload.recorded_by or current_user.full_name,
        photo_url=payload.photo_url,
    )
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


@router.delete("/readings/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reading(
    reading_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """Remove a mis-entered reading and roll the meter back to the previous one."""
    reading = db.query(MeterReading).filter(MeterReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")
    meter_id = reading.meter_id
    db.delete(reading)
    db.flush()
    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if meter:
        latest = (
            db.query(MeterReading)
            .filter(MeterReading.meter_id == meter_id)
            .order_by(MeterReading.reading_date.desc())
            .first()
        )
        meter.last_reading_value = latest.reading_value if latest else 0.0
        meter.last_reading_date = latest.reading_date if latest else None
    db.commit()
