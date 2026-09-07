import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.ai.analytics import (
    detect_consumption_anomalies,
    get_financial_sustainability_alerts,
    get_payment_risk_scores,
    prioritize_maintenance,
)
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.billing import Invoice, InvoiceStatus, Payment
from app.models.community import Community
from app.models.expense import Expense
from app.models.household import Household
from app.models.maintenance import MaintenanceRecord, MaintenanceStatus
from app.models.meter import Meter, MeterReading
from app.models.user import User
from app.schemas.analytics import (
    AgingBucket,
    AnalyticsOverview,
    AnalyticsTotals,
    MonthlyPoint,
    StatusSlice,
    TopConsumer,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

MONTH_LABELS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _month_key(value: datetime) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.get("/overview", response_model=AnalyticsOverview)
def overview(
    community_id: uuid.UUID = Query(...),
    months: int = Query(12, ge=3, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Everything the committee looks at in one call: water in, money in, money out."""
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")

    now = datetime.now(timezone.utc)
    window: list[tuple[str, str]] = []
    cursor = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    for _ in range(months):
        window.append((_month_key(cursor), f"{MONTH_LABELS[cursor.month - 1]} {cursor.year}"))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    window.reverse()
    buckets = {
        key: MonthlyPoint(month=key, label=label, consumption_m3=0.0, billed=0.0, collected=0.0, expenses=0.0)
        for key, label in window
    }
    earliest = datetime.strptime(window[0][0], "%Y-%m").replace(tzinfo=timezone.utc)

    households = db.query(Household).filter(Household.community_id == community_id).all()
    household_ids = [h.id for h in households]
    household_by_id = {h.id: h for h in households}

    meters = (
        db.query(Meter).filter(Meter.household_id.in_(household_ids)).all()
        if household_ids
        else []
    )
    meter_to_household = {m.id: m.household_id for m in meters}

    consumption_by_household: dict[uuid.UUID, float] = {}
    if meters:
        readings = (
            db.query(MeterReading)
            .filter(
                MeterReading.meter_id.in_(list(meter_to_household)),
                MeterReading.reading_date >= earliest,
            )
            .all()
        )
        for reading in readings:
            key = _month_key(_as_utc(reading.reading_date))
            if key in buckets:
                buckets[key].consumption_m3 += reading.consumption_m3 or 0.0
            hh_id = meter_to_household[reading.meter_id]
            consumption_by_household[hh_id] = (
                consumption_by_household.get(hh_id, 0.0) + (reading.consumption_m3 or 0.0)
            )

    invoices = (
        db.query(Invoice).filter(Invoice.household_id.in_(household_ids)).all()
        if household_ids
        else []
    )
    for invoice in invoices:
        key = _month_key(_as_utc(invoice.billing_period_end))
        if key in buckets:
            buckets[key].billed += invoice.total_amount

    payments = (
        db.query(Payment).filter(Payment.household_id.in_(household_ids)).all()
        if household_ids
        else []
    )
    for payment in payments:
        key = _month_key(_as_utc(payment.payment_date))
        if key in buckets:
            buckets[key].collected += payment.amount

    expenses = db.query(Expense).filter(Expense.community_id == community_id).all()
    for expense in expenses:
        key = _month_key(_as_utc(expense.expense_date))
        if key in buckets:
            buckets[key].expenses += expense.amount

    series = [buckets[key] for key, _ in window]
    for point in series:
        point.consumption_m3 = round(point.consumption_m3, 1)
        point.billed = round(point.billed, 2)
        point.collected = round(point.collected, 2)
        point.expenses = round(point.expenses, 2)

    total_billed = sum(i.total_amount for i in invoices)
    total_collected = sum(p.amount for p in payments)
    total_expenses = sum(e.amount for e in expenses)
    total_arrears = sum(i.balance_due for i in invoices if i.status is not InvoiceStatus.CANCELLED)

    aging_definitions = [("Current", 0, 0), ("1-30 days", 1, 30), ("31-60 days", 31, 60), ("61-90 days", 61, 90), ("Over 90 days", 91, 10_000)]
    aging = {name: [0.0, 0] for name, _, _ in aging_definitions}
    for invoice in invoices:
        if invoice.balance_due <= 0 or invoice.status is InvoiceStatus.CANCELLED:
            continue
        overdue_days = (now - _as_utc(invoice.due_date)).days
        for name, low, high in aging_definitions:
            if (overdue_days <= 0 and name == "Current") or (overdue_days > 0 and low <= overdue_days <= high):
                aging[name][0] += invoice.balance_due
                aging[name][1] += 1
                break

    status_totals: dict[str, list[float]] = {}
    for invoice in invoices:
        entry = status_totals.setdefault(invoice.status.value, [0.0, 0.0])
        entry[0] += 1
        entry[1] += invoice.total_amount

    top = sorted(consumption_by_household.items(), key=lambda item: item[1], reverse=True)[:8]

    open_maintenance = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.community_id == community_id,
            MaintenanceRecord.status.in_([MaintenanceStatus.REPORTED, MaintenanceStatus.IN_PROGRESS]),
        )
        .count()
    )

    return AnalyticsOverview(
        currency=community.currency,
        months=series,
        totals=AnalyticsTotals(
            billed=round(total_billed, 2),
            collected=round(total_collected, 2),
            expenses=round(total_expenses, 2),
            arrears=round(total_arrears, 2),
            net_balance=round(total_collected - total_expenses, 2),
            collection_rate=round(total_collected / total_billed * 100, 1) if total_billed else 0.0,
            consumption_m3=round(sum(p.consumption_m3 for p in series), 1),
            households=len(households),
            metered_households=len(meters),
            open_maintenance=open_maintenance,
        ),
        aging=[
            AgingBucket(bucket=name, amount=round(aging[name][0], 2), invoices=int(aging[name][1]))
            for name, _, _ in aging_definitions
        ],
        top_consumers=[
            TopConsumer(
                household_id=hh_id,
                account_number=household_by_id[hh_id].account_number,
                head_of_household=household_by_id[hh_id].head_of_household,
                consumption_m3=round(value, 1),
            )
            for hh_id, value in top
            if hh_id in household_by_id
        ],
        invoice_status=[
            StatusSlice(status=name, count=int(counts[0]), amount=round(counts[1], 2))
            for name, counts in sorted(status_totals.items())
        ],
    )


@router.get("/payment-risk/{community_id}")
def payment_risk(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_payment_risk_scores(db, str(community_id))


@router.get("/consumption-anomalies/{community_id}")
def consumption_anomalies(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return detect_consumption_anomalies(db, str(community_id))


@router.get("/maintenance-priority/{community_id}")
def maintenance_priority(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return prioritize_maintenance(db, str(community_id))


@router.get("/financial-alerts/{community_id}")
def financial_alerts(
    community_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_financial_sustainability_alerts(db, str(community_id))
