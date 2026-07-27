"""
"Create with AI" — turns a description of a form into questions.

Talks to the Anthropic Messages API over the standard library, so the backend
keeps its four dependencies. The key, model and base URL all come from the
environment (see app/core/config.py); nothing is hardcoded, and with no key
configured the endpoint reports itself unavailable rather than falling back to
something that only looks like generation.

The model is pinned to a tool call, so it answers with structured input rather
than prose that would need parsing out of a sentence. Its output is still treated
as untrusted: _sanitise() is what decides what actually reaches the database.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from app.core.config import settings
from app.schemas.form import VALID_QUESTION_TYPES

# Types that cannot be answered without a list to choose from.
CHOICE_TYPES = ("multiple_choice", "dropdown")

MAX_TITLE = 300
MAX_DESCRIPTION = 500
MAX_OPTIONS = 8


class AIUnavailable(Exception):
    """No API key is configured, so the feature is switched off."""


class AIError(Exception):
    """The request was attempted and failed."""


SYSTEM_PROMPT = f"""You design forms. Given a description, return the questions the form should ask.

You can only use these question types:
- short_text: a single line, for names and other brief answers
- long_text: a paragraph, for open feedback
- multiple_choice: pick from a list; supply 2-{MAX_OPTIONS} options
- dropdown: pick from a longer list; supply 2-{MAX_OPTIONS} options
- email: an email address, validated
- number: a numeric answer
- yes_no: a binary answer
- rating: a 1-N scale; put the scale in settings as {{"max_rating": 5, "shape": "star"}} \
(shape is "star" or "number")

Rules:
- Ask between 3 and 8 questions unless the description asks for a specific number.
- Word each title as you would ask it out loud, and keep it under 15 words.
- Choose the type that fits the answer: an email address is `email`, a quantity is \
`number`, "how satisfied" is `rating`, a fixed set of answers is `multiple_choice`.
- Mark a question required only when the form is useless without it.
- Only add a description when the question genuinely needs clarifying.
- No duplicate questions, and nothing the description didn't ask for."""


def _post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{settings.AI_BASE_URL.rstrip('/')}{path}",
        method="POST",
        data=json.dumps(payload).encode(),
        headers={
            "content-type": "application/json",
            "x-api-key": settings.AI_API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.AI_TIMEOUT_SECONDS) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        # Surface the provider's own explanation — an expired key or a rate limit
        # is something the creator can act on, "502" is not.
        detail = ""
        try:
            body = json.loads(exc.read())
            detail = body.get("error", {}).get("message", "")
        except Exception:
            pass
        if exc.code in (401, 403):
            raise AIError("The AI provider rejected the configured API key.") from exc
        if exc.code == 429:
            raise AIError("The AI provider is rate limiting this key. Try again shortly.") from exc
        raise AIError(detail or f"The AI provider returned an error ({exc.code}).") from exc
    except urllib.error.URLError as exc:
        raise AIError(f"Could not reach the AI provider: {exc.reason}") from exc
    except (TimeoutError, json.JSONDecodeError) as exc:
        raise AIError("The AI provider did not answer in time.") from exc


FORM_TOOL = {
    "name": "emit_questions",
    "description": "Return the questions the described form should ask.",
    "input_schema": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_type": {"type": "string", "enum": list(VALID_QUESTION_TYPES)},
                        "title": {"type": "string", "description": "The question as asked."},
                        "description": {"type": "string", "description": "Optional help text."},
                        "is_required": {"type": "boolean"},
                        "options": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Choices, for multiple_choice and dropdown only.",
                        },
                        "settings": {
                            "type": "object",
                            "properties": {
                                "max_rating": {"type": "integer"},
                                "shape": {"type": "string", "enum": ["star", "number"]},
                            },
                            "description": "Rating scale, for rating only.",
                        },
                    },
                    "required": ["question_type", "title"],
                },
            }
        },
        "required": ["questions"],
    },
}


def _clean_options(raw: Any) -> list[str]:
    """Options as distinct, non-empty strings, in the order given."""
    if not isinstance(raw, list):
        return []
    seen: list[str] = []
    for option in raw:
        text = str(option).strip()[:MAX_TITLE]
        if text and text not in seen:
            seen.append(text)
    return seen[:MAX_OPTIONS]


def _clean_settings(question_type: str, raw: Any) -> dict[str, Any] | None:
    """Only the settings the type actually has, clamped to what the UI can show."""
    if question_type != "rating":
        return None
    raw = raw if isinstance(raw, dict) else {}
    try:
        steps = int(raw.get("max_rating", 5))
    except (TypeError, ValueError):
        steps = 5
    shape = raw.get("shape") if raw.get("shape") in ("star", "number") else "star"
    return {"max_rating": min(max(steps, 3), 10), "shape": shape}


def _sanitise(payload: Any) -> list[dict[str, Any]]:
    """
    The model's answer, reduced to questions this app can store and render.

    Anything unrecognised is dropped rather than passed through — a settings key
    we don't support, or a type we can't render, would reach the builder as a
    question nobody can answer. A choice question that arrived without options
    becomes short_text: the intent was to ask something, and an empty list would
    be a dead end for the respondent.
    """
    raw_questions = payload.get("questions") if isinstance(payload, dict) else None
    if not isinstance(raw_questions, list):
        return []

    questions: list[dict[str, Any]] = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()[:MAX_TITLE]
        if not title:
            continue

        question_type = item.get("question_type")
        if question_type not in VALID_QUESTION_TYPES:
            question_type = "short_text"

        options = _clean_options(item.get("options")) if question_type in CHOICE_TYPES else []
        if question_type in CHOICE_TYPES and len(options) < 2:
            question_type, options = "short_text", []

        description = str(item.get("description") or "").strip()[:MAX_DESCRIPTION]
        questions.append({
            "question_type": question_type,
            "title": title,
            "description": description or None,
            "is_required": bool(item.get("is_required", False)),
            "options": options or None,
            "settings": _clean_settings(question_type, item.get("settings")),
        })
        if len(questions) >= settings.AI_MAX_QUESTIONS:
            break

    return questions


def is_configured() -> bool:
    return bool(settings.AI_API_KEY)


def generate_questions(prompt: str) -> list[dict[str, Any]]:
    """
    Questions for the described form, ready to hand to form_service.add_question.

    Raises AIUnavailable when no key is configured, and AIError when the request
    was made and failed.
    """
    if not is_configured():
        raise AIUnavailable(
            "Create with AI needs an API key. Set AI_API_KEY (or ANTHROPIC_API_KEY) "
            "in the backend environment and restart it."
        )

    body = _post("/messages", {
        "model": settings.AI_MODEL,
        "max_tokens": 2048,
        "system": SYSTEM_PROMPT,
        "tools": [FORM_TOOL],
        # Force the tool: a prose answer would have to be parsed back out of a
        # sentence, and any wording change would break that.
        "tool_choice": {"type": "tool", "name": FORM_TOOL["name"]},
        "messages": [{"role": "user", "content": prompt}],
    })

    for block in body.get("content", []):
        if isinstance(block, dict) and block.get("type") == "tool_use":
            questions = _sanitise(block.get("input"))
            if questions:
                return questions
            raise AIError("The model didn't return any usable questions. Try describing the form differently.")

    raise AIError("The model answered without any questions.")
