"""Redis connection for queues and caching."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return the global Redis client."""
    if _redis is None:
        raise RuntimeError("Redis not initialised. Call connect_redis() first.")
    return _redis


async def connect_redis() -> aioredis.Redis:
    """Create and verify the async Redis connection."""
    global _redis
    _redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )
    # Verify connection
    await _redis.ping()
    logger.info("Redis connection established at %s", settings.redis_url)
    return _redis


async def disconnect_redis() -> None:
    """Close the Redis connection."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        logger.info("Redis connection closed")


async def enqueue(queue_name: str, payload: dict[str, Any]) -> None:
    """Push a job payload onto a Redis list (queue)."""
    r = await get_redis()
    await r.lpush(queue_name, json.dumps(payload))
    logger.debug("Enqueued job on %s: %s", queue_name, payload.get("job_id", "?"))


async def dequeue(queue_name: str, timeout: float = 0) -> Optional[dict[str, Any]]:
    """Blocking pop from a Redis list queue. Returns parsed dict or None."""
    r = await get_redis()
    result = await r.brpop(queue_name, timeout=int(timeout))
    if result is None:
        return None
    _, raw = result
    return json.loads(raw)


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    """Set a cached value with TTL (seconds)."""
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value, returning None on miss."""
    r = await get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    return json.loads(raw)
