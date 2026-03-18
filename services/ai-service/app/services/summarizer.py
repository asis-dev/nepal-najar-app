"""Summarization logic -- wraps LLM service with DB integration."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.db import connection as db
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


async def summarize_text(
    text: str, language: str = "en", max_length: int = 200
) -> dict:
    """Summarize arbitrary text."""
    summary, tokens = await llm_service.summarize(text, language, max_length)
    return {"summary": summary, "language": language, "tokens_used": tokens}


async def summarize_project_update(project_id: str, update_id: str) -> dict:
    """Fetch a project update from the DB, summarize it, and store the result."""
    row = await db.fetch_one(
        """
        SELECT ou.title, ou.content, ou.data, p.name_en, p.name_ne
        FROM official_updates ou
        JOIN projects p ON p.id = ou.project_id
        WHERE ou.id = $1 AND ou.project_id = $2
        """,
        update_id, project_id,
    )
    if row is None:
        return {"error": "Update not found", "project_id": project_id, "update_id": update_id}

    text = f"Project: {row['name_en']}\nUpdate: {row['title']}\n\n{row['content']}"

    # Summarize in both languages
    summary_en, tokens_en = await llm_service.summarize(text, "en", 200)
    summary_ne, tokens_ne = await llm_service.summarize(text, "ne", 200)

    # Store summaries back
    now = datetime.now(timezone.utc)
    await db.execute(
        """
        UPDATE official_updates
        SET ai_summary_en = $1,
            ai_summary_ne = $2,
            ai_summarized_at = $3
        WHERE id = $4
        """,
        summary_en, summary_ne, now, update_id,
    )

    return {
        "project_id": project_id,
        "update_id": update_id,
        "summary_en": summary_en,
        "summary_ne": summary_ne,
        "tokens_used": tokens_en + tokens_ne,
        "summarized_at": now.isoformat(),
    }


async def classify_blocker(blocker_id: str, title: str, description: str) -> dict:
    """Classify a project blocker by category."""
    categories = [
        "funding", "regulatory", "technical", "political",
        "environmental", "land_acquisition", "contractor",
        "supply_chain", "community", "other",
    ]
    category, confidence, tokens = await llm_service.classify(
        f"Title: {title}\nDescription: {description}",
        categories,
    )

    # Persist classification
    await db.execute(
        """
        UPDATE blockers
        SET ai_category = $1,
            ai_category_confidence = $2,
            ai_classified_at = $3
        WHERE id = $4
        """,
        category, confidence, datetime.now(timezone.utc), blocker_id,
    )

    return {
        "blocker_id": blocker_id,
        "category": category,
        "confidence": confidence,
        "tokens_used": tokens,
    }
