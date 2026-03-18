"""Redis queue consumer for ai-research queue.

Processes research jobs: ministry scans, project scans, and project discovery.
Run as a standalone process: python -m app.workers.research_worker
"""

from __future__ import annotations

import asyncio
import logging
import signal
import sys
from datetime import datetime, timezone

from app.config import settings
from app.db.connection import connect_db, disconnect_db
from app.db.redis_client import connect_redis, dequeue, disconnect_redis
from app.db import connection as db
from app.services.researcher import discover_projects, run_ministry_scan, run_project_scan

logger = logging.getLogger(__name__)

_running = True


def _handle_signal(sig, frame):
    global _running
    logger.info("Received signal %s, shutting down gracefully...", sig)
    _running = False


async def process_job(payload: dict) -> None:
    """Process a single research job from the queue."""
    job_id = payload.get("job_id", "unknown")
    job_type = payload.get("job_type")
    scope_type = payload.get("scope_type")
    scope_id = payload.get("scope_id")

    logger.info("Processing research job %s: type=%s scope=%s:%s", job_id, job_type, scope_type, scope_id)

    # Mark as running
    await db.execute(
        "UPDATE research_jobs SET status = 'running' WHERE id = $1",
        job_id,
    )

    try:
        if job_type == "ministry_scan":
            result = await run_ministry_scan(scope_id)
        elif job_type in ("source_scan", "project_scan"):
            result = await run_project_scan(scope_id)
        elif job_type == "discovery":
            result = await discover_projects(scope_id if scope_id != "all" else None)
        else:
            raise ValueError(f"Unknown job type: {job_type}")

        # Store findings count
        findings_count = len(result.get("findings", result.get("projects", [])))

        # Mark as completed
        await db.execute(
            """
            UPDATE research_jobs
            SET status = 'completed', completed_at = $1,
                result_summary = $2
            WHERE id = $3
            """,
            datetime.now(timezone.utc),
            f"Found {findings_count} results",
            job_id,
        )
        logger.info("Job %s completed: %d findings", job_id, findings_count)

    except Exception as exc:
        logger.exception("Job %s failed: %s", job_id, exc)
        await db.execute(
            """
            UPDATE research_jobs
            SET status = 'failed', error = $1, completed_at = $2
            WHERE id = $3
            """,
            str(exc)[:500],
            datetime.now(timezone.utc),
            job_id,
        )


async def run_worker() -> None:
    """Main worker loop: connect to services and consume from the research queue."""
    global _running

    logger.info("Starting research worker, queue=%s", settings.research_queue)
    await connect_db()
    await connect_redis()

    try:
        while _running:
            payload = await dequeue(settings.research_queue, timeout=settings.worker_poll_interval)
            if payload is None:
                continue

            try:
                await process_job(payload)
            except Exception:
                logger.exception("Unhandled error processing research job")
    finally:
        await disconnect_redis()
        await disconnect_db()
        logger.info("Research worker shut down")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
