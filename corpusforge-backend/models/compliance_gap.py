from sqlalchemy import Column, Text, ForeignKey
from core.database import Base


class ComplianceGap(Base):
    __tablename__ = "compliance_gaps"

    id = Column(Text, primary_key=True)
    regulation_ref = Column(Text, nullable=False)
    clause_number = Column(Text, nullable=False)
    clause_text = Column(Text, nullable=False)
    matched_procedure_id = Column(Text, ForeignKey("documents.id"))
    matched_chunk_id = Column(Text, ForeignKey("chunks.id"))
    verdict = Column(Text)
    explanation = Column(Text)
    severity = Column(Text)
    recommendation = Column(Text)
    reg_document_id = Column(Text, ForeignKey("documents.id"))
    created_at = Column(Text)
