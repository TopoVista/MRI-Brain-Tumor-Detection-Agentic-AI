from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8")

    app_name: str = Field(default="Agentic MRI Analysis Copilot API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    api_prefix: str = Field(default="/api", alias="API_PREFIX")
    jwt_secret: str = Field(default="change-me", alias="JWT_SECRET")
    jwt_expire_minutes: int = Field(default=120, alias="JWT_EXPIRE_MINUTES")
    sqlite_path: str = Field(default="storage/mri_copilot.db", alias="SQLITE_PATH")
    chroma_path: str = Field(default="chroma", alias="CHROMA_PATH")
    storage_path: str = Field(default="storage/uploads", alias="STORAGE_PATH")
    mri_model_path: str = Field(default="", alias="MRI_MODEL_PATH")
    cnn_model_path: str = Field(default="", alias="CNN_MODEL_PATH")
    resnet50_model_path: str = Field(default="", alias="RESNET50_MODEL_PATH")
    vgg16_model_path: str = Field(default="", alias="VGG16_MODEL_PATH")
    inception_v3_model_path: str = Field(default="", alias="INCEPTION_V3_MODEL_PATH")
    mri_confidence_threshold: float = Field(default=0.72, alias="MRI_CONFIDENCE_THRESHOLD")
    top_k_literature: int = Field(default=3, alias="TOP_K_LITERATURE")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    llm_provider: str = Field(default="local", alias="LLM_PROVIDER")
    openai_model: str = Field(default="gpt-5-mini", alias="OPENAI_MODEL")
    cloudinary_cloud_name: str = Field(default="", alias="CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: str = Field(default="", alias="CLOUDINARY_API_KEY")
    cloudinary_api_secret: str = Field(default="", alias="CLOUDINARY_API_SECRET")
    demo_username: str = Field(default="admin", alias="DEMO_USERNAME")
    demo_password: str = Field(default="admin123", alias="DEMO_PASSWORD")

    @property
    def sqlite_url(self) -> str:
        return f"sqlite:///{BASE_DIR / self.sqlite_path}"

    @property
    def chroma_dir(self) -> Path:
        return BASE_DIR / self.chroma_path

    @property
    def storage_dir(self) -> Path:
        return BASE_DIR / self.storage_path

    @property
    def model_path(self) -> Path | None:
        if not self.mri_model_path:
            return None
        return BASE_DIR / self.mri_model_path

    def resolve_model_path(self, relative_path: str) -> Path | None:
        if not relative_path:
            return None
        return BASE_DIR / relative_path


@lru_cache
def get_settings() -> Settings:
    return Settings()
