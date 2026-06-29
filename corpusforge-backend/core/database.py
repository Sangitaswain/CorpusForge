import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_db_path = "/app/data/corpusforge.db" if os.getenv("FLY_APP_NAME") else "./corpusforge.db"
engine = create_engine(f"sqlite:///{_db_path}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    from models import document, chunk, entity, relationship, pattern, compliance_gap, alert  # noqa: F401
    Base.metadata.create_all(engine)
