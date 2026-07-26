from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, model_validator


class AnswerSubmit(BaseModel):
    question_id: str
    answer_value: Any  # str | int | float | list[str]


class SubmitFormRequest(BaseModel):
    answers: list[AnswerSubmit]
    completion_time_seconds: Optional[int] = None


class AnswerOut(BaseModel):
    id: str
    question_id: Optional[str]
    answer_value: Any

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_answer(cls, values: Any) -> Any:
        if hasattr(values, "__dict__"):
            obj = values.__dict__
        elif isinstance(values, dict):
            obj = values
        else:
            return values
        raw = obj.get("answer_value")
        if isinstance(raw, str):
            try:
                obj["answer_value"] = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass
        return values


class ResponseOut(BaseModel):
    id: str
    form_id: str
    submitted_at: datetime
    completion_time_seconds: Optional[int]
    answers: list[AnswerOut] = []

    model_config = {"from_attributes": True}


class ResponseListItem(BaseModel):
    id: str
    form_id: str
    submitted_at: datetime
    completion_time_seconds: Optional[int]
    answer_count: int

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def compute_answer_count(cls, values: Any) -> Any:
        if hasattr(values, "answers"):
            if isinstance(values, dict):
                values["answer_count"] = len(values.get("answers", []))
            else:
                values.__dict__["answer_count"] = len(values.answers)
        return values


# ---------- Stats Schemas ----------

class ChoiceCount(BaseModel):
    label: str
    count: int
    percentage: float


class QuestionStats(BaseModel):
    question_id: str
    question_title: str
    question_type: str
    total_answers: int
    # For multiple_choice / dropdown / yes_no
    choice_counts: Optional[list[ChoiceCount]] = None
    # For rating / number
    average: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    # For short_text / long_text / email
    sample_answers: Optional[list[str]] = None


class FormStats(BaseModel):
    form_id: str
    total_responses: int
    avg_completion_time_seconds: Optional[float]
    question_stats: list[QuestionStats]
