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


def _check_text_rules(answer: str, settings: dict[str, Any]) -> None:
    """
    Applies the author's optional text rules: a character cap and a regular
    expression, each gated by its own switch in the builder's inspector.

    Mirrors textRules() in frontend/lib/validation.ts. A pattern that will not
    compile is ignored rather than failing every answer — the author may simply
    have saved a half-typed expression.
    """
    if settings.get("limit_characters") and settings.get("max_characters") is not None:
        try:
            max_chars = int(settings["max_characters"])
        except (TypeError, ValueError):
            max_chars = 0
        if max_chars > 0 and len(answer) > max_chars:
            raise ValidationError(f"Answer must be {max_chars} characters or fewer.")

    if settings.get("validate_pattern") and settings.get("answer_pattern"):
        try:
            pattern = re.compile(str(settings["answer_pattern"]))
        except re.error:
            return
        if not pattern.search(answer):
            raise ValidationError("Answer doesn't match the required format.")


def _fmt_number(value: float) -> str:
    """Renders a bound the way JavaScript would, so both layers word a rejection
    identically ("at most 10", not "at most 10.0")."""
    return str(int(value)) if float(value).is_integer() else str(value)


def _number_bound(settings: dict[str, Any], key: str) -> float | None:
    """
    One end of a Number question's accepted range, or None when that end is
    unbounded.

    Each bound is optional and gated by its own switch in the builder, so a
    switched-off or blank bound is no constraint at all rather than a bound of
    zero. Questions authored before the switches existed fall back to whatever
    they stored.

    Mirrors numberBounds() in frontend/lib/validation.ts.
    """
    enabled = settings.get("limit_min" if key == "min" else "limit_max")
    raw = settings.get(key)
    if enabled is None:
        enabled = raw is not None
    if not enabled or raw is None or raw == "":
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


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
            _check_text_rules(answer, settings)
            return answer.strip()

        case "long_text":
            if not isinstance(answer, str):
                raise ValidationError("Answer must be a string.")
            if len(answer) > 5000:
                raise ValidationError("Answer must be 5000 characters or fewer.")
            _check_text_rules(answer, settings)
            return answer.strip()

        case "email":
            if not isinstance(answer, str):
                raise ValidationError("Answer must be a string.")
            answer = answer.strip().lower()
            # The question's "Answer validation" switch. Absent means on, so an
            # Email question validates unless the creator turned it off.
            if settings.get("validate_email") is False:
                return answer
            if not EMAIL_RE.match(answer):
                raise ValidationError("Please enter a valid email address.")
            return answer

        case "number":
            try:
                value = float(answer)
            except (ValueError, TypeError):
                raise ValidationError("Answer must be a number.")
            min_val = _number_bound(settings, "min")
            max_val = _number_bound(settings, "max")
            if min_val is not None and value < min_val:
                raise ValidationError(f"Value must be at least {_fmt_number(min_val)}.")
            if max_val is not None and value > max_val:
                raise ValidationError(f"Value must be at most {_fmt_number(max_val)}.")
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
