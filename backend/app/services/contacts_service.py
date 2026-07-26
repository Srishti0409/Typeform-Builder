"""
Contacts service: derive the creator's contact list from submitted responses.

There is no contacts table, because a contact is not a thing the creator
creates — it is an observation. Whenever a respondent answers an `email`
question, that address is a contact; every later submission carrying the same
address folds into the same contact. A display name is taken from a name-ish
text answer in the same submission, if the form asked for one.

Aggregating server-side keeps the client to one request instead of one per
response, and keeps the matching rules (below) in a single testable place.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.form import Form
from app.models.question import Question
from app.models.response import Response

#: Substrings that mark a text question as asking for the respondent's name.
NAME_HINTS = ("name", "who are you", "call you")


def _decode(raw: str | None) -> Any:
    """Answers are JSON text; fall back to the raw string if it is not."""
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    return str(value).strip()


def _maps_to_contacts(q: Question) -> bool:
    """An email question feeds the contact list unless it was opted out.

    The builder's "Map to contacts" switch writes `map_to_contacts: false`;
    absent means on, so questions authored before the switch existed — and every
    new one — still produce contacts.
    """
    if q.question_type != "email":
        return False
    settings = _decode(q.settings)
    return not (isinstance(settings, dict) and settings.get("map_to_contacts") is False)


def _is_name_question(q: Question) -> bool:
    if q.question_type not in ("short_text", "long_text"):
        return False
    title = (q.title or "").lower()
    return any(hint in title for hint in NAME_HINTS)


def list_contacts(db: Session, creator_id: str) -> list[dict]:
    """One entry per email address seen across the creator's forms.

    Ordered most-recently-active first — the order the Contacts table wants.
    """
    forms = db.query(Form).filter(Form.creator_id == creator_id).all()
    if not forms:
        return []

    form_titles = {f.id: f.title for f in forms}

    questions = (
        db.query(Question)
        .filter(Question.form_id.in_(list(form_titles)))
        .all()
    )
    email_qids = {q.id for q in questions if _maps_to_contacts(q)}
    name_qids = {q.id for q in questions if _is_name_question(q)}
    if not email_qids:
        return []

    responses = (
        db.query(Response)
        .options(joinedload(Response.answers))
        .filter(Response.form_id.in_(list(form_titles)))
        .order_by(Response.submitted_at.asc())
        .all()
    )

    contacts: dict[str, dict] = {}
    for response in responses:
        email = ""
        name = ""
        for answer in response.answers:
            if answer.question_id in email_qids and not email:
                email = _as_text(_decode(answer.answer_value))
            elif answer.question_id in name_qids and not name:
                name = _as_text(_decode(answer.answer_value))

        if "@" not in email:
            continue

        key = email.lower()
        entry = contacts.get(key)
        submitted: datetime = response.submitted_at
        if entry is None:
            contacts[key] = {
                "email": email,
                "name": name or None,
                "response_count": 1,
                "first_response_at": submitted,
                "last_response_at": submitted,
                "forms": [form_titles.get(response.form_id, "Untitled")],
            }
            continue

        entry["response_count"] += 1
        entry["last_response_at"] = max(entry["last_response_at"], submitted)
        entry["first_response_at"] = min(entry["first_response_at"], submitted)
        # A later submission can supply a name the first one did not.
        if not entry["name"] and name:
            entry["name"] = name
        title = form_titles.get(response.form_id, "Untitled")
        if title not in entry["forms"]:
            entry["forms"].append(title)

    return sorted(contacts.values(), key=lambda c: c["last_response_at"], reverse=True)
