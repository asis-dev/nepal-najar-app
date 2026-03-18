"""Pydantic models for all AI service request/response schemas."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AnomalyType(str, Enum):
    BUDGET_MISMATCH = "budget_mismatch"
    PROGRESS_JUMP = "progress_jump"
    STALE_NO_UPDATE = "stale_no_update"
    CONTRADICTED_CLAIM = "contradicted_claim"
    SUSPICIOUS_COMPLETION = "suspicious_completion"
    TIMELINE_VIOLATION = "timeline_violation"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ConfidenceRating(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NEEDS_VERIFICATION = "needs_verification"


class ResearchJobType(str, Enum):
    SOURCE_SCAN = "source_scan"
    PROJECT_SCAN = "project_scan"
    DISCOVERY = "discovery"
    MINISTRY_SCAN = "ministry_scan"


class ResearchJobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScopeType(str, Enum):
    MINISTRY = "ministry"
    PROJECT = "project"
    REGION = "region"


# ---------------------------------------------------------------------------
# Summarization
# ---------------------------------------------------------------------------

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000)
    language: str = Field(default="en", pattern="^(en|ne)$")
    max_length: int = Field(default=200, ge=20, le=2000)


class SummarizeResponse(BaseModel):
    summary: str
    language: str
    tokens_used: int


class SummarizeUpdateRequest(BaseModel):
    project_id: str
    update_id: str


class ClassifyBlockerRequest(BaseModel):
    blocker_id: str
    title: str
    description: str


class ClassifyBlockerResponse(BaseModel):
    blocker_id: str
    category: str
    confidence: float


# ---------------------------------------------------------------------------
# Translation
# ---------------------------------------------------------------------------

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000)
    source_language: str = Field(default="ne", pattern="^(en|ne)$")
    target_language: str = Field(default="en", pattern="^(en|ne)$")


class TranslateResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    tokens_used: int


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------

class AnomalyCheckRequest(BaseModel):
    project_id: str
    check_types: list[AnomalyType] = Field(
        default_factory=lambda: list(AnomalyType),
    )


class AnomalyResult(BaseModel):
    flag_type: AnomalyType
    severity: Severity
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    details: dict | None = None


class AnomalyCheckResponse(BaseModel):
    project_id: str
    anomalies_found: list[AnomalyResult]
    checks_run: list[str]
    checked_at: datetime


class StaleProjectsRequest(BaseModel):
    days_threshold: int = Field(default=30, ge=1)


class ProgressJumpsRequest(BaseModel):
    threshold_percent: float = Field(default=10.0, ge=1.0)


# ---------------------------------------------------------------------------
# Confidence Scoring
# ---------------------------------------------------------------------------

class ConfidenceScoreRequest(BaseModel):
    project_id: str


class ConfidenceBreakdown(BaseModel):
    official_signal_score: float = Field(ge=0.0, le=1.0)
    evidence_score: float = Field(ge=0.0, le=1.0)
    external_signal_score: float = Field(ge=0.0, le=1.0)
    citizen_signal_score: float = Field(ge=0.0, le=1.0)
    anomaly_penalty: float = Field(ge=0.0, le=1.0)


class ConfidenceAssessment(BaseModel):
    project_id: str
    overall_score: float = Field(ge=0.0, le=1.0)
    rating: ConfidenceRating
    breakdown: ConfidenceBreakdown
    factors: list[str] = Field(default_factory=list)
    computed_at: datetime


class BatchRecomputeRequest(BaseModel):
    project_ids: list[str] | None = None


class BatchRecomputeResponse(BaseModel):
    status: str
    jobs_queued: int


# ---------------------------------------------------------------------------
# Research
# ---------------------------------------------------------------------------

class ResearchJobRequest(BaseModel):
    job_type: ResearchJobType
    scope_type: ScopeType
    scope_id: str


class ResearchJobResponse(BaseModel):
    job_id: str
    status: ResearchJobStatus
    job_type: ResearchJobType
    scope: str
    created_at: datetime


class ResearchFinding(BaseModel):
    finding_type: str
    title: str
    body: str
    source_url: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    recommended_action: str | None = None


class ResearchJobDetail(BaseModel):
    job_id: str
    status: ResearchJobStatus
    job_type: ResearchJobType
    scope: str
    findings: list[ResearchFinding] = Field(default_factory=list)
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

class DiscoverProjectsRequest(BaseModel):
    region_id: str | None = None
    sources: list[str] = Field(
        default_factory=lambda: ["news", "ministry_sites"],
    )


class DiscoveredProject(BaseModel):
    title: str
    description: str
    source_url: str
    source_name: str
    matched_existing_project_id: str | None = None
    similarity_score: float | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    discovered_at: datetime


class DiscoverProjectsResponse(BaseModel):
    region_id: str | None
    projects_found: list[DiscoveredProject]
    sources_scanned: int
    scan_duration_ms: int


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    postgres_connected: bool
    redis_connected: bool
    uptime_seconds: float
