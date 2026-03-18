"""PostgreSQL connection pool using asyncpg."""

from __future__ import annotations

import logging
from typing import Optional

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Return the global connection pool, raising if not initialised."""
    if _pool is None:
        raise RuntimeError("Database pool not initialised. Call connect_db() first.")
    return _pool


async def connect_db() -> asyncpg.Pool:
    """Create the asyncpg connection pool."""
    global _pool
    dsn = settings.database_url
    # asyncpg expects postgresql:// not postgres://
    if dsn.startswith("postgres://"):
        dsn = dsn.replace("postgres://", "postgresql://", 1)
    _pool = await asyncpg.create_pool(
        dsn=dsn,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    # Ensure pgvector extension is available
    async with _pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    logger.info("PostgreSQL connection pool created (%s connections)", _pool.get_size())
    return _pool


async def disconnect_db() -> None:
    """Close all connections in the pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL connection pool closed")


async def fetch_one(query: str, *args) -> Optional[asyncpg.Record]:
    """Execute a query and return a single row."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def fetch_all(query: str, *args) -> list[asyncpg.Record]:
    """Execute a query and return all rows."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def execute(query: str, *args) -> str:
    """Execute a statement and return the status string."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)
