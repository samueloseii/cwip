import os
import secrets
from pathlib import Path

from pydantic_settings import BaseSettings

DATA_DIR = Path("/data")


def _on_persistent_volume() -> bool:
    """True when a hosted deployment mounted a writable volume at /data."""
    return DATA_DIR.is_dir() and os.access(DATA_DIR, os.W_OK)


def _default_database_url() -> str:
    if _on_persistent_volume():
        return f"sqlite:///{DATA_DIR / 'flow.db'}"
    return "postgresql://cwip:cwip@localhost:5432/cwip"


def _default_secret_key() -> str:
    """Persist a generated key so tokens survive restarts of a hosted instance."""
    if not _on_persistent_volume():
        return "dev-secret-key-change-in-production"
    key_file = DATA_DIR / "secret_key"
    if not key_file.exists():
        key_file.write_text(secrets.token_urlsafe(48))
    return key_file.read_text().strip()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Flow — Community Water Management"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = _default_database_url()

    # JWT
    SECRET_KEY: str = _default_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # AI / OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # App
    DEFAULT_CURRENCY: str = "USD"
    SUPPORTED_CURRENCIES: list[str] = ["USD", "NIO", "HNL"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
