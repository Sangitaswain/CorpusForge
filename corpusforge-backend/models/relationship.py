from sqlalchemy import Column, Float, Text, ForeignKey
from core.database import Base


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Text, primary_key=True)
    source_entity_id = Column(Text, ForeignKey("entities.id", ondelete="CASCADE"))
    target_entity_id = Column(Text, ForeignKey("entities.id", ondelete="CASCADE"))
    rel_type = Column(Text, nullable=False)
    source_document_id = Column(Text, ForeignKey("documents.id"))
    confidence = Column(Float, default=1.0)
