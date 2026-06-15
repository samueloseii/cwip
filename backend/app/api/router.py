from fastapi import APIRouter

from app.api.endpoints import analytics, auth, billing, communities, dashboard, households, maintenance, meters, sync

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(communities.router)
api_router.include_router(households.router)
api_router.include_router(meters.router)
api_router.include_router(billing.router)
api_router.include_router(maintenance.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(sync.router)
