import uuid

from pydantic import BaseModel


class MonthlyPoint(BaseModel):
    month: str
    label: str
    consumption_m3: float
    billed: float
    collected: float
    expenses: float


class AnalyticsTotals(BaseModel):
    billed: float
    collected: float
    expenses: float
    arrears: float
    net_balance: float
    collection_rate: float
    consumption_m3: float
    households: int
    metered_households: int
    open_maintenance: int


class AgingBucket(BaseModel):
    bucket: str
    amount: float
    invoices: int


class TopConsumer(BaseModel):
    household_id: uuid.UUID
    account_number: str
    head_of_household: str
    consumption_m3: float


class StatusSlice(BaseModel):
    status: str
    count: int
    amount: float


class AnalyticsOverview(BaseModel):
    currency: str
    months: list[MonthlyPoint]
    totals: AnalyticsTotals
    aging: list[AgingBucket]
    top_consumers: list[TopConsumer]
    invoice_status: list[StatusSlice]
