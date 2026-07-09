from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="CamTrace API", alias="APP_NAME")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")

    # Security
    secret_key: str = Field(default="", alias="SECRET_KEY")

    @property
    def has_secure_key(self) -> bool:
        return len(self.secret_key) >= 32

    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=480, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Database
    oracle_dsn: str = Field(default="", alias="ORACLE_DSN")
    allow_dev_sqlite_fallback: bool = Field(default=True, alias="ALLOW_DEV_SQLITE_FALLBACK")
    dev_sqlite_url: str = Field(default="sqlite:///./camtrace-dev.db", alias="DEV_SQLITE_URL")

    # File/image paths (legacy; BLOB storage preferred)
    lan_image_root: str = Field(default=r"\\fileserver\camtrace\inspection_photos", alias="LAN_IMAGE_ROOT")
    local_image_root: str = Field(default="./uploads/inspection_photos", alias="LOCAL_IMAGE_ROOT")

    # CORS
    cors_origins_str: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")

    # Business rules
    default_manager_override_window_hours: int = Field(default=12, alias="DEFAULT_MANAGER_OVERRIDE_WINDOW_HOURS")
    report_timezone: str = Field(default="Asia/Kolkata", alias="REPORT_TIMEZONE")
    max_inspection_photos: int = Field(default=50, alias="MAX_INSPECTION_PHOTOS")
    inspection_lock_timeout_seconds: int = Field(default=300, alias="INSPECTION_LOCK_TIMEOUT_SECONDS")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_str.split(",") if o.strip()]

    @property
    def is_oracle(self) -> bool:
        return bool(self.oracle_dsn)

    @property
    def database_url(self) -> str:
        if self.oracle_dsn and not self.allow_dev_sqlite_fallback:
            return self.oracle_dsn
        return self.dev_sqlite_url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
