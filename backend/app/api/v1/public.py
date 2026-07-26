"""
Public API — unauthenticated form rendering and response submission.
"""
from __future__ import annotations
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.form import Form
from app.models.response import Response, ResponseAnswer
from app.schemas.form import FormWithQuestions
from app.schemas.response import SubmitFormRequest, ResponseOut, AnswerOut
from app.services.validation import validate_answer, ValidationError

router = APIRouter(prefix="/f", tags=["public"])


def _question_to_dict(q) -> dict:
    options = None
    if q.options:
        try:
            options = json.loads(q.options)
        except Exception:
            options = None
    settings = None
    if q.settings:
        try:
            settings = json.loads(q.settings)
        except Exception:
            settings = None
    return {
        "id": q.id,
        "form_id": q.form_id,
        "order_index": q.order_index,
        "question_type": q.question_type,
        "title": q.title,
        "description": q.description,
        "is_required": q.is_required,
        "placeholder": q.placeholder,
        "options": options,
        "settings": settings,
        "created_at": q.created_at,
    }


@router.get("/{slug}", response_model=dict)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    """Get a published form by slug — public, no auth required."""
    form = db.query(Form).filter(Form.slug == slug, Form.status == "published").first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")

    theme = None
    if form.theme_config:
        try:
            theme = json.loads(form.theme_config)
        except Exception:
            theme = None

    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "slug": form.slug,
        "status": form.status,
        "thank_you_title": form.thank_you_title,
        "thank_you_message": form.thank_you_message,
        "theme_config": theme,
        "questions": [_question_to_dict(q) for q in form.questions],
    }


@router.post("/{slug}/submit", response_model=dict, status_code=status.HTTP_201_CREATED)
def submit_form(
    slug: str,
    payload: SubmitFormRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Submit a response to a published form — public, no auth required."""
    form = db.query(Form).filter(Form.slug == slug, Form.status == "published").first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")

    # Build question lookup
    question_map = {q.id: q for q in form.questions}

    # Validate all answers
    validation_errors: dict[str, str] = {}
    coerced_answers: dict[str, any] = {}

    for answer_input in payload.answers:
        qid = answer_input.question_id
        question = question_map.get(qid)
        if not question:
            continue  # Skip unknown questions

        options = None
        if question.options:
            try:
                options = json.loads(question.options)
            except Exception:
                options = None

        q_settings = None
        if question.settings:
            try:
                q_settings = json.loads(question.settings)
            except Exception:
                q_settings = None

        try:
            coerced = validate_answer(
                question_type=question.question_type,
                answer=answer_input.answer_value,
                is_required=question.is_required,
                options=options,
                settings=q_settings,
            )
            coerced_answers[qid] = coerced
        except ValidationError as e:
            validation_errors[qid] = e.message

    # Also check required questions that weren't answered
    answered_ids = {a.question_id for a in payload.answers}
    for qid, question in question_map.items():
        if question.is_required and qid not in answered_ids:
            validation_errors[qid] = "This field is required."

    if validation_errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"validation_errors": validation_errors},
        )

    # Reject a wholly empty submission. Without this, POSTing {"answers": []} to a
    # form whose questions are all optional records a blank response and inflates
    # the response count.
    meaningful = {
        qid: value
        for qid, value in coerced_answers.items()
        if value is not None and value != "" and value != []
    }
    if question_map and not meaningful:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please answer at least one question before submitting.",
        )

    # Persist response
    user_agent = request.headers.get("user-agent", "")
    response = Response(
        form_id=form.id,
        submitted_at=datetime.utcnow(),
        completion_time_seconds=payload.completion_time_seconds,
        user_agent=user_agent[:500] if user_agent else None,
    )
    db.add(response)
    db.flush()

    for qid, value in coerced_answers.items():
        db.add(ResponseAnswer(
            response_id=response.id,
            question_id=qid,
            answer_value=json.dumps(value),
        ))

    db.commit()
    db.refresh(response)

    return {
        "id": response.id,
        "form_id": form.id,
        "submitted_at": response.submitted_at.isoformat(),
        "message": "Response submitted successfully",
    }
