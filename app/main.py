from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.init_db import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    if not settings.has_secure_key:
        import logging
        logging.warning("CRITICAL: SECRET_KEY is not set or is too short (min 32 chars). Use a strong key in production.")
    initialize_database()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


@app.get("/health", tags=["health"])
async def healthcheck():
    return {"status": "ok", "service": settings.app_name}


# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    import traceback
    logging.getLogger(__name__).error(
        "Unhandled exception: %s\n%s", exc, "".join(traceback.format_tb(exc.__traceback__))
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please contact system administrator."},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)
