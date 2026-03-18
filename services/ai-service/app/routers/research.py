"""Research job endpoints -- web research, source scanning, project discovery."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.db import connection as db
from app.db.redis_client import enqueue
from app.models.schemas import (
    DiscoverProjectsRequest,
    ResearchJobDetail,
    ResearchJobRequest,
    ResearchJobResponse,
    ResearchJobStatus,
)

router = APIRouter()


@router.post("/research/start", response_model=ResearchJobResponse)
async def start_research_job(request: ResearchJobRequest):
    """Queue a new research job."""
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Persist job record
    await db.execute(
        """
        INSERT INTO research_jobs (id, job_type, scope_type, scope_id, status, created_at)
        VALUES ($1, $2, $3, $4, 'queued', $5)
        """,
        job_id, request.job_type.value, request.scope_type.value,
        request.scope_id, now,
    )

    # Enqueue to Redis
    await enqueue(settings.research_queue, {
        "job_id": job_id,
        "job_type": request.job_type.value,
        "scope_type": request.scope_type.value,
        "scope_id": request.scope_id,
    })

    return ResearchJobResponse(
        job_id=job_id,
        status=ResearchJobStatus.QUEUED,
        job_type=request.job_type,
        scope=f"{request.scope_type.value}:{request.scope_id}",
        created_at=now,
    )


@router.get("/research/jobs/{job_id}")
async def get_research_job(job_id: str):
    """Get status and results of a research job."""
    row = await db.fetch_one(
        """
        SELECT id, job_type, scope_type, scope_id, status,
               error, created_at, completed_at
        FROM research_jobs
        WHERE id = $1
        """,
        job_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Research job not found")

    # Fetch associated findings
    findings = await db.fetch_all(
        """
        SELECT finding_type, title, body, source_url, confidence, recommended_action
        FROM research_findings
        WHERE job_id = $1
        """,
        job_id,
    )

    return {
        "job_id": str(row["id"]),
        "status": row["status"],
        "job_type": row["job_type"],
        "scope": f"{row['scope_type']}:{row['scope_id']}",
        "findings": [dict(f) for f in findings],
        "error": row["error"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
    }


@router.post("/research/discover-projects")
async def discover_projects_endpoint(request: DiscoverProjectsRequest):
    """Scan external sources for projects not yet registered in the system.

    Queues a discovery job and returns immediately.
    """
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        """
        INSERT INTO research_jobs (id, job_type, scope_type, scope_id, status, created_at)
        VALUES ($1, 'discovery', 'region', $2, 'queued', $3)
        """,
        job_id, request.region_id or "all", now,
    )

    await enqueue(settings.research_queue, {
        "job_id": job_id,
        "job_type": "discovery",
        "scope_type": "region",
        "scope_id": request.region_id or "all",
    })

    return {
        "job_id": job_id,
        "status": "queued",
        "region_id": request.region_id,
    }


@router.post("/research/scan-ministry")
async def scan_ministry_sources(government_unit_id: str):
    """Queue a ministry site scan for new announcements and updates."""
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        """
        INSERT INTO research_jobs (id, job_type, scope_type, scope_id, status, created_at)
        VALUES ($1, 'ministry_scan', 'ministry', $2, 'queued', $3)
        """,
        job_id, government_unit_id, now,
    )

    await enqueue(settings.research_queue, {
        "job_id": job_id,
        "job_type": "ministry_scan",
        "scope_type": "ministry",
        "scope_id": government_unit_id,
    })

    return {
        "job_id": job_id,
        "status": "queued",
        "government_unit_id": government_unit_id,
    }
