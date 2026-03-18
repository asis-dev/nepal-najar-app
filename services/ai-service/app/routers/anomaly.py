"""Anomaly detection endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.models.schemas import (
    AnomalyCheckRequest,
    AnomalyCheckResponse,
    ProgressJumpsRequest,
    StaleProjectsRequest,
)
from app.services.anomaly_detector import (
    detect_progress_jumps,
    detect_stale_projects,
    run_anomaly_checks,
)

router = APIRouter()


@router.post("/anomaly/check", response_model=AnomalyCheckResponse)
async def check_anomalies(request: AnomalyCheckRequest):
    """Run anomaly detection on a project."""
    anomalies = await run_anomaly_checks(request.project_id, request.check_types)
    return AnomalyCheckResponse(
        project_id=request.project_id,
        anomalies_found=anomalies,
        checks_run=[ct.value for ct in request.check_types],
        checked_at=datetime.now(timezone.utc),
    )


@router.post("/anomaly/detect-stale")
async def detect_stale(request: StaleProjectsRequest):
    """Detect projects without recent updates."""
    results = await detect_stale_projects(request.days_threshold)
    return {
        "threshold_days": request.days_threshold,
        "stale_projects": results,
        "count": len(results),
    }


@router.post("/anomaly/detect-progress-jumps")
async def detect_jumps(request: ProgressJumpsRequest):
    """Detect projects with suspicious progress jumps."""
    results = await detect_progress_jumps(request.threshold_percent)
    return {
        "threshold_percent": request.threshold_percent,
        "suspicious_projects": results,
        "count": len(results),
    }
