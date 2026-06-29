from sqlalchemy import Column, Integer, Text
from core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Text, primary_key=True)
    alert_type = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Text)
    affected_entities = Column(Text)
    source_doc_ids = Column(Text)
    recommendation = Column(Text)
    is_dismissed = Column(Integer, default=0)
    created_at = Column(Text)
