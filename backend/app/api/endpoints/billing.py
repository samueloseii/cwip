import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLES, get_current_user, require_role
from app.db.session import get_db
from app.models.billing import Invoice, InvoiceStatus, Payment
from app.models.community import Community
from app.models.household import Household, HouseholdStatus
from app.models.meter import Meter, MeterReading
from app.models.user import User
from app.schemas.billing import (
    InvoiceCreate,
    InvoiceGenerateRequest,
    InvoiceGenerateResult,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
)

router = APIRouter(prefix="/billing", tags=["billing"])

UNPAID_STATUSES = (InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE)


def _generate_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count()
    return f"INV-{count + 1:06d}"


def _apply_to_invoice(invoice: Invoice, amount: float) -> None:
    invoice.amount_paid = round(invoice.amount_paid + amount, 2)
    invoice.balance_due = round(max(0.0, invoice.total_amount - invoice.amount_paid), 2)
    if invoice.balance_due == 0:
        invoice.status = InvoiceStatus.PAID
    elif invoice.amount_paid > 0:
        invoice.status = InvoiceStatus.PARTIAL


def _invoice_response(invoice: Invoice, household: Household | None) -> InvoiceResponse:
    response = InvoiceResponse.model_validate(invoice)
    if household:
        response.household_name = household.head_of_household
        response.account_number = household.account_number
        response.community_id = household.community_id
    return response


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    household_id: uuid.UUID | None = Query(None),
    community_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    unpaid_only: bool = Query(False),
    period_start: datetime | None = Query(None),
    period_end: datetime | None = Query(None),
    search: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Invoice, Household).join(Household, Invoice.household_id == Household.id)
    if household_id:
        query = query.filter(Invoice.household_id == household_id)
    if community_id:
        query = query.filter(Household.community_id == community_id)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)
    if unpaid_only:
        query = query.filter(Invoice.status.in_(UNPAID_STATUSES))
    if period_start:
        query = query.filter(Invoice.billing_period_end >= period_start)
    if period_end:
        query = query.filter(Invoice.billing_period_start <= period_end)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Household.head_of_household.ilike(term),
                Household.account_number.ilike(term),
                Invoice.invoice_number.ilike(term),
            )
        )
    rows = (
        query.order_by(Invoice.billing_period_start.desc(), Household.account_number)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_invoice_response(invoice, household) for invoice, household in rows]


@router.post("/invoices/generate", response_model=InvoiceGenerateResult)
def generate_invoices(
    payload: InvoiceGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    """Bill every active household with a reading in the period, using community tariffs."""
    community = db.query(Community).filter(Community.id == payload.community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    households = (
        db.query(Household)
        .filter(Household.community_id == community.id)
        .filter(Household.status == HouseholdStatus.ACTIVE)
        .order_by(Household.account_number)
        .all()
    )

    created: list[Invoice] = []
    skipped_existing = 0
    skipped_no_reading = 0

    for household in households:
        already = (
            db.query(Invoice)
            .filter(Invoice.household_id == household.id)
            .filter(Invoice.billing_period_start == payload.billing_period_start)
            .first()
        )
        if already:
            skipped_existing += 1
            continue

        meter = db.query(Meter).filter(Meter.household_id == household.id).first()
        consumption = 0.0
        if meter:
            consumption = (
                db.query(func.coalesce(func.sum(MeterReading.consumption_m3), 0.0))
                .filter(MeterReading.meter_id == meter.id)
                .filter(MeterReading.reading_date >= payload.billing_period_start)
                .filter(MeterReading.reading_date <= payload.billing_period_end)
                .scalar()
            )
        if not meter or consumption <= 0:
            skipped_no_reading += 1
            continue

        variable_charge = round(consumption * community.tariff_per_m3, 2)
        total = round(community.tariff_fixed + variable_charge, 2)
        invoice = Invoice(
            invoice_number=_generate_invoice_number(db),
            billing_period_start=payload.billing_period_start,
            billing_period_end=payload.billing_period_end,
            consumption_m3=consumption,
            fixed_charge=community.tariff_fixed,
            variable_charge=variable_charge,
            total_amount=total,
            balance_due=total,
            currency=community.currency,
            due_date=payload.due_date,
            household_id=household.id,
        )
        db.add(invoice)
        db.flush()
        household.outstanding_balance += total
        created.append(invoice)

    db.commit()
    for invoice in created:
        db.refresh(invoice)

    by_id = {h.id: h for h in households}
    return InvoiceGenerateResult(
        created=len(created),
        skipped_existing=skipped_existing,
        skipped_no_reading=skipped_no_reading,
        invoices=[_invoice_response(inv, by_id.get(inv.household_id)) for inv in created],
    )


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    invoice = Invoice(
        invoice_number=_generate_invoice_number(db),
        billing_period_start=payload.billing_period_start,
        billing_period_end=payload.billing_period_end,
        consumption_m3=payload.consumption_m3,
        fixed_charge=payload.fixed_charge,
        variable_charge=payload.variable_charge,
        total_amount=payload.total_amount,
        balance_due=payload.total_amount,
        currency=payload.currency,
        due_date=payload.due_date,
        household_id=payload.household_id,
        notes=payload.notes,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/payments", response_model=list[PaymentResponse])
def list_payments(
    household_id: uuid.UUID | None = Query(None),
    community_id: uuid.UUID | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Payment, Household, Invoice)
        .join(Household, Payment.household_id == Household.id)
        .outerjoin(Invoice, Payment.invoice_id == Invoice.id)
    )
    if household_id:
        query = query.filter(Payment.household_id == household_id)
    if community_id:
        query = query.filter(Household.community_id == community_id)
    rows = (
        query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
    )
    results = []
    for payment, household, invoice in rows:
        response = PaymentResponse.model_validate(payment)
        response.household_name = household.head_of_household
        response.account_number = household.account_number
        response.invoice_number = invoice.invoice_number if invoice else None
        results.append(response)
    return results


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    payment = Payment(**payload.model_dump())
    db.add(payment)

    if payload.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
        if invoice:
            _apply_to_invoice(invoice, payload.amount)
    else:
        # Settle the household's oldest outstanding invoices first.
        outstanding = (
            db.query(Invoice)
            .filter(Invoice.household_id == payload.household_id)
            .filter(Invoice.status.in_(UNPAID_STATUSES))
            .order_by(Invoice.billing_period_end)
            .all()
        )
        remaining = payload.amount
        for invoice in outstanding:
            if remaining <= 0:
                break
            applied = min(remaining, invoice.balance_due)
            _apply_to_invoice(invoice, applied)
            remaining -= applied
            if payment.invoice_id is None:
                payment.invoice_id = invoice.id

    # Update household outstanding balance
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if household:
        household.outstanding_balance = max(0, household.outstanding_balance - payload.amount)

    db.commit()
    db.refresh(payment)
    return payment


class BillDetail(BaseModel):
    household_name: str
    account_number: str
    community_name: str
    country: str
    currency: str
    invoice_number: str
    period: str
    consumption_m3: float
    fixed_charge: float
    variable_charge: float
    total_amount: float
    amount_paid: float
    balance_due: float
    status: str
    due_date: str
    previous_reading: float | None = None
    current_reading: float | None = None


@router.get("/bill/{invoice_id}", response_model=BillDetail)
def get_printable_bill(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    household = db.query(Household).filter(Household.id == invoice.household_id).first()
    community = db.query(Community).filter(Community.id == household.community_id).first() if household else None

    meter = db.query(Meter).filter(Meter.household_id == invoice.household_id).first() if household else None
    readings = []
    if meter:
        readings = (
            db.query(MeterReading)
            .filter(MeterReading.meter_id == meter.id)
            .order_by(MeterReading.reading_date.desc())
            .limit(2)
            .all()
        )

    current_reading = readings[0].reading_value if len(readings) > 0 else None
    previous_reading = readings[1].reading_value if len(readings) > 1 else (readings[0].previous_value if readings else None)

    period_str = f"{invoice.billing_period_start.strftime('%b %d')} - {invoice.billing_period_end.strftime('%b %d, %Y')}"

    return BillDetail(
        household_name=household.head_of_household if household else "Unknown",
        account_number=household.account_number if household else "N/A",
        community_name=community.name if community else "Unknown",
        country=community.country if community else "",
        currency=invoice.currency,
        invoice_number=invoice.invoice_number,
        period=period_str,
        consumption_m3=invoice.consumption_m3,
        fixed_charge=invoice.fixed_charge,
        variable_charge=invoice.variable_charge,
        total_amount=invoice.total_amount,
        amount_paid=invoice.amount_paid,
        balance_due=invoice.balance_due,
        status=invoice.status.value,
        due_date=invoice.due_date.strftime('%b %d, %Y'),
        previous_reading=previous_reading,
        current_reading=current_reading,
    )
