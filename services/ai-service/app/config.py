"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://nepal:nepal_dev_password@localhost:5432/nepal_progress"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # AI / Anthropic
    anthropic_api_key: str = ""
    default_model: str = "claude-sonnet-4-20250514"
    max_tokens_default: int = 4096

    # API gateway (the Node/Next API service)
    api_service_url: str = "http://localhost:3001"

    # Rate limiting
    llm_max_requests_per_minute: int = 40
    llm_retry_max_attempts: int = 3
    llm_retry_base_delay: float = 1.0

    # Workers
    research_queue: str = "ai-research"
    anomaly_queue: str = "anomaly-analysis"
    confidence_queue: str = "confidence-recompute"
    worker_poll_interval: float = 1.0

    # Research scraping
    scrape_timeout: float = 15.0
    scrape_user_agent: str = (
        "NepalProgressBot/1.0 (+https://nepalprogress.gov.np/bot)"
    )

    # Embeddings
    embedding_dimensions: int = 1536

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
