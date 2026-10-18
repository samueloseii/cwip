import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import assert_community_access, get_current_user, require_role
from app.db.session import get_db
from app.models.household import Household
from app.models.meter import Meter, MeterReading
from app.models.user import User, UserRole
from app.schemas.meter import (
    MeterCreate,
    MeterReadingCreate,
    MeterReadingResponse,
    MeterReadingUpdate,
    MeterResponse,
)

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


@router.patch("/readings/{reading_id}", response_model=MeterReadingResponse)
def update_reading(
    reading_id: uuid.UUID,
    payload: MeterReadingUpdate,
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
    """Correct an existing meter reading (e.g. a mistyped value).

    Community admins and treasurers can only correct readings for households in
    their own community. Consumption is recomputed from the stored previous
    value, and the meter's latest reading is kept in sync when applicable.
    """
    reading = db.query(MeterReading).filter(MeterReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")

    meter = db.query(Meter).filter(Meter.id == reading.meter_id).first()
    if meter is not None:
        household = db.query(Household).filter(Household.id == meter.household_id).first()
        if household is not None:
            assert_community_access(current_user, household.community_id)

    data = payload.model_dump(exclude_unset=True)
    if "reading_value" in data and data["reading_value"] is not None:
        reading.reading_value = data["reading_value"]
        reading.consumption_m3 = round(max(0, reading.reading_value - reading.previous_value), 2)
    if "reading_date" in data and data["reading_date"] is not None:
        reading.reading_date = data["reading_date"]
    if "notes" in data:
        reading.notes = data["notes"]
    if "is_estimated" in data and data["is_estimated"] is not None:
        reading.is_estimated = data["is_estimated"]

    # Keep the meter's cached latest value in sync if this is the newest reading.
    if meter is not None and reading.meter_id is not None:
        latest = (
            db.query(MeterReading)
            .filter(MeterReading.meter_id == reading.meter_id)
            .order_by(MeterReading.reading_date.desc())
            .first()
        )
        if latest is not None:
            meter.last_reading_value = latest.reading_value
            meter.last_reading_date = latest.reading_date

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
