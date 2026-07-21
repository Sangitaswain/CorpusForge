from sqlalchemy import Column, Float, Integer, Text, ForeignKey
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
    # Backend-issued, permanent, collision-free Cast Number source (Visual_Identity.md,
    # signature element 8). Assigned to every extracted entity row, but only the canonical
    # row's number is ever shown — graph_builder.add_entity_node picks node_id = the first
    # row's id for a given (entity_type, normalized_value), so that row's cast_number is the
    # one graph node's permanent number too.
    cast_number = Column(Integer, unique=True)
