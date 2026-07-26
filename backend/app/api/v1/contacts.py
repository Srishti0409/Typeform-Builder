"""
Contacts API — the people who have answered the creator's forms.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.schemas.contact import ContactOut
from app.services.contacts_service import list_contacts

router = APIRouter(prefix="/contacts", tags=["contacts"])

CREATOR_ID = settings.DEFAULT_CREATOR_ID


@router.get("", response_model=list[ContactOut])
def get_contacts(db: Session = Depends(get_db)):
    """Every email address seen in a response, most recently active first."""
    return list_contacts(db, CREATOR_ID)
