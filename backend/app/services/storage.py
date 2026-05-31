import base64
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.core.logging import get_logger


settings = get_settings()
logger = get_logger(__name__)


def _configure_cloudinary() -> bool:
    import cloudinary

    if not all(
        [
            settings.cloudinary_cloud_name,
            settings.cloudinary_api_key,
            settings.cloudinary_api_secret,
        ]
    ):
        return False
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    return True


def store_scan(case_id: str, filename: str, content: bytes) -> str:
    if _configure_cloudinary():
        try:
            import cloudinary.uploader
            from cloudinary.exceptions import Error as CloudinaryError

            result = cloudinary.uploader.upload(
                "data:image/png;base64," + base64.b64encode(content).decode("utf-8"),
                folder="mri-copilot",
                public_id=f"{case_id}-{Path(filename).stem}",
                overwrite=True,
                resource_type="image",
            )
            return str(result["secure_url"])
        except CloudinaryError as exc:
            logger.warning("Cloudinary upload failed, falling back to local storage: %s", exc)

    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix or ".png"
    target = settings.storage_dir / f"{uuid4()}-{case_id}{ext}"
    target.write_bytes(content)
    return str(target)
