import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    form_id: Mapped[str] = mapped_column(String(36), ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    completion_time_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="responses")  # noqa: F821
    answers: Mapped[list["ResponseAnswer"]] = relationship(
        "ResponseAnswer",
        back_populates="response",
        cascade="all, delete-orphan",
    )


class ResponseAnswer(Base):
    __tablename__ = "response_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    response_id: Mapped[str] = mapped_column(String(36), ForeignKey("responses.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True, index=True)
    # JSON text: stores string | number | list[str] depending on question type
    answer_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    response: Mapped["Response"] = relationship("Response", back_populates="answers")
    question: Mapped["Question"] = relationship("Question", back_populates="answers")  # noqa: F821
