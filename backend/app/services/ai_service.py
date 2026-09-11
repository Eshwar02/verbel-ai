"""AI text enhancement — Mistral wrapper.

Isolated behind a single function so the transformation logic stays out of the
router. Calls the Mistral chat-completions REST API directly with httpx (no SDK
dependency). Reads the API key from settings/MISTRAL_API_KEY. Raises
AIServiceUnavailable when the key is missing or the API/network call fails so
the router can map it to HTTP 503.
"""
from __future__ import annotations

import os

import httpx

from app.config import settings

# Fast, cheap Mistral model for lightweight text editing.
MODEL = "mistral-small-latest"
MAX_TOKENS = 2000
API_URL = "https://api.mistral.ai/v1/chat/completions"
TIMEOUT = 30.0

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

    try:
        resp = httpx.post(API_URL, json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise AIServiceUnavailable(str(exc)) from exc
    except Exception as exc:  # unexpected provider failure
        raise AIServiceUnavailable(str(exc)) from exc
