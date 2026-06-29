from sqlalchemy import Column, Integer, Text
from core.database import Base


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(Text, primary_key=True)
    title = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    severity = Column(Text)
    incident_count = Column(Integer)
    incident_ids = Column(Text)
    equipment_tags = Column(Text)
    created_at = Column(Text)
    last_run_at = Column(Text)
