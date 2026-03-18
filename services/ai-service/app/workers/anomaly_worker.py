"""Redis queue consumer for anomaly-analysis queue.

Processes anomaly detection jobs on projects.
Run as a standalone process: python -m app.workers.anomaly_worker
"""

from __future__ import annotations

import asyncio
import logging
import signal
from datetime import datetime, timezone

from app.config import settings
from app.db.connection import connect_db, disconnect_db
from app.db.redis_client import connect_redis, dequeue, disconnect_redis
from app.db import connection as db
from app.services.anomaly_detector import run_anomaly_checks

logger = logging.getLogger(__name__)

_running = True


def _handle_signal(sig, frame):
    global _running
    logger.info("Received signal %s, shutting down gracefully...", sig)
    _running = False


async def process_job(payload: dict) -> None:
    """Process a single anomaly detection job."""
    project_id = payload.get("project_id")
    check_types = payload.get("check_types")  # None means all
    job_id = payload.get("job_id", "inline")

    if not project_id:
        logger.warning("Anomaly job missing project_id: %s", payload)
        return

    logger.info("Running anomaly checks for project %s (job=%s)", project_id, job_id)

    try:
        anomalies = await run_anomaly_checks(project_id, check_types)
        logger.info(
            "Project %s: found %d anomalies",
            project_id, len(anomalies),
        )

        # If this was triggered by a batch scan, update tracking
        if payload.get("batch_id"):
            await db.execute(
                """
                UPDATE anomaly_scan_batches
                SET projects_completed = projects_completed + 1,
                    anomalies_found = anomalies_found + $1
                WHERE id = $2
                """,
                len(anomalies), payload["batch_id"],
            )

    except Exception as exc:
        logger.exception("Anomaly check failed for project %s: %s", project_id, exc)


async def run_worker() -> None:
    """Main worker loop."""
    global _running

    logger.info("Starting anomaly worker, queue=%s", settings.anomaly_queue)
    await connect_db()
    await connect_redis()

    try:
        while _running:
            payload = await dequeue(settings.anomaly_queue, timeout=settings.worker_poll_interval)
            if payload is None:
                continue

            try:
                await process_job(payload)
            except Exception:
                logger.exception("Unhandled error in anomaly worker")
    finally:
        await disconnect_redis()
        await disconnect_db()
        logger.info("Anomaly worker shut down")


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
