"""Anomaly detection logic for Nepal government projects."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db import connection as db
from app.models.schemas import AnomalyResult, AnomalyType, Severity
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


async def check_budget_mismatch(project_id: str) -> AnomalyResult | None:
    """Detect when expenditure exceeds allocation."""
    row = await db.fetch_one(
        """
        SELECT allocated_budget, spent_budget, name_en
        FROM projects
        WHERE id = $1
        """,
        project_id,
    )
    if row is None or row["allocated_budget"] is None or row["spent_budget"] is None:
        return None

    allocated = float(row["allocated_budget"])
    spent = float(row["spent_budget"])
    if allocated <= 0:
        return None

    ratio = spent / allocated
    if ratio > 1.0:
        overspend_pct = (ratio - 1.0) * 100
        severity = Severity.CRITICAL if overspend_pct > 20 else Severity.HIGH if overspend_pct > 10 else Severity.MEDIUM
        return AnomalyResult(
            flag_type=AnomalyType.BUDGET_MISMATCH,
            severity=severity,
            description=(
                f"Expenditure ({spent:,.0f} NPR) exceeds allocation "
                f"({allocated:,.0f} NPR) by {overspend_pct:.1f}%"
            ),
            confidence=min(0.95, 0.7 + overspend_pct / 100),
            details={"allocated": allocated, "spent": spent, "overspend_pct": overspend_pct},
        )
    return None


async def check_progress_jump(project_id: str, threshold: float = 10.0) -> AnomalyResult | None:
    """Detect suspicious progress jumps >threshold% in a single update."""
    rows = await db.fetch_all(
        """
        SELECT progress_pct, reported_at
        FROM progress_snapshots
        WHERE project_id = $1
        ORDER BY reported_at DESC
        LIMIT 5
        """,
        project_id,
    )
    if len(rows) < 2:
        return None

    latest = float(rows[0]["progress_pct"])
    previous = float(rows[1]["progress_pct"])
    jump = latest - previous

    if jump > threshold:
        severity = Severity.HIGH if jump > 25 else Severity.MEDIUM
        return AnomalyResult(
            flag_type=AnomalyType.PROGRESS_JUMP,
            severity=severity,
            description=(
                f"Progress jumped {jump:.1f}% in a single update "
                f"(from {previous:.1f}% to {latest:.1f}%)"
            ),
            confidence=min(0.9, 0.5 + jump / 50),
            details={
                "previous_pct": previous,
                "current_pct": latest,
                "jump_pct": jump,
                "reported_at": rows[0]["reported_at"].isoformat(),
            },
        )
    return None


async def check_stale_no_update(project_id: str, days: int = 30) -> AnomalyResult | None:
    """Detect projects with no official update in N+ days."""
    row = await db.fetch_one(
        """
        SELECT p.name_en, p.status,
               MAX(ou.published_at) AS last_update
        FROM projects p
        LEFT JOIN official_updates ou ON ou.project_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        """,
        project_id,
    )
    if row is None:
        return None

    # Skip completed/cancelled projects
    if row["status"] in ("completed", "cancelled"):
        return None

    last_update = row["last_update"]
    if last_update is None:
        return AnomalyResult(
            flag_type=AnomalyType.STALE_NO_UPDATE,
            severity=Severity.HIGH,
            description="Project has never received an official update",
            confidence=0.95,
        )

    age = datetime.now(timezone.utc) - last_update.replace(tzinfo=timezone.utc)
    if age.days >= days:
        severity = Severity.HIGH if age.days > 90 else Severity.MEDIUM
        return AnomalyResult(
            flag_type=AnomalyType.STALE_NO_UPDATE,
            severity=severity,
            description=f"No official update in {age.days} days (threshold: {days})",
            confidence=min(0.95, 0.6 + age.days / 365),
            details={"days_since_update": age.days, "last_update": last_update.isoformat()},
        )
    return None


async def check_contradicted_claim(project_id: str) -> AnomalyResult | None:
    """Detect when external or citizen data contradicts official claims."""
    # Get latest official claim
    official = await db.fetch_one(
        """
        SELECT content, title FROM official_updates
        WHERE project_id = $1
        ORDER BY published_at DESC
        LIMIT 1
        """,
        project_id,
    )
    if official is None:
        return None

    # Get external findings that may contradict
    externals = await db.fetch_all(
        """
        SELECT title, body, source_url FROM research_findings
        WHERE project_id = $1
          AND finding_type IN ('contradiction', 'discrepancy')
          AND reviewed = false
        ORDER BY discovered_at DESC
        LIMIT 3
        """,
        project_id,
    )
    if not externals:
        return None

    # Use LLM to verify contradiction
    official_text = f"{official['title']}: {official['content']}"
    for ext in externals:
        external_text = f"{ext['title']}: {ext['body']}"
        result, _ = await llm_service.detect_contradiction(official_text, external_text)
        if result.get("contradicts"):
            return AnomalyResult(
                flag_type=AnomalyType.CONTRADICTED_CLAIM,
                severity=Severity.HIGH,
                description=result.get("explanation", "External evidence contradicts official claim"),
                confidence=result.get("confidence", 0.7),
                details={"source_url": ext["source_url"]},
            )
    return None


async def check_suspicious_completion(project_id: str) -> AnomalyResult | None:
    """Detect milestones marked complete without supporting evidence."""
    rows = await db.fetch_all(
        """
        SELECT m.id, m.title, m.status, m.completed_at,
               COUNT(e.id) AS evidence_count
        FROM milestones m
        LEFT JOIN evidence e ON e.milestone_id = m.id
        WHERE m.project_id = $1 AND m.status = 'completed'
        GROUP BY m.id
        HAVING COUNT(e.id) = 0
        """,
        project_id,
    )
    if not rows:
        return None

    titles = [r["title"] for r in rows]
    return AnomalyResult(
        flag_type=AnomalyType.SUSPICIOUS_COMPLETION,
        severity=Severity.MEDIUM,
        description=(
            f"{len(rows)} milestone(s) marked complete without evidence: "
            f"{', '.join(titles[:3])}"
        ),
        confidence=0.75,
        details={"milestone_ids": [str(r["id"]) for r in rows]},
    )


async def check_timeline_violation(project_id: str) -> AnomalyResult | None:
    """Detect milestones completed before the project start date."""
    rows = await db.fetch_all(
        """
        SELECT m.title, m.completed_at, p.start_date
        FROM milestones m
        JOIN projects p ON p.id = m.project_id
        WHERE m.project_id = $1
          AND m.status = 'completed'
          AND m.completed_at < p.start_date
        """,
        project_id,
    )
    if not rows:
        return None

    return AnomalyResult(
        flag_type=AnomalyType.TIMELINE_VIOLATION,
        severity=Severity.CRITICAL,
        description=(
            f"{len(rows)} milestone(s) recorded as completed before the "
            f"project start date"
        ),
        confidence=0.95,
        details={
            "violations": [
                {"title": r["title"], "completed_at": r["completed_at"].isoformat()}
                for r in rows
            ]
        },
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

_CHECK_FUNCTIONS = {
    AnomalyType.BUDGET_MISMATCH: check_budget_mismatch,
    AnomalyType.PROGRESS_JUMP: check_progress_jump,
    AnomalyType.STALE_NO_UPDATE: check_stale_no_update,
    AnomalyType.CONTRADICTED_CLAIM: check_contradicted_claim,
    AnomalyType.SUSPICIOUS_COMPLETION: check_suspicious_completion,
    AnomalyType.TIMELINE_VIOLATION: check_timeline_violation,
}


async def run_anomaly_checks(
    project_id: str,
    check_types: list[AnomalyType] | None = None,
) -> list[AnomalyResult]:
    """Run selected (or all) anomaly checks on a project.

    Returns list of detected anomalies.
    """
    types_to_check = check_types or list(AnomalyType)
    anomalies: list[AnomalyResult] = []

    for atype in types_to_check:
        fn = _CHECK_FUNCTIONS.get(atype)
        if fn is None:
            continue
        try:
            result = await fn(project_id)
            if result is not None:
                anomalies.append(result)
        except Exception:
            logger.exception("Anomaly check %s failed for project %s", atype, project_id)

    # Persist detected anomalies
    if anomalies:
        now = datetime.now(timezone.utc)
        for a in anomalies:
            await db.execute(
                """
                INSERT INTO anomaly_flags (project_id, flag_type, severity, description, confidence, detected_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (project_id, flag_type)
                DO UPDATE SET severity = $3, description = $4, confidence = $5, detected_at = $6
                """,
                project_id, a.flag_type.value, a.severity.value,
                a.description, a.confidence, now,
            )

    return anomalies


async def detect_stale_projects(days_threshold: int = 30) -> list[dict[str, Any]]:
    """Scan all active projects for staleness."""
    rows = await db.fetch_all(
        """
        SELECT p.id, p.name_en, p.status,
               MAX(ou.published_at) AS last_update
        FROM projects p
        LEFT JOIN official_updates ou ON ou.project_id = p.id
        WHERE p.status NOT IN ('completed', 'cancelled')
        GROUP BY p.id
        HAVING MAX(ou.published_at) IS NULL
           OR MAX(ou.published_at) < NOW() - INTERVAL '%s days'
        ORDER BY MAX(ou.published_at) ASC NULLS FIRST
        """ % days_threshold,
    )
    return [
        {
            "project_id": str(r["id"]),
            "name": r["name_en"],
            "status": r["status"],
            "last_update": r["last_update"].isoformat() if r["last_update"] else None,
        }
        for r in rows
    ]


async def detect_progress_jumps(threshold_percent: float = 10.0) -> list[dict[str, Any]]:
    """Scan all projects for suspicious progress jumps."""
    rows = await db.fetch_all(
        """
        WITH ranked AS (
            SELECT project_id, progress_pct, reported_at,
                   LAG(progress_pct) OVER (PARTITION BY project_id ORDER BY reported_at) AS prev_pct
            FROM progress_snapshots
        )
        SELECT r.project_id, p.name_en,
               r.progress_pct AS current_pct,
               r.prev_pct,
               (r.progress_pct - r.prev_pct) AS jump
        FROM ranked r
        JOIN projects p ON p.id = r.project_id
        WHERE r.prev_pct IS NOT NULL
          AND (r.progress_pct - r.prev_pct) > $1
        ORDER BY (r.progress_pct - r.prev_pct) DESC
        LIMIT 50
        """,
        threshold_percent,
    )
    return [
        {
            "project_id": str(r["project_id"]),
            "name": r["name_en"],
            "current_pct": float(r["current_pct"]),
            "previous_pct": float(r["prev_pct"]),
            "jump_pct": float(r["jump"]),
        }
        for r in rows
    ]
