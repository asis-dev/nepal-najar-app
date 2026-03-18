"""Redis queue consumer for confidence-recompute queue.

Recomputes confidence scores for projects on demand.
Run as a standalone process: python -m app.workers.confidence_worker
"""

from __future__ import annotations

import asyncio
import logging
import signal

from app.config import settings
from app.db.connection import connect_db, disconnect_db
from app.db.redis_client import connect_redis, dequeue, disconnect_redis
from app.services.confidence_scorer import compute_confidence

logger = logging.getLogger(__name__)

_running = True


def _handle_signal(sig, frame):
    global _running
    logger.info("Received signal %s, shutting down gracefully...", sig)
    _running = False


async def process_job(payload: dict) -> None:
    """Process a single confidence recompute job."""
    project_id = payload.get("project_id")
    if not project_id:
        logger.warning("Confidence job missing project_id: %s", payload)
        return

    logger.info("Recomputing confidence for project %s", project_id)

    try:
        assessment = await compute_confidence(project_id)
        logger.info(
            "Project %s: confidence=%.3f rating=%s",
            project_id, assessment.overall_score, assessment.rating.value,
        )
    except Exception as exc:
        logger.exception("Confidence recompute failed for project %s: %s", project_id, exc)


async def run_worker() -> None:
    """Main worker loop."""
    global _running

    logger.info("Starting confidence worker, queue=%s", settings.confidence_queue)
    await connect_db()
    await connect_redis()

    try:
        while _running:
            payload = await dequeue(settings.confidence_queue, timeout=settings.worker_poll_interval)
            if payload is None:
                continue

            try:
                await process_job(payload)
            except Exception:
                logger.exception("Unhandled error in confidence worker")
    finally:
        await disconnect_redis()
        await disconnect_db()
        logger.info("Confidence worker shut down")


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
