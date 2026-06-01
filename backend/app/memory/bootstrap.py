from app.core.config import get_settings
from app.memory.database import Base, engine
from app.services.auth import seed_default_user


def bootstrap_storage() -> None:
    settings = get_settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    seed_default_user()
