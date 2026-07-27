import json

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "Typeform Builder"
    API_V1_STR: str = "/api/v1"
    # SQLite by default, which is what local development runs on. Deployments set
    # this to a Postgres URL; app/core/database.py adapts the driver to match.
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/teraform.db"
    # Browser origins the API answers. Held as a string and parsed below so that
    # either a comma-separated list or a JSON array can be set in the
    # environment — a hosting dashboard's plain "a,b" is the likelier input, and
    # a strict JSON-only field would fail the deploy at startup.
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DEFAULT_CREATOR_ID: str = "default-creator-001"
    # Where a published form is answerable. The share link the publish endpoint
    # hands back is built from this, so it has to be the frontend's origin rather
    # than the API's.
    PUBLIC_FORM_BASE_URL: str = "http://localhost:3000"

    # "Create with AI". The key comes from the environment and has no default, so
    # none is ever committed and the feature simply reports itself unavailable
    # until one is set. ANTHROPIC_API_KEY is accepted too, so an environment that
    # already has one configured works without further setup.
    AI_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("AI_API_KEY", "ANTHROPIC_API_KEY"),
    )
    AI_BASE_URL: str = "https://api.anthropic.com/v1"
    AI_MODEL: str = "claude-sonnet-5"
    # A form the creator has to scroll through isn't a helpful starting point, and
    # this also bounds what one request can insert.
    AI_MAX_QUESTIONS: int = 12
    AI_TIMEOUT_SECONDS: int = 60

    @property
    def allowed_origins(self) -> list[str]:
        """ALLOWED_ORIGINS as CORS wants it, from either accepted format."""
        raw = self.ALLOWED_ORIGINS.strip()
        if not raw:
            return []
        if raw.startswith("["):
            return [str(origin).rstrip("/") for origin in json.loads(raw)]
        # A trailing slash makes an origin no longer match the browser's, which
        # is a silent, confusing CORS failure — so trim it here.
        return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
