"""
Responses API — results, stats, and CSV export for creator.
"""
from __future__ import annotations
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.form import Form
from app.models.response import Response, ResponseAnswer
from app.services.stats_service import get_form_stats
from app.services.export_service import export_responses_csv

router = APIRouter(prefix="/forms/{form_id}/responses", tags=["responses"])

CREATOR_ID = settings.DEFAULT_CREATOR_ID


def _answer_to_dict(a: ResponseAnswer) -> dict:
    value = None
    if a.answer_value is not None:
        try:
            value = json.loads(a.answer_value)
        except (json.JSONDecodeError, TypeError):
            value = a.answer_value
    return {
        "id": a.id,
        "question_id": a.question_id,
        "answer_value": value,
    }


@router.get("")
def list_responses(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    responses = (
        db.query(Response)
        .filter(Response.form_id == form_id)
        .order_by(Response.submitted_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "form_id": r.form_id,
            "submitted_at": r.submitted_at.isoformat(),
            "completion_time_seconds": r.completion_time_seconds,
            "answer_count": len(r.answers),
        }
        for r in responses
    ]


@router.get("/{response_id}")
def get_response(form_id: str, response_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    response = db.query(Response).filter(
        Response.id == response_id,
        Response.form_id == form_id,
    ).first()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    return {
        "id": response.id,
        "form_id": response.form_id,
        "submitted_at": response.submitted_at.isoformat(),
        "completion_time_seconds": response.completion_time_seconds,
        "answers": [_answer_to_dict(a) for a in response.answers],
    }


@router.get("/stats/summary")
def get_stats(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    stats = get_form_stats(db, form_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Could not compute stats")

    return stats.model_dump()


@router.get("/export/csv")
def export_csv(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id, Form.creator_id == CREATOR_ID).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    csv_bytes = export_responses_csv(db, form_id)
    filename = f"{form.slug}-responses.csv"

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
