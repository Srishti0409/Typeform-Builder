from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


def _engine_url() -> str:
    """The configured URL as SQLAlchemy needs to see it.

    Managed Postgres hands out `postgres://` or `postgresql://`. SQLAlchemy
    rejects the first outright and maps the second onto psycopg2, which this
    project does not install — so both are pointed at psycopg 3 explicitly.
    Everything else, the SQLite URL of local development included, is left alone.
    """
    url = settings.DATABASE_URL
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _engine_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    # SQLite alone needs the cross-thread escape hatch. Any other driver takes
    # this as an unexpected keyword and fails to connect at all.
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    # A hosted Postgres drops idle connections — Neon suspends the compute
    # outright — so a pooled connection is checked before it is handed out.
    pool_pre_ping=not IS_SQLITE,
)


if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Enable WAL mode and foreign key constraints for SQLite."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """Create all database tables."""
    from app.models import form, question, response  # noqa: F401
    Base.metadata.create_all(bind=engine)
