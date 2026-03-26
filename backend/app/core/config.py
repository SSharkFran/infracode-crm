from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    minio_endpoint: str = Field(alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field(alias="MINIO_BUCKET")
    secret_key: str = Field(alias="SECRET_KEY")
    fernet_key: str = Field(alias="FERNET_KEY")
    datajud_api_key: str = Field(alias="DATAJUD_API_KEY")
    crm_email: str = Field(alias="CRM_EMAIL")
    crm_password: str = Field(alias="CRM_PASSWORD")
    environment: str = Field(default="development", alias="ENVIRONMENT")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @property
    def minio_endpoint_url(self) -> str:
        if self.minio_endpoint.startswith(("http://", "https://")):
            return self.minio_endpoint
        return f"http://{self.minio_endpoint}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
