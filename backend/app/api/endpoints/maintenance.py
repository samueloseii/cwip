import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.maintenance import MaintenanceRecord
from app.models.user import User, UserRole
from app.schemas.maintenance import MaintenanceCreate, MaintenanceResponse, MaintenanceUpdate

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/", response_model=list[MaintenanceResponse])
def list_maintenance(
    community_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MaintenanceRecord)
    if community_id:
        query = query.filter(MaintenanceRecord.community_id == community_id)
    if status_filter:
        query = query.filter(MaintenanceRecord.status == status_filter)
    if priority:
        query = query.filter(MaintenanceRecord.priority == priority)
    return query.order_by(MaintenanceRecord.reported_date.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN,
            UserRole.COMMUNITY_ADMIN, UserRole.OPERATOR,
        )
    ),
):
    record = MaintenanceRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}", response_model=MaintenanceResponse)
def get_maintenance(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return record


@router.patch("/{record_id}", response_model=MaintenanceResponse)
def update_maintenance(
    record_id: uuid.UUID,
    payload: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.SUPER_ADMIN, UserRole.PARTNER_ADMIN,
            UserRole.COMMUNITY_ADMIN, UserRole.OPERATOR,
        )
    ),
):
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record
