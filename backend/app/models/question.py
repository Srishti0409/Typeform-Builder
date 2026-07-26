import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

QUESTION_TYPES = (
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    form_id: Mapped[str] = mapped_column(String(36), ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    question_type: Mapped[str] = mapped_column(
        Enum(*QUESTION_TYPES, name="question_type"),
        nullable=False,
        default="short_text",
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # help text
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    placeholder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # JSON list for choices/dropdown options: ["Option A", "Option B", ...]
    options: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON object for type-specific settings:
    # number: { limit_min, min, limit_max, max }  |  rating: { max_rating, shape }
    # Optional settings pair a flag with a value, so an off switch is telling
    # apart from an unset one and the value survives being switched off.
    settings: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="questions")  # noqa: F821
    answers: Mapped[list["ResponseAnswer"]] = relationship(  # noqa: F821
        "ResponseAnswer",
        back_populates="question",
        cascade="all, delete-orphan",
    )
