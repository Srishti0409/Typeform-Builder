from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "Teraform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/teraform.db"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    DEFAULT_CREATOR_ID: str = "default-creator-001"

    class Config:
        env_file = ".env"


settings = Settings()
