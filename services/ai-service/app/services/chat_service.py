"""Chat Service -- Conversational AI for querying Nepal Progress project data."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.db.connection import fetch_all
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

# Singleton LLM service instance for chat
_llm = LLMService()

# Common Nepali region/district names for keyword extraction
_NEPALI_REGIONS = [
    "kathmandu", "pokhara", "lalitpur", "bhaktapur", "chitwan", "lumbini",
    "janakpur", "biratnagar", "birgunj", "dharan", "butwal", "hetauda",
    "nepalgunj", "dhangadhi", "itahari", "bharatpur", "tulsipur", "ghorahi",
    "baglung", "myagdi", "mustang", "dolpa", "jumla", "humla", "manang",
    "solukhumbu", "taplejung", "ilam", "jhapa", "morang", "sunsari",
    "province 1", "madhesh", "bagmati", "gandaki", "lumbini", "karnali", "sudurpashchim",
    # Nepali script variants
    "काठमाडौं", "पोखरा", "ललितपुर", "भक्तपुर", "चितवन", "लुम्बिनी",
    "जनकपुर", "विराटनगर", "वीरगञ्ज", "धरान", "बुटवल", "हेटौडा",
    "नेपालगञ्ज", "धनगढी", "इटहरी", "भरतपुर",
]

SYSTEM_PROMPT = """You are the Nepal Progress AI assistant — a helpful, accurate, and bilingual (English/Nepali) assistant for Nepal's public infrastructure transparency platform.

Your role:
- Answer questions about government infrastructure projects using ONLY the data provided below.
- If the data does not contain enough information to answer, say so clearly. Never fabricate facts.
- When citing projects, mention them by title.
- Be concise but thorough. Use bullet points for lists.
- If the user writes in Nepali, respond in Nepali. If in English, respond in English.
- Format budget figures in NPR (Nepali Rupees) with commas for readability.
- When discussing progress, mention the percentage and status.

You must NOT:
- Make up project names, budgets, or statistics not in the provided data.
- Provide political opinions or commentary.
- Answer questions unrelated to Nepal's infrastructure projects."""


def _detect_language(message: str) -> str:
    """Detect whether the message is in Nepali or English based on script."""
    nepali_chars = len(re.findall(r"[\u0900-\u097F]", message))
    total_alpha = len(re.findall(r"[a-zA-Z\u0900-\u097F]", message))
    if total_alpha == 0:
        return "en"
    return "ne" if nepali_chars / total_alpha > 0.3 else "en"


def _extract_keywords(message: str) -> list[str]:
    """Extract search keywords from the user message.

    Pulls out region names and meaningful words (length >= 3)
    while filtering common stop words.
    """
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "need", "must", "about",
        "what", "which", "who", "whom", "this", "that", "these", "those",
        "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
        "neither", "each", "every", "all", "any", "few", "more", "most",
        "other", "some", "such", "than", "too", "very", "just", "how",
        "when", "where", "why", "there", "here", "then", "once", "also",
        "with", "from", "for", "into", "during", "before", "after",
        "above", "below", "between", "out", "off", "over", "under",
        "again", "further", "tell", "show", "give", "please", "thanks",
        "know", "find", "get", "many", "much",
        # Nepali stop words
        "को", "मा", "ले", "र", "हो", "छ", "थियो", "गर्नुहोस्", "कृपया",
        "के", "कुन", "कसरी", "कहाँ", "किन",
    }

    lower = message.lower()
    keywords: list[str] = []

    # Check for region names
    for region in _NEPALI_REGIONS:
        if region.lower() in lower:
            keywords.append(region)

    # Check for status keywords
    status_terms = {
        "completed": "completed", "complete": "completed",
        "ongoing": "ongoing", "progress": "ongoing", "active": "ongoing",
        "delayed": "delayed", "stalled": "stalled", "blocked": "blocked",
        "planned": "planned", "upcoming": "planned",
        "सम्पन्न": "completed", "जारी": "ongoing", "ढिलो": "delayed",
        "रोकिएको": "blocked", "योजना": "planned",
    }
    for term, status in status_terms.items():
        if term in lower:
            keywords.append(status)

    # Extract general words
    words = re.findall(r"[a-zA-Z\u0900-\u097F]+", message)
    for word in words:
        w = word.lower()
        if len(w) >= 3 and w not in stop_words and w not in keywords:
            keywords.append(w)

    return keywords


async def _query_projects(keywords: list[str], limit: int = 20) -> list[dict[str, Any]]:
    """Query the database for projects matching the extracted keywords.

    Searches across project title, description, region name, and government unit name.
    """
    if not keywords:
        # No keywords: return recent / top projects
        query = """
            SELECT
                p.id, p.title, p.description, p.status,
                p.current_progress_percent_cached AS progress,
                p.allocated_budget_npr, p.spent_budget_npr,
                r.name AS region_name,
                gu.name AS government_unit_name
            FROM projects p
            LEFT JOIN regions r ON p.region_id = r.id
            LEFT JOIN government_units gu ON p.government_unit_id = gu.id
            ORDER BY p.updated_at DESC NULLS LAST
            LIMIT $1
        """
        rows = await fetch_all(query, limit)
    else:
        # Build a search pattern from keywords
        pattern = "|".join(re.escape(k) for k in keywords)
        query = """
            SELECT
                p.id, p.title, p.description, p.status,
                p.current_progress_percent_cached AS progress,
                p.allocated_budget_npr, p.spent_budget_npr,
                r.name AS region_name,
                gu.name AS government_unit_name
            FROM projects p
            LEFT JOIN regions r ON p.region_id = r.id
            LEFT JOIN government_units gu ON p.government_unit_id = gu.id
            WHERE
                p.title ~* $1
                OR p.description ~* $1
                OR r.name ~* $1
                OR gu.name ~* $1
            ORDER BY p.updated_at DESC NULLS LAST
            LIMIT $2
        """
        rows = await fetch_all(query, pattern, limit)

    return [dict(row) for row in rows]


async def _query_blockers(project_ids: list[str]) -> list[dict[str, Any]]:
    """Fetch active blockers for the given project IDs."""
    if not project_ids:
        return []
    query = """
        SELECT b.id, b.project_id, b.title, b.description, b.severity, b.status
        FROM blockers b
        WHERE b.project_id = ANY($1::uuid[])
          AND b.status != 'resolved'
        ORDER BY b.severity DESC
    """
    rows = await fetch_all(query, project_ids)
    return [dict(row) for row in rows]


async def _query_milestones(project_ids: list[str]) -> list[dict[str, Any]]:
    """Fetch milestones for the given project IDs."""
    if not project_ids:
        return []
    query = """
        SELECT m.id, m.project_id, m.title, m.status, m.due_date, m.completed_date
        FROM milestones m
        WHERE m.project_id = ANY($1::uuid[])
        ORDER BY m.due_date ASC NULLS LAST
    """
    rows = await fetch_all(query, project_ids)
    results = []
    for row in rows:
        d = dict(row)
        # Convert dates to strings for JSON serialization
        if d.get("due_date"):
            d["due_date"] = str(d["due_date"])
        if d.get("completed_date"):
            d["completed_date"] = str(d["completed_date"])
        results.append(d)
    return results


def _build_context(
    projects: list[dict[str, Any]],
    blockers: list[dict[str, Any]],
    milestones: list[dict[str, Any]],
) -> str:
    """Build the data context string to inject into the LLM prompt."""
    if not projects:
        return "No matching projects found in the database."

    sections: list[str] = []
    for p in projects:
        budget_alloc = f"NPR {p['allocated_budget_npr']:,.2f}" if p.get("allocated_budget_npr") else "N/A"
        budget_spent = f"NPR {p['spent_budget_npr']:,.2f}" if p.get("spent_budget_npr") else "N/A"
        progress = f"{p['progress']}%" if p.get("progress") is not None else "N/A"

        section = (
            f"**Project: {p['title']}**\n"
            f"  - ID: {p['id']}\n"
            f"  - Status: {p.get('status', 'N/A')}\n"
            f"  - Progress: {progress}\n"
            f"  - Region: {p.get('region_name', 'N/A')}\n"
            f"  - Government Unit: {p.get('government_unit_name', 'N/A')}\n"
            f"  - Allocated Budget: {budget_alloc}\n"
            f"  - Spent Budget: {budget_spent}\n"
            f"  - Description: {p.get('description', 'N/A')}\n"
        )

        # Add blockers for this project
        proj_blockers = [b for b in blockers if str(b.get("project_id")) == str(p["id"])]
        if proj_blockers:
            section += "  - Active Blockers:\n"
            for b in proj_blockers:
                section += f"    * [{b.get('severity', 'N/A')}] {b['title']}: {b.get('description', '')}\n"

        # Add milestones for this project
        proj_milestones = [m for m in milestones if str(m.get("project_id")) == str(p["id"])]
        if proj_milestones:
            section += "  - Milestones:\n"
            for m in proj_milestones:
                due = m.get("due_date", "N/A")
                status = m.get("status", "N/A")
                section += f"    * {m['title']} — Status: {status}, Due: {due}\n"

        sections.append(section)

    return "\n".join(sections)


async def chat(message: str, conversation_id: str | None = None) -> dict[str, Any]:
    """Process a user chat message and return an AI-generated response.

    Args:
        message: The user's question in English or Nepali.
        conversation_id: Optional conversation ID for future multi-turn support.

    Returns:
        Dictionary with keys: response, language, sources.
    """
    language = _detect_language(message)
    keywords = _extract_keywords(message)

    logger.info("Chat query — language=%s, keywords=%s", language, keywords)

    # Query the database for relevant projects
    projects = await _query_projects(keywords)

    # Fetch related blockers and milestones
    project_ids = [str(p["id"]) for p in projects]
    blockers, milestones = [], []
    if project_ids:
        blockers = await _query_blockers(project_ids)
        milestones = await _query_milestones(project_ids)

    # Build the context for the LLM
    data_context = _build_context(projects, blockers, milestones)

    lang_instruction = (
        "The user is writing in Nepali. Respond in Nepali."
        if language == "ne"
        else "The user is writing in English. Respond in English."
    )

    user_prompt = (
        f"{lang_instruction}\n\n"
        f"## Project Data\n{data_context}\n\n"
        f"## User Question\n{message}"
    )

    # Call the LLM
    msg = await _llm._call(SYSTEM_PROMPT, user_prompt, max_tokens=2048)
    response_text = _llm._extract_text(msg)

    # Build source references
    sources = [
        {"id": str(p["id"]), "title": p["title"]}
        for p in projects
    ]

    return {
        "response": response_text,
        "language": language,
        "sources": sources,
    }
