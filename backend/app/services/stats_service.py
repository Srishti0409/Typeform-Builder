"""
Stats service: aggregate per-question summary statistics from responses.
"""
from __future__ import annotations
import json
from typing import Any
from sqlalchemy.orm import Session

from app.models.form import Form
from app.models.question import Question
from app.models.response import Response, ResponseAnswer
from app.schemas.response import FormStats, QuestionStats, ChoiceCount


def get_form_stats(db: Session, form_id: str) -> FormStats | None:
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return None

    responses = db.query(Response).filter(Response.form_id == form_id).all()
    total_responses = len(responses)

    # Average completion time
    times = [r.completion_time_seconds for r in responses if r.completion_time_seconds is not None]
    avg_time = sum(times) / len(times) if times else None

    # Build stats per question
    question_stats: list[QuestionStats] = []
    for question in form.questions:
        answers = (
            db.query(ResponseAnswer)
            .filter(ResponseAnswer.question_id == question.id)
            .all()
        )
        parsed_answers: list[Any] = []
        for a in answers:
            if a.answer_value is None:
                continue
            try:
                parsed_answers.append(json.loads(a.answer_value))
            except (json.JSONDecodeError, TypeError):
                parsed_answers.append(a.answer_value)

        stats = _compute_question_stats(question, parsed_answers)
        question_stats.append(stats)

    return FormStats(
        form_id=form_id,
        total_responses=total_responses,
        avg_completion_time_seconds=avg_time,
        question_stats=question_stats,
    )


def _compute_question_stats(question: Question, parsed_answers: list[Any]) -> QuestionStats:
    qtype = question.question_type
    total = len(parsed_answers)

    # Parse options
    raw_options = question.options
    options: list[str] = []
    if raw_options:
        try:
            options = json.loads(raw_options)
        except (json.JSONDecodeError, TypeError):
            options = []

    if qtype in ("multiple_choice", "dropdown", "yes_no"):
        counts: dict[str, int] = {}
        for ans in parsed_answers:
            if isinstance(ans, list):
                for item in ans:
                    counts[str(item)] = counts.get(str(item), 0) + 1
            else:
                counts[str(ans)] = counts.get(str(ans), 0) + 1

        # For yes_no, use canonical labels
        if qtype == "yes_no":
            all_keys = {"yes", "no"} | set(counts.keys())
        elif options:
            all_keys = set(options) | set(counts.keys())
        else:
            all_keys = set(counts.keys())

        choice_counts = [
            ChoiceCount(
                label=k,
                count=counts.get(k, 0),
                percentage=round((counts.get(k, 0) / total * 100), 1) if total > 0 else 0.0,
            )
            for k in sorted(all_keys)
        ]
        # Sort by count descending
        choice_counts.sort(key=lambda x: x.count, reverse=True)

        return QuestionStats(
            question_id=question.id,
            question_title=question.title,
            question_type=qtype,
            total_answers=total,
            choice_counts=choice_counts,
        )

    elif qtype in ("rating", "number"):
        numeric_vals: list[float] = []
        for ans in parsed_answers:
            try:
                numeric_vals.append(float(ans))
            except (ValueError, TypeError):
                pass
        avg = sum(numeric_vals) / len(numeric_vals) if numeric_vals else None
        return QuestionStats(
            question_id=question.id,
            question_title=question.title,
            question_type=qtype,
            total_answers=total,
            average=round(avg, 2) if avg is not None else None,
            min_value=min(numeric_vals) if numeric_vals else None,
            max_value=max(numeric_vals) if numeric_vals else None,
        )

    else:  # short_text, long_text, email
        samples = [str(a) for a in parsed_answers if a][:20]
        return QuestionStats(
            question_id=question.id,
            question_title=question.title,
            question_type=qtype,
            total_answers=total,
            sample_answers=samples,
        )
