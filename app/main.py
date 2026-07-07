from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["health"])
async def healthcheck():
    return {"status": "ok", "service": settings.app_name}
