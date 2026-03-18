"""Web research job runner -- scrapes external sources for project intelligence."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.db import connection as db
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

# Known Nepal government and news sources
NEPAL_NEWS_SOURCES = [
    "https://english.onlinekhabar.com",
    "https://kathmandupost.com",
    "https://myrepublica.nagariknetwork.com",
    "https://thehimalayantimes.com",
    "https://nepalitimes.com",
]

MINISTRY_SITES = {
    "mopit": "https://mopit.gov.np",
    "mof": "https://mof.gov.np",
    "moud": "https://moud.gov.np",
    "moe": "https://moewri.gov.np",
    "moha": "https://moha.gov.np",
}


async def _fetch_page(url: str) -> str | None:
    """Fetch a web page and return its text content."""
    try:
        async with httpx.AsyncClient(
            timeout=settings.scrape_timeout,
            follow_redirects=True,
            headers={"User-Agent": settings.scrape_user_agent},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text
    except httpx.HTTPError as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return None


def _extract_text(html: str) -> str:
    """Extract readable text from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove script/style elements
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def _extract_links(html: str, base_url: str) -> list[dict[str, str]]:
    """Extract article links from an HTML page."""
    soup = BeautifulSoup(html, "html.parser")
    links: list[dict[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        title = a.get_text(strip=True)
        if not title or len(title) < 10:
            continue
        # Make absolute
        if href.startswith("/"):
            href = base_url.rstrip("/") + href
        if href.startswith("http"):
            links.append({"url": href, "title": title})
    return links


async def run_ministry_scan(ministry_id: str) -> dict[str, Any]:
    """Scan a ministry website for news and announcements.

    Returns summary of findings.
    """
    base_url = MINISTRY_SITES.get(ministry_id)
    if not base_url:
        # Try to look up from database
        row = await db.fetch_one(
            "SELECT website_url FROM government_units WHERE id = $1",
            ministry_id,
        )
        if row and row["website_url"]:
            base_url = row["website_url"]
        else:
            return {"error": f"Unknown ministry: {ministry_id}", "findings": []}

    html = await _fetch_page(base_url)
    if html is None:
        return {"error": f"Could not fetch {base_url}", "findings": []}

    # Extract links to news/announcements
    links = _extract_links(html, base_url)
    # Filter for likely news/project pages
    news_keywords = ["news", "notice", "project", "press", "update", "tender", "procurement"]
    relevant_links = [
        link for link in links
        if any(kw in link["url"].lower() or kw in link["title"].lower() for kw in news_keywords)
    ][:10]  # Limit to 10

    findings: list[dict[str, Any]] = []
    for link in relevant_links:
        page_html = await _fetch_page(link["url"])
        if page_html is None:
            continue

        page_text = _extract_text(page_html)
        if len(page_text) < 100:
            continue

        # Use LLM to extract project mentions
        mentions, _ = await llm_service.extract_project_mentions(page_text, link["url"])
        for mention in mentions:
            finding_id = str(uuid.uuid4())
            finding = {
                "id": finding_id,
                "finding_type": "ministry_announcement",
                "title": mention.get("title", link["title"]),
                "body": mention.get("description", ""),
                "source_url": link["url"],
                "source_name": base_url,
                "confidence": 0.6,
            }
            findings.append(finding)

            # Persist to DB
            await db.execute(
                """
                INSERT INTO research_findings
                    (id, project_id, finding_type, title, body, source_url, source_name,
                     confidence, discovered_at)
                VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
                """,
                finding_id, finding["finding_type"], finding["title"],
                finding["body"], finding["source_url"], finding["source_name"],
                finding["confidence"], datetime.now(timezone.utc),
            )

    return {
        "ministry_id": ministry_id,
        "url": base_url,
        "pages_scanned": len(relevant_links),
        "findings": findings,
    }


async def run_project_scan(project_id: str) -> dict[str, Any]:
    """Search external sources for mentions of a specific project.

    Returns summary of findings.
    """
    # Get project details for search
    project = await db.fetch_one(
        "SELECT name_en, name_ne, description_en FROM projects WHERE id = $1",
        project_id,
    )
    if project is None:
        return {"error": "Project not found", "project_id": project_id, "findings": []}

    search_term = project["name_en"] or project["name_ne"] or ""
    if not search_term:
        return {"error": "No project name to search", "project_id": project_id, "findings": []}

    findings: list[dict[str, Any]] = []

    # Search across news sources
    for source_url in NEPAL_NEWS_SOURCES:
        search_url = f"{source_url}/?s={httpx.QueryParams({'q': search_term})}"
        html = await _fetch_page(search_url)
        if html is None:
            continue

        links = _extract_links(html, source_url)[:5]
        for link in links:
            page_html = await _fetch_page(link["url"])
            if page_html is None:
                continue

            page_text = _extract_text(page_html)
            if len(page_text) < 100:
                continue

            # Check relevance using LLM
            mentions, _ = await llm_service.extract_project_mentions(page_text, link["url"])
            for mention in mentions:
                finding_id = str(uuid.uuid4())
                # Determine finding type
                finding_type = "external_mention"
                finding = {
                    "id": finding_id,
                    "finding_type": finding_type,
                    "title": mention.get("title", link["title"]),
                    "body": mention.get("description", ""),
                    "source_url": link["url"],
                    "source_name": source_url,
                    "confidence": 0.5,
                }
                findings.append(finding)

                # Persist
                await db.execute(
                    """
                    INSERT INTO research_findings
                        (id, project_id, finding_type, title, body, source_url, source_name,
                         confidence, discovered_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT DO NOTHING
                    """,
                    finding_id, project_id, finding_type, finding["title"],
                    finding["body"], finding["source_url"], finding["source_name"],
                    finding["confidence"], datetime.now(timezone.utc),
                )

    return {
        "project_id": project_id,
        "sources_scanned": len(NEPAL_NEWS_SOURCES),
        "findings_count": len(findings),
        "findings": findings,
    }


async def discover_projects(region_id: str | None = None) -> dict[str, Any]:
    """Scan news sources for mentioned projects not yet in the system.

    Returns list of potential unregistered projects.
    """
    discovered: list[dict[str, Any]] = []

    for source_url in NEPAL_NEWS_SOURCES:
        # Fetch main page / infrastructure section
        urls_to_check = [source_url]
        for suffix in ["/category/development", "/category/infrastructure", "/category/economy"]:
            urls_to_check.append(source_url + suffix)

        for page_url in urls_to_check:
            html = await _fetch_page(page_url)
            if html is None:
                continue

            links = _extract_links(html, source_url)
            # Filter for likely project articles
            project_keywords = [
                "project", "construction", "bridge", "road", "highway",
                "school", "hospital", "dam", "irrigation", "airport",
                "infrastructure", "development", "budget",
            ]
            relevant = [
                link for link in links
                if any(kw in link["title"].lower() for kw in project_keywords)
            ][:5]

            for link in relevant:
                page_html = await _fetch_page(link["url"])
                if page_html is None:
                    continue

                page_text = _extract_text(page_html)
                if len(page_text) < 200:
                    continue

                mentions, _ = await llm_service.extract_project_mentions(page_text, link["url"])
                for mention in mentions:
                    discovered.append({
                        "title": mention.get("title", ""),
                        "description": mention.get("description", ""),
                        "source_url": link["url"],
                        "source_name": source_url,
                        "location": mention.get("location"),
                        "budget_mentioned": mention.get("budget_mentioned"),
                        "status_mentioned": mention.get("status_mentioned"),
                    })

    return {
        "region_id": region_id,
        "sources_scanned": len(NEPAL_NEWS_SOURCES),
        "projects_discovered": len(discovered),
        "projects": discovered,
    }
