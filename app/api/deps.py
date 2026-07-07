from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Role, User

DBSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DBSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization format. Use: Bearer <token>")

    token = parts[1]
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "role", "exp", "iat"]},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user_id = payload.get("sub")
    token_role = payload.get("role")
    if not user_id or not token_role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing required claims")

    try:
        user = db.scalar(select(User).where(User.id == int(user_id)))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user identifier in token")

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    role = db.scalar(select(Role).where(Role.id == user.role_id))
    if not role or role.name != token_role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token role mismatch")

    return user


def require_role(*allowed_roles: str):
    def dependency(current_user: Annotated[User, Depends(get_current_user)], db: DBSession) -> User:
        role = db.scalar(select(Role).where(Role.id == current_user.role_id))
        if not role or role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires one of these roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return dependency
