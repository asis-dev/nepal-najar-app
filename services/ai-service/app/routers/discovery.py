"""Project discovery endpoints -- find and manage unregistered projects."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.discovery_service import (
    discover_and_match,
    get_potential_projects,
    resolve_potential_project,
)
from app.services.embedding_service import embedding_service

router = APIRouter()


@router.post("/discovery/scan")
async def scan_for_projects(region_id: str | None = None):
    """Scan external sources for unregistered projects and match against DB."""
    result = await discover_and_match(region_id=region_id)
    return result


@router.get("/discovery/potential-projects")
async def list_potential_projects(status: str = "pending", limit: int = 50):
    """List potential projects awaiting review."""
    projects = await get_potential_projects(status=status, limit=limit)
    return {"projects": projects, "count": len(projects)}


@router.post("/discovery/resolve/{potential_id}")
async def resolve_potential(
    potential_id: str,
    action: str,
    project_id: str | None = None,
):
    """Resolve a potential project: link, create, or dismiss.

    - action=link: link to an existing project (requires project_id)
    - action=create: flag for new project creation
    - action=dismiss: dismiss as not relevant
    """
    if action not in ("link", "create", "dismiss"):
        raise HTTPException(status_code=400, detail="action must be link, create, or dismiss")
    if action == "link" and not project_id:
        raise HTTPException(status_code=400, detail="project_id required for link action")

    result = await resolve_potential_project(potential_id, action, project_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/discovery/generate-embeddings")
async def generate_embeddings(limit: int = 100):
    """Generate embeddings for projects that don't have one yet."""
    count = await embedding_service.batch_generate_embeddings(limit=limit)
    return {"embeddings_generated": count}


@router.post("/discovery/find-similar")
async def find_similar_projects(text: str, limit: int = 5, threshold: float = 0.5):
    """Find projects similar to the given text using embedding search."""
    results = await embedding_service.find_similar(text, limit=limit, threshold=threshold)
    return {"query": text, "results": results, "count": len(results)}
