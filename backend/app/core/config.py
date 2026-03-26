from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    minio_endpoint: str = Field(default="", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(default="", alias="MINIO_BUCKET")
    secret_key: str = Field(alias="SECRET_KEY")
    fernet_key: str = Field(alias="FERNET_KEY")
    datajud_api_key: str = Field(alias="DATAJUD_API_KEY")
    crm_email: str = Field(alias="CRM_EMAIL")
    crm_password: str = Field(alias="CRM_PASSWORD")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    backend_cors_origins: str = Field(default="", alias="BACKEND_CORS_ORIGINS")
    frontend_dist: str = Field(default="", alias="FRONTEND_DIST")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @property
    def minio_endpoint_url(self) -> str:
        if not self.minio_endpoint.strip():
            return ""
        if self.minio_endpoint.startswith(("http://", "https://")):
            return self.minio_endpoint
        return f"http://{self.minio_endpoint}"

    @property
    def storage_enabled(self) -> bool:
        required_values = (
            self.minio_endpoint.strip(),
            self.minio_access_key.strip(),
            self.minio_secret_key.strip(),
            self.minio_bucket.strip(),
        )
        return all(required_values)

    @property
    def cors_origins(self) -> list[str]:
        if self.is_development and not self.backend_cors_origins.strip():
            return ["*"]
        return [origin.strip().rstrip("/") for origin in self.backend_cors_origins.split(",") if origin.strip()]

    @property
    def frontend_dist_path(self) -> Path | None:
        value = self.frontend_dist.strip()
        if not value:
            return None
        return Path(value).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
