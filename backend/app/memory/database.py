from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import get_settings


settings = get_settings()
engine = create_engine(settings.sqlite_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class CaseRecord(Base):
    __tablename__ = "case_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    image_name: Mapped[str] = mapped_column(String(255))
    image_url: Mapped[str] = mapped_column(Text)
    prediction: Mapped[str] = mapped_column(String(64))
    confidence: Mapped[float] = mapped_column(Float)
    report: Mapped[str] = mapped_column(Text)
    verified: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


def get_session() -> Session:
    return SessionLocal()
