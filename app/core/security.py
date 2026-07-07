import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings

PBKDF2_PREFIX = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 600000


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algorithm, iterations, salt, digest = hashed_password.split("$", 3)
    except ValueError:
        return False
    if algorithm != PBKDF2_PREFIX:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        _b64decode(salt),
        int(iterations),
    )
    return hmac.compare_digest(_b64encode(candidate), digest)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{PBKDF2_PREFIX}${PBKDF2_ITERATIONS}${_b64encode(salt)}${_b64encode(digest)}"


def create_access_token(subject: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "role": role, "exp": expires_at, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
