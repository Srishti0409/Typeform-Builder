"""
Forms CRUD API — creator endpoints (assume default logged-in creator).
"""
from __future__ import annotations
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.form import Form
from app.schemas.form import (
    FormCreate, FormUpdate, FormOut, FormListItem,
    FormWithQuestions, QuestionOut, PublishResponse, DuplicateFormResponse, ReorderQuestionsRequest
)
from app.services import form_service

router = APIRouter(prefix="/forms", tags=["forms"])

CREATOR_ID = settings.DEFAULT_CREATOR_ID


def _build_share_url(slug: str) -> str:
    return f"{settings.PUBLIC_FORM_BASE_URL}/f/{slug}"


# The form's name is how it is identified in the creator's list, so a blank one
# would leave a row that can't be told apart from any other. Reject it here, with
# a message the UI can show verbatim, rather than storing whitespace.
TITLE_MAX_LENGTH = 255


def _clean_title(value: str) -> str:
    title = value.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Give the form a name.")
    if len(title) > TITLE_MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Name must be {TITLE_MAX_LENGTH} characters or fewer.",
        )
    return title


@router.get("", response_model=list[FormListItem])
def list_forms(db: Session = Depends(get_db)):
    forms = (
        db.query(Form)
        .filter(Form.creator_id == CREATOR_ID)
        .order_by(Form.updated_at.desc())
        .all()
    )
    result = []
    for f in forms:
        result.append(FormListItem(
            id=f.id,
            title=f.title,
            slug=f.slug,
            status=f.status,
            response_count=len(f.responses),
            created_at=f.created_at,
            updated_at=f.updated_at,
        ))
    return result


@router.post("", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, db: Session = Depends(get_db)):
    form = form_service.create_form(
        db, _clean_title(payload.title), payload.description, CREATOR_ID
    )
    return _form_to_out(form)


@router.get("/{form_id}", response_model=FormWithQuestions)
def get_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return _form_to_out_with_questions(form)


@router.patch("/{form_id}", response_model=FormOut)
def update_form(form_id: str, payload: FormUpdate, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Renaming. The slug is left alone on purpose: a link that has been shared
    # keeps working, which is what the rename dialog promises.
    if payload.title is not None:
        form.title = _clean_title(payload.title)
    if payload.description is not None:
        form.description = payload.description
    if payload.thank_you_title is not None:
        form.thank_you_title = payload.thank_you_title
    if payload.thank_you_message is not None:
        form.thank_you_message = payload.thank_you_message
    if payload.theme_config is not None:
        form.theme_config = payload.theme_config.model_dump_json()

    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return _form_to_out(form)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    db.delete(form)
    db.commit()


@router.post("/{form_id}/publish", response_model=PublishResponse)
def publish_form(form_id: str, db: Session = Depends(get_db)):
    # A form with no questions would publish a link that renders nothing, so
    # refuse it here rather than handing out a dead URL.
    existing = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Form not found")
    if not existing.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one question before publishing.",
        )

    form = form_service.publish_form(db, form_id, CREATOR_ID)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return PublishResponse(
        id=form.id,
        slug=form.slug,
        status=form.status,
        share_url=_build_share_url(form.slug),
    )


@router.post("/{form_id}/unpublish", response_model=PublishResponse)
def unpublish_form(form_id: str, db: Session = Depends(get_db)):
    form = form_service.unpublish_form(db, form_id, CREATOR_ID)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return PublishResponse(
        id=form.id,
        slug=form.slug,
        status=form.status,
        share_url=_build_share_url(form.slug),
    )


@router.post("/{form_id}/duplicate", response_model=DuplicateFormResponse, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: str, db: Session = Depends(get_db)):
    new_form = form_service.duplicate_form(db, form_id, CREATOR_ID)
    if not new_form:
        raise HTTPException(status_code=404, detail="Form not found")
    return DuplicateFormResponse(
        id=new_form.id,
        title=new_form.title,
        slug=new_form.slug,
        status=new_form.status,
    )


@router.post("/{form_id}/reorder-questions", response_model=list[QuestionOut])
def reorder_questions(form_id: str, payload: ReorderQuestionsRequest, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    questions = form_service.reorder_questions(db, form_id, payload.question_ids)
    return [_question_to_out(q) for q in questions]


# ---- Helpers ----

def _form_to_out(form: Form) -> dict:
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
        "creator_id": form.creator_id,
        "thank_you_title": form.thank_you_title,
        "thank_you_message": form.thank_you_message,
        "theme_config": theme,
        "response_count": len(form.responses),
        "created_at": form.created_at,
        "updated_at": form.updated_at,
    }


def _form_to_out_with_questions(form: Form) -> dict:
    data = _form_to_out(form)
    data["questions"] = [_question_to_out(q) for q in form.questions]
    return data


def _question_to_out(q) -> dict:
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
