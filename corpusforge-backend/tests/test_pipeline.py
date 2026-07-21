import uuid
from contextlib import contextmanager
from unittest.mock import patch

from models.chunk import Chunk
from models.document import Document
from services.ingestion.pipeline import process_document


def test_process_document_marks_failed_when_all_entity_extraction_fails(test_db):
    """If every chunk's Gemini call fails (e.g. a quota outage), the document must land as
    'failed' with a clear error message — not silently as 'done' with entity_count=0, which
    is indistinguishable from a document that genuinely has zero extractable entities."""
    doc = Document(
        id=str(uuid.uuid4()), filename="d.txt", original_name="d.txt", status="processing",
    )
    test_db.add(doc)
    test_db.commit()

    @contextmanager
    def fake_session_local():
        yield test_db

    with patch("services.ingestion.pipeline.SessionLocal", fake_session_local), \
         patch("services.ingestion.pipeline.embed_and_store"), \
         patch("services.ingestion.entity_extractor.gemini_model") as mock_model:
        mock_model.generate_content.side_effect = Exception("429 quota exceeded")
        process_document(doc.id, b"P-101 pump maximum operating pressure is 18 bar.")

    test_db.refresh(doc)
    assert doc.status == "failed"
    assert doc.error_msg is not None
    assert "retry" in doc.error_msg.lower()
    # Text must still be usable (Copilot/search) even though entity extraction failed —
    # this is a degraded state, not a total loss of the upload.
    assert test_db.query(Chunk).filter_by(document_id=doc.id).count() > 0


def test_process_document_succeeds_when_extraction_partially_fails(test_db, mock_gemini_entity):
    """A document with multiple chunks where only some fail must still complete normally —
    only a TOTAL failure (every chunk) should block completion, matching the same
    partial-failure tolerance already established in pattern_engine.py/compliance_engine.py."""
    doc = Document(
        id=str(uuid.uuid4()), filename="d.txt", original_name="d.txt", status="processing",
    )
    test_db.add(doc)
    test_db.commit()

    @contextmanager
    def fake_session_local():
        yield test_db

    # A long document forces multiple chunks, so a single failing chunk is a genuine
    # partial failure rather than the only chunk that exists.
    long_text = ("P-101 pump maximum operating pressure is 18 bar. " * 5 + "\n\n") * 20

    call_count = {"n": 0}
    original_side_effect = mock_gemini_entity.generate_content.side_effect

    def flaky_generate_content(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise Exception("transient error")
        return mock_gemini_entity.generate_content.return_value

    with patch("services.ingestion.pipeline.SessionLocal", fake_session_local), \
         patch("services.ingestion.pipeline.embed_and_store"):
        mock_gemini_entity.generate_content.side_effect = flaky_generate_content
        process_document(doc.id, long_text.encode())
    mock_gemini_entity.generate_content.side_effect = original_side_effect

    test_db.refresh(doc)
    assert doc.status == "done"
    assert doc.error_msg is None
