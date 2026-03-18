"""Translation endpoints -- Nepali <-> English."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import TranslateRequest, TranslateResponse
from app.services.translator import translate, translate_project_fields

router = APIRouter()


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """Translate text between Nepali and English."""
    result = await translate(request.text, request.source_language, request.target_language)
    return TranslateResponse(**result)


@router.post("/translate-project/{project_id}")
async def translate_project(project_id: str):
    """Auto-translate missing project name/description fields."""
    result = await translate_project_fields(project_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
