"""
Form service: duplicate, publish/unpublish, question reordering, slug generation.
"""
from __future__ import annotations
import json
import re
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.form import Form
from app.models.question import Question


def slugify(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")[:80]
    return slug or "form"


def unique_slug(db: Session, base: str) -> str:
    """Generate a unique slug by appending a random suffix if needed."""
    candidate = base
    while db.query(Form).filter(Form.slug == candidate).first():
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
    return candidate


def _owned(db: Session, form_id: str, creator_id: str) -> Form | None:
    """
    A form, but only if this creator owns it.

    Every mutation goes through this: an id belonging to someone else has to be
    indistinguishable from one that doesn't exist, or the API leaks which ids are
    real.
    """
    return (
        db.query(Form)
        .filter(Form.id == form_id, Form.creator_id == creator_id)
        .first()
    )


def create_form(db: Session, title: str, description: str | None, creator_id: str) -> Form:
    base_slug = slugify(title)
    slug = unique_slug(db, base_slug)
    form = Form(
        title=title,
        description=description,
        slug=slug,
        creator_id=creator_id,
        status="draft",
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def duplicate_form(db: Session, form_id: str, creator_id: str) -> Form | None:
    """
    Deep-copy a form and all its questions.

    Every copied row is a new row with its own id, and the question bodies are
    copied by value (the options/settings JSON is stored as text), so the copy and
    the original share nothing once this returns — editing one cannot affect the
    other.

    Responses are deliberately not copied: the copy is a new form that has never
    been answered. It also starts as a draft with its own slug, so duplicating a
    published form can't silently put a second live link on the same questions.
    """
    original = (
        db.query(Form)
        .filter(Form.id == form_id, Form.creator_id == creator_id)
        .first()
    )
    if not original:
        return None

    new_title = f"{original.title} (Copy)"
    base_slug = slugify(new_title)
    slug = unique_slug(db, base_slug)

    new_form = Form(
        title=new_title,
        description=original.description,
        slug=slug,
        creator_id=creator_id,
        status="draft",
        theme_config=original.theme_config,
        thank_you_title=original.thank_you_title,
        thank_you_message=original.thank_you_message,
    )
    db.add(new_form)
    db.flush()

    # Read through the ordered relationship — the same read the builder and the
    # public form render from — so the copy's order is the order the creator sees.
    #
    # Renumber as we go rather than carrying order_index across: a form authored
    # before the ordering fix can hold several questions at the same index, and
    # copying those verbatim would leave the copy's order down to how SQLite
    # happens to break the tie, and any later reorder inside the copy unpredictable.
    for index, q in enumerate(original.questions):
        db.add(Question(
            form_id=new_form.id,
            order_index=index,
            question_type=q.question_type,
            title=q.title,
            description=q.description,
            is_required=q.is_required,
            placeholder=q.placeholder,
            options=q.options,
            settings=q.settings,
        ))

    db.commit()
    db.refresh(new_form)
    return new_form


def publish_form(db: Session, form_id: str, creator_id: str) -> Form | None:
    """
    Make the form answerable at its public slug.

    The slug is minted once, at creation, and never reissued — a link that has
    been shared has to keep working, so renaming or republishing must not move it.
    """
    form = _owned(db, form_id, creator_id)
    if not form:
        return None
    form.status = "published"
    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return form


def unpublish_form(db: Session, form_id: str, creator_id: str) -> Form | None:
    """
    Take the form offline. The slug is kept, so republishing restores the same
    link rather than orphaning the one already handed out; until then the public
    route refuses it (see api/v1/public.py, which filters on status).
    """
    form = _owned(db, form_id, creator_id)
    if not form:
        return None
    form.status = "draft"
    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return form


def reorder_questions(db: Session, form_id: str, question_ids: list[str]) -> list[Question]:
    """Reorder questions by updating order_index values."""
    questions = db.query(Question).filter(Question.form_id == form_id).all()
    q_map = {q.id: q for q in questions}

    for idx, qid in enumerate(question_ids):
        if qid in q_map:
            q_map[qid].order_index = idx

    db.commit()

    # Return updated, sorted list
    return sorted(questions, key=lambda q: q.order_index)


def add_question(db: Session, form_id: str, data: dict) -> Question:
    """Add a question to a form, appending at end or specified index."""
    existing_count = db.query(Question).filter(Question.form_id == form_id).count()
    # The API model declares order_index as Optional, so model_dump() sends the
    # key with a None value. A plain .get(key, default) therefore returns None
    # rather than the fallback, which left every appended question at index 0.
    order_index = data.get("order_index")
    if order_index is None:
        order_index = existing_count

    question = Question(
        form_id=form_id,
        order_index=order_index,
        question_type=data.get("question_type", "short_text"),
        title=data.get("title", "Untitled Question"),
        description=data.get("description"),
        is_required=data.get("is_required", False),
        placeholder=data.get("placeholder"),
        options=json.dumps(data.get("options")) if data.get("options") else None,
        settings=json.dumps(data.get("settings")) if data.get("settings") else None,
    )
    db.add(question)

    # Update form updated_at
    form = db.query(Form).filter(Form.id == form_id).first()
    if form:
        form.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(question)
    return question
