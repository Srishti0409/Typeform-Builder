"""
Per-type answer validation — single source of truth for both API submission
and client-side Zod mirror rules.
"""
from __future__ import annotations
import re
from typing import Any


EMAIL_RE = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


class ValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_answer(
    question_type: str,
    answer: Any,
    is_required: bool,
    options: list[str] | None = None,
    settings: dict[str, Any] | None = None,
) -> Any:
    """
    Validate and coerce an answer value for a given question type.
    Returns the (possibly coerced) value on success.
    Raises ValidationError on failure.
    """
    settings = settings or {}

    # Handle empty / null answers
    if answer is None or answer == "" or answer == []:
        if is_required:
            raise ValidationError("This field is required.")
        return answer  # Optional — accept empty

    match question_type:
        case "short_text":
            if not isinstance(answer, str):
                raise ValidationError("Answer must be a string.")
            if len(answer) > 500:
                raise ValidationError("Answer must be 500 characters or fewer.")
            return answer.strip()

        case "long_text":
            if not isinstance(answer, str):
                raise ValidationError("Answer must be a string.")
            if len(answer) > 5000:
                raise ValidationError("Answer must be 5000 characters or fewer.")
            return answer.strip()

        case "email":
            if not isinstance(answer, str):
                raise ValidationError("Answer must be a string.")
            answer = answer.strip().lower()
            if not EMAIL_RE.match(answer):
                raise ValidationError("Please enter a valid email address.")
            return answer

        case "number":
            try:
                value = float(answer)
            except (ValueError, TypeError):
                raise ValidationError("Answer must be a number.")
            min_val = settings.get("min")
            max_val = settings.get("max")
            if min_val is not None and value < float(min_val):
                raise ValidationError(f"Value must be at least {min_val}.")
            if max_val is not None and value > float(max_val):
                raise ValidationError(f"Value must be at most {max_val}.")
            return value

        case "rating":
            try:
                value = int(answer)
            except (ValueError, TypeError):
                raise ValidationError("Rating must be an integer.")
            max_rating = int(settings.get("max_rating", 5))
            if value < 1 or value > max_rating:
                raise ValidationError(f"Rating must be between 1 and {max_rating}.")
            return value

        case "yes_no":
            if answer not in ("yes", "no", True, False, "true", "false"):
                raise ValidationError("Answer must be 'yes' or 'no'.")
            if isinstance(answer, bool):
                return "yes" if answer else "no"
            if isinstance(answer, str):
                if answer.lower() in ("yes", "true"):
                    return "yes"
                return "no"

        case "multiple_choice":
            if isinstance(answer, str):
                answer = [answer]
            if not isinstance(answer, list):
                raise ValidationError("Answer must be a list of selected options.")
            if options:
                for choice in answer:
                    if choice not in options:
                        raise ValidationError(f"'{choice}' is not a valid option.")
            return answer

        case "dropdown":
            if not isinstance(answer, str):
                raise ValidationError("Answer must be a string.")
            if options and answer not in options:
                raise ValidationError(f"'{answer}' is not a valid option.")
            return answer

        case _:
            raise ValidationError(f"Unknown question type: {question_type}")

    return answer
