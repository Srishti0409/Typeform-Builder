import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, default="default-creator-001")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        Enum("draft", "published", name="form_status"),
        nullable=False,
        default="draft",
    )
    # JSON string for theme config: { primaryColor, backgroundColor, fontFamily, backgroundImage }
    theme_config: Mapped[str | None] = mapped_column(Text, nullable=True, default='{"primaryColor":"#0445AF","backgroundColor":"#FFFFFF","fontFamily":"Inter"}')
    thank_you_title: Mapped[str] = mapped_column(String(255), nullable=False, default="Thanks for completing this form!")
    thank_you_message: Mapped[str | None] = mapped_column(Text, nullable=True, default="Your response has been recorded.")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        "Question",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.order_index",
    )
    responses: Mapped[list["Response"]] = relationship(  # noqa: F821
        "Response",
        back_populates="form",
        cascade="all, delete-orphan",
    )

    @property
    def response_count(self) -> int:
        return len(self.responses)
