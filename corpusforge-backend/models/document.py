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
    # Backend-issued, permanent, collision-free Cast Number source (Visual_Identity.md,
    # signature element 8) — assigned once at upload time, never reused. Replaces the old
    # frontend-only hash of `id`, which had a real 16-bit collision risk at scale.
    cast_number = Column(Integer, unique=True)
