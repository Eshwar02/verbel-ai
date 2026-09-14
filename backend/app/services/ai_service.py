"""AI text enhancement — Mistral wrapper.

Isolated behind a single function so the transformation logic stays out of the
router. Calls the Mistral chat-completions REST API directly with httpx (no SDK
dependency). Reads the API key from settings/MISTRAL_API_KEY. Raises
AIServiceUnavailable when the key is missing or the API/network call fails so
the router can map it to HTTP 503.
"""
from __future__ import annotations

import os
import time

import httpx

from app.config import settings

# Fast, cheap Mistral model for lightweight text editing.
MODEL = "mistral-small-latest"
MAX_TOKENS = 2000
API_URL = "https://api.mistral.ai/v1/chat/completions"
TIMEOUT = 30.0

# Transient failures (rate limiting, provider hiccups) are retried with
# exponential backoff before we give up and surface a 503. Free-tier Mistral
# keys frequently return 429, so this makes enhancement resilient.
MAX_RETRIES = 3
BACKOFF_BASE = 0.5  # seconds: waits ~0.5s, 1s, 2s between attempts
_RETRY_STATUS = {429, 500, 502, 503, 504}

# One concise system prompt per supported action. Each instructs the model to
# return ONLY the transformed text with no preamble or commentary.
_SYSTEM_PROMPTS: dict[str, str] = {
    "summarize": (
        "You are a text editor. Summarize the user's text concisely while "
        "preserving its key points and meaning. Respond with ONLY the summary "
        "— no preamble, labels, or commentary."
    ),
    "grammar": (
        "You are a proofreader. Fix all grammar and spelling errors in the "
        "user's text. Preserve the original meaning, tone, and formatting; do "
        "not rephrase beyond what is needed to correct errors. Respond with "
        "ONLY the corrected text — no preamble, labels, or commentary."
    ),
    "rewrite": (
        "You are a text editor. Rewrite the user's text to be clearer and more "
        "natural while preserving its meaning. Respond with ONLY the rewritten "
        "text — no preamble, labels, or commentary."
    ),
    "conversational": (
        "You are a text editor preparing text for text-to-speech. Rewrite the "
        "user's text in a natural, spoken conversational style that sounds "
        "smooth when read aloud, while preserving its meaning. Respond with "
        "ONLY the rewritten text — no preamble, labels, or commentary."
    ),
}

SUPPORTED_ACTIONS: tuple[str, ...] = tuple(_SYSTEM_PROMPTS.keys())


class AIServiceUnavailable(Exception):
    """Raised when the AI provider is unconfigured or fails to respond."""


def enhance_text(text: str, action: str) -> str:
    """Transform ``text`` according to ``action`` using Mistral.

    Returns only the transformed text. Raises AIServiceUnavailable if the API
    key is missing or the API/network call fails.
    """
    system_prompt = _SYSTEM_PROMPTS.get(action)
    if system_prompt is None:
        raise ValueError(f"Unsupported action: {action!r}")

    api_key = settings.mistral_api_key or os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise AIServiceUnavailable("MISTRAL_API_KEY is not configured.")

    payload = {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.post(
                API_URL, json=payload, headers=headers, timeout=TIMEOUT
            )
            # raise_for_status turns 4xx/5xx into HTTPStatusError; the handler
            # below decides whether the status is worth retrying.
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            if exc.response.status_code not in _RETRY_STATUS:
                raise AIServiceUnavailable(str(exc)) from exc
        except (httpx.TransportError, KeyError, IndexError, ValueError) as exc:
            # Network/timeout errors and malformed responses are transient.
            last_exc = exc
        except Exception as exc:  # unexpected provider failure — don't retry
            raise AIServiceUnavailable(str(exc)) from exc

        # Back off before the next attempt (skip the wait after the last try).
        if attempt < MAX_RETRIES - 1:
            time.sleep(BACKOFF_BASE * (2**attempt))

    raise AIServiceUnavailable(str(last_exc))
