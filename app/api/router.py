from fastapi import APIRouter

from app.api.routes import admin, auth, investigation, manager, operator, reports, upload

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(operator.router, prefix="/operator", tags=["operator"])
api_router.include_router(manager.router, prefix="/manager", tags=["manager"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(investigation.router, prefix="/investigation", tags=["investigation"])
