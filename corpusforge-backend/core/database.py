from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

engine = create_engine("sqlite:///./corpusforge.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    from models import document, chunk, entity, relationship, pattern, compliance_gap, alert  # noqa: F401
    Base.metadata.create_all(engine)
