from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "CWIP - Community Water Intelligence Platform"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://cwip:cwip@localhost:5432/cwip"

    # JWT
    SECRET_KEY: str = "dev-secret-key-change-in-production"
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
