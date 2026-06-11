import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.billing import Invoice, InvoiceStatus, Payment
from app.models.household import Household
from app.models.user import User, UserRole
from app.schemas.billing import InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse

router = APIRouter(prefix="/billing", tags=["billing"])


def _generate_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count()
    return f"INV-{count + 1:06d}"


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    household_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Invoice)
    if household_id:
        query = query.filter(Invoice.household_id == household_id)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)
    return query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.TREASURER)
    ),
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
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Payment)
    if household_id:
        query = query.filter(Payment.household_id == household_id)
    return query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN, UserRole.COMMUNITY_ADMIN, UserRole.TREASURER)
    ),
):
    payment = Payment(**payload.model_dump())
    db.add(payment)

    # Update invoice balance if linked
    if payload.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
        if invoice:
            invoice.amount_paid += payload.amount
            invoice.balance_due = max(0, invoice.total_amount - invoice.amount_paid)
            if invoice.balance_due == 0:
                invoice.status = InvoiceStatus.PAID
            elif invoice.amount_paid > 0:
                invoice.status = InvoiceStatus.PARTIAL

    # Update household outstanding balance
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if household:
        household.outstanding_balance = max(0, household.outstanding_balance - payload.amount)

    db.commit()
    db.refresh(payment)
    return payment
