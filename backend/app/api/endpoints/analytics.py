import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.analytics import (
    detect_consumption_anomalies,
    get_financial_sustainability_alerts,
    get_payment_risk_scores,
    prioritize_maintenance,
)
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


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
