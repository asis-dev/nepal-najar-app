"""Translation service -- Nepali <-> English via Claude."""

from __future__ import annotations

import logging

from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


async def translate(
    text: str,
    source_language: str = "ne",
    target_language: str = "en",
) -> dict:
    """Translate text between Nepali and English.

    Returns dict with translated_text, source_language, target_language, tokens_used.
    """
    if source_language == target_language:
        return {
            "translated_text": text,
            "source_language": source_language,
            "target_language": target_language,
            "tokens_used": 0,
        }

    translated, tokens = await llm_service.translate(text, source_language, target_language)

    return {
        "translated_text": translated,
        "source_language": source_language,
        "target_language": target_language,
        "tokens_used": tokens,
    }


async def translate_project_fields(project_id: str) -> dict:
    """Translate key project fields (name, description) to the missing language.

    If name_en exists but name_ne is empty, translate en->ne and vice versa.
    """
    from app.db import connection as db

    row = await db.fetch_one(
        "SELECT name_en, name_ne, description_en, description_ne FROM projects WHERE id = $1",
        project_id,
    )
    if row is None:
        return {"error": "Project not found", "project_id": project_id}

    translations_made = 0

    # Name
    if row["name_en"] and not row["name_ne"]:
        ne_name, _ = await llm_service.translate(row["name_en"], "en", "ne")
        await db.execute("UPDATE projects SET name_ne = $1 WHERE id = $2", ne_name, project_id)
        translations_made += 1
    elif row["name_ne"] and not row["name_en"]:
        en_name, _ = await llm_service.translate(row["name_ne"], "ne", "en")
        await db.execute("UPDATE projects SET name_en = $1 WHERE id = $2", en_name, project_id)
        translations_made += 1

    # Description
    if row["description_en"] and not row["description_ne"]:
        ne_desc, _ = await llm_service.translate(row["description_en"], "en", "ne")
        await db.execute("UPDATE projects SET description_ne = $1 WHERE id = $2", ne_desc, project_id)
        translations_made += 1
    elif row["description_ne"] and not row["description_en"]:
        en_desc, _ = await llm_service.translate(row["description_ne"], "ne", "en")
        await db.execute("UPDATE projects SET description_en = $1 WHERE id = $2", en_desc, project_id)
        translations_made += 1

    return {
        "project_id": project_id,
        "translations_made": translations_made,
    }
