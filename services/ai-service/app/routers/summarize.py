"""Summarization endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ClassifyBlockerRequest,
    ClassifyBlockerResponse,
    SummarizeRequest,
    SummarizeResponse,
    SummarizeUpdateRequest,
)
from app.services.summarizer import classify_blocker, summarize_project_update, summarize_text

router = APIRouter()


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    """Summarize arbitrary text in English or Nepali."""
    result = await summarize_text(request.text, request.language, request.max_length)
    return SummarizeResponse(**result)


@router.post("/summarize-update")
async def summarize_update(request: SummarizeUpdateRequest):
    """Fetch a project update from the DB, summarize it, and store the result."""
    result = await summarize_project_update(request.project_id, request.update_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/classify-blocker", response_model=ClassifyBlockerResponse)
async def classify_blocker_endpoint(request: ClassifyBlockerRequest):
    """Classify a project blocker by category using AI."""
    result = await classify_blocker(request.blocker_id, request.title, request.description)
    return ClassifyBlockerResponse(**result)
