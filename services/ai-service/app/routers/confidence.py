"""Confidence scoring endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.db.redis_client import enqueue
from app.models.schemas import (
    BatchRecomputeRequest,
    BatchRecomputeResponse,
    ConfidenceAssessment,
    ConfidenceScoreRequest,
)
from app.services.confidence_scorer import compute_confidence

router = APIRouter()


@router.post("/confidence/compute", response_model=ConfidenceAssessment)
async def compute_confidence_endpoint(request: ConfidenceScoreRequest):
    """Compute or recompute confidence score for a project."""
    return await compute_confidence(request.project_id)


@router.post("/confidence/batch-recompute", response_model=BatchRecomputeResponse)
async def batch_recompute(request: BatchRecomputeRequest):
    """Queue confidence recomputation for multiple projects.

    If no project_ids given, queues all active projects.
    """
    if request.project_ids:
        ids = request.project_ids
    else:
        from app.db import connection as db
        rows = await db.fetch_all(
            "SELECT id FROM projects WHERE status NOT IN ('completed', 'cancelled')"
        )
        ids = [str(r["id"]) for r in rows]

    for pid in ids:
        await enqueue(settings.confidence_queue, {
            "job_type": "confidence_recompute",
            "project_id": pid,
        })

    return BatchRecomputeResponse(status="queued", jobs_queued=len(ids))
