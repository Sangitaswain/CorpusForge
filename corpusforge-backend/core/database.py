import os
from sqlalchemy import create_engine, func, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_db_path = "/app/data/corpusforge.db" if os.getenv("FLY_APP_NAME") else "./corpusforge.db"
engine = create_engine(f"sqlite:///{_db_path}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


# Tables that gained a `cast_number` column after this project already had rows in
# development — `Base.metadata.create_all()` only creates missing tables, it never alters
# an existing one, so those two need an explicit one-time migration. This project has no
# Alembic; the DDL below has no user-supplied values (table/column names are fixed
# constants), so it's schema migration, not an application query — it doesn't fall under
# the ORM-only rule (SO-07) that governs request-time database access.
_CAST_NUMBER_TABLES = ("documents", "entities")


def _add_cast_number_columns():
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in _CAST_NUMBER_TABLES:
            columns = {col["name"] for col in inspector.get_columns(table)}
            if "cast_number" not in columns:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN cast_number INTEGER"))


def _backfill_cast_numbers():
    from models.document import Document
    from models.entity import Entity

    with SessionLocal() as db:
        for model in (Document, Entity):
            rows = db.query(model).filter(model.cast_number.is_(None)).order_by(model.id).all()
            if not rows:
                continue
            next_number = (db.query(func.max(model.cast_number)).scalar() or 0) + 1
            for row in rows:
                row.cast_number = next_number
                next_number += 1
            db.commit()


def _ensure_cast_number_unique_index():
    # SQLite's ALTER TABLE cannot add a UNIQUE constraint inline, so the index is created
    # separately here, after backfill — `create_all()` never retrofits indexes onto a table
    # that already existed before this column did.
    with engine.begin() as conn:
        for table in _CAST_NUMBER_TABLES:
            conn.execute(
                text(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{table}_cast_number ON {table}(cast_number)")
            )


def init_db():
    from models import document, chunk, entity, relationship, pattern, compliance_gap, alert  # noqa: F401
    Base.metadata.create_all(engine)
    _add_cast_number_columns()
    _backfill_cast_numbers()
    _ensure_cast_number_unique_index()
