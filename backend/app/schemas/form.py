from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, field_validator, model_validator


# ---------- Question Schemas ----------

VALID_QUESTION_TYPES = [
    "short_text", "long_text", "multiple_choice",
    "dropdown", "email", "number", "yes_no", "rating",
]


class QuestionBase(BaseModel):
    question_type: str
    title: str
    description: Optional[str] = None
    is_required: bool = False
    placeholder: Optional[str] = None
    options: Optional[list[str]] = None        # For multiple_choice / dropdown
    settings: Optional[dict[str, Any]] = None  # Type-specific settings

    @field_validator("question_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_QUESTION_TYPES:
            raise ValueError(f"Invalid question type: {v}")
        return v


class QuestionCreate(QuestionBase):
    order_index: Optional[int] = None


class QuestionUpdate(BaseModel):
    question_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    placeholder: Optional[str] = None
    options: Optional[list[str]] = None
    settings: Optional[dict[str, Any]] = None


class QuestionOut(QuestionBase):
    id: str
    form_id: str
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, values: Any) -> Any:
        """Parse JSON strings stored in SQLite back to Python objects."""
        if hasattr(values, "__dict__"):
            obj = values.__dict__
        elif isinstance(values, dict):
            obj = values
        else:
            return values

        for field in ("options", "settings"):
            raw = obj.get(field)
            if isinstance(raw, str):
                try:
                    obj[field] = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    obj[field] = None
        return values


# ---------- Form Schemas ----------

class ThemeConfig(BaseModel):
    primaryColor: str = "#0445AF"
    backgroundColor: str = "#FFFFFF"
    fontFamily: str = "Inter"
    backgroundImage: Optional[str] = None


class FormBase(BaseModel):
    title: str
    description: Optional[str] = None


class FormCreate(FormBase):
    pass


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thank_you_title: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme_config: Optional[ThemeConfig] = None


class FormOut(FormBase):
    id: str
    slug: str
    status: str
    creator_id: str
    thank_you_title: str
    thank_you_message: Optional[str]
    theme_config: Optional[ThemeConfig]
    response_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_theme(cls, values: Any) -> Any:
        if hasattr(values, "__dict__"):
            obj = values.__dict__
        elif isinstance(values, dict):
            obj = values
        else:
            return values
        raw = obj.get("theme_config")
        if isinstance(raw, str):
            try:
                obj["theme_config"] = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                obj["theme_config"] = None
        # response_count from property
        if "response_count" not in obj and hasattr(values, "response_count"):
            obj["response_count"] = values.response_count
        return values


class FormWithQuestions(FormOut):
    questions: list[QuestionOut] = []


class FormListItem(BaseModel):
    id: str
    title: str
    slug: str
    status: str
    response_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_response_count(cls, values: Any) -> Any:
        if hasattr(values, "response_count"):
            pass
        return values


class PublishResponse(BaseModel):
    id: str
    slug: str
    status: str
    share_url: str


class ReorderQuestionsRequest(BaseModel):
    question_ids: list[str]  # Ordered list of question IDs


class GenerateQuestionsRequest(BaseModel):
    """The creator's description of the form, for "Create with AI"."""
    prompt: str


class DuplicateFormResponse(BaseModel):
    id: str
    title: str
    slug: str
    status: str
