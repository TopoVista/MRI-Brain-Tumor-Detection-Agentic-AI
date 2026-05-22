from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import get_settings


settings = get_settings()


def authenticate_user(username: str, password: str) -> bool:
    return username == settings.demo_username and password == settings.demo_password


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
