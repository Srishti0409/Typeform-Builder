from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ContactOut(BaseModel):
    """A respondent, folded across every form they have answered."""

    email: str
    name: Optional[str] = None
    response_count: int
    first_response_at: datetime
    last_response_at: datetime
    #: Titles of the forms this contact has responded to.
    forms: list[str] = []
