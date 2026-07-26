"""
CSV export service: generate CSV bytes from form responses.
"""
from __future__ import annotations
import csv
import io
import json
from sqlalchemy.orm import Session

from app.models.form import Form
from app.models.response import Response, ResponseAnswer


def export_responses_csv(db: Session, form_id: str) -> bytes:
    """Generate CSV bytes for all responses to a form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return b""

    questions = sorted(form.questions, key=lambda q: q.order_index)
    responses = (
        db.query(Response)
        .filter(Response.form_id == form_id)
        .order_by(Response.submitted_at.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    header = ["Response ID", "Submitted At", "Completion Time (s)"]
    for q in questions:
        header.append(q.title)
    writer.writerow(header)

    # Data rows
    for response in responses:
        # Build answer map: question_id -> answer_value
        answer_map: dict[str, str] = {}
        for answer in response.answers:
            if answer.question_id and answer.answer_value is not None:
                try:
                    val = json.loads(answer.answer_value)
                    if isinstance(val, list):
                        answer_map[answer.question_id] = ", ".join(str(v) for v in val)
                    else:
                        answer_map[answer.question_id] = str(val)
                except (json.JSONDecodeError, TypeError):
                    answer_map[answer.question_id] = str(answer.answer_value)

        row = [
            response.id,
            response.submitted_at.isoformat(),
            response.completion_time_seconds or "",
        ]
        for q in questions:
            row.append(answer_map.get(q.id, ""))

        writer.writerow(row)

    return output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility
