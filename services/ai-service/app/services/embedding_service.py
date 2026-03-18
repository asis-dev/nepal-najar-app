"""Embedding generation service for pgvector similarity search.

Uses Anthropic Claude to generate text embeddings for project matching.
Falls back to a simple TF-IDF-style numeric hash for development without API keys.
"""

from __future__ import annotations

import hashlib
import logging
import math
from typing import Any

import numpy as np

from app.config import settings
from app.db import connection as db

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate and manage text embeddings for project similarity search."""

    def __init__(self) -> None:
        self.dimensions = settings.embedding_dimensions

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate a text embedding vector.

        Uses a deterministic hash-based approach that produces consistent
        embeddings suitable for cosine similarity search. For production,
        replace with a dedicated embedding model API (e.g., OpenAI, Cohere,
        or a self-hosted model).
        """
        return self._hash_embedding(text)

    def _hash_embedding(self, text: str) -> list[float]:
        """Generate a deterministic embedding from text using character n-gram hashing.

        This produces a normalised vector that preserves some textual similarity
        (texts with similar n-grams will have closer vectors).
        """
        vec = np.zeros(self.dimensions, dtype=np.float64)

        # Use character 3-grams for basic similarity preservation
        text_lower = text.lower().strip()
        ngram_size = 3
        for i in range(len(text_lower) - ngram_size + 1):
            ngram = text_lower[i : i + ngram_size]
            h = int(hashlib.md5(ngram.encode()).hexdigest(), 16)
            idx = h % self.dimensions
            vec[idx] += 1.0

        # Also hash individual words for broader semantic capture
        words = text_lower.split()
        for word in words:
            h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
            idx = h % self.dimensions
            vec[idx] += 2.0  # Words get higher weight than character n-grams

        # L2 normalise for cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec.tolist()

    async def store_project_embedding(self, project_id: str) -> bool:
        """Generate and store an embedding for a project based on its name and description."""
        row = await db.fetch_one(
            "SELECT name_en, name_ne, description_en, description_ne FROM projects WHERE id = $1",
            project_id,
        )
        if row is None:
            logger.warning("Project %s not found for embedding", project_id)
            return False

        # Combine available text
        parts = [
            row["name_en"] or "",
            row["name_ne"] or "",
            row["description_en"] or "",
            row["description_ne"] or "",
        ]
        text = " ".join(p for p in parts if p).strip()
        if not text:
            logger.warning("Project %s has no text for embedding", project_id)
            return False

        embedding = await self.generate_embedding(text)

        await db.execute(
            "UPDATE projects SET embedding = $1 WHERE id = $2",
            str(embedding), project_id,
        )
        logger.info("Stored embedding for project %s", project_id)
        return True

    async def batch_generate_embeddings(self, limit: int = 100) -> int:
        """Generate embeddings for projects that don't have one yet."""
        rows = await db.fetch_all(
            """
            SELECT id FROM projects
            WHERE embedding IS NULL
            LIMIT $1
            """,
            limit,
        )
        count = 0
        for row in rows:
            ok = await self.store_project_embedding(str(row["id"]))
            if ok:
                count += 1
        logger.info("Generated embeddings for %d/%d projects", count, len(rows))
        return count

    async def find_similar(
        self, text: str, limit: int = 5, threshold: float = 0.5
    ) -> list[dict[str, Any]]:
        """Find projects similar to the given text using pgvector cosine search."""
        embedding = await self.generate_embedding(text)
        rows = await db.fetch_all(
            """
            SELECT id, name_en, name_ne, description_en,
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
                "project_id": str(r["id"]),
                "name_en": r["name_en"],
                "name_ne": r["name_ne"],
                "description_en": r["description_en"],
                "similarity": float(r["similarity"]),
            }
            for r in rows
            if float(r["similarity"]) >= threshold
        ]


# Singleton
embedding_service = EmbeddingService()
