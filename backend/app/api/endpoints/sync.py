"""Offline sync endpoint — accepts batched meter readings and payments."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.billing import Invoice, InvoiceStatus, Payment, PaymentMethod
from app.models.community import Community
from app.models.household import Household
from app.models.meter import Meter, MeterReading
from app.models.user import User, UserRole

router = APIRouter(prefix="/sync", tags=["sync"])


def _find_or_create_household(db: Session, community_id: uuid.UUID, name_or_number: str) -> Household:
    """Match an operator's free-text entry to a household, creating one if new.

    Operators identify a household by head-of-household name OR account number.
    New households are registered in the operator's own community with an
    auto-generated account number.
    """
    term = name_or_number.strip()
    existing = (
        db.query(Household)
        .filter(Household.community_id == community_id)
        .filter(
            (Household.account_number.ilike(term))
            | (Household.head_of_household.ilike(term))
        )
        .first()
    )
    if existing:
        return existing

    count = db.query(Household).filter(Household.community_id == community_id).count()
    community = db.query(Community).filter(Community.id == community_id).first()
    prefix = (community.name[:3].upper().replace(" ", "") if community else "HH")
    household = Household(
        account_number=f"{prefix}-{count + 1:04d}",
        head_of_household=term,
        status="active",
        has_meter=True,
        community_id=community_id,
    )
    db.add(household)
    db.flush()
    return household


def _get_or_create_meter(db: Session, household: Household) -> Meter:
    meter = db.query(Meter).filter(Meter.household_id == household.id).first()
    if meter:
        return meter
    meter = Meter(
        serial_number=f"M-{uuid.uuid4().hex[:12].upper()}",
        household_id=household.id,
    )
    db.add(meter)
    db.flush()
    return meter


class SyncMeterReading(BaseModel):
    client_id: str
    meter_id: uuid.UUID | None = None
    household_name: str | None = None
    reading_value: float
    reading_date: datetime
    notes: str | None = None
    recorded_by: str | None = None


class SyncPayment(BaseModel):
    client_id: str
    household_id: uuid.UUID
    invoice_id: uuid.UUID | None = None
    amount: float
    currency: str = "USD"
    payment_method: str = "cash"
    payment_date: datetime
    receipt_number: str | None = None
    notes: str | None = None


class SyncRequest(BaseModel):
    readings: list[SyncMeterReading] = []
    payments: list[SyncPayment] = []


class SyncResultItem(BaseModel):
    client_id: str
    server_id: str | None = None
    success: bool
    error: str | None = None


class SyncResponse(BaseModel):
    readings: list[SyncResultItem]
    payments: list[SyncResultItem]
    synced_at: datetime


@router.post("/push", response_model=SyncResponse)
def push_offline_data(
    payload: SyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN,
            UserRole.COMMUNITY_ADMIN, UserRole.OPERATOR, UserRole.TREASURER,
        )
    ),
):
    reading_results: list[SyncResultItem] = []
    payment_results: list[SyncResultItem] = []

    for r in payload.readings:
        try:
            if r.meter_id:
                meter = db.query(Meter).filter(Meter.id == r.meter_id).first()
                if not meter:
                    reading_results.append(SyncResultItem(client_id=r.client_id, success=False, error="Meter not found"))
                    continue

                previous_value = meter.last_reading_value
                consumption = max(0, r.reading_value - previous_value)

                reading = MeterReading(
                    reading_value=r.reading_value,
                    previous_value=previous_value,
                    consumption_m3=round(consumption, 1),
                    reading_date=r.reading_date,
                    notes=r.notes,
                    recorded_by=r.recorded_by or current_user.full_name,
                    meter_id=r.meter_id,
                )
                db.add(reading)
                meter.last_reading_value = r.reading_value
                meter.last_reading_date = r.reading_date
                db.flush()

                reading_results.append(SyncResultItem(
                    client_id=r.client_id, server_id=str(reading.id), success=True,
                ))
            elif r.household_name and current_user.community_id:
                # Field flow: match/create the household by name, then record
                # against its meter so consumption and payments stay linked.
                household = _find_or_create_household(
                    db, current_user.community_id, r.household_name
                )
                meter = _get_or_create_meter(db, household)
                previous_value = meter.last_reading_value
                consumption = max(0, r.reading_value - previous_value)

                reading = MeterReading(
                    reading_value=r.reading_value,
                    previous_value=previous_value,
                    consumption_m3=round(consumption, 1),
                    reading_date=r.reading_date,
                    notes=r.notes,
                    recorded_by=r.recorded_by or current_user.full_name,
                    meter_id=meter.id,
                )
                db.add(reading)
                meter.last_reading_value = r.reading_value
                meter.last_reading_date = r.reading_date
                db.flush()

                reading_results.append(SyncResultItem(
                    client_id=r.client_id, server_id=str(reading.id), success=True,
                ))
            else:
                # Fallback when no community is assigned: keep the name in notes.
                reading = MeterReading(
                    reading_value=r.reading_value,
                    previous_value=0,
                    consumption_m3=r.reading_value,
                    reading_date=r.reading_date,
                    notes=f"Household: {r.household_name or 'Unknown'}",
                    recorded_by=r.recorded_by or current_user.full_name,
                    meter_id=None,
                )
                db.add(reading)
                db.flush()

                reading_results.append(SyncResultItem(
                    client_id=r.client_id, server_id=str(reading.id), success=True,
                ))
        except Exception as e:
            reading_results.append(SyncResultItem(client_id=r.client_id, success=False, error=str(e)))

    for p in payload.payments:
        try:
            method = PaymentMethod.CASH
            if p.payment_method == "bank_transfer":
                method = PaymentMethod.BANK_TRANSFER
            elif p.payment_method == "mobile_money":
                method = PaymentMethod.MOBILE_MONEY

            payment = Payment(
                amount=p.amount,
                currency=p.currency,
                payment_method=method,
                payment_date=p.payment_date,
                receipt_number=p.receipt_number,
                notes=p.notes,
                household_id=p.household_id,
                invoice_id=p.invoice_id,
            )
            db.add(payment)
            db.flush()

            if p.invoice_id:
                invoice = db.query(Invoice).filter(Invoice.id == p.invoice_id).first()
                if invoice:
                    invoice.amount_paid += p.amount
                    invoice.balance_due = max(0, invoice.total_amount - invoice.amount_paid)
                    if invoice.balance_due == 0:
                        invoice.status = InvoiceStatus.PAID
                    elif invoice.amount_paid > 0:
                        invoice.status = InvoiceStatus.PARTIAL

            household = db.query(Household).filter(Household.id == p.household_id).first()
            if household:
                household.outstanding_balance = max(0, household.outstanding_balance - p.amount)

            payment_results.append(SyncResultItem(
                client_id=p.client_id, server_id=str(payment.id), success=True,
            ))
        except Exception as e:
            payment_results.append(SyncResultItem(client_id=p.client_id, success=False, error=str(e)))

    db.commit()

    return SyncResponse(
        readings=reading_results,
        payments=payment_results,
        synced_at=datetime.utcnow(),
    )
