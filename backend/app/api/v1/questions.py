"""
Questions API — nested CRUD under forms.
"""
from __future__ import annotations
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.form import Form
from app.models.question import Question
from app.schemas.form import QuestionCreate, QuestionUpdate
from app.services import form_service

router = APIRouter(prefix="/forms/{form_id}/questions", tags=["questions"])

CREATOR_ID = settings.DEFAULT_CREATOR_ID


def _question_to_out(q: Question) -> dict:
    options = None
    if q.options:
        try:
            options = json.loads(q.options)
        except Exception:
            options = None
    q_settings = None
    if q.settings:
        try:
            q_settings = json.loads(q.settings)
        except Exception:
            q_settings = None
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
        "settings": q_settings,
        "created_at": q.created_at,
    }


@router.get("", response_model=list[dict])
def list_questions(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return [_question_to_out(q) for q in form.questions]


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_question(form_id: str, payload: QuestionCreate, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    data = payload.model_dump()
    question = form_service.add_question(db, form_id, data)
    return _question_to_out(question)


@router.patch("/{question_id}", response_model=dict)
def update_question(
    form_id: str,
    question_id: str,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    question = db.query(Question).filter(
        Question.id == question_id,
        Question.form_id == form_id,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("options", "settings"):
            setattr(question, field, json.dumps(value) if value is not None else None)
        else:
            setattr(question, field, value)

    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(question)
    return _question_to_out(question)


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(form_id: str, question_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    question = db.query(Question).filter(
        Question.id == question_id,
        Question.form_id == form_id,
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(question)

    # Renumber remaining questions
    remaining = (
        db.query(Question)
        .filter(Question.form_id == form_id, Question.id != question_id)
        .order_by(Question.order_index)
        .all()
    )
    for idx, q in enumerate(remaining):
        q.order_index = idx

    form.updated_at = datetime.utcnow()
    db.commit()
