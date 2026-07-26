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
    # Where a published form is answerable. The share link the publish endpoint
    # hands back is built from this, so it has to be the frontend's origin rather
    # than the API's.
    PUBLIC_FORM_BASE_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
