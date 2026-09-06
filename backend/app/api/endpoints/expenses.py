import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLES, require_role
from app.db.session import get_db
from app.models.community import Community
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseSummary,
    ExpenseUpdate,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _response(expense: Expense, community: Community | None) -> ExpenseResponse:
    response = ExpenseResponse.model_validate(expense)
    if community:
        response.community_name = community.name
    return response


def _filtered(
    db: Session,
    community_id: uuid.UUID | None,
    category: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
):
    query = db.query(Expense, Community).outerjoin(Community, Community.id == Expense.community_id)
    if community_id:
        query = query.filter(Expense.community_id == community_id)
    if category:
        query = query.filter(Expense.category == category)
    if date_from:
        query = query.filter(Expense.expense_date >= date_from)
    if date_to:
        query = query.filter(Expense.expense_date <= date_to)
    return query


@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(
    community_id: uuid.UUID | None = Query(None),
    category: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    rows = (
        _filtered(db, community_id, category, date_from, date_to)
        .order_by(Expense.expense_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_response(expense, community) for expense, community in rows]


@router.get("/summary", response_model=ExpenseSummary)
def expense_summary(
    community_id: uuid.UUID | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    rows = _filtered(db, community_id, None, date_from, date_to).all()
    by_category: dict[str, float] = {}
    by_currency: dict[str, float] = {}
    total = 0.0
    for expense, _community in rows:
        by_category[expense.category.value] = round(
            by_category.get(expense.category.value, 0.0) + expense.amount, 2
        )
        by_currency[expense.currency] = round(
            by_currency.get(expense.currency, 0.0) + expense.amount, 2
        )
        total += expense.amount
    # Totals only mean something in a single currency, so report the mix as well.
    currency = next(iter(by_currency), "USD") if len(by_currency) == 1 else "mixed"
    return ExpenseSummary(
        total=round(total, 2),
        currency=currency,
        by_category=by_category,
        by_currency=by_currency,
        count=len(rows),
    )


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    community = db.query(Community).filter(Community.id == payload.community_id).first()
    if not community:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    expense = Expense(**payload.model_dump(), recorded_by=current_user.full_name)
    expense.currency = community.currency
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _response(expense, community)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return _response(expense, expense.community)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ADMIN_ROLES)),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    db.delete(expense)
    db.commit()
