import json
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base
from core.dependencies import get_db
from main import app


@pytest.fixture(autouse=True)
def mock_file_storage():
    """Keep tests hermetic: no real Supabase calls."""
    with patch("routers.documents.file_storage") as mock:
        mock.upload_file.side_effect = lambda file_bytes, storage_path, content_type: storage_path
        mock.get_signed_url.return_value = "https://example.supabase.co/signed/test"
        mock.delete_file.return_value = None
        yield mock


@pytest.fixture(autouse=True)
def mock_pipeline():
    """Don't run the real ingestion pipeline (embeddings, Gemini) in unit tests."""
    with patch("routers.documents.process_document") as mock:
        yield mock


@pytest.fixture(autouse=True)
def mock_background_engines():
    """Don't run the real pattern/compliance engines (Gemini) in unit tests.

    Both run_pattern_analysis and run_compliance_check open their own SessionLocal()
    rather than accepting a db session — the test_client/get_db override has no effect on
    them. TestClient runs BackgroundTasks synchronously, so a test hitting
    POST /intelligence/patterns/run or /compliance/run without this mock fires a REAL
    Gemini call against the REAL on-disk dev database, not the isolated in-memory test_db —
    burning real API quota and silently overwriting real data. Same class of bug
    mock_pipeline already prevents for ingestion, just missing here until now.
    """
    with patch("routers.intelligence.run_pattern_analysis") as pattern_mock, \
         patch("routers.intelligence.run_compliance_check") as compliance_mock:
        yield pattern_mock, compliance_mock


@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def test_client(test_db):
    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_chroma():
    with tempfile.TemporaryDirectory() as tmpdir:
        import chromadb

        client = chromadb.PersistentClient(path=tmpdir)
        yield client


@pytest.fixture
def mock_gemini():
    with patch("services.rag.gemini_model") as mock:
        mock.generate_content.return_value.text = json.dumps(
            {"answer": "The safe pressure is 18 bar [DOC: chunk_001]", "raw_citations": ["chunk_001"]}
        )
        yield mock


@pytest.fixture
def mock_gemini_entity():
    with patch("services.ingestion.entity_extractor.gemini_model") as mock:
        mock.generate_content.return_value.text = json.dumps(
            {
                "entities": [
                    {"entity_type": "equipment_tag", "value": "P-101", "confidence": 0.95},
                    {"entity_type": "date", "value": "2024-03-14", "confidence": 0.90},
                ]
            }
        )
        yield mock


@pytest.fixture
def sample_pdf_bytes():
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"


@pytest.fixture
def sample_text_bytes():
    return b"P-101 pump maximum operating pressure is 18 bar. Last maintenance: 2024-03-14 by Rajesh Nair."
