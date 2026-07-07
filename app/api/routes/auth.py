from fastapi import APIRouter, Depends

from app.api.deps import DBSession
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth import login

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login_endpoint(payload: LoginRequest, db: DBSession):
    return login(db, payload)
