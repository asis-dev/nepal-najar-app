"""Nepal Progress AI Intelligence Service -- FastAPI application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.connection import connect_db, disconnect_db
from app.db.redis_client import connect_redis, disconnect_redis
from app.routers import anomaly, chat, confidence, discovery, health, research, summarize, translate

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown: connect to Postgres and Redis on startup, disconnect on shutdown."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    logger.info("Nepal Progress AI Service starting up...")

    # Connect to dependencies
    try:
        await connect_db()
        logger.info("PostgreSQL connected")
    except Exception as exc:
        logger.error("Failed to connect to PostgreSQL: %s", exc)

    try:
        await connect_redis()
        logger.info("Redis connected")
    except Exception as exc:
        logger.error("Failed to connect to Redis: %s", exc)

    yield

    # Shutdown
    logger.info("Nepal Progress AI Service shutting down...")
    await disconnect_redis()
    await disconnect_db()


app = FastAPI(
    title="Nepal Progress AI Service",
    description=(
        "Intelligence layer for the Nepal Progress platform. "
        "Provides summarization, translation, anomaly detection, "
        "confidence scoring, web research, and project discovery."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(summarize.router, prefix="/api/v1/ai", tags=["summarization"])
app.include_router(translate.router, prefix="/api/v1/ai", tags=["translation"])
app.include_router(anomaly.router, prefix="/api/v1/ai", tags=["anomaly"])
app.include_router(chat.router, prefix="/api/v1/ai", tags=["chat"])
app.include_router(research.router, prefix="/api/v1/ai", tags=["research"])
app.include_router(confidence.router, prefix="/api/v1/ai", tags=["confidence"])
app.include_router(discovery.router, prefix="/api/v1/ai", tags=["discovery"])
