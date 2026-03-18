"""Chat endpoints -- conversational AI for querying project data."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.chat_service import chat

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message in English or Nepali")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for multi-turn context")


class ChatSource(BaseModel):
    id: str
    title: str


class ChatResponse(BaseModel):
    response: str
    language: str
    sources: list[ChatSource]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Chat with the Nepal Progress AI assistant about infrastructure projects."""
    try:
        result = await chat(request.message, request.conversation_id)
        return ChatResponse(**result)
    except Exception as exc:
        logger.exception("Chat request failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to process chat request") from exc
