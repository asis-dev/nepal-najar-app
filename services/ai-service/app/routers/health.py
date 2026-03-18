"""Health check endpoint with dependency status."""

from __future__ import annotations

import time

from fastapi import APIRouter

from app.db.connection import get_pool
from app.db.redis_client import get_redis

router = APIRouter()

_start_time = time.monotonic()


@router.get("/health")
async def health_check():
    """Full health check with dependency probing."""
    pg_ok = False
    redis_ok = False

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        pg_ok = True
    except Exception:
        pass

    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        pass

    uptime = time.monotonic() - _start_time
    overall = "ok" if (pg_ok and redis_ok) else "degraded"

    return {
        "status": overall,
        "service": "nepal-progress-ai-service",
        "version": "0.1.0",
        "postgres_connected": pg_ok,
        "redis_connected": redis_ok,
        "uptime_seconds": round(uptime, 1),
    }
