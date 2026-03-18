"""Multi-signal confidence scoring engine for Nepal Progress projects.

Computes an overall confidence score from multiple independent signals:
  - Official signals (30%): recency and completeness of government data
  - Evidence signals (25%): count, quality, and review status of evidence
  - External signals (20%): confirmations vs. contradictions from external sources
  - Citizen signals (15%): consistency and volume of citizen reports
  - Anomaly penalty (10%): deduction for active anomaly flags
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from app.db import connection as db
from app.models.schemas import (
    ConfidenceAssessment,
    ConfidenceBreakdown,
    ConfidenceRating,
)

logger = logging.getLogger(__name__)

# Weights
W_OFFICIAL = 0.30
W_EVIDENCE = 0.25
W_EXTERNAL = 0.20
W_CITIZEN = 0.15
W_ANOMALY = 0.10


async def score_official_signals(project_id: str) -> tuple[float, list[str]]:
    """Score based on recency and completeness of official data.

    Returns (score 0-1, list of factor descriptions).
    """
    row = await db.fetch_one(
        """
        SELECT
            p.name_en, p.description_en, p.allocated_budget,
            p.start_date, p.expected_end_date, p.status,
            p.government_unit_id,
            COUNT(ou.id) AS update_count,
            MAX(ou.published_at) AS last_update
        FROM projects p
        LEFT JOIN official_updates ou ON ou.project_id = p.id
        GROUP BY p.id
        HAVING p.id = $1
        """,
        project_id,
    )
    if row is None:
        return 0.0, ["Project not found"]

    score = 0.0
    factors: list[str] = []

    # Completeness: key fields populated (max 0.4)
    fields_present = sum([
        bool(row["name_en"]),
        bool(row["description_en"]),
        row["allocated_budget"] is not None,
        row["start_date"] is not None,
        row["expected_end_date"] is not None,
        bool(row["government_unit_id"]),
    ])
    completeness = fields_present / 6.0
    score += completeness * 0.4
    if completeness < 0.5:
        factors.append(f"Low data completeness ({fields_present}/6 key fields)")

    # Recency of updates (max 0.4)
    update_count = row["update_count"]
    if update_count == 0:
        factors.append("No official updates recorded")
    else:
        last_update = row["last_update"]
        if last_update:
            age_days = (datetime.now(timezone.utc) - last_update.replace(tzinfo=timezone.utc)).days
            if age_days <= 7:
                score += 0.4
            elif age_days <= 30:
                score += 0.3
                factors.append(f"Last update {age_days} days ago")
            elif age_days <= 90:
                score += 0.15
                factors.append(f"Last update {age_days} days ago (aging)")
            else:
                score += 0.05
                factors.append(f"Stale: last update {age_days} days ago")

    # Volume of updates (max 0.2)
    if update_count >= 10:
        score += 0.2
    elif update_count >= 5:
        score += 0.15
    elif update_count >= 2:
        score += 0.1
    elif update_count == 1:
        score += 0.05
        factors.append("Only one official update")

    return min(1.0, score), factors


async def score_evidence(project_id: str) -> tuple[float, list[str]]:
    """Score based on evidence quantity, quality, and review status.

    Returns (score 0-1, factors).
    """
    rows = await db.fetch_all(
        """
        SELECT e.id, e.evidence_type, e.verified, e.reviewed_at, e.quality_rating
        FROM evidence e
        WHERE e.project_id = $1
        """,
        project_id,
    )
    factors: list[str] = []
    if not rows:
        return 0.0, ["No evidence submitted"]

    total = len(rows)
    verified = sum(1 for r in rows if r["verified"])
    reviewed = sum(1 for r in rows if r["reviewed_at"] is not None)

    # Count score (max 0.3)
    count_score = min(1.0, total / 10.0) * 0.3

    # Verification ratio (max 0.3)
    verify_ratio = verified / total if total else 0
    verify_score = verify_ratio * 0.3
    if verify_ratio < 0.5:
        factors.append(f"Only {verified}/{total} evidence items verified")

    # Review ratio (max 0.2)
    review_ratio = reviewed / total if total else 0
    review_score = review_ratio * 0.2

    # Quality average (max 0.2)
    quality_ratings = [r["quality_rating"] for r in rows if r["quality_rating"] is not None]
    if quality_ratings:
        avg_quality = sum(quality_ratings) / len(quality_ratings)
        quality_score = (avg_quality / 5.0) * 0.2  # assuming 1-5 scale
    else:
        quality_score = 0.1  # neutral if no ratings
        factors.append("No quality ratings on evidence")

    score = count_score + verify_score + review_score + quality_score
    return min(1.0, score), factors


async def score_external_signals(project_id: str) -> tuple[float, list[str]]:
    """Score based on external research findings -- confirmations vs. contradictions.

    Returns (score 0-1, factors).
    """
    rows = await db.fetch_all(
        """
        SELECT finding_type, confidence
        FROM research_findings
        WHERE project_id = $1
        """,
        project_id,
    )
    factors: list[str] = []
    if not rows:
        return 0.5, ["No external research findings"]  # neutral

    confirmations = [r for r in rows if r["finding_type"] == "confirmation"]
    contradictions = [r for r in rows if r["finding_type"] in ("contradiction", "discrepancy")]
    neutral = [r for r in rows if r["finding_type"] not in ("confirmation", "contradiction", "discrepancy")]

    total = len(rows)
    confirm_count = len(confirmations)
    contra_count = len(contradictions)

    if contra_count == 0 and confirm_count > 0:
        score = min(1.0, 0.7 + confirm_count * 0.05)
    elif contra_count > 0:
        ratio = contra_count / total
        score = max(0.0, 0.5 - ratio * 0.5)
        factors.append(f"{contra_count} contradicting finding(s) detected")
    else:
        score = 0.5

    if confirm_count > 0:
        factors.append(f"{confirm_count} external confirmation(s)")

    return min(1.0, score), factors


async def score_citizen_signals(project_id: str) -> tuple[float, list[str]]:
    """Score based on citizen report consistency and volume.

    Returns (score 0-1, factors).
    """
    rows = await db.fetch_all(
        """
        SELECT cr.sentiment, cr.verified, cr.status_claim
        FROM citizen_reports cr
        WHERE cr.project_id = $1
          AND cr.status != 'rejected'
        """,
        project_id,
    )
    factors: list[str] = []
    if not rows:
        return 0.5, ["No citizen reports"]  # neutral

    total = len(rows)
    verified = sum(1 for r in rows if r["verified"])

    # Volume score (max 0.3)
    volume_score = min(1.0, total / 20.0) * 0.3

    # Verification ratio (max 0.3)
    verify_ratio = verified / total if total else 0
    verify_score = verify_ratio * 0.3

    # Sentiment consistency (max 0.4)
    sentiments = [r["sentiment"] for r in rows if r["sentiment"]]
    if sentiments:
        positive = sum(1 for s in sentiments if s in ("positive", "neutral"))
        consistency = positive / len(sentiments)
        sentiment_score = consistency * 0.4
        if consistency < 0.5:
            factors.append("Majority negative citizen sentiment")
    else:
        sentiment_score = 0.2
        factors.append("No sentiment data in citizen reports")

    score = volume_score + verify_score + sentiment_score
    return min(1.0, score), factors


async def compute_anomaly_penalty(project_id: str) -> tuple[float, list[str]]:
    """Compute anomaly penalty from active anomaly flags.

    Returns (penalty 0-1, factors). Higher = worse.
    """
    rows = await db.fetch_all(
        """
        SELECT flag_type, severity, confidence
        FROM anomaly_flags
        WHERE project_id = $1
          AND resolved_at IS NULL
        """,
        project_id,
    )
    if not rows:
        return 0.0, []

    severity_weights = {"critical": 1.0, "high": 0.7, "medium": 0.4, "low": 0.2}
    factors: list[str] = []
    total_penalty = 0.0

    for r in rows:
        weight = severity_weights.get(r["severity"], 0.3)
        total_penalty += weight * r["confidence"]
        factors.append(f"Active {r['severity']} anomaly: {r['flag_type']}")

    # Normalize to 0-1 range (cap at 1.0)
    penalty = min(1.0, total_penalty / max(len(rows), 1))
    return penalty, factors


async def compute_confidence(project_id: str) -> ConfidenceAssessment:
    """Compute the multi-signal confidence score for a project.

    Weights:
      - Official signals: 30%
      - Evidence: 25%
      - External signals: 20%
      - Citizen signals: 15%
      - Anomaly penalty: -10%
    """
    official_score, official_factors = await score_official_signals(project_id)
    evidence_score, evidence_factors = await score_evidence(project_id)
    external_score, external_factors = await score_external_signals(project_id)
    citizen_score, citizen_factors = await score_citizen_signals(project_id)
    anomaly_penalty, anomaly_factors = await compute_anomaly_penalty(project_id)

    overall = (
        official_score * W_OFFICIAL
        + evidence_score * W_EVIDENCE
        + external_score * W_EXTERNAL
        + citizen_score * W_CITIZEN
        - anomaly_penalty * W_ANOMALY
    )
    overall = max(0.0, min(1.0, overall))

    if overall >= 0.75:
        rating = ConfidenceRating.HIGH
    elif overall >= 0.50:
        rating = ConfidenceRating.MEDIUM
    elif overall >= 0.25:
        rating = ConfidenceRating.LOW
    else:
        rating = ConfidenceRating.NEEDS_VERIFICATION

    all_factors = official_factors + evidence_factors + external_factors + citizen_factors + anomaly_factors

    now = datetime.now(timezone.utc)

    # Persist the computed score
    await db.execute(
        """
        INSERT INTO confidence_scores (project_id, overall_score, rating,
            official_signal_score, evidence_score, external_signal_score,
            citizen_signal_score, anomaly_penalty, computed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (project_id)
        DO UPDATE SET overall_score = $2, rating = $3,
            official_signal_score = $4, evidence_score = $5,
            external_signal_score = $6, citizen_signal_score = $7,
            anomaly_penalty = $8, computed_at = $9
        """,
        project_id, overall, rating.value,
        official_score, evidence_score, external_score,
        citizen_score, anomaly_penalty, now,
    )

    return ConfidenceAssessment(
        project_id=project_id,
        overall_score=overall,
        rating=rating,
        breakdown=ConfidenceBreakdown(
            official_signal_score=official_score,
            evidence_score=evidence_score,
            external_signal_score=external_score,
            citizen_signal_score=citizen_score,
            anomaly_penalty=anomaly_penalty,
        ),
        factors=all_factors,
        computed_at=now,
    )
