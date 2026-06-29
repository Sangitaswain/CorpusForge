from sqlalchemy import Column, Integer, Text, ForeignKey
from core.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Text, primary_key=True)
    document_id = Column(Text, ForeignKey("documents.id", ondelete="CASCADE"))
    page_number = Column(Integer)
    chunk_index = Column(Integer)
    text = Column(Text, nullable=False)
    chroma_id = Column(Text)
    token_count = Column(Integer)
