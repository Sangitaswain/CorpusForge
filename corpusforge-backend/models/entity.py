from sqlalchemy import Column, Float, Text, ForeignKey
from core.database import Base


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Text, primary_key=True)
    document_id = Column(Text, ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_id = Column(Text, ForeignKey("chunks.id", ondelete="CASCADE"))
    entity_type = Column(Text, nullable=False)
    value = Column(Text, nullable=False)
    normalized_value = Column(Text)
    confidence = Column(Float, default=1.0)
