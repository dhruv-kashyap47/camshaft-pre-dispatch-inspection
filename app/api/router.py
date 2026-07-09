from fastapi import APIRouter

from app.api.routes import admin, auth, blob_photos, engine, export, investigation, manager, notifications, operator, reports, upload

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(operator.router, prefix="/operator", tags=["operator"])
api_router.include_router(manager.router, prefix="/manager", tags=["manager"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(investigation.router, prefix="/investigation", tags=["investigation"])
api_router.include_router(engine.router, prefix="/engine", tags=["engine"])
api_router.include_router(blob_photos.router, prefix="", tags=["photos"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(notifications.router, prefix="", tags=["notifications"])
