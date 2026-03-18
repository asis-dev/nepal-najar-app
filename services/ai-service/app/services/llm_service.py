"""LLM Service -- Claude API integration with rate limiting and retries."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple token-bucket rate limiter for API calls."""

    def __init__(self, max_per_minute: int):
        self._max = max_per_minute
        self._tokens = max_per_minute
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(self._max, self._tokens + elapsed * (self._max / 60.0))
            self._last_refill = now
            if self._tokens < 1:
                wait = (1 - self._tokens) / (self._max / 60.0)
                logger.debug("Rate limiter: waiting %.2fs", wait)
                await asyncio.sleep(wait)
                self._tokens = 0
            else:
                self._tokens -= 1


class LLMService:
    """Wrapper around the Anthropic Claude API for Nepal Progress AI tasks."""

    def __init__(self) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.default_model
        self._rate_limiter = RateLimiter(settings.llm_max_requests_per_minute)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _call(
        self,
        system: str,
        user_prompt: str,
        max_tokens: int = 1024,
    ) -> anthropic.types.Message:
        """Make a Claude API call with rate limiting and exponential retry."""
        await self._rate_limiter.acquire()

        last_err: Exception | None = None
        for attempt in range(settings.llm_retry_max_attempts):
            try:
                message = await self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    system=system,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                return message
            except anthropic.RateLimitError as exc:
                last_err = exc
                delay = settings.llm_retry_base_delay * (2 ** attempt)
                logger.warning(
                    "Rate limited (attempt %d/%d), retrying in %.1fs",
                    attempt + 1, settings.llm_retry_max_attempts, delay,
                )
                await asyncio.sleep(delay)
            except anthropic.APIStatusError as exc:
                if exc.status_code >= 500:
                    last_err = exc
                    delay = settings.llm_retry_base_delay * (2 ** attempt)
                    logger.warning(
                        "API error %d (attempt %d/%d), retrying in %.1fs",
                        exc.status_code, attempt + 1,
                        settings.llm_retry_max_attempts, delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    raise

        raise last_err  # type: ignore[misc]

    def _extract_text(self, message: anthropic.types.Message) -> str:
        return message.content[0].text

    def _extract_usage(self, message: anthropic.types.Message) -> int:
        return message.usage.input_tokens + message.usage.output_tokens

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def summarize(
        self, text: str, language: str = "en", max_length: int = 200
    ) -> tuple[str, int]:
        """Summarize text. Returns (summary, tokens_used)."""
        lang_name = "Nepali" if language == "ne" else "English"
        system = (
            "You are a Nepal government project analyst. "
            "Produce clear, factual, neutral summaries of project updates. "
            "Never fabricate information."
        )
        prompt = (
            f"Summarize the following government project update in {lang_name} "
            f"in {max_length} words or fewer. Be factual and neutral.\n\n{text}"
        )
        msg = await self._call(system, prompt, max_tokens=max_length * 4)
        return self._extract_text(msg), self._extract_usage(msg)

    async def translate(
        self, text: str, source_lang: str, target_lang: str
    ) -> tuple[str, int]:
        """Translate between Nepali and English. Returns (translation, tokens)."""
        lang_map = {"ne": "Nepali", "en": "English"}
        source = lang_map.get(source_lang, source_lang)
        target = lang_map.get(target_lang, target_lang)
        system = (
            "You are a professional translator specialising in Nepal government "
            "documents. Preserve meaning, tone, and technical terms accurately."
        )
        prompt = (
            f"Translate the following text from {source} to {target}. "
            f"Output only the translation, nothing else.\n\n{text}"
        )
        msg = await self._call(system, prompt, max_tokens=len(text) * 4)
        return self._extract_text(msg), self._extract_usage(msg)

    async def classify(
        self, text: str, categories: list[str]
    ) -> tuple[str, float, int]:
        """Classify text into one of the given categories.

        Returns (category, confidence, tokens_used).
        """
        cats = ", ".join(categories)
        system = (
            "You are a classification engine. You respond ONLY with valid JSON."
        )
        prompt = (
            f"Classify the following text into exactly one of these categories: "
            f"{cats}.\n\nText: {text}\n\n"
            f'Respond with JSON: {{"category": "...", "confidence": 0.0-1.0}}'
        )
        msg = await self._call(system, prompt, max_tokens=100)
        raw = self._extract_text(msg)
        try:
            parsed = json.loads(raw)
            return parsed["category"], parsed.get("confidence", 0.5), self._extract_usage(msg)
        except (json.JSONDecodeError, KeyError):
            return raw.strip().lower(), 0.5, self._extract_usage(msg)

    async def detect_anomaly(
        self, project_data: dict[str, Any], historical_data: dict[str, Any]
    ) -> tuple[list[dict[str, Any]], int]:
        """Analyse project data for anomalies using LLM reasoning.

        Returns (list of anomaly dicts, tokens_used).
        """
        system = (
            "You are an auditor analysing Nepal government infrastructure projects. "
            "Detect suspicious patterns, inconsistencies, and anomalies. "
            "Respond ONLY with valid JSON."
        )
        prompt = (
            "Analyse this project data for anomalies.\n\n"
            f"Current project data:\n{json.dumps(project_data, indent=2)}\n\n"
            f"Historical data:\n{json.dumps(historical_data, indent=2)}\n\n"
            "Return a JSON array of anomalies found. Each anomaly should have:\n"
            '- "flag_type": one of budget_mismatch, progress_jump, stale_no_update, '
            "contradicted_claim, suspicious_completion, timeline_violation\n"
            '- "severity": critical, high, medium, or low\n'
            '- "description": brief explanation\n'
            '- "confidence": 0.0 to 1.0\n\n'
            "If no anomalies, return an empty array []."
        )
        msg = await self._call(system, prompt, max_tokens=2048)
        raw = self._extract_text(msg)
        try:
            anomalies = json.loads(raw)
            if not isinstance(anomalies, list):
                anomalies = [anomalies]
            return anomalies, self._extract_usage(msg)
        except json.JSONDecodeError:
            return [], self._extract_usage(msg)

    async def generate_questions(
        self, project_data: dict[str, Any]
    ) -> tuple[list[str], int]:
        """Generate follow-up verification questions for a project.

        Returns (questions, tokens_used).
        """
        system = (
            "You are a government accountability analyst. "
            "Generate pointed, specific questions to verify project claims."
        )
        prompt = (
            "Based on this project data, generate 3-5 specific follow-up "
            "questions that would help verify claims and detect issues.\n\n"
            f"Project data:\n{json.dumps(project_data, indent=2)}\n\n"
            'Respond with a JSON array of question strings.'
        )
        msg = await self._call(system, prompt, max_tokens=1024)
        raw = self._extract_text(msg)
        try:
            questions = json.loads(raw)
            if isinstance(questions, list):
                return questions, self._extract_usage(msg)
        except json.JSONDecodeError:
            pass
        # Fallback: split by newlines
        return [q.strip("- ") for q in raw.strip().split("\n") if q.strip()], self._extract_usage(msg)

    async def detect_contradiction(
        self, official_claim: str, external_finding: str
    ) -> tuple[dict[str, Any], int]:
        """Check if an external finding contradicts an official claim.

        Returns (result_dict, tokens_used).
        """
        system = (
            "You are a fact-checker comparing official government claims with "
            "external evidence. Respond ONLY with valid JSON."
        )
        prompt = (
            "Compare these two statements about a government project:\n\n"
            f"Official claim: {official_claim}\n\n"
            f"External report: {external_finding}\n\n"
            "Respond with JSON:\n"
            '{"contradicts": true/false, "explanation": "...", "confidence": 0.0-1.0}'
        )
        msg = await self._call(system, prompt, max_tokens=512)
        raw = self._extract_text(msg)
        try:
            result = json.loads(raw)
            return result, self._extract_usage(msg)
        except json.JSONDecodeError:
            return {
                "contradicts": False,
                "explanation": raw,
                "confidence": 0.0,
            }, self._extract_usage(msg)

    async def extract_project_mentions(
        self, text: str, source_url: str
    ) -> tuple[list[dict[str, Any]], int]:
        """Extract mentions of infrastructure projects from scraped text.

        Returns (list of project mention dicts, tokens_used).
        """
        system = (
            "You are an analyst extracting infrastructure project mentions "
            "from Nepal news articles and government publications. "
            "Respond ONLY with valid JSON."
        )
        prompt = (
            "Extract all mentions of infrastructure or development projects "
            "from this text. For each project found, provide:\n"
            '- "title": project name or short description\n'
            '- "description": brief summary of what was mentioned\n'
            '- "location": district/province if mentioned\n'
            '- "budget_mentioned": budget figure if mentioned, else null\n'
            '- "status_mentioned": status if mentioned, else null\n\n'
            f"Source URL: {source_url}\n\n"
            f"Text:\n{text[:8000]}\n\n"
            "Return a JSON array. If no projects found, return []."
        )
        msg = await self._call(system, prompt, max_tokens=2048)
        raw = self._extract_text(msg)
        try:
            mentions = json.loads(raw)
            return mentions if isinstance(mentions, list) else [], self._extract_usage(msg)
        except json.JSONDecodeError:
            return [], self._extract_usage(msg)


# Singleton instance
llm_service = LLMService()
