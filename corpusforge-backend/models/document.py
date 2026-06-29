from sqlalchemy import Column, Integer, Text
from core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Text, primary_key=True)
    filename = Column(Text, nullable=False)
    original_name = Column(Text, nullable=False)
    doc_type = Column(Text)
    file_url = Column(Text)
    status = Column(Text, default="processing")
    error_msg = Column(Text)
    page_count = Column(Integer, default=0)
    entity_count = Column(Integer, default=0)
    content_hash = Column(Text)
    uploaded_at = Column(Text)
