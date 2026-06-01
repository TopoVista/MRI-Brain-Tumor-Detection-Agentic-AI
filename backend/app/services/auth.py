from datetime import UTC, datetime, timedelta

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.memory.database import UserRecord, get_session


settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


def authenticate_user(username: str, password: str) -> bool:
    with get_session() as session:
        user = session.query(UserRecord).filter(UserRecord.username == username, UserRecord.is_active.is_(True)).first()
        if user is None:
            return False
        return pwd_context.verify(password, user.password_hash)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_default_user() -> None:
    username = settings.admin_username.strip()
    if not username:
        return

    with get_session() as session:
        existing = session.query(UserRecord).filter(UserRecord.username == username).first()
        if existing is not None:
            return

        password_hash = settings.admin_password_hash.strip()
        if not password_hash and settings.admin_password:
            password_hash = hash_password(settings.admin_password)
        if not password_hash:
            return

        session.add(
            UserRecord(
                username=username,
                password_hash=password_hash,
                is_active=True,
            )
        )
        session.commit()


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
