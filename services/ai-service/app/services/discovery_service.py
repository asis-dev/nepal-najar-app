"""Project discovery service -- find unregistered projects and match against existing ones."""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.db import connection as db
from app.services.embedding_service import embedding_service
from app.services.researcher import discover_projects as _discover_raw

logger = logging.getLogger(__name__)


async def discover_and_match(
    region_id: str | None = None,
    sources: list[str] | None = None,
) -> dict[str, Any]:
    """Scan external sources for projects, then match against existing DB records.

    For each discovered project:
      1. Generate an embedding of its title + description.
      2. Search pgvector for similar existing projects.
      3. If similarity > threshold, link to existing project.
      4. Otherwise, create a potential_project record.

    Returns discovery results with match data.
    """
    start = time.monotonic()

    # Step 1: Discover raw projects from news
    raw_results = await _discover_raw(region_id)
    raw_projects = raw_results.get("projects", [])

    matched: list[dict[str, Any]] = []
    new_potentials: list[dict[str, Any]] = []

    for proj in raw_projects:
        title = proj.get("title", "")
        description = proj.get("description", "")
        text_for_embedding = f"{title}. {description}"

        if not text_for_embedding.strip(". "):
            continue

        # Generate embedding
        embedding = await embedding_service.generate_embedding(text_for_embedding)

        # Search for similar existing projects
        similar = await _find_similar_projects(embedding, threshold=0.75)

        if similar:
            best = similar[0]
            matched.append({
                "discovered_title": title,
                "discovered_description": description,
                "source_url": proj.get("source_url"),
                "matched_project_id": str(best["id"]),
                "matched_project_name": best["name_en"],
                "similarity_score": best["similarity"],
            })
            # Store as research finding linked to existing project
            await db.execute(
                """
                INSERT INTO research_findings
                    (id, project_id, finding_type, title, body, source_url,
                     source_name, confidence, discovered_at)
                VALUES ($1, $2, 'external_mention', $3, $4, $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
                """,
                str(uuid.uuid4()), str(best["id"]), title, description,
                proj.get("source_url", ""), proj.get("source_name", ""),
                best["similarity"], datetime.now(timezone.utc),
            )
        else:
            # Create potential project record
            potential_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO potential_projects
                    (id, title, description, source_url, source_name,
                     location, budget_mentioned, confidence, embedding,
                     discovered_at, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
                ON CONFLICT DO NOTHING
                """,
                potential_id, title, description,
                proj.get("source_url", ""), proj.get("source_name", ""),
                proj.get("location"), proj.get("budget_mentioned"),
                0.5, embedding, datetime.now(timezone.utc),
            )
            new_potentials.append({
                "potential_id": potential_id,
                "title": title,
                "description": description,
                "source_url": proj.get("source_url"),
                "location": proj.get("location"),
            })

    elapsed_ms = int((time.monotonic() - start) * 1000)

    return {
        "region_id": region_id,
        "sources_scanned": raw_results.get("sources_scanned", 0),
        "total_discovered": len(raw_projects),
        "matched_to_existing": len(matched),
        "new_potential_projects": len(new_potentials),
        "matches": matched,
        "potentials": new_potentials,
        "scan_duration_ms": elapsed_ms,
    }


async def _find_similar_projects(
    embedding: list[float],
    threshold: float = 0.75,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """Find existing projects with similar embeddings using pgvector.

    Uses cosine similarity search.
    """
    rows = await db.fetch_all(
        """
        SELECT id, name_en, name_ne,
               1 - (embedding <=> $1::vector) AS similarity
        FROM projects
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        str(embedding), limit,
    )
    return [
        {
            "id": r["id"],
            "name_en": r["name_en"],
            "name_ne": r["name_ne"],
            "similarity": float(r["similarity"]),
        }
        for r in rows
        if float(r["similarity"]) >= threshold
    ]


async def get_potential_projects(
    status: str = "pending",
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Retrieve potential projects awaiting review."""
    rows = await db.fetch_all(
        """
        SELECT id, title, description, source_url, source_name,
               location, budget_mentioned, confidence,
               discovered_at, status
        FROM potential_projects
        WHERE status = $1
        ORDER BY discovered_at DESC
        LIMIT $2
        """,
        status, limit,
    )
    return [dict(r) for r in rows]


async def resolve_potential_project(
    potential_id: str,
    action: str,
    project_id: str | None = None,
) -> dict[str, Any]:
    """Resolve a potential project: link to existing, create new, or dismiss.

    action: "link" | "create" | "dismiss"
    """
    if action == "link" and project_id:
        await db.execute(
            """
            UPDATE potential_projects
            SET status = 'linked', linked_project_id = $1, resolved_at = $2
            WHERE id = $3
            """,
            project_id, datetime.now(timezone.utc), potential_id,
        )
        return {"potential_id": potential_id, "action": "linked", "project_id": project_id}
    elif action == "dismiss":
        await db.execute(
            """
            UPDATE potential_projects
            SET status = 'dismissed', resolved_at = $1
            WHERE id = $2
            """,
            datetime.now(timezone.utc), potential_id,
        )
        return {"potential_id": potential_id, "action": "dismissed"}
    elif action == "create":
        # Mark as creating -- the actual project creation happens in the API service
        await db.execute(
            """
            UPDATE potential_projects
            SET status = 'creating', resolved_at = $1
            WHERE id = $2
            """,
            datetime.now(timezone.utc), potential_id,
        )
        return {"potential_id": potential_id, "action": "creating"}
    else:
        return {"error": f"Invalid action: {action}"}
